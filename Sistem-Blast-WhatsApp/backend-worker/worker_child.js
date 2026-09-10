let makeWASocket, useMultiFileAuthState, DisconnectReason, delay, Browsers, fetchLatestBaileysVersion;
let baileysLoaded = false;
let ipcQueue = [];
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
// Mencegah Database Crash (Too Many Connections) saat ada puluhan worker
const dbUrl = process.env.DATABASE_URL || '';
const connectionUrl = dbUrl.includes('?') ? `${dbUrl}&connection_limit=3` : `${dbUrl}?connection_limit=3`;
const prisma = new PrismaClient({ datasources: { db: { url: connectionUrl } } });
const QRCode = require('qrcode');

const workerId = process.argv[2] || 'UNKNOWN';
console.log(`[${workerId}] Booting up...`);

const sessions = {}; // sessionId -> { sock, status, isBlasting, blastDelay, maxMessages, messagesSent, timeout, dbInfo }
const globalImageCache = {};
const MAX_IMAGE_CACHE = 20; // FIX 3: Limit image cache to prevent RAM leak

// FIX 1: Cache appSetting to avoid DB hit per message
let _cachedAppSetting = null;
let _appSettingCachedAt = 0;
async function getAppSetting() {
    const now = Date.now();
    if (_cachedAppSetting && (now - _appSettingCachedAt) < 5 * 60 * 1000) {
        return _cachedAppSetting;
    }
    _cachedAppSetting = await prisma.appSetting.findFirst();
    _appSettingCachedAt = now;
    return _cachedAppSetting;
}

// ----------------------------------------
// MEMORY RULES
// ----------------------------------------
setInterval(() => {
    const memory = process.memoryUsage();
    process.send({
        type: 'WORKER_STATS',
        data: {
            rss: memory.rss,
            heap: memory.heapUsed,
            sessions: Object.keys(sessions).length
        }
    });

    // Broadcast BLAST_STATE for each session to update UI
    for (const sid in sessions) {
        const s = sessions[sid];
        if (s) {
            process.send({
                type: 'BLAST_STATE',
                sessionId: Number(sid),
                state: {
                    isBlasting: s.isBlasting,
                    status: s.blastStatus || s.status,
                    messagesAttempted: (s.messagesSent || 0) + (s.messagesFailed || 0),
                    messagesSent: s.messagesSent || 0,
                    messagesFailed: s.messagesFailed || 0,
                    invalidNumbers: s.invalidNumbers || 0,
                    incomeEarned: (s.messagesSent || 0) * (s.userReward || 50),
                    idleMinutes: s.idleMinutes || 0,
                    nextActionTime: s.nextActionTime || null,
                    stoppedAt: s.blastStoppedAt || null
                }
            });
        }
    }
}, 3000);

// Auto-Sleep Idle Sessions (Save RAM)
setInterval(() => {
    for (const sid in sessions) {
        const session = sessions[sid];
        if (session && session.status === 'CONNECTED' && session.sock) {
            if (!session.isBlasting) {
                session.idleMinutes = (session.idleMinutes || 0) + 1;
                if (session.idleMinutes >= 3) {
                    console.log(`[${workerId}] Session ${sid} idle for 3 mins. Hard disconnecting to save RAM...`);

                    // Benar-benar matikan dan set OFFLINE, tapi JANGAN hapus auth folder
                    updateDbStatus(sid, 'DISCONNECTED', 'TIDUR (Tidak Dipakai Blast)');
                    if (session.sock) {
                        session.sock.ev.removeAllListeners();
                        try { session.sock.ws.close(); } catch (e) { }
                    }
                    delete sessions[sid];
                }
            } else {
                session.idleMinutes = 0;
            }
        }
    }
}, 60 * 1000);

const withTimeout = (promise, ms) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_WA_SERVER')), ms))
    ]);
};

async function updateDbStatus(sessionId, dbStatus, ipcStatus) {
    try {
        await prisma.waSession.updateMany({
            where: { id: Number(sessionId) },
            data: { status: dbStatus }
        });
        process.send({ type: 'SESSION_STATUS', sessionId: Number(sessionId), status: ipcStatus || dbStatus });
    } catch (e) {
        console.error(`[${workerId}] DB Status Error:`, e.message);
    }
}

// ----------------------------------------
// EVENT DRIVEN BLAST LOOP
// ----------------------------------------
const activeTargetRequests = new Map(); // sessionId -> resolve function

function resetPairingTimeout(sessionId) {
    const session = sessions[sessionId];
    if (!session) return;
    
    if (session.timeout) clearTimeout(session.timeout);
    
    session.timeout = setTimeout(async () => {
        if (sessions[sessionId] && sessions[sessionId].status !== 'CONNECTED') {
            console.log(`[${workerId}] Session ${sessionId} timeout pairing.`);
            const dbDevice = await prisma.waSession.findUnique({ where: { id: Number(sessionId) } });
            if (dbDevice && dbDevice.sessionName === 'Menunggu Tautan') {
                await deleteSession(sessionId);
                await prisma.waSession.delete({ where: { id: Number(sessionId) } }).catch(()=>{});
            } else {
                await updateDbStatus(sessionId, 'DISCONNECTED');
                if (sessions[sessionId].sock) {
                    sessions[sessionId].sock.ev.removeAllListeners();
                    try { sessions[sessionId].sock.ws.close(); } catch (e) { }
                }
                delete sessions[sessionId];
            }
        }
    }, 3 * 60 * 1000);
}

async function handleMessage(msg) {
    try {
        if (msg.type === 'START_SESSION') {
            await startSession(msg.sessionId);
        } else if (msg.type === 'DELETE_SESSION') {
            await deleteSession(msg.sessionId);
        } else if (msg.type === 'START_BLAST') {
            // GEMBOK ANTI-SPAM: Cegah pembuatan loop paralel jika session sudah blasting
            if (sessions[msg.sessionId] && sessions[msg.sessionId].isBlasting) {
                console.log(`[${workerId}] Abaikan START_BLAST ganda untuk Session ${msg.sessionId}. Loop sudah aktif!`);
                sessions[msg.sessionId].blastDelay = msg.delay || 5000;
                sessions[msg.sessionId].maxMessages = msg.maxMessages;
                return;
            }

            let needsWakeup = false;
            if (!sessions[msg.sessionId]) {
                sessions[msg.sessionId] = { status: 'STARTING', isBlasting: false };
                needsWakeup = true;
            } else if (!sessions[msg.sessionId].sock) {
                needsWakeup = true;
            }

            const session = sessions[msg.sessionId];
            session.isBlasting = true;
            session.blastDelay = msg.delay || 5000;
            session.maxMessages = msg.maxMessages;
            session.messagesSent = 0;
            session.messagesFailed = 0;
            session.invalidNumbers = 0;
            session.idleMinutes = 0;
            session.noTargetCount = 0;
            session.blastStatus = 'MEMULAI...';
            session.blastStoppedAt = null;
            console.log(`[${workerId}] Session ${msg.sessionId} starts blasting!`);
            
            // Fetch setting once at start so UI can reflect it immediately
            prisma.appSetting.findFirst().then(setting => {
                session.appSetting = setting;
                session.userReward = setting?.rewardPerMessage || 50;
            }).catch(() => {});

            if (needsWakeup) {
                console.log(`[${workerId}] Waking up Session ${msg.sessionId} for blast (was idle)`);
                await startSession(msg.sessionId);
            } else {
                triggerBlastLoop(msg.sessionId); // kick off the event loop directly
            }
        } else if (msg.type === 'STOP_BLAST') {
            if (sessions[msg.sessionId]) {
                sessions[msg.sessionId].isBlasting = false;
                sessions[msg.sessionId].blastStatus = 'BERHENTI';
                sessions[msg.sessionId].blastStoppedAt = Date.now();
                console.log(`[${workerId}] Session ${msg.sessionId} stopped blasting.`);
            }
        } else if (msg.type === 'TARGET_DATA') {
            const resolver = activeTargetRequests.get(msg.sessionId);
            if (resolver) {
                activeTargetRequests.delete(msg.sessionId);
                resolver(msg.target);
            }
        } else if (msg.type === 'NO_TARGET') {
            const resolver = activeTargetRequests.get(msg.sessionId);
            if (resolver) {
                activeTargetRequests.delete(msg.sessionId);
                resolver(null);
            }
        } else if (msg.type === 'GET_PAIRING_CODE') {
            const session = sessions[msg.sessionId];
            if (session && session.sock) {
                try {
                    // Safely normalize phone number
                    let cleanPhone = (msg.phoneNumber || '').replace(/[^0-9]/g, '');
                    console.log(`[${workerId}] Requesting pairing code for ${cleanPhone}`);
                    
                    // Reset 3-minute timer so user has fresh time to type the code
                    resetPairingTimeout(msg.sessionId);
                    
                    let code = await session.sock.requestPairingCode(cleanPhone);
                    process.send({ type: 'PAIRING_CODE', sessionId: msg.sessionId, code });
                } catch (e) {
                    console.error(`[${workerId}] Request Pairing Code Error:`, e.message);
                }
            } else {
                console.error(`[${workerId}] Session not ready for pairing code.`);
            }
        }
    } catch (e) {
        console.error(`[${workerId}] IPC Message Error:`, e);
    }
}

process.on('message', async (msg) => {
    if (!baileysLoaded) {
        ipcQueue.push(msg);
        return;
    }
    await handleMessage(msg);
});

// Load Baileys Dynamically for ESM compatibility
import('@whiskeysockets/baileys').then(async (baileys) => {
    makeWASocket = baileys.default || baileys.makeWASocket;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    delay = baileys.delay;
    Browsers = baileys.Browsers;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    baileysLoaded = true;

    for (const msg of ipcQueue) {
        await handleMessage(msg);
    }
    ipcQueue = [];
}).catch(err => {
    console.error(`[${workerId}] Failed to load Baileys ESM:`, err);
    process.exit(1);
});

function requestTarget(sessionId) {
    return new Promise((resolve) => {
        activeTargetRequests.set(sessionId, resolve);
        process.send({ type: 'REQUEST_TARGET', sessionId });
    });
}

async function triggerBlastLoop(sessionId) {
    const session = sessions[sessionId];
    if (!session || !session.isBlasting) return;
    
    if (session.status !== 'CONNECTED') {
        session.isBlasting = false;
        session.blastStatus = 'BERHENTI';
        session.blastStoppedAt = Date.now();
        console.log(`[${workerId}] Session ${sessionId} terputus, menghentikan sesi blast.`);
        return;
    }

    if (session.maxMessages && session.messagesSent >= session.maxMessages) {
        session.isBlasting = false;
        session.blastStatus = 'BERHENTI';
        session.blastStoppedAt = Date.now();
        console.log(`[${workerId}] Session ${sessionId} reached max messages. Stop.`);
        return;
    }

    try {
        // 1. Minta target ke Master (Event-Driven)
        const target = await requestTarget(sessionId);

        if (!target) {
            session.blastStatus = 'DB KOSONG';
            session.noTargetCount = (session.noTargetCount || 0) + 1;
            if (session.noTargetCount >= 10) {
                session.isBlasting = false;
                session.blastStatus = 'BERHENTI';
                session.blastStoppedAt = Date.now();
                session.noTargetCount = 0;
                console.log(`[${workerId}] Session ${sessionId} menghentikan blast: DB kosong selama 30 detik.`);
                return;
            }
            // Pool kosong, istirahat 3 detik lalu minta lagi
            session.nextActionTime = Date.now() + 3000;
            await delay(3000);
            return setImmediate(() => triggerBlastLoop(sessionId)); // non-blocking recursion
        }
        session.noTargetCount = 0; // reset jika dapat target
        session.blastStatus = 'MENGIRIM PESAN...';

        // 2. Eksekusi Pengiriman
        const success = await executeSend(sessionId, target);

        // 3. Beritahu master hasil
        process.send({ type: 'TARGET_DONE', targetId: target.id, success });

        // 4. Istirahat sesuai delay user, lalu loop
        session.blastStatus = 'JEDA BLAST';
        session.nextActionTime = Date.now() + (session.blastDelay || 5000);
        await delay(session.blastDelay || 5000);

    } catch (e) {
        console.error(`[${workerId}] Blast loop error for ${sessionId}:`, e.message);
        await delay(3000);
    }

    // Panggil ulang dirinya sendiri selama isBlasting masih true
    if (session.isBlasting) {
        setImmediate(() => triggerBlastLoop(sessionId));
    }
}

async function executeSend(sessionId, target) {
    const session = sessions[sessionId];
    if (!session || !session.sock) return false;

    let isSuccess = false;
    let failReason = 'UNKNOWN';
    try {
        const activeCampaign = target.activeCampaign;
        const cleanPhone = target.phone.replace(/[^0-9]/g, '');
        const jid = `${cleanPhone}@s.whatsapp.net`;

        // OPSI 1 BARBAR: Hapus fitur cek onWhatsApp() untuk menghindari Rate-Limit dari server WA
        // Semua nomor dianggap valid (isOnWa = true). Jika bodong, akan langsung ditangkap oleh blok catch(e) di bawah.
        let isOnWa = true;

        if (!isOnWa) {
            console.log(`[${workerId}] Skip ${target.phone} - Tidak terdaftar di WA`);
            failReason = 'NO_WA';
            // Lanjut ke blok update DB (Gagal)
        } else {
            // MARK AS SENDING FIRST
            try {
                await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'PROCESSING' } });
            } catch (e) {
                console.error(`[${workerId}] Gagal set status PROCESSING untuk ${target.id}:`, e.message);
            }

            const greetings = ["Kak", "Bunda", "Bosku", "Gan", "Sis"];
            const randomName = greetings[Math.floor(Math.random() * greetings.length)];
            let finalTemplate = activeCampaign.messageTemplate
                .replace(/\{\{name\}\}|\{name\}/gi, randomName)
                .replace(/\{\{phone\}\}|\{phone\}/gi, target.phone);

            const zeroWidthSpaces = '\u200B'.repeat(Math.floor(Math.random() * 4) + 1);
            finalTemplate = finalTemplate + ' '.repeat(Math.floor(Math.random() * 3)) + zeroWidthSpaces;

            let imageBuffer = null;
            if (activeCampaign.mediaUrl) {
                const cacheKey = activeCampaign.id.toString();
                if (globalImageCache[cacheKey]) {
                    imageBuffer = globalImageCache[cacheKey];
                } else {
                    const imagePath = path.join(__dirname, '..', 'backend', activeCampaign.mediaUrl);
                    if (fs.existsSync(imagePath)) {
                        imageBuffer = fs.readFileSync(imagePath);
                        globalImageCache[cacheKey] = imageBuffer;
                        // FIX 3: Evict oldest entry if cache exceeds limit
                        const keys = Object.keys(globalImageCache);
                        if (keys.length > MAX_IMAGE_CACHE) {
                            delete globalImageCache[keys[0]];
                        }
                    }
                }
            }

            let sent = null;
            if (activeCampaign.linkText && activeCampaign.linkUrl) {
                const baileys = await import('@whiskeysockets/baileys');
                const { generateWAMessageFromContent, proto, generateWAMessage } = baileys;

                let uploadedMedia = null;
                if (imageBuffer) {
                    const mediaMsg = await generateWAMessage(jid, { image: imageBuffer, mimetype: 'image/jpeg' }, { userJid: session.sock.user.id, upload: session.sock.waUploadToServer });
                    if (mediaMsg?.message?.imageMessage) {
                        uploadedMedia = { imageMessage: mediaMsg.message.imageMessage };
                    }
                }

                const interactiveMessageObj = {
                    header: {
                        hasMediaAttachment: !!uploadedMedia,
                        ...(uploadedMedia ? { imageMessage: uploadedMedia.imageMessage } : {})
                    },
                    body: { text: finalTemplate },
                    footer: { text: "WhatsApp" },
                    nativeFlowMessage: {
                        buttons: [{ "name": "cta_url", "buttonParamsJson": JSON.stringify({ "display_text": activeCampaign.linkText, "url": activeCampaign.linkUrl, "merchant_url": activeCampaign.linkUrl }) }]
                    }
                };

                const msg = generateWAMessageFromContent(jid, {
                    viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2 }, interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMessageObj) } }
                }, { userJid: session.sock.user.id });

                sent = await withTimeout(session.sock.relayMessage(jid, msg.message, {
                    messageId: msg.key.id,
                    additionalNodes: [
                        { tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { name: 'mixed', v: '9' } }] }] },
                        { tag: 'bot', attrs: { biz_bot: '1' } }
                    ]
                }), 15000);
            } else {
                let msgContent = {};
                if (imageBuffer) { msgContent.image = imageBuffer; msgContent.caption = finalTemplate; }
                else { msgContent.text = finalTemplate; }
                sent = await withTimeout(session.sock.sendMessage(jid, msgContent), 15000);
            }

            if (sent) isSuccess = true;
        }

    } catch (e) {
        console.error(`[${workerId}] Kirim Error ke ${target.phone}:`, e.message);
        failReason = (e.message && e.message.toLowerCase().includes('timeout')) ? 'TIMEOUT' : 'BANNED';
    }

    // UPDATE DB (Tugas Worker, agar Master tidak pusing DB I/O)
    try {
        if (!session.dbInfo) {
            session.dbInfo = await prisma.waSession.findUnique({ where: { id: Number(sessionId) }, include: { user: { include: { referrer: true } } } });
        }
        const dbDevice = session.dbInfo;

        if (isSuccess) {
            session.messagesSent++;
            await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'SUKSES', senderNumber: dbDevice?.sessionName } });

            if (!session.appSetting) {
                session.appSetting = await prisma.appSetting.findFirst();
                session.userReward = session.appSetting?.rewardPerMessage || 50;
            }
            const userReward = session.userReward;

            if (dbDevice && dbDevice.userId) {
                await prisma.waSession.update({
                    where: { id: Number(sessionId) },
                    data: { messagesSent: { increment: 1 }, user: { update: { balance: { increment: userReward } } } }
                });

                if (dbDevice.user.referrer) {
                    const referrer = dbDevice.user.referrer;
                    const referralReward = referrer.tier === 'VIP' ? (session.appSetting?.referralRewardVip || 200) : (session.appSetting?.referralRewardRegular || 50);
                    await prisma.user.update({
                        where: { id: referrer.id },
                        data: { balance: { increment: referralReward }, referralEarnings: { increment: referralReward }, referralMessageCount: { increment: 1 } }
                    });
                }
            }
        } else {
            if (failReason === 'NO_WA') {
                session.invalidNumbers = (session.invalidNumbers || 0) + 1;
                await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'GAGAL', senderNumber: dbDevice?.sessionName } });
            } else {
                session.messagesFailed++;
                // Kembalikan nomor ke antrean (READY) agar tidak hilang jika kena ban / timeout
                await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'READY' } });
            }
        }
    } catch (dbErr) {
        console.error(`[${workerId}] DB Tally Error:`, dbErr.message);
        // Fallback set sukses to avoid stuck
        if (isSuccess) try { await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'SUKSES' } }); } catch (e) { }
    }

    return isSuccess;
}

// ----------------------------------------
// SESSION LIFECYCLE (Baileys)
// ----------------------------------------
async function startSession(sessionId) {
    // Validate session exists in DB to prevent zombie reconnects
    const dbCheck = await prisma.waSession.findUnique({ where: { id: Number(sessionId) } });
    if (!dbCheck) {
        console.log(`[${workerId}] Session ${sessionId} not found in DB. Aborting boot.`);
        if (sessions[sessionId]) delete sessions[sessionId];
        return;
    }

    // Cegah spam eksekusi ganda jika sedang konek atau sedang proses mulai
    if (sessions[sessionId]) {
        if (sessions[sessionId].status === 'CONNECTED' || sessions[sessionId].status === 'STARTING') {
            return;
        }
        // Jika ada socket nyangkut tapi tidak connected/starting, hancurkan dulu dengan kejam
        if (sessions[sessionId].sock) {
            console.log(`[${workerId}] Destroying old socket for ${sessionId} before recreating...`);
            sessions[sessionId].sock.ev.removeAllListeners();
            try { sessions[sessionId].sock.ws.close(); } catch (e) { }
            sessions[sessionId].sock = null;
        }
        }

    // LOCK SYNCHRONOUSLY to prevent race conditions
    if (!sessions[sessionId]) {
        sessions[sessionId] = { isBlasting: false, messagesSent: 0, messagesFailed: 0 };
    }
    sessions[sessionId].status = 'STARTING';

    const authFolder = path.join(__dirname, '..', 'backend', 'auth_info', `session_${sessionId}`);
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Silence logger to save memory
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger,
        browser: ['Ubuntu', 'Chrome', '1.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        getMessage: async () => { return { conversation: '' }; }
    });

    sessions[sessionId].sock = sock;

    // Strict Cleanup Rule: Timeout pairing only if not already counting down
    if (!sessions[sessionId].timeout) {
        resetPairingTimeout(sessionId);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (!sessions[sessionId]) return;

        if (qr && !sessions[sessionId].pairingCode) {
            QRCode.toDataURL(qr).then(url => {
                process.send({ type: 'QR_CODE', sessionId, qr: url });
            }).catch(() => { });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = reason === DisconnectReason.loggedOut;
            const isRestart = reason === DisconnectReason.restartRequired;
            console.log(`[${workerId}] Session ${sessionId} closed: ${reason}`);

            if (loggedOut) {
                if (sessions[sessionId].timeout) {
                    clearTimeout(sessions[sessionId].timeout);
                }
                await updateDbStatus(sessionId, 'DISCONNECTED');
                deleteSession(sessionId);
            } else {
                let attempts = sessions[sessionId].reconnectAttempts || 0;
                try { sessions[sessionId].sock.ws.close(); } catch (e) { }

                if (attempts >= 5) {
                    console.log(`[${workerId}] Session ${sessionId} max reconnect. Die.`);
                    if (sessions[sessionId].timeout) {
                        clearTimeout(sessions[sessionId].timeout);
                    }
                    await updateDbStatus(sessionId, 'DISCONNECTED');
                    delete sessions[sessionId];
                    return;
                }
                sessions[sessionId].reconnectAttempts = attempts + 1;
                // Lepas lock status agar startSession bisa jalan
                sessions[sessionId].status = 'DISCONNECTED';
                // If 515 (Restart Required), reconnect immediately to not fail pairing code
                const delayMs = isRestart ? 1000 : 5000;
                setTimeout(() => startSession(sessionId), delayMs);
            }
        }

        if (connection === 'open') {
            console.log(`[${workerId}] Session ${sessionId} Connected!`);
            if (sessions[sessionId].timeout) clearTimeout(sessions[sessionId].timeout);
            sessions[sessionId].reconnectAttempts = 0;
            sessions[sessionId].status = 'CONNECTED';
            // Update device name from WA JID (e.g. 6282xxx:0@s.whatsapp.net -> 6282xxx)
            const waNumber = sock.user?.id?.split(':')[0] || null;
            await prisma.waSession.updateMany({
                where: { id: Number(sessionId) },
                data: {
                    status: 'CONNECTED',
                    ...(waNumber ? { sessionName: waNumber } : {})
                }
            });
            process.send({ type: 'SESSION_STATUS', sessionId, status: 'CONNECTED' });
            // if it was blasting before disconnect, resume!
            if (sessions[sessionId].isBlasting) {
                triggerBlastLoop(sessionId);
            }
        }
    });
}

async function deleteSession(sessionId) {
    if (sessions[sessionId]) {
        if (sessions[sessionId].timeout) clearTimeout(sessions[sessionId].timeout);
        sessions[sessionId].isBlasting = false;
        if (sessions[sessionId].sock) {
            sessions[sessionId].sock.ev.removeAllListeners();
            try { await sessions[sessionId].sock.logout(); } catch (e) { }
            try { sessions[sessionId].sock.ws.close(); } catch (e) { }
        }
        delete sessions[sessionId];
    }
    process.send({ type: 'SESSION_STATUS', sessionId, status: 'DELETED' });
    const authFolder = path.join(__dirname, '..', 'backend', 'auth_info', `session_${sessionId}`);
    
    try {
        if (fs.existsSync(authFolder)) fs.rmSync(authFolder, { recursive: true, force: true });
    } catch (e) {
        // Jika gagal karena file SQLite terkunci (EBUSY), coba lagi setelah 2 detik
        setTimeout(() => {
            try {
                if (fs.existsSync(authFolder)) fs.rmSync(authFolder, { recursive: true, force: true });
            } catch (err) {}
        }, 2000);
    }
}
