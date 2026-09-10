const redis = require('redis');

// -------------------------------------------------------
// Shared subscriber registry (shared between mock clients)
// -------------------------------------------------------
const _mockSubscribers = {};

function _mockPublish(channel, message) {
  if (_mockSubscribers[channel]) {
    _mockSubscribers[channel].forEach(cb => {
      try { cb(message); } catch(e) {}
    });
  }
  return Promise.resolve(1);
}

function _mockSubscribe(channel, callback) {
  if (!_mockSubscribers[channel]) _mockSubscribers[channel] = [];
  _mockSubscribers[channel].push(callback);
  return Promise.resolve();
}

// Start with mock clients so require() never throws
const redisClient = {
  isOpen: true,
  publish: _mockPublish,
  subscribe: _mockSubscribe,
  on: () => {},
  _isMock: true
};

const redisSubscriber = {
  isOpen: true,
  publish: _mockPublish,
  subscribe: _mockSubscribe,
  on: () => {},
  _isMock: true
};

async function initRedis() {
  try {
    const realClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000,
        keepAlive: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Max Redis reconnects exceeded');
          return Math.min(retries * 500, 3000);
        }
      }
    });

    realClient.on('error', (err) => console.error('[Redis Client] Error:', err.message));
    await realClient.connect();

    const realSubscriber = realClient.duplicate();
    realSubscriber.on('error', (err) => console.error('[Redis Subscriber] Error:', err.message));
    await realSubscriber.connect();

    // Upgrade mock objects in-place so all existing references are updated
    Object.assign(redisClient, {
      isOpen: true,
      publish: (ch, msg) => realClient.publish(ch, msg).catch(e => console.error('[Redis] Publish error:', e.message)),
      subscribe: (ch, cb) => realSubscriber.subscribe(ch, cb),
      on: (ev, cb) => realClient.on(ev, cb),
      _isMock: false,
      _real: realClient
    });

    Object.assign(redisSubscriber, {
      isOpen: true,
      publish: (ch, msg) => realClient.publish(ch, msg).catch(e => console.error('[Redis] Publish error:', e.message)),
      subscribe: (ch, cb) => realSubscriber.subscribe(ch, cb),
      on: (ev, cb) => realSubscriber.on(ev, cb),
      _isMock: false,
      _real: realSubscriber
    });

    // Transfer mock subscribers to real subscriber
    for (const channel in _mockSubscribers) {
      _mockSubscribers[channel].forEach(cb => {
        realSubscriber.subscribe(channel, cb).catch(e => console.error('[Redis] Re-subscribe error:', e.message));
      });
    }

    console.log('[Redis] Connected to Redis server successfully.');
  } catch (e) {
    console.warn('[Redis] Redis unavailable, using in-memory fallback (local dev mode).');
  }
}


module.exports = { redisClient, redisSubscriber, initRedis };

