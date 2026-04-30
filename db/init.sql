CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_games INT DEFAULT 0,
    total_wins INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) UNIQUE NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    winner_id INT REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS game_players (
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    PRIMARY KEY (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at DESC);

-- Données de démo
INSERT INTO players (username, email) VALUES
    ('alice', 'alice@nexusplay.com'),
    ('bob', 'bob@nexusplay.com'),
    ('charlie', 'charlie@nexusplay.com')
ON CONFLICT DO NOTHING;
