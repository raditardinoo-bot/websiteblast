const { redisClient, redisSubscriber } = require('./redisClient');

// In-memory cache of blast states (populated by Worker)
const blastStates = {};
let engineMetrics = {
    mps: 0,
    poolSize: 0,
    activeDevices: 0,
    deviceStats: [],
    lastFillMs: 0,
    lastFillTaken: 0,
    updatedAt: null,
    memory: null
};

redisSubscriber.subscribe('WA_EVENTS', (message) => {
  try {
    const data = JSON.parse(message);
    if (data.type === 'BLAST_STATE') {
      blastStates[data.sessionId] = data.state;
    } else if (data.type === 'ENGINE_METRICS') {
      engineMetrics = {
          mps: data.mps,
          poolSize: data.poolSize,
          activeDevices: data.activeDevices,
          deviceStats: data.deviceStats,
          lastFillMs: data.lastFillMs,
          lastFillTaken: data.lastFillTaken,
          updatedAt: Date.now(),
          memory: engineMetrics.memory // Pertahankan nilai memori
      };
    } else if (data.type === 'MEMORY_PROFILER') {
      engineMetrics.memory = data.data;
    }
  } catch(e) {}
});

const startDeviceBlast = (deviceId, delay = 5000, maxMessages = null) => {
  console.log(`[API BlastService] Requesting Worker to start blast for ${deviceId}`);
  redisClient.publish('WA_COMMANDS', JSON.stringify({ 
    command: 'START_BLAST', 
    sessionId: deviceId, 
    delay, 
    maxMessages 
  }));
};

const stopDeviceBlast = (deviceId) => {
  console.log(`[API BlastService] Requesting Worker to stop blast for ${deviceId}`);
  redisClient.publish('WA_COMMANDS', JSON.stringify({ 
    command: 'STOP_BLAST', 
    sessionId: deviceId 
  }));
};

const getBlastState = (deviceId) => {
  return blastStates[deviceId] || { isBlasting: false };
};

const clearBlastState = (deviceId) => {
  delete blastStates[deviceId];
};

module.exports = {
  blastStates,
  engineMetrics: () => engineMetrics,
  startDeviceBlast,
  stopDeviceBlast,
  getBlastState,
  clearBlastState
};
