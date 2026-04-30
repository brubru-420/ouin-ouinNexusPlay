.PHONY: help install dev start stop restart logs logs-lobby logs-game test build health gatling load-test clean

help:
	@echo "NexusPlay - Commandes disponibles"
	@echo ""
	@echo "  make install    - Installer les dépendances locales"
	@echo "  make dev        - Démarrer la stack en mode dev (foreground)"
	@echo "  make start      - Démarrer la stack en background"
	@echo "  make stop       - Arrêter la stack"
	@echo "  make restart    - Redémarrer la stack"
	@echo "  make logs       - Suivre tous les logs"
	@echo "  make logs-lobby - Suivre les logs du service Lobby"
	@echo "  make logs-game  - Suivre les logs du service Game"
	@echo "  make test       - Lancer les tests unitaires"
	@echo "  make build      - Builder les images Docker"
	@echo "  make health     - Vérifier la santé des services"
	@echo "  make load-test  - Lancer le test de charge (wrk)"
	@echo "  make clean      - Nettoyer (volumes + images)"

install:
	cd services/lobby && npm install
	cd services/game && npm install

dev:
	docker compose up --build

start:
	docker compose up -d --build

stop:
	docker compose down

restart: stop start

logs:
	docker compose logs -f

logs-lobby:
	docker compose logs -f lobby

logs-game:
	docker compose logs -f game

test:
	cd services/lobby && npm test
	cd services/game && npm test

build:
	docker compose build

health:
	@echo "=== Lobby Service ==="
	@curl -s http://localhost:3000/health | python3 -m json.tool || echo "DOWN"
	@echo ""
	@echo "=== Game Service ==="
	@curl -s http://localhost:3001/health | python3 -m json.tool || echo "DOWN"

load-test:
	@echo "═══════════════════════════════════════════"
	@echo "  Test de charge wrk - NexusPlay"
	@echo "═══════════════════════════════════════════"
	@which wrk > /dev/null || (echo "❌ wrk non installé : brew install wrk" && exit 1)
	@curl -sf http://localhost:3000/health > /dev/null || (echo "❌ Lobby pas joignable - lance 'make start' d'abord" && exit 1)
	@cd load-tests && ./run-load-test.sh

# Alias pour compatibilité
gatling: load-test

clean:
	docker compose down -v
	docker system prune -f
	rm -rf gatling-js/node_modules gatling-js/target gatling-bin
