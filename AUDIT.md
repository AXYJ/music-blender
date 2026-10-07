# Audit music-blender : suivi

Méthode : un point à la fois. On discute du problème, l'utilisateur décide, on corrige, on passe au suivant.

## Fait

### Code mort retiré
- Dépendances : `isomorphic-fetch`, `spotify-url-info` (+ sa déclaration dans `declarations.d.ts`) côté backend ; `socket.io` (serveur) côté frontend.
- `main: "index.js"` inexistant dans `package.json` (racine et frontend).
- `Game.tsx` : import `Stepper`, bloc commenté, `handleVolume`.
- `GameContext.tsx` : `SFX_KEY`. `types/game.ts` (front) : type `Phase`.
- Backend : `room.leavedPlayers` (type + écriture), champs `artist_answer` / `artist_score` / `track_answer` sur `Player`, `export` de `checkAndResetGame`, wrapper `fetchDeezerTracks` fusionné avec `fetchDeezerEntityTracks`.
- `todo.txt` (vide, non versionné).
- Vérifié : `tsc --noEmit` OK côté backend et frontend.

## Corrections, par thème

Règle : une modification et un commit par thème, avec un test par thème (scripts Socket.IO contre le vrai serveur).

### Thème A : Le serveur fait confiance au client (sécurité)
- [x] A1. `submit_answer` : score répétable, `turn` fourni par le client. Le tour est recalculé côté serveur (`getCurrentTurn`), une seule réponse par joueur et par tour. La phase « devinette » n est volontairement pas imposée (latence du client). Testé.
- [x] A2. `start_game` / `music_amount` / `time` : garde hôte + bornes (1 à 30 morceaux, 5 à 30 s par pas de 5). Testé.
- [x] A3. Code de room : tirage répété tant que le code existe. Testé : 150 rooms, 150 codes distincts (une vraie collision ne peut pas être forcée).
- [x] A4. CORS : option 1 retenue, serveur assumé ouvert (`origin: true`), liste inutile et `credentials` supprimés. Testé : handshake depuis une origine quelconque accepté. Piste si abus : rate limit, pas un filtre d origine.

### Thème B : Robustesse de la reconnexion et de l état de partie
- [x] B0. **Crash serveur à la déconnexion** (trouvé en test, bug existant) : le `Timeout` stocké dans `Player` était envoyé aux clients (circulaire, `RangeError` socket.io). Minuteurs déplacés dans une `Map` côté serveur (`disconnectTimeouts`). Testé : déconnexion hôte / non-hôte, reconnexion dans le délai de grâce, `leave_game`. Non testé : l expiration des 5 minutes.
- [ ] B1. Timer client local qui dérive de l horloge du serveur (renforcé par A1 : un client en retard de plus de 7 s verrait sa réponse rejetée).
- [ ] B2. `isGameOver` jamais posé par le serveur en fin de partie (transfert d hôte et retrait des absents ratés pendant l écran de résultats).
- [ ] B3. `join_game` : logique de reconnexion copiée deux fois, indentation cassée à partir de la ligne ~196.
- [ ] B4. Frontend : effet de reconnexion auto (`GameContext`) qui émet `join_game` trop souvent.
- [ ] B5. Frontend : dépendances d effet incomplètes dans `useSocketListeners` (`t`, `playerId`).

### Thème C : Protocole socket incohérent
- [ ] C1. `socket.emit("volume")` dans `Game.tsx` : événement que le serveur n écoute pas et qui n est pas dans `ClientToServerEvents`.
- [ ] C2. `room.answers` écrit mais jamais lu (code mort probable, avec le type `PlayerAnswer`).

### Thème D : Duplications et gros blocs
- [ ] D1. `send_playlist_url` : handler de ~190 lignes à découper.
- [ ] D2. Types dupliqués front/back (déjà divergents).
- [ ] D3. Types de résultats Spotify / Apple / Deezer identiques, plus le type littéral recopié.
- [ ] D4. `transliterate.ts` : prompt et appel Groq copiés dans deux fonctions.
- [ ] D5. Reset message/erreur après 2 s copié dans `Game` et `Lobby`.
- [ ] D6. Détection « localhost » copiée deux fois (et `.includes("10.")` trop large).
- [ ] D7. `checkAndResetGame` reçoit `rooms` / `io` qui sont des variables de module.

### Thème E : Hygiène
- [ ] E1. `loadEnvFile` appelé deux fois avec un cast `as unknown as`.
- [ ] E2. `import` au milieu de `get-artists-tracks.ts`.
