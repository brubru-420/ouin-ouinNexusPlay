const { test } = require('node:test');
const assert = require('node:assert');
const { handleGameAction } = require('../src/game-logic');

test('handleGameAction retourne un résultat valide', () => {
    const result = handleGameAction('game1', 'move', 'player1');
    assert.strictEqual(result.gameId, 'game1');
    assert.strictEqual(result.valid, true);
    assert.ok(result.timestamp);
});
