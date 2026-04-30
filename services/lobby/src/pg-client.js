const { Pool } = require('pg');

let pgPool = null;

function getPg() {
    if (!pgPool) {
        pgPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            user: process.env.DB_USER || 'nexusplay',
            password: process.env.DB_PASSWORD || 'nexusplay',
            database: process.env.DB_NAME || 'nexusplay',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            statement_timeout: 5000,
        });
        pgPool.on('error', (err) => {
            console.error('[pg] pool error:', err.message);
        });
    }
    return pgPool;
}

async function isPgHealthy() {
    try {
        const pg = getPg();
        await pg.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

module.exports = { getPg, isPgHealthy };
