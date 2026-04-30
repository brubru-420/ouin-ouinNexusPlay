// Configuration des endpoints
const LOBBY_URL = 'http://localhost:3000';
const GAME_URL = 'http://localhost:3001';

// Cache d'état
let state = {
    lastLobbyId: null,
    healthInterval: null,
};

// ============================================
// LOGS
// ============================================
function log(message, type = 'info') {
    const console = document.getElementById('console');
    const time = new Date().toLocaleTimeString('fr-FR');
    const icon = { info: 'ℹ', success: '✓', error: '✗', warn: '⚠' }[type] || '·';
    const line = `<span class="log-time">[${time}]</span> <span class="log-${type}">${icon} ${message}</span>\n`;
    console.innerHTML += line;
    console.scrollTop = console.scrollHeight;
}

function clearLogs() {
    document.getElementById('console').innerHTML = '';
    log('Logs effacés', 'info');
}

// ============================================
// HEALTH CHECKS
// ============================================
async function checkLobbyHealth() {
    try {
        const res = await fetch(`${LOBBY_URL}/health`);
        const data = await res.json();
        
        document.getElementById('lobby-status').textContent = data.status;
        document.getElementById('lobby-status').className = `value ${data.status === 'ok' ? 'ok' : 'ko'}`;
        document.getElementById('lobby-redis').textContent = data.checks.redis ? '✓ OK' : '✗ KO';
        document.getElementById('lobby-redis').className = `value ${data.checks.redis ? 'ok' : 'ko'}`;
        document.getElementById('lobby-postgres').textContent = data.checks.postgres ? '✓ OK' : '✗ KO';
        document.getElementById('lobby-postgres').className = `value ${data.checks.postgres ? 'ok' : 'ko'}`;
        document.getElementById('lobby-version').textContent = data.version;
        document.getElementById('lobby-card').className = `service-card ${data.status === 'ok' ? 'healthy' : 'unhealthy'}`;
        
        return data.status === 'ok';
    } catch (err) {
        document.getElementById('lobby-status').textContent = 'DOWN';
        document.getElementById('lobby-status').className = 'value ko';
        document.getElementById('lobby-card').className = 'service-card unhealthy';
        return false;
    }
}

async function checkGameHealth() {
    try {
        const res = await fetch(`${GAME_URL}/health`);
        const data = await res.json();
        
        document.getElementById('game-status').textContent = data.status;
        document.getElementById('game-status').className = `value ${data.status === 'ok' ? 'ok' : 'ko'}`;
        document.getElementById('game-redis').textContent = data.checks.redis ? '✓ OK' : '✗ KO';
        document.getElementById('game-redis').className = `value ${data.checks.redis ? 'ok' : 'ko'}`;
        document.getElementById('game-sockets').textContent = data.sockets;
        document.getElementById('game-version').textContent = data.version;
        document.getElementById('game-card').className = `service-card ${data.status === 'ok' ? 'healthy' : 'unhealthy'}`;
        
        return data.status === 'ok';
    } catch (err) {
        document.getElementById('game-status').textContent = 'DOWN';
        document.getElementById('game-status').className = 'value ko';
        document.getElementById('game-card').className = 'service-card unhealthy';
        return false;
    }
}

async function refreshHealth() {
    log('Vérification de la santé des services...', 'info');
    const lobbyOk = await checkLobbyHealth();
    const gameOk = await checkGameHealth();
    
    const globalDot = document.getElementById('global-status');
    const globalText = document.getElementById('global-status-text');
    
    if (lobbyOk && gameOk) {
        globalDot.className = 'status-dot healthy';
        globalText.textContent = 'Tous les services sont opérationnels';
        log('Tous les services sont opérationnels', 'success');
    } else if (lobbyOk || gameOk) {
        globalDot.className = 'status-dot unhealthy';
        globalText.textContent = 'Service partiellement indisponible';
        log('Service partiellement indisponible', 'warn');
    } else {
        globalDot.className = 'status-dot unhealthy';
        globalText.textContent = 'Tous les services sont DOWN';
        log('Tous les services sont DOWN', 'error');
    }
}

// ============================================
// TESTS
// ============================================
function showResult(testId, success, message) {
    const item = document.querySelector(`[data-test="${testId}"]`);
    const result = document.getElementById(`result-${testId}`);
    
    item.classList.remove('running', 'success', 'error');
    item.classList.add(success ? 'success' : 'error');
    
    result.classList.add('visible', success ? 'success' : 'error');
    result.textContent = message;
}

function setRunning(testId) {
    const item = document.querySelector(`[data-test="${testId}"]`);
    item.classList.remove('success', 'error');
    item.classList.add('running');
    
    const result = document.getElementById(`result-${testId}`);
    result.classList.add('visible');
    result.classList.remove('success', 'error');
    result.textContent = '⏳ En cours...';
}

async function testCreateLobby() {
    setRunning('create-lobby');
    log('Test : créer un lobby...', 'info');
    
    try {
        const t0 = performance.now();
        const res = await fetch(`${LOBBY_URL}/lobbies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `Lobby Démo ${Date.now()}`,
                gameType: 'chess',
                maxPlayers: 4,
            }),
        });
        const elapsed = (performance.now() - t0).toFixed(0);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.lastLobbyId = data.lobbyId;
        
        const msg = `✓ Lobby créé en ${elapsed}ms · ID: ${data.lobbyId}`;
        showResult('create-lobby', true, msg);
        log(msg, 'success');
    } catch (err) {
        const msg = `✗ Erreur : ${err.message}`;
        showResult('create-lobby', false, msg);
        log(msg, 'error');
    }
}

async function testListLobbies() {
    setRunning('list-lobbies');
    log('Test : lister les lobbies...', 'info');
    
    try {
        const t0 = performance.now();
        const res = await fetch(`${LOBBY_URL}/lobbies`);
        const elapsed = (performance.now() - t0).toFixed(0);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const msg = `✓ ${data.count} lobbies récupérés en ${elapsed}ms (Redis pipeline)`;
        showResult('list-lobbies', true, msg);
        log(msg, 'success');
    } catch (err) {
        const msg = `✗ Erreur : ${err.message}`;
        showResult('list-lobbies', false, msg);
        log(msg, 'error');
    }
}

async function testJoinLobby() {
    setRunning('join-lobby');
    log('Test : rejoindre un lobby...', 'info');
    
    if (!state.lastLobbyId) {
        log('Création d\'un lobby au préalable...', 'info');
        await testCreateLobby();
    }
    
    try {
        const t0 = performance.now();
        const res = await fetch(`${LOBBY_URL}/lobbies/${state.lastLobbyId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: `player_${Date.now()}` }),
        });
        const elapsed = (performance.now() - t0).toFixed(0);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const msg = `✓ Joueur ajouté en ${elapsed}ms · ${data.currentPlayers} joueurs dans le lobby`;
        showResult('join-lobby', true, msg);
        log(msg, 'success');
    } catch (err) {
        const msg = `✗ Erreur : ${err.message}`;
        showResult('join-lobby', false, msg);
        log(msg, 'error');
    }
}

async function testStats() {
    setRunning('stats');
    log('Test : récupérer les stats...', 'info');
    
    try {
        const t0 = performance.now();
        const res = await fetch(`${LOBBY_URL}/stats`);
        const elapsed = (performance.now() - t0).toFixed(0);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const msg = `✓ Stats en ${elapsed}ms · ${data.total_players} joueurs · ${data.games_played} parties (PostgreSQL)`;
        showResult('stats', true, msg);
        log(msg, 'success');
    } catch (err) {
        const msg = `✗ Erreur : ${err.message}`;
        showResult('stats', false, msg);
        log(msg, 'error');
    }
}

async function testWebSocket() {
    setRunning('websocket');
    log('Test : connexion WebSocket...', 'info');
    
    return new Promise((resolve) => {
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = () => {
                const socket = io(GAME_URL, { transports: ['websocket', 'polling'] });
                let connected = false;
                
                const timeout = setTimeout(() => {
                    if (!connected) {
                        socket.close();
                        const msg = '✗ Timeout WebSocket (10s)';
                        showResult('websocket', false, msg);
                        log(msg, 'error');
                        resolve();
                    }
                }, 10000);
                
                socket.on('connect', () => {
                    connected = true;
                    clearTimeout(timeout);
                    
                    const gameId = `game_demo_${Date.now()}`;
                    socket.emit('join_game', { gameId, playerId: 'player_demo' });
                    
                    setTimeout(() => {
                        socket.emit('action', { gameId, action: 'move_e2_e4', playerId: 'player_demo' });
                    }, 500);
                });
                
                socket.on('player_joined', (data) => {
                    log(`WebSocket : événement player_joined reçu`, 'success');
                });
                
                socket.on('action_result', (data) => {
                    const msg = `✓ WebSocket OK · Connection établie + action reçue`;
                    showResult('websocket', true, msg);
                    log(msg, 'success');
                    socket.close();
                    resolve();
                });
                
                socket.on('connect_error', (err) => {
                    clearTimeout(timeout);
                    const msg = `✗ Erreur WebSocket : ${err.message}`;
                    showResult('websocket', false, msg);
                    log(msg, 'error');
                    resolve();
                });
            };
            script.onerror = () => {
                const msg = '✗ Impossible de charger Socket.IO client';
                showResult('websocket', false, msg);
                log(msg, 'error');
                resolve();
            };
            document.head.appendChild(script);
        } catch (err) {
            const msg = `✗ Erreur : ${err.message}`;
            showResult('websocket', false, msg);
            log(msg, 'error');
            resolve();
        }
    });
}

async function runAllTests() {
    setRunning('all');
    log('═══════════════════════════════════════', 'info');
    log('LANCEMENT DE TOUS LES TESTS', 'info');
    log('═══════════════════════════════════════', 'info');
    
    await testCreateLobby();
    await new Promise(r => setTimeout(r, 300));
    
    await testListLobbies();
    await new Promise(r => setTimeout(r, 300));
    
    await testJoinLobby();
    await new Promise(r => setTimeout(r, 300));
    
    await testStats();
    await new Promise(r => setTimeout(r, 300));
    
    await testWebSocket();
    
    log('═══════════════════════════════════════', 'info');
    log('TOUS LES TESTS TERMINÉS', 'success');
    log('═══════════════════════════════════════', 'info');
    
    showResult('all', true, '✓ Tous les tests exécutés (voir résultats ci-dessus)');
}

// ============================================
// INIT
// ============================================
window.addEventListener('DOMContentLoaded', async () => {
    log('Dashboard NexusPlay chargé', 'info');
    log('Endpoints : Lobby=:3000 · Game=:3001', 'info');
    
    await refreshHealth();
    
    // Refresh auto toutes les 10s
    state.healthInterval = setInterval(refreshHealth, 10000);
});
