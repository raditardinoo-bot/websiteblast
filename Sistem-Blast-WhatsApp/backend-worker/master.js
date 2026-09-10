const { fork } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { redisSubscriber, redisClient, initRedis } = require('./services/redisClient');

const prisma = new PrismaClient();
const MAX_SESSIONS_PER_WORKER = 3; // Keep it tight for RAM control
const WORKER_SCRIPT = path.join(__dirname, 'worker_child.js');

let workers = {}; // workerId -> { process, sessions: Set, pendingTargets: Map, status: 'READY', rss: 0 }
let sessionToWorker = {}; // sessionId -> workerId
let nextWorkerId = 1;

// Master Target Pool (In-Memory Queue to avoid DB bottleneck)
let targetPool = [];
let queuedTargetIds = new Set();
let isFillingPool = false;
let masterMetrics = { activeDevices: 0, mps: 0, messagesSent: 0 };

async function fillPool() {
    if (isFillingPool) return;
    if (targetPool.length > 200) return; // Keep pool reasonable
    
    isFillingPool = true;
    try {
        const activeCampaigns = await prisma.campaign.findMany({
            where: { status: 'ACTIVE' }
        });
        
        if (activeCampaigns.length === 0) {
            isFillingPool = false;
            return;
        }

        // AUTO-HEALING: Kembalikan target hantu yang tertinggal (karena restart/manual SQL) menjadi bersih
        const queuedArr = Array.from(queuedTargetIds);
        await prisma.targetNumber.updateMany({
            where: {
                OR: [
                    { status: 'PROCESSING' },
                    { status: 'READY', waSessionId: { not: null } }
                ],
                id: { notIn: queuedArr.length > 0 ? queuedArr : [-1] }
            },
            data: { status: 'READY', waSessionId: null }
        });

        const campaignIds = activeCampaigns.map(c => c.id);
        const targets = await prisma.targetNumber.findMany({
            where: {
                campaignId: { in: campaignIds },
                status: 'READY',
                waSessionId: null,
                id: { notIn: queuedArr }
            },
            take: 300,
            orderBy: { id: 'asc' }
        });

        if (targets.length > 0) {
            // Map with campaign details to send to worker
            const mappedTargets = targets.map(t => {
                queuedTargetIds.add(t.id);
                const c = activeCampaigns.find(camp => camp.id === t.campaignId);
                return { ...t, activeCampaign: c };
            });
            targetPool.push(...mappedTargets);
        }
    } catch (e) {
        console.error('[Master] Error filling pool:', e.message);
    } finally {
        isFillingPool = false;
    }
}

// Keep pool filled
setInterval(fillPool, 2000);

    // (Moved to startMaster)


// Safe publish: never throws, swallows Redis errors silently
function safePub(channel, data) {
    if (redisClient.isOpen) {
        redisClient.publish(channel, JSON.stringify(data)).catch(e => {
            console.error('[Master] Redis publish error:', e.message);
        });
    }
}

function spawnWorker() {
    const workerId = `W-${nextWorkerId++}`;
    console.log(`[Master] Spawning new Worker ${workerId}`);
    
    const child = fork(WORKER_SCRIPT, [workerId], {
        env: process.env,
        stdio: 'inherit'
    });
    
    workers[workerId] = {
        process: child,
        sessions: new Set(),
        pendingTargets: new Map(),
        status: 'READY',
        stats: {}
    };

    child.on('message', async (msg) => {
        const worker = workers[workerId];
        if (!worker) return;

        if (msg.type === 'REQUEST_TARGET') {
            const { sessionId } = msg;
            if (targetPool.length === 0) {
                child.send({ type: 'NO_TARGET', sessionId });
                return;
            }
            // Give 1 target
            const target = targetPool.shift();
            // Lock in DB asynchronously so other masters/API don't touch it
            prisma.targetNumber.update({
                where: { id: target.id },
                data: { status: 'PROCESSING', waSessionId: sessionId }
            }).catch(e => console.error(e));
            
            worker.pendingTargets.set(target.id, target);
            child.send({ type: 'TARGET_DATA', sessionId, target });
        }
        else if (msg.type === 'TARGET_DONE') {
            const { targetId, success } = msg;
            worker.pendingTargets.delete(targetId);
            queuedTargetIds.delete(targetId);
            if (success) masterMetrics.messagesSent++;
        }
        else if (msg.type === 'BLAST_STATE') {
            safePub('WA_EVENTS', msg);
        }
        else if (msg.type === 'SESSION_STATUS') {
            if (msg.status === 'DISCONNECTED' || msg.status === 'DELETED' || msg.status.includes('TIDUR')) {
                worker.sessions.delete(msg.sessionId);
                delete sessionToWorker[msg.sessionId];
            }
            safePub('WA_EVENTS', {
                type: 'STATUS',
                sessionId: msg.sessionId,
                status: msg.status
            });
        }
        else if (msg.type === 'WORKER_STATS') {
            worker.stats = msg.data;
            if (msg.data.rss > 600 * 1024 * 1024 && worker.status === 'READY') { // 600 MB Limit per worker
                console.log(`[Master] Worker ${workerId} exceeded RAM limit. Marking for graceful restart.`);
                worker.status = 'DRAINING'; // Stop accepting new sessions, wait for pending to clear
            }
            if (worker.status === 'DRAINING' && worker.pendingTargets.size === 0) {
                console.log(`[Master] Worker ${workerId} is drained. Killing it.`);
                worker.process.kill('SIGTERM');
            }
        }
        else if (msg.type === 'QR_CODE') {
            safePub('WA_EVENTS', {
                type: 'QR',
                sessionId: msg.sessionId,
                qr: msg.qr
            });
        }
        else if (msg.type === 'PAIRING_CODE') {
            safePub('WA_EVENTS', {
                type: 'PAIRING_CODE',
                sessionId: msg.sessionId,
                code: msg.code
            });
        }
    });

    child.on('exit', (code) => {
        console.log(`[Master] Worker ${workerId} died with code ${code}. Reassigning sessions...`);
        const deadWorker = workers[workerId];
        if (deadWorker) {
            // Return pending targets to pool
            for (const [tid, target] of deadWorker.pendingTargets) {
                queuedTargetIds.delete(target.id);
                prisma.targetNumber.update({
                    where: { id: target.id },
                    data: { status: 'READY', waSessionId: null }
                }).catch(()=>{});
            }
            
            // Re-assign sessions to other workers
            const sessionsToRestart = Array.from(deadWorker.sessions);
            delete workers[workerId];
            
            for (const sid of sessionsToRestart) {
                // CLEAR GHOST DATA IN UI: Tell monitor the blast stopped due to worker crash
                safePub('WA_EVENTS', {
                    type: 'BLAST_STATE',
                    sessionId: sid,
                    state: {
                        isBlasting: false,
                        status: 'BERHENTI'
                    }
                });
                
                delete sessionToWorker[sid];
                assignSessionToWorker(sid);
            }
        }
    });

    return workerId;
}

function assignSessionToWorker(sessionId, blastDelay = null, maxMessages = null, action = 'START') {
    if (action === 'DELETE') {
        const wid = sessionToWorker[sessionId];
        if (wid && workers[wid]) {
            workers[wid].process.send({ type: 'DELETE_SESSION', sessionId });
            workers[wid].sessions.delete(sessionId);
            delete sessionToWorker[sessionId];
        }
        return;
    }

    if (action === 'START_BLAST' || action === 'STOP_BLAST') {
        let wid = sessionToWorker[sessionId];
        if (!wid) {
            // Auto-wake up sleeping session
            assignSessionToWorker(sessionId, null, null, 'START_SESSION');
            wid = sessionToWorker[sessionId];
        }
        if (wid && workers[wid]) {
            workers[wid].process.send({ type: action, sessionId, delay: blastDelay, maxMessages });
        }
        return;
    }

    if (action === 'GET_PAIRING_CODE') {
        const wid = sessionToWorker[sessionId];
        if (wid && workers[wid]) {
            workers[wid].process.send({ type: action, sessionId, phoneNumber: blastDelay });
        }
        return;
    }

    // ACTION: START_SESSION
    let assignedWorkerId = sessionToWorker[sessionId];
    
    // Find a worker with capacity if not already assigned
    if (!assignedWorkerId || !workers[assignedWorkerId]) {
        for (const wid in workers) {
            if (workers[wid].status === 'READY' && workers[wid].sessions.size < MAX_SESSIONS_PER_WORKER) {
                assignedWorkerId = wid;
                break;
            }
        }
        // If still no capacity, spawn new
        if (!assignedWorkerId) {
            assignedWorkerId = spawnWorker();
        }
    }

    sessionToWorker[sessionId] = assignedWorkerId;
    workers[assignedWorkerId].sessions.add(sessionId);
    workers[assignedWorkerId].process.send({ type: 'START_SESSION', sessionId });
    console.log(`[Master] Assigned Session ${sessionId} to Worker ${assignedWorkerId}`);
}

async function startMaster() {
    console.log('[Master] Starting Node.js Worker Pool Engine...');
    await prisma.$connect();
    await initRedis();

    // Start sending metrics only after Redis is connected
    setInterval(() => {
        let totalRss = process.memoryUsage().rss;
        let totalHeap = process.memoryUsage().heapUsed;
        
        for (const wid in workers) {
            if (workers[wid].stats) {
                totalRss += workers[wid].stats.rss || 0;
                totalHeap += workers[wid].stats.heap || 0;
            }
        }
        
        const mps = masterMetrics.messagesSent;
        masterMetrics.messagesSent = 0;
        masterMetrics.activeDevices = Object.keys(sessionToWorker).length;

        if (redisClient.isOpen) {
            redisClient.publish('WA_EVENTS', JSON.stringify({
                type: 'ENGINE_METRICS',
                mps,
                poolSize: targetPool.length,
                activeDevices: masterMetrics.activeDevices,
                lastFillMs: 0,
                lastFillTaken: 0
            }));
        }

        const activeWorkers = Object.keys(workers).length;
        let activeIpc = 0;
        for (const wid in workers) {
            if (workers[wid].pendingTargets) {
                activeIpc += workers[wid].pendingTargets.size;
            }
        }

        if (Math.random() < 0.2) {
            console.log(`[Master-Health] Workers: ${activeWorkers}, Sessions: ${masterMetrics.activeDevices}, IPC Active: ${activeIpc}, RAM: ${(totalRss / 1024 / 1024).toFixed(2)} MB`);
        }

        if (redisClient.isOpen) {
            redisClient.publish('WA_EVENTS', JSON.stringify({
                type: 'MEMORY_PROFILER',
                data: {
                    sessions: masterMetrics.activeDevices,
                    activeRequests: activeIpc,
                    activeHandles: activeWorkers,
                    memory: {
                        rss: (totalRss / 1024 / 1024).toFixed(2) + ' MB',
                        heapTotal: '-',
                        heapUsed: (totalHeap / 1024 / 1024).toFixed(2) + ' MB',
                        external: '-'
                    }
                }
            }));
        }
    }, 1000);

    redisSubscriber.subscribe('WA_COMMANDS', async (message) => {
        try {
            const data = JSON.parse(message);
            const { command, sessionId, delay, maxMessages, phoneNumber } = data;
            
            if (command === 'START_SESSION') {
                assignSessionToWorker(sessionId, null, null, 'START_SESSION');
            } else if (command === 'DELETE_SESSION') {
                assignSessionToWorker(sessionId, null, null, 'DELETE');
            } else if (command === 'START_BLAST') {
                assignSessionToWorker(sessionId, delay, maxMessages, 'START_BLAST');
            } else if (command === 'STOP_BLAST') {
                assignSessionToWorker(sessionId, null, null, 'STOP_BLAST');
            } else if (command === 'GET_PAIRING_CODE') {
                assignSessionToWorker(sessionId, phoneNumber, null, 'GET_PAIRING_CODE');
            }
        } catch (e) {
            console.error('[Master] Redis Command Error:', e);
        }
    });

    // Auto-start active sessions from DB
    const activeSessions = await prisma.waSession.findMany({
        where: { status: 'CONNECTED' }
    });
    
    console.log(`[Master] Found ${activeSessions.length} active sessions to restore.`);
    for (const session of activeSessions) {
        assignSessionToWorker(session.id, null, null, 'START_SESSION');
    }
}

startMaster().catch(e => {
    console.error('[Master] Fatal Error:', e);
    process.exit(1);
});
