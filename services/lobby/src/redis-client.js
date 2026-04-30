const Redis = require('ioredis');

let redisInstance = null;

function getRedis() {
    if (!redisInstance) {
        redisInstance = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => Math.min(times * 200, 2000),
            maxRetriesPerRequest: 3,
        });
        redisInstance.on('error', (err) => {
            console.error('[redis] error:', err.message);
        });
    }
    return redisInstance;
}

async function isRedisHealthy() {
    try {
        const r = getRedis();
        const pong = await r.ping();
        return pong === 'PONG';
    } catch {
        return false;
    }
}

module.exports = { getRedis, isRedisHealthy };
