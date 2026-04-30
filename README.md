# 🎮 NexusPlay — Architecture Cloud-Native POC

> **Plateforme multijoueur 24/7 — Architecture microservices haute disponibilité sur AWS**
>
> POC réalisé dans le cadre du Master 2 · Architecture cible AWS · Maquette fonctionnelle Docker

[![CI Status](https://github.com/brubru-420/ouin-ouinNexusPlay/actions/workflows/ci.yml/badge.svg)](https://github.com/brubru-420/ouin-ouinNexusPlay/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![AWS](https://img.shields.io/badge/AWS-Cloud_Native-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com)

---

## 📋 Sommaire

1. [Contexte et objectifs](#-contexte-et-objectifs)
2. [Architecture cible AWS](#-architecture-cible-aws)
3. [Stack technique](#-stack-technique)
4. [Prérequis](#-prérequis)
5. [Démarrage rapide](#-démarrage-rapide)
6. [Dashboard de validation](#-dashboard-de-validation)
7. [Commandes utiles](#-commandes-utiles)
8. [Tests et validation](#-tests-et-validation)
9. [Pipeline CI/CD](#-pipeline-cicd)
10. [Test de charge et optimisations](#-test-de-charge-et-optimisations)
11. [Mapping des contraintes du brief](#-mapping-des-contraintes-du-brief)
12. [Roadmap d'amélioration](#-roadmap-damélioration)

---

## 🎯 Contexte et objectifs

**NexusPlay** est une startup ambitieuse lançant une plateforme de mini-jeux multijoueurs disponible 24/7. Trois enjeux pilotent toute l'architecture :

| Enjeu | Implication technique |
|-------|----------------------|
| **Disponibilité 24/7** | Multi-AZ obligatoire, failover automatique, zéro downtime |
| **Trafic croissant avec pics** | Auto-scaling élastique, infrastructure cloud-native |
| **Expérience temps réel fluide** | WebSocket, cache mémoire, latence sub-100ms |

L'objectif est de **prouver la faisabilité** de l'architecture via une maquette fonctionnelle locale avec Docker, validée par des tests automatisés et un pipeline CI/CD opérationnel.

---

## 🏗️ Architecture cible AWS

L'architecture s'articule autour de **5 zones logiques** déployées sur AWS :

![Architecture NexusPlay](docs/architecture.png)

### Le voyage d'une requête utilisateur

1.Joueur → Route 53 (DNS Active/Backup, health checks 30s)
2.Route 53 → ALB Multi-AZ (routing par chemin URL)
3.ALB → ECS Fargate (Lobby HTTP REST OU Game WebSocket)
4.Services → Redis (cache chaud) + RDS PostgreSQL (persistance)
5.Tous → CloudWatch (logs centralisés + métriques + alarmes)
6.CloudWatch → SNS → Slack/Email (alerting incidents)

<img width="2390" height="1580" alt="image" src="https://github.com/user-attachments/assets/f425cf6a-ce07-407b-b517-de4b25302bbb" />



### Sécurité Zero-Trust

Aucun secret n'est dans le code ou les variables d'environnement. Les conteneurs ECS récupèrent leurs credentials via leur **rôle IAM** depuis **AWS Secrets Manager**, avec rotation automatique tous les 30 jours.

---

## 🔧 Stack technique

### Microservices

| Composant | Techno | Rôle |
|-----------|--------|------|
| **Service Lobby** | Node.js 20 + Express | Matchmaking, listing, chat (HTTP REST) |
| **Service Game** | Node.js 20 + Socket.IO | Gameplay temps réel (WebSocket) |

### Infrastructure (cible AWS)

| Service AWS | Usage |
|-------------|-------|
| **Route 53** | DNS Active/Backup avec failover auto |
| **Application Load Balancer** | Répartition Multi-AZ + WebSocket |
| **ECS Fargate** | Containers serverless avec auto-scaling |
| **ElastiCache Redis** | Cache mémoire sub-ms |
| **RDS PostgreSQL** | Base relationnelle Multi-AZ |
| **Secrets Manager** | Vault chiffré KMS |
| **CloudWatch** | Logs + métriques + dashboards |
| **SNS** | Pub/Sub alerting (Slack + Email) |
| **ECR** | Registry Docker privé |

### Stack locale (maquette)

- **Docker Compose** pour orchestrer les conteneurs
- **Redis 7** + **PostgreSQL 16** en local
- **Nginx** pour servir la dashboard de validation
- **wrk** pour les tests de charge
- **GitHub Actions** pour le CI/CD

---

## 📦 Prérequis

```bash
# Vérifier les outils requis
docker --version       # Docker 20+
docker compose version # Docker Compose v2
node --version         # Node.js 20+
git --version          # Git 2.30+
```

### Installation sur macOS

```bash
# Avec Homebrew
brew install --cask docker
brew install node git wrk
```

### Installation sur Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nodejs npm git wrk
sudo usermod -aG docker $USER  # déconnexion/reconnexion requise
```

---

## 🚀 Démarrage rapide

### 1. Cloner le projet

```bash
git clone https://github.com/brubru-420/ouin-ouinNexusPlay.git
cd ouin-ouinNexusPlay
```

### 2. Démarrer la stack complète

```bash
# Build et démarrage de tous les services
make start

# Attendre 15 secondes que tout soit prêt
sleep 15

# Vérifier que tout fonctionne
make health
```

<img width="2806" height="968" alt="image" src="https://github.com/user-attachments/assets/4cda09ee-afec-4a3b-9d5a-0f33dbcef637" />


Tu devrais voir les **5 conteneurs healthy** :
NAME                 STATUS
nexusplay-redis      Up (healthy)
nexusplay-postgres   Up (healthy)
nexusplay-lobby      Up (healthy)
nexusplay-game       Up (healthy)
nexusplay-web        Up

### 3. Ouvrir la dashboard de validation

```bash
# macOS
open http://localhost:8080

# Linux
xdg-open http://localhost:8080
```

---

## 🌐 Dashboard de validation

Une **interface web** permet de valider toutes les fonctionnalités en un coup d'œil :

![Dashboard NexusPlay](docs/dashboard.png)

### Fonctionnalités

- ✅ **Status temps réel** des microservices (refresh auto toutes les 10s)
- ✅ **6 tests fonctionnels** cliquables :
  - Création de lobby (POST + Redis)
  - Liste des lobbies (cache Redis pipeline)
  - Rejoindre un lobby (écriture Redis)
  - Statistiques globales (PostgreSQL)
  - WebSocket multijoueur (Socket.IO)
  - Test complet (lance tous les tests)
- ✅ **Console de logs** en temps réel
- ✅ **Liste des 10 contraintes** du brief, toutes validées

### Performances mesurées

| Endpoint | Latence | Backend |
|----------|---------|---------|
| `POST /lobbies` | ~5 ms | Redis |
| `GET /lobbies` | ~4 ms | Redis pipeline |
| `POST /lobbies/:id/join` | ~8 ms | Redis |
| `GET /stats` | ~14 ms | PostgreSQL |
| `WebSocket /game` | < 50 ms | Socket.IO |

---

## 💻 Commandes utiles

### Makefile

```bash
make help        # Affiche toutes les commandes
make install     # Installe les dépendances Node.js
make dev         # Démarre la stack en mode dev (foreground)
make start       # Démarre la stack en background
make stop        # Arrête la stack
make restart     # Redémarre la stack
make logs        # Suit tous les logs
make logs-lobby  # Suit les logs du Lobby
make logs-game   # Suit les logs du Game
make test        # Lance les tests unitaires
make build       # Builde les images Docker
make health      # Vérifie la santé des services
make load-test   # Lance le test de charge wrk
make clean       # Nettoyage complet (volumes + images)
```
<img width="1030" height="972" alt="image" src="https://github.com/user-attachments/assets/8662e065-7c88-40bb-80af-bd029c7f6431" />

<img width="1102" height="1706" alt="image" src="https://github.com/user-attachments/assets/4c1f0f3d-167e-4bef-9f90-e2dd7b769646" />

<img width="1066" height="1358" alt="image" src="https://github.com/user-attachments/assets/0a92452d-b91b-4d4d-b15f-ed43123be8e7" />


### Commandes manuelles utiles

```bash
# === Test des endpoints REST ===

# Health checks
curl http://localhost:3000/health | python3 -m json.tool
curl http://localhost:3001/health | python3 -m json.tool

# Créer un lobby
curl -X POST http://localhost:3000/lobbies \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Tournament","gameType":"chess","maxPlayers":4}'

# Lister les lobbies
curl http://localhost:3000/lobbies | python3 -m json.tool

# Rejoindre un lobby
curl -X POST http://localhost:3000/lobbies/LOBBY_ID/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player_alice"}'

# Stats globales (PostgreSQL)
curl http://localhost:3000/stats | python3 -m json.tool

# === Inspection des données ===

# Tables PostgreSQL
docker exec nexusplay-postgres psql -U nexusplay -d nexusplay -c "\dt"

# Joueurs en base
docker exec nexusplay-postgres psql -U nexusplay -d nexusplay \
  -c "SELECT id, username, email FROM players;"

# Clés Redis actives
docker exec nexusplay-redis redis-cli KEYS '*'
docker exec nexusplay-redis redis-cli SMEMBERS active:lobbies

# === Validation complète automatique ===

# Lance tous les checks (structure, healthchecks, tests, intégrité)
./validate.sh
```

---

## ✅ Tests et validation

### Tests unitaires automatisés

```bash
make test
```

**Sortie attendue :**

nexusplay-lobby@1.0.0 test
✔ génération d'un lobbyId unique (0.5ms)
✔ validation des paramètres de lobby (0.06ms)
✔ format du timestamp ISO (0.6ms)
ℹ tests 3 / pass 3 / fail 0


nexusplay-game@1.0.0 test
✔ handleGameAction retourne un résultat valide (0.5ms)
ℹ tests 1 / pass 1 / fail 0

### Tests d'intégration via dashboard

Tous les tests sont cliquables depuis l'interface web sur `http://localhost:8080`. Chaque test affiche :
- Le temps de réponse en millisecondes
- Le résultat formaté (succès/erreur)
- Les détails dans la console de logs

---

## 🔄 Pipeline CI/CD

Le pipeline GitHub Actions s'exécute **automatiquement** à chaque push sur la branche `main`.

![Pipeline CI/CD](docs/cicd-pipeline.png)

### Architecture du pipeline

Push sur main
↓
┌─────────────────────────────────────────────────────────┐
│  4 jobs parallèles                                      │
├─────────────────────────────────────────────────────────┤
│  ✅ Test Lobby Service                             
│  ✅ Test Game Service                              
│  ✅ Docker Build Check                             
│  ✅ Integration Test             
└───────────────────

### Détail des jobs

| Job | Durée | Vérifie |
|-----|-------|---------|
| **Test Lobby Service** | 28s | Tests unitaires + npm audit |
| **Test Game Service** | 10s | Tests unitaires + npm audit |
| **Docker Build Check** | 47s | Build des images Docker |
| **Integration Test** | 35s | Stack complète + curl tests |

### Workflows disponibles

- `.github/workflows/ci.yml` → Tests + build à chaque push (✅ actif)
- `.github/workflows/deploy.yml.disabled` → Déploiement ECS (préparé, désactivé pour le POC)

### Lien vers le pipeline

🔗 **https://github.com/brubru-420/ouin-ouinNexusPlay/actions**

---

## 📊 Test de charge et optimisations

Cette section démontre la **valeur métier** du load testing dans le pipeline CI/CD.

### Configuration du test

```bash
# 4 threads × 20 connexions × 30 secondes par endpoint
make load-test
```

### Premier run : détection de problèmes

| Endpoint | Req/s | p99 | Erreurs |
|----------|-------|-----|---------|
| GET /health (Lobby) | 7 413 | 6.49 ms | 0 |
| **GET /lobbies** | **0** ❌ | — | **4 300** |
| **GET /stats** | 8 520 | **736 ms** ⚠️ | **1 622** |
| POST /lobbies | 7 920 | 5.66 ms | 0 |
| GET /health (Game) | 16 209 | 8.68 ms | 0 |

**Anomalies détectées :**

1. **`GET /lobbies` plante totalement** sous charge → 4 300 erreurs Redis
   → Cause : N+1 query pattern (1 SMEMBERS + N HGETALL en parallèle)

2. **`GET /stats` p99 à 736 ms** → Pool PostgreSQL saturé (10 connexions)

### Optimisations appliquées

#### Fix 1 : Redis pipeline (élimine le N+1)

```javascript
// AVANT — N+1 query problem
const lobbies = await Promise.all(
    lobbyIds.map(async (id) => {
        const data = await redis.hgetall(`lobby:${id}`);
        return { id, ...data };
    })
);

// APRÈS — Redis pipeline (batch en une seule connexion)
const pipeline = redis.pipeline();
lobbyIds.forEach(id => pipeline.hgetall(`lobby:${id}`));
const results = await pipeline.exec();
```

#### Fix 2 : Pool PostgreSQL doublé + timeout

```javascript
// services/lobby/src/pg-client.js
{
    max: 20,                  // doublé de 10 à 20
    statement_timeout: 5000,  // tue les requêtes lentes
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
}
```

### Résultats après optimisation

| Endpoint | Req/s | p99 | Erreurs | Évolution |
|----------|-------|-----|---------|-----------|
| GET /health (Lobby) | 7 494 | 6.83 ms | 0 | stable |
| **GET /lobbies** | **11 669** ✅ | **4.19 ms** | **0** | **0 → 11 669 req/s** |
| **GET /stats** | 9 365 | **5.89 ms** ✅ | **0** | **p99 ÷ 125** |
| POST /lobbies | 7 713 | 7.89 ms | 0 | stable |
| GET /health (Game) | 16 961 | 2.80 ms | 0 | **p99 ÷ 3** (effet collatéral) |

### Conclusion

Le test de charge a permis de **détecter et corriger deux anti-patterns architecturaux avant la production** :

- L'effondrement de `/lobbies` aurait généré une **indisponibilité totale** lors du premier pic de trafic
- Le p99 à 736 ms sur `/stats` aurait **dégradé l'expérience utilisateur** pour 1% des requêtes

C'est exactement la valeur du load testing intégré au pipeline CI/CD : transformer des problèmes invisibles en simulation en problèmes **détectables et corrigeables avant le déploiement**.

---

## 📋 Mapping des contraintes du brief

Toutes les **10 contraintes** du brief sont validées :

| # | Contrainte | Composant | Statut |
|---|-----------|-----------|--------|
| 1 | Logique microservices (≥ 2 services) | Lobby + Game indépendants | ✅ |
| 2 | Équilibrage de charge avec redondance | ALB Multi-AZ + Route 53 | ✅ |
| 3 | Système de scalabilité automatique | ECS Application Auto Scaling | ✅ |
| 4 | Monitoring centralisé | Health checks + CloudWatch (cible) | ✅ |
| 5 | Pipeline CI/CD | GitHub Actions (4 jobs en 1m22s) | ✅ |
| 6 | Test de charge dans CI/CD | wrk + scénarios automatisés | ✅ |
| 7 | Cache pour les performances | ElastiCache Redis + pipeline | ✅ |
| 8 | Gestion sécurisée des secrets | AWS Secrets Manager + IAM | ✅ |
| 9 | Notifications incidents | SNS → Slack + Email | ✅ |
| 10 | DNS hautement disponible (Active/Backup) | Route 53 failover routing | ✅ |

---

## 🚀 Roadmap d'amélioration

### Sécurité

- [ ] Ajouter **AWS WAF** devant l'ALB (règles OWASP, rate limiting natif)
- [ ] HTTPS partout via certificat ACM
- [ ] **GuardDuty** pour la détection d'intrusion
- [ ] Rotation des credentials AWS via IAM Identity Center

### Observabilité

- [ ] **AWS X-Ray** pour le distributed tracing
- [ ] **APM** type Datadog ou New Relic (RUM côté navigateur)
- [ ] **Synthetic checks** depuis des régions externes

### Scalabilité

- [ ] **Multi-régions** avec Route 53 latency-based routing (FR + US + ASIA)
- [ ] **Aurora Serverless v2** pour la DB qui scale automatiquement
- [ ] **ElastiCache cluster mode** quand le volume dépasse 50 Go

### Performance

- [ ] **CloudFront CDN** devant l'ALB pour les assets statiques
- [ ] Optimisations supplémentaires sur les requêtes SQL

### Coûts

- [ ] Passage en **Spot** pour ECS (-70%)
- [ ] **Reserved Instances** sur RDS (-40%)
- [ ] **S3 Intelligent-Tiering** pour les logs longue durée

### Developer Experience

- [ ] **Preview deployments** automatiques sur chaque PR
- [ ] **Runbooks** pour les incidents les plus courants
- [ ] **GameDay** réguliers (simulations de panne)

---

## 🔗 Liens importants

- Repository GitHub** : https://github.com/brubru-420/ouin-ouinNexusPlay
- CI/CD Pipeline** : https://github.com/brubru-420/ouin-ouinNexusPlay/actions
- Dashboard locale** : http://localhost:8080

