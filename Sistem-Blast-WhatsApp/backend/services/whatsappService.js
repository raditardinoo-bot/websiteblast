const { redisClient, redisSubscriber } = require('./redisClient');

// In-memory cache for the API server (populated by Redis events from Worker)
const sessions = {};
const pendingPairingRequests = {};

function setupEventListeners() {
  redisSubscriber.subscribe('WA_EVENTS', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'PAIRING_CODE') {
        if (pendingPairingRequests[data.sessionId]) {
          pendingPairingRequests[data.sessionId](data.code);
          delete pendingPairingRequests[data.sessionId];
        }
        return;
      }

      if (!sessions[data.sessionId]) {
        sessions[data.sessionId] = {};
      }

      if (data.type === 'QR') {
        sessions[data.sessionId].qrCode = data.qr;
        sessions[data.sessionId].status = 'READY_TO_CONNECT';
      } else if (data.type === 'STATUS') {
        sessions[data.sessionId].status = data.status;
        if (data.status === 'CONNECTED') {
          sessions[data.sessionId].qrCode = null;
        }
      }
    } catch (err) {
      console.error('[API WaService] Error parsing WA_EVENTS:', err);
    }
  });
}

const startSession = (sessionId) => {
  console.log(`[API WaService] Requesting Worker to start session ${sessionId}`);
  sessions[sessionId] = { status: 'STARTING', qrCode: null };
  if (redisClient.isOpen) {
    redisClient.publish('WA_COMMANDS', JSON.stringify({ command: 'START_SESSION', sessionId })).catch(e => console.error(e));
  }
};

const deleteSession = (sessionId) => {
  console.log(`[API WaService] Requesting Worker to delete session ${sessionId}`);
  if (redisClient.isOpen) {
    redisClient.publish('WA_COMMANDS', JSON.stringify({ command: 'DELETE_SESSION', sessionId })).catch(e => console.error(e));
  }
  delete sessions[sessionId];
};

const getSessionQR = (sessionId) => {
  return sessions[sessionId]?.qrCode || null;
};

const getSessionStatus = (sessionId) => {
  return sessions[sessionId]?.status || 'OFFLINE';
};

const getPairingCode = (sessionId, phoneNumber) => {
  return new Promise((resolve, reject) => {
    pendingPairingRequests[sessionId] = resolve;
    console.log(`[API WaService] Requesting Worker to generate pairing code for ${sessionId}`);
    if (redisClient.isOpen) {
      redisClient.publish('WA_COMMANDS', JSON.stringify({ 
        command: 'GET_PAIRING_CODE', 
        sessionId, 
        phoneNumber 
      })).catch(e => {
        delete pendingPairingRequests[sessionId];
        reject(new Error("Redis Publish Error"));
      });
    } else {
      delete pendingPairingRequests[sessionId];
      reject(new Error("Redis Client Offline"));
    }
    
    setTimeout(() => {
      if (pendingPairingRequests[sessionId]) {
        delete pendingPairingRequests[sessionId];
        reject(new Error("Timeout dari Worker"));
      }
    }, 15000);
  });
};

const initializeSessions = () => {
  setupEventListeners();
  console.log('[API WaService] API Server ready to relay commands to Worker.');
};

module.exports = {
  sessions,
  startSession,
  deleteSession,
  getSessionQR,
  getSessionStatus,
  getPairingCode,
  initializeSessions
};
