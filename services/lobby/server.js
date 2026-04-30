const express = require('express');
const Redis = require('ioredis');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const serviceName = 'lobby';
const region = process.env.AWS_REGION || 'us-east-1';

// Redis pour les lobbies temps réel
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
    lazyConnect: true,
});

// PostgreSQL pour les données persistantes
const pgPool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'nexusplay',
    port: 5432,
    max: 10,
});

// Health check pour ALB
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: serviceName });
});

// Lister les lobbies actifs (depuis Redis)
app.get('/lobbies', async (req, res) => {
    try {
        const lobbies = await redis.smembers('active:lobbies');
        res.json({ count: lobbies.length, lobbies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Créer un lobby
app.post('/lobbies', async (req, res) => {
    const { name, gameType } = req.body;
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
        await redis.sadd('active:lobbies', lobbyId);
        await redis.hset(`lobby:${lobbyId}`, { name, gameType, players: 0, createdAt: Date.now() });
        await redis.expire(`lobby:${lobbyId}`, 3600);
        res.status(201).json({ lobbyId, name, gameType });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stats globales (RDS)
app.get('/stats', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT COUNT(*) AS total_players FROM players');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message, hint: 'DB pas initialisée ?' });
    }
});

app.listen(port, () => console.log(`[${serviceName}] running on :${port}`));
