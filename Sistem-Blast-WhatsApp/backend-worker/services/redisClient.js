const redis = require('redis');

const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    keepAlive: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('[Redis] Max reconnect attempts reached.');
        return new Error('Max Redis reconnects exceeded');
      }
      return Math.min(retries * 500, 3000); // exponential backoff
    }
  }
};

const redisClient = redis.createClient(redisConfig);
const redisSubscriber = redisClient.duplicate(redisConfig);

redisClient.on('error', (err) => console.error('[Redis Client] Error:', err));
redisSubscriber.on('error', (err) => console.error('[Redis Subscriber] Error:', err));

async function initRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
  if (!redisSubscriber.isOpen) await redisSubscriber.connect();
  console.log('[Redis] Connected successfully');
}

module.exports = {
  redisClient,
  redisSubscriber,
  initRedis
};
