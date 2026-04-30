const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { getRedis, isRedisHealthy } = require('./redis-client');
const { getPg, isPgHealthy } = require('./pg-client');

const SERVICE_NAME = 'lobby';
const PORT = parseInt(process.env.PORT || '3000', 10);
const VERSION = process.env.APP_VERSION || 'dev';

const logger = pino({
    name: SERVICE_NAME,
    level: process.env.LOG_LEVEL || 'info',
});

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger }));

// =========================
// Health checks (pour ALB)
// =========================
app.get('/health', async (req, res) => {
    const redisOk = await isRedisHealthy();
    const pgOk = await isPgHealthy();
    const healthy = redisOk && pgOk;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        service: SERVICE_NAME,
        version: VERSION,
        checks: { redis: redisOk, postgres: pgOk },
        timestamp: new Date().toISOString(),
    });
});

// Liveness (juste : « le process tourne ? »)
app.get('/live', (req, res) => {
    res.json({ status: 'alive', service: SERVICE_NAME });
});

// =========================
// Routes métier
// =========================

// Lister les lobbies actifs
app.get('/lobbies', async (req, res) => {
    try {
        const redis = getRedis();
        const lobbyIds = await redis.smembers('active:lobbies');
        
        if (lobbyIds.length === 0) {
            return res.json({ count: 0, lobbies: [] });
        }
        
        // Pipeline : batch toutes les requêtes en une seule connexion
        const pipeline = redis.pipeline();
        lobbyIds.forEach(id => pipeline.hgetall(`lobby:${id}`));
        const results = await pipeline.exec();
        
        const lobbies = lobbyIds.map((id, i) => ({
            id,
            ...(results[i][1] || {}),
        }));
        
        res.json({ count: lobbies.length, lobbies });
    } catch (err) {
        logger.error({ err }, 'Failed to list lobbies');
        res.status(500).json({ error: 'internal_error' });
    }
});
// Créer un lobby
app.post('/lobbies', async (req, res) => {
    const { name, gameType, maxPlayers = 4 } = req.body;
    if (!name || !gameType) {
        return res.status(400).json({ error: 'name and gameType required' });
    }
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
        const redis = getRedis();
        await redis.sadd('active:lobbies', lobbyId);
        await redis.hset(`lobby:${lobbyId}`, {
            name,
            gameType,
            maxPlayers,
            currentPlayers: 0,
            createdAt: Date.now(),
            status: 'waiting',
        });
        await redis.expire(`lobby:${lobbyId}`, 3600);
        logger.info({ lobbyId, name, gameType }, 'Lobby created');
        res.status(201).json({ lobbyId, name, gameType, maxPlayers });
    } catch (err) {
        logger.error({ err }, 'Failed to create lobby');
        res.status(500).json({ error: 'internal_error' });
    }
});

// Rejoindre un lobby
app.post('/lobbies/:id/join', async (req, res) => {
    const { id } = req.params;
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'playerId required' });
    }
    try {
        const redis = getRedis();
        const exists = await redis.sismember('active:lobbies', id);
        if (!exists) {
            return res.status(404).json({ error: 'lobby_not_found' });
        }
        await redis.sadd(`lobby:${id}:players`, playerId);
        const count = await redis.scard(`lobby:${id}:players`);
        await redis.hset(`lobby:${id}`, { currentPlayers: count });
        logger.info({ lobbyId: id, playerId }, 'Player joined lobby');
        res.json({ lobbyId: id, currentPlayers: count });
    } catch (err) {
        logger.error({ err }, 'Failed to join lobby');
        res.status(500).json({ error: 'internal_error' });
    }
});

// Stats globales (PostgreSQL)
app.get('/stats', async (req, res) => {
    try {
        const pg = getPg();
        const result = await pg.query(`
            SELECT
                (SELECT COUNT(*) FROM players) AS total_players,
                (SELECT COUNT(*) FROM games WHERE status = 'completed') AS games_played
        `);
        res.json(result.rows[0]);
    } catch (err) {
        logger.warn({ err: err.message }, 'Stats query failed (DB may not be initialized)');
        res.status(200).json({
            total_players: 0,
            games_played: 0,
            note: 'DB not initialized - returning defaults',
        });
    }
});

// =========================
// Démarrage
// =========================
const server = app.listen(PORT, () => {
    logger.info({ port: PORT, version: VERSION }, `${SERVICE_NAME} service started`);
});

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
