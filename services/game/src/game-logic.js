function handleGameAction(gameId, action, playerId) {
    return {
        gameId,
        action,
        playerId,
        timestamp: Date.now(),
        valid: true,
    };
}

module.exports = { handleGameAction };
