#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

URL_LOBBY="http://localhost:3000"
URL_GAME="http://localhost:3001"
DURATION=30
THREADS=4
CONNECTIONS=20

echo "═══════════════════════════════════════════════════════"
echo "   NEXUSPLAY - TEST DE CHARGE WRK"
echo "   Date  : $(date)"
echo "   Config: ${THREADS} threads × ${CONNECTIONS} connexions × ${DURATION}s"
echo "═══════════════════════════════════════════════════════"

echo ""
echo -e "${BLUE}[1/5] Health check Lobby${NC}"
echo "      Cible : $URL_LOBBY/health"
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s --latency $URL_LOBBY/health

echo ""
echo -e "${BLUE}[2/5] List lobbies (lecture Redis)${NC}"
echo "      Cible : $URL_LOBBY/lobbies"
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s --latency $URL_LOBBY/lobbies

echo ""
echo -e "${BLUE}[3/5] Stats globales (lecture PostgreSQL)${NC}"
echo "      Cible : $URL_LOBBY/stats"
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s --latency $URL_LOBBY/stats

echo ""
echo -e "${BLUE}[4/5] Create lobby (écriture Redis)${NC}"
echo "      Cible : $URL_LOBBY/lobbies (POST)"
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s --latency -s post-lobby.lua $URL_LOBBY/lobbies

echo ""
echo -e "${BLUE}[5/5] Health check Game${NC}"
echo "      Cible : $URL_GAME/health"
wrk -t${THREADS} -c${CONNECTIONS} -d${DURATION}s --latency $URL_GAME/health

echo ""
echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}   ✓ TEST DE CHARGE TERMINÉ${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Métriques clés à analyser :"
echo "  • Requests/sec     : débit total"
echo "  • Latency p50      : médiane (50% des req)"
echo "  • Latency p99      : pire cas (1% des req)"
echo "  • Non-2xx errors   : taux d'erreur"
