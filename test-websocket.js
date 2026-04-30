const { io } = require('socket.io-client');

const player1 = io('http://localhost:3001');
const player2 = io('http://localhost:3001');

const gameId = 'partie-test-001';

player1.on('connect', () => {
    console.log('[Player 1] Connecté:', player1.id);
    player1.emit('join_game', { gameId });
});

player2.on('connect', () => {
    console.log('[Player 2] Connecté:', player2.id);
    setTimeout(() => player2.emit('join_game', { gameId }), 500);
});

player1.on('action', (data) => {
    console.log(`[Player 1] reçoit l'action de ${data.playerId}:`, data.action);
});

player2.on('action', (data) => {
    console.log(`[Player 2] reçoit l'action de ${data.playerId}:`, data.action);
});

setTimeout(() => {
    console.log('[Player 1] joue: "déplace pièce e2-e4"');
    player1.emit('move', { gameId, action: 'e2-e4' });
}, 1500);

setTimeout(() => {
    console.log('[Player 2] joue: "déplace pièce e7-e5"');
    player2.emit('move', { gameId, action: 'e7-e5' });
}, 2500);

setTimeout(() => {
    console.log('Test terminé.');
    player1.close();
    player2.close();
    process.exit(0);
}, 4000);
