# 🎵 Museek

**Museek** est un jeu de blindtest multijoueur en temps réel où chaque joueur apporte sa propre playlist. Le serveur fusionne les différentes playlists (Spotify, Deezer, Apple Music) pour créer une expérience de jeu unique et collaborative.

🌐 **Jouer en ligne :** [https://museek.xiao-web.com/](https://museek.xiao-web.com/)

---

## ✨ Fonctionnalités

- **Blindtest Collaboratif** : Chaque joueur soumet le lien d'une de ses playlists favorites. Les morceaux sont mélangés et diffusés en temps réel.
- **Support Multi-plateformes** : Importation de playlists publiques depuis **Spotify**, **Deezer** et **Apple Music**.
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
  - Intégration API & Scraping : `spotify-url-info`, `cheerio` (pour Apple/Deezer)
  - Normalisation & Translittération : `kuroshiro`, `kuroshiro-analyzer-kuromoji`, `transliteration`

---

## 📂 Structure du Projet

```text
music-blender/
├── backend/            # Serveur Node.js / Socket.io
│   ├── scripts/        # Scripts d'extraction des morceaux (Spotify, Deezer, Apple)
│   ├── servor.js       # Point d'entrée principal du serveur backend
│   └── package.json
├── frontend/           # Application Next.js
│   ├── src/
│   │   ├── app/        # Configuration Next.js (App Router)
│   │   ├── components/ # Composants d'interface (stepper, autocomplete, etc.)
│   │   ├── context/    # Gestion du contexte de jeu (GameContext)
│   │   ├── locales/    # Fichiers de traduction (FR/EN)
│   │   ├── views/      # Vues de l'application (Home, Lobby, Game, Results)
│   │   └── utils/      # Utilitaires et configuration socket
│   └── package.json
├── package.json        # Fichier de scripts global
└── README.md           # Ce fichier
```

---

## 🚀 Installation et Démarrage

### 1. Prérequis
- [Node.js](https://nodejs.org/) (version 18+ recommandée)
- Un compte [Spotify Developer](https://developer.spotify.com/) (pour générer les clés API nécessaires à l'extraction des playlists Spotify)

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
SPOTIFY_CLIENT_ID=votre_spotify_client_id
SPOTIFY_CLIENT_SECRET=votre_spotify_client_secret
PORT=4000
```

*Note : Pour obtenir vos identifiants Spotify, créez une application sur le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).*

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

---

## 🔒 Confidentialité & Données

Le projet fonctionne selon le principe du respect de la vie privée par défaut :
- Pas de base de données persistante.
- Les données de jeu, pseudonymes, et liens de playlists sont conservés uniquement en mémoire volatile sur le serveur backend.
- Dès que tous les joueurs quittent un salon, la mémoire associée est entièrement purgée.

---

## ⚖️ Avertissement Légal
Ce jeu est un projet indépendant et n'est ni affilié, ni sponsorisé, ni approuvé par Spotify, Deezer ou Apple Music. Les titres, artistes et visuels associés restent la propriété exclusive de leurs ayants droit respectifs.
