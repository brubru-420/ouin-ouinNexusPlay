#!/bin/bash

# ====================================================
# NEXUSPLAY - SCRIPT DE VALIDATION COMPLÈTE
# Lance tous les tests pour valider le POC
# ====================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

step() {
    echo ""
    echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}═══════════════════════════════════════════════════${NC}"
}

ok() {
    echo -e "${GREEN}  ✓ $1${NC}"
    PASS=$((PASS+1))
}

fail() {
    echo -e "${RED}  ✗ $1${NC}"
    FAIL=$((FAIL+1))
}

warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

# ====================================================
step "1. VÉRIFICATION DE L'ENVIRONNEMENT"
# ====================================================
command -v docker > /dev/null && ok "Docker installé" || fail "Docker manquant"
command -v node > /dev/null && ok "Node.js installé ($(node -v))" || fail "Node manquant"
command -v curl > /dev/null && ok "curl disponible" || fail "curl manquant"
command -v git > /dev/null && ok "Git installé" || fail "Git manquant"

# ====================================================
step "2. STRUCTURE DU PROJET"
# ====================================================
[ -f docker-compose.yml ] && ok "docker-compose.yml présent" || fail "docker-compose.yml manquant"
[ -d services/lobby/src ] && ok "Service Lobby (src/)" || fail "services/lobby/src manquant"
[ -d services/game/src ] && ok "Service Game (src/)" || fail "services/game/src manquant"
[ -f db/init.sql ] && ok "Init SQL présent" || fail "db/init.sql manquant"
[ -d .github/workflows ] && ok "Workflows GitHub Actions" || fail ".github/workflows manquant"
[ -d web ] && ok "Dashboard web présente" || fail "Dossier web manquant"

# ====================================================
step "3. ÉTAT DE LA STACK DOCKER"
# ====================================================
docker compose ps --format json 2>/dev/null | grep -q "running" && ok "Stack Docker active" || warn "Stack pas démarrée → lance 'make start'"

containers=("nexusplay-redis" "nexusplay-postgres" "nexusplay-lobby" "nexusplay-game" "nexusplay-web")
for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "$container"; then
        ok "$container running"
    else
        fail "$container DOWN"
    fi
done

# ====================================================
step "4. HEALTH CHECKS"
# ====================================================
LOBBY=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
GAME=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
WEB=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)

[ "$LOBBY" = "200" ] && ok "Lobby /health → 200" || fail "Lobby health → $LOBBY"
[ "$GAME" = "200" ] && ok "Game /health → 200" || fail "Game health → $GAME"
[ "$WEB" = "200" ] && ok "Dashboard web → 200" || fail "Dashboard → $WEB"

# ====================================================
step "5. TESTS FONCTIONNELS"
# ====================================================

# Test 1 : Création de lobby
RESULT=$(curl -s -X POST http://localhost:3000/lobbies \
    -H "Content-Type: application/json" \
    -d '{"name":"Validation Test","gameType":"chess","maxPlayers":4}')
echo "$RESULT" | grep -q "lobbyId" && ok "POST /lobbies → lobby créé" || fail "POST /lobbies → erreur"

LOBBY_ID=$(echo "$RESULT" | grep -o '"lobbyId":"[^"]*' | cut -d'"' -f4)

# Test 2 : Liste des lobbies
RESULT=$(curl -s http://localhost:3000/lobbies)
echo "$RESULT" | grep -q "count" && ok "GET /lobbies → liste OK" || fail "GET /lobbies → erreur"

# Test 3 : Rejoindre un lobby
if [ -n "$LOBBY_ID" ]; then
    RESULT=$(curl -s -X POST http://localhost:3000/lobbies/$LOBBY_ID/join \
        -H "Content-Type: application/json" \
        -d '{"playerId":"validator"}')
    echo "$RESULT" | grep -q "currentPlayers" && ok "POST /lobbies/:id/join → OK" || fail "Join → erreur"
fi

# Test 4 : Stats PostgreSQL
RESULT=$(curl -s http://localhost:3000/stats)
echo "$RESULT" | grep -q "total_players" && ok "GET /stats → PostgreSQL OK" || fail "Stats → erreur"

# Test 5 : Game active games
RESULT=$(curl -s http://localhost:3001/active-games)
echo "$RESULT" | grep -q "activeGames" && ok "GET /active-games → OK" || fail "Active games → erreur"

# ====================================================
step "6. TESTS UNITAIRES"
# ====================================================
cd services/lobby && npm test > /tmp/test-lobby.log 2>&1
[ $? -eq 0 ] && ok "Tests Lobby passent" || fail "Tests Lobby échouent (voir /tmp/test-lobby.log)"
cd ../..

cd services/game && npm test > /tmp/test-game.log 2>&1
[ $? -eq 0 ] && ok "Tests Game passent" || fail "Tests Game échouent (voir /tmp/test-game.log)"
cd ../..

# ====================================================
step "7. INTÉGRITÉ DES DONNÉES"
# ====================================================
PG_TABLES=$(docker exec nexusplay-postgres psql -U nexusplay -d nexusplay -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
[ "$PG_TABLES" = "3" ] && ok "PostgreSQL : 3 tables créées (players, games, game_players)" || fail "PostgreSQL : tables manquantes"

PG_PLAYERS=$(docker exec nexusplay-postgres psql -U nexusplay -d nexusplay -tAc "SELECT count(*) FROM players")
[ "$PG_PLAYERS" -ge "3" ] && ok "PostgreSQL : $PG_PLAYERS joueurs en base" || fail "Données initiales manquantes"

REDIS_KEYS=$(docker exec nexusplay-redis redis-cli DBSIZE)
ok "Redis : $REDIS_KEYS clés actives"

# ====================================================
step "8. PIPELINE CI/CD"
# ====================================================
[ -f .github/workflows/ci.yml ] && ok "Workflow CI présent (ci.yml)" || fail "ci.yml manquant"
[ -f .github/workflows/deploy.yml.disabled ] && ok "Workflow deploy préparé (.disabled pour POC)" || warn "deploy.yml absent"

if git remote -v | grep -q "github.com"; then
    REMOTE=$(git remote -v | grep fetch | awk '{print $2}')
    ok "Repo GitHub configuré : $REMOTE"
else
    warn "Pas de remote GitHub configuré"
fi

# ====================================================
step "9. ARTÉFACTS DE VALIDATION"
# ====================================================
[ -f load-tests/results-after-opti.txt ] && ok "Résultats load test sauvegardés" || warn "Pas de résultats load test"
[ -f README.md ] && ok "README.md présent" || warn "README.md manquant"
[ -f Makefile ] && ok "Makefile présent" || warn "Makefile manquant"

# ====================================================
# RÉSUMÉ FINAL
# ====================================================
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}                  RÉSUMÉ FINAL                     ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}  ✓ Tests réussis : $PASS${NC}"
echo -e "${RED}  ✗ Tests échoués : $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  🎉 PROJET VALIDÉ — Tous les checks passent !${NC}"
    echo ""
    echo -e "${BLUE}  Pour la démo orale :${NC}"
    echo -e "    1. Ouvre la dashboard : http://localhost:8080"
    echo -e "    2. Clique sur '🚀 Tout tester' pour la démo en live"
    echo -e "    3. Repo GitHub : https://github.com/brubru-420/ouin-ouinNexusPlay"
    echo ""
    exit 0
else
    echo -e "${RED}${BOLD}  ⚠️  $FAIL problème(s) détecté(s) — Corrige avant la démo !${NC}"
    echo ""
    exit 1
fi
