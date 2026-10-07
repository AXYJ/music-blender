# 🎵 Museek

**Museek** est un jeu de blindtest multijoueur en temps réel où chaque joueur apporte sa propre playlist. Le serveur fusionne les différentes playlists (Spotify, Deezer, Apple Music) pour créer une expérience de jeu unique et collaborative.

🌐 **Jouer en ligne :** [https://museek.xiao-web.com/](https://museek.xiao-web.com/)

---

## ✨ Fonctionnalités

- **Blindtest Collaboratif** : Chaque joueur soumet le lien d'une de ses playlists favorites. Les morceaux sont mélangés et diffusés en temps réel.
- **Support Multi-plateformes** : Importation de playlists publiques depuis **Spotify**, **Deezer** et **Apple Music** (liens https de ces plateformes uniquement, liens courts compris ; tout autre lien est refusé).
- **Multijoueur en Temps Réel** : Création et gestion de salons de jeu (rooms) grâce aux WebSockets.
- **Paramètres Personnalisables** : Le créateur de la partie peut ajuster le nombre de morceaux par playlist et le temps imparti pour deviner chaque morceau.
- **Système de Saisie & Autocomplétion** : Les joueurs saisissent le titre et/ou l'artiste, avec un mécanisme d'autocomplétion et de tolérance aux fautes (translittération, prise en charge des caractères spéciaux/japonais via Kuroshiro, etc.).
- **Respect de la Vie Privée (RGPD)** : Aucune base de données persistante. Les données de session sont éphémères et stockées uniquement en mémoire vive (RAM) le temps de la partie.

---

## 🛠️ Stack Technique

Le projet est structuré en **monorepo** :

- **Frontend** :
  - [Next.js](https://nextjs.org/) (React, TypeScript)
  - Styling : CSS / Tailwind CSS
  - Communication temps réel : Client [Socket.io](https://socket.io/)
- **Backend** :
  - [Node.js](https://nodejs.org/) avec [Express](https://expressjs.com/)
  - Serveur temps réel : [Socket.io](https://socket.io/)
  - Intégration API & Scraping : `fetch` natif (Spotify, Deezer, iTunes), `cheerio` (scraping Apple Music)
  - Normalisation & Translittération : `kuroshiro`, `kuroshiro-analyzer-kuromoji`, `transliteration`

---

## 📂 Structure du Projet

```text
music-blender/
├── backend/            # Serveur Node.js / Socket.io
│   ├── scripts/        # Extraction des morceaux (Spotify, Deezer, Apple) et translittération
│   ├── types/          # Types du jeu et des événements socket
│   ├── tests/          # Tests (voir « Tests » plus bas)
│   ├── servor.ts       # Point d'entrée principal du serveur backend
│   └── package.json
├── frontend/           # Application Next.js
│   ├── src/
│   │   ├── app/        # Configuration Next.js (App Router)
│   │   ├── components/ # Composants d'interface (stepper, autocomplete, PWA, etc.)
│   │   ├── context/    # Contextes : jeu (GameContext) et langue (LanguageContext)
│   │   ├── locales/    # Fichiers de traduction (FR/EN)
│   │   ├── types/      # Types du jeu côté client
│   │   ├── views/      # Vues de l'application (Home, Lobby, Game, Results)
│   │   └── utils/      # Socket partagée, horloge de partie (gameClock), stockage local
│   └── package.json
├── package.json        # Fichier de scripts global
├── AUDIT.md            # Suivi de l'audit de code (corrections faites)
├── DISCUSSION.md       # Points restant à trancher (sécurité, architecture)
└── README.md           # Ce fichier
```

---

## 🚀 Installation et Démarrage

### 1. Prérequis
- [Node.js](https://nodejs.org/) (version 20.12+ : le backend charge `backend/.env` avec `process.loadEnvFile`)
- Optionnel : un compte [Spotify Developer](https://developer.spotify.com/) pour les **albums** Spotify (les playlists sont lues sans clé ; sans clés, les albums passent par le même scraping anonyme)
- Optionnel : une clé [Groq](https://console.groq.com/) pour romaniser les noms non latins (japonais, chinois, coréen) ; sans clé, la translittération locale est utilisée

### 2. Cloner le projet et installer les dépendances

Installez d'abord les dépendances du dossier racine, puis celles du frontend et du backend :

```bash
# Installation des dépendances globales (concurrently)
npm install

# Installation des dépendances du backend
npm install --prefix backend

# Installation des dépendances du frontend
npm install --prefix frontend
```

### 3. Configuration des variables d'environnement

#### Backend
Créez un fichier `.env` dans le dossier `backend/` :

```env
# backend/.env
PORT=4000
SPOTIFY_CLIENT_ID=votre_spotify_client_id        # optionnel (albums Spotify)
SPOTIFY_CLIENT_SECRET=votre_spotify_client_secret # optionnel (albums Spotify)
GROQ_API_KEY=votre_cle_groq                       # optionnel (romanisation)
GROQ_MODEL=qwen/qwen3.8-27b                       # optionnel, modèle Groq utilisé
TRUST_PROXY=1                                     # optionnel, à activer derrière un reverse proxy
```

**Limites par adresse IP** (par minute, réglables, valeurs par défaut) : `RATE_LIMIT_ROOMS=20` créations de salon, `RATE_LIMIT_PLAYLISTS=60` chargements de playlist, `RATE_LIMIT_BAD_JOINS=30` codes de salon inexistants essayés, `MAX_SOCKETS_PER_IP=50` connexions simultanées. Derrière un reverse proxy (hébergeur type Render, Hostinger…), mettez `TRUST_PROXY=1` : le serveur lit alors l'adresse du client dans `X-Forwarded-For`. Sans cela, tous les joueurs partagent l'adresse du proxy et donc les mêmes limites.

*Note : pour obtenir vos identifiants Spotify, créez une application sur le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).*

#### Frontend (Optionnel en local)
Le frontend est configuré par défaut pour se connecter sur `http://localhost:4000` en mode développement. Pour la production, vous pouvez créer un fichier `.env.local` dans le dossier `frontend/` :

```env
# frontend/.env.local
NEXT_PUBLIC_SOCKET_URL=https://votre-serveur-backend.com
```

### 4. Lancer le projet en mode développement

Depuis la racine du projet, lancez la commande suivante :

```bash
npm run dev
```

Cette commande démarre simultanément :
- Le serveur backend sur [http://localhost:4000](http://localhost:4000)
- L'application Next.js sur [http://localhost:3000](http://localhost:3000)

Ouvrez ensuite votre navigateur sur **[http://localhost:3000](http://localhost:3000)** pour jouer !

### 5. Lancer les tests

Les tests (backend) démarrent eux-mêmes un serveur sur le port 4100, jouent des parties avec de vrais clients Socket.IO, puis l'arrêtent :

```bash
npm test --prefix backend                  # tous les tests
npm test --prefix backend -- reset answers # seulement les fichiers dont le nom contient ces mots
SKIP_NETWORK=1 npm test --prefix backend   # sans les parties qui chargent une vraie playlist Deezer
```

Ils couvrent les réponses et les scores, les droits de l'hôte et les limites des paramètres, l'identité des joueurs (aucune fuite de l'identifiant de reconnexion), les déconnexions et reconnexions (dont le retour d'une autre appli sur mobile), la remise à zéro d'une partie, les fonctions de l'horloge de partie, les liens de playlist autorisés (protection contre les appels du serveur vers des adresses arbitraires) et les limites par adresse IP. Le serveur de test réduit le délai de grâce de 5 minutes à 3 secondes (`GRACE_PERIOD_MS`). Lint du frontend : `npm run lint --prefix frontend`.

---

## 🔒 Confidentialité & Données

Le projet fonctionne selon le principe du respect de la vie privée par défaut :
- Pas de base de données persistante.
- Les données de jeu, pseudonymes, et liens de playlists sont conservés uniquement en mémoire volatile sur le serveur backend.
- Dès que tous les joueurs quittent un salon, la mémoire associée est entièrement purgée.
- Les autres joueurs ne reçoivent jamais votre identifiant de reconnexion ni votre lien de playlist : ils ne voient qu'un identifiant public tiré au hasard à votre arrivée dans le salon, ce qui empêche de prendre la place d'un autre joueur.

---

## ⚖️ Avertissement Légal
Ce jeu est un projet indépendant et n'est ni affilié, ni sponsorisé, ni approuvé par Spotify, Deezer ou Apple Music. Les titres, artistes et visuels associés restent la propriété exclusive de leurs ayants droit respectifs.
