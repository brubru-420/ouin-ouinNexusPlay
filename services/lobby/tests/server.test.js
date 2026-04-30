const { test } = require('node:test');
const assert = require('node:assert');

test('génération d\'un lobbyId unique', () => {
    const id1 = `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const id2 = `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    assert.notStrictEqual(id1, id2);
    assert.ok(id1.startsWith('lobby_'));
});

test('validation des paramètres de lobby', () => {
    const validateLobby = (body) => {
        if (!body.name || !body.gameType) return false;
        return true;
    };
    assert.strictEqual(validateLobby({ name: 'Test', gameType: 'chess' }), true);
    assert.strictEqual(validateLobby({ name: 'Test' }), false);
    assert.strictEqual(validateLobby({}), false);
});

test('format du timestamp ISO', () => {
    const ts = new Date().toISOString();
    assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});
