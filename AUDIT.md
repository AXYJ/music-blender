# Audit music-blender : suivi

## Audit n°2 (7 octobre 2026)

Relecture du code et des dépendances. État de départ : `tsc --noEmit` OK des deux côtés, 14 fichiers de tests backend OK.

### Corrigé
- [x] **Limite par IP contournable derrière un proxy** (`getClientIp`, `backend/scripts/rate-limit.ts`). Avec `TRUST_PROXY=1`, la fonction lisait la première adresse de `X-Forwarded-For`, celle que le client écrit lui-même : une valeur différente par connexion échappait à la limite. Elle lit maintenant la dernière (ajoutée par le proxy). Limite connue : un seul proxy de confiance (`ponytail:` dans le code). Test mis à jour (`limiter.test.mts` : `6.6.6.6, 9.9.9.9` donne `9.9.9.9`).
- [x] **Dépendances backend** : `npm audit fix` ; `npm audit --omit=dev` passe de 4 alertes (`proxy-addr` critique, `engine.io`, `undici` hautes, `qs` modérée) à 0.
- [x] **Dépendances frontend** : `next` 16.1.6 → 16.4.0 (saut mineur, aucun changement incompatible pour l'App Router + React 19), puis `npm audit fix` (`sharp`, `postcss`, `nanoid`, `source-map-js`). `npm audit --omit=dev` passe de 5 paquets (dont `next` critique) à 0. Build et lint OK, images (`next/image`) vérifiées à la main.
- [x] **`console.log` retirés du frontend** (`useSocketListeners.ts` ×2, `InstallPrompt.tsx` ×2). Les `console.error` et les journaux du serveur sont conservés.

### Reste à faire
- [ ] **Racine** : `shell-quote` via `concurrently` (critique, outil de développement seulement) : `npm audit fix` à la racine.
- [ ] **Versions majeures volontairement non montées (frontend)** : `eslint` 10 (les plugins de `eslint-config-next` ne le déclarent pas compatible), `typescript` 7 (casse `typescript-eslint`, build OK mais lint KO), `@types/node` 26 (Node 20 ciblé côté frontend). À revoir quand `eslint-config-next` / `typescript-eslint` les supportent.
- [ ] **`dangerouslySetInnerHTML`** (`Toggle.tsx`, `Mentions.tsx`) : sans risque tant que le contenu vient des fichiers de traduction ; ne jamais y faire passer une saisie de joueur.
- [ ] **`backend/servor.ts`** : 809 lignes, non relu en entier lors de cet audit.
- [ ] Les trois défauts de `PISTES.md` (groupes dont le nom contient « & » / « and », japonais romanisé sans espaces, kanji seuls lus en chinois).

### Vérification après corrections
`tsc --noEmit` OK (backend et frontend), 14 fichiers de tests backend OK. Non testé : un vrai reverse proxy devant le serveur (testé uniquement sur la fonction).

---

## Audit n°1

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
- [x] B0. **Crash serveur à la déconnexion** : le `Timeout` stocké dans `Player` était envoyé aux clients (circulaire, `RangeError` socket.io). Minuteurs déplacés dans une `Map` côté serveur (`disconnectTimeouts`).
- [x] B2. **Hôte perdu / room supprimée au retour d'une autre appli (mobile)**, cause : socket périmée. Le client se reconnecte avec une nouvelle socket, puis le serveur détecte enfin la mort de l'ancienne, et `disconnect` marquait le joueur comme parti (hôte transféré après 5 min, room supprimée si hôte seul). Corrigé : `disconnect` ignore une socket qui n'est plus celle du joueur (`player.socketId !== socket.id`). Aussi : `leave_game` transfère l'hôte dans tous les cas (avant : seulement lobby / fin), et la fin de partie est dérivée du temps (`isGameRunning`) pour le retrait des absents pendant les résultats. Reproduit puis corrigé (test avec délai de grâce de 3 s).
- [x] B1. **Timer client qui dérivait** : le serveur envoie une horloge (`timing` : `gameStartTime`, `serverNow`, `time`) dans `data_loaded` et `game_reconnected` ; le client recalcule tour, phase et temps restant depuis cette horloge (`utils/gameClock.ts`, tick de 250 ms dans `Game.tsx`). Plus de décompte local, retour de veille resynchronisé. Réponse envoyée une seule fois par tour (`answeredTurn`).
- [x] B3. `join_game` : reconnexion dédupliquée (`getTurnInfo`, `hasActiveGame`), indentation corrigée. Au passage : un joueur existant peut se reconnecter à une room pleine (avant : refusé `room_full`).
- [x] B4. `GameContext` : `join_game` automatique émis une seule fois par connexion (`joinedSocketRef`), plus à chaque changement de pseudo.
- [x] B5. `useSocketListeners` : `t` et `playerId` lus via un ref, les erreurs suivent la langue.
- Testé : serveur (scénario mobile avec socket périmée, hôte qui quitte en pleine partie, état de reconnexion, room pleine, horloge) ; fonction d'horloge client (décalage d'horloge, retour de veille) ; vraie partie dans le navigateur intégré (lobby, 3 tours au rythme exact du serveur, réponse saisie notée 2 points, coupure de connexion en plein tour 2 : reconnexion automatique, même tour, toujours hôte, résultats). Non testé : l'expiration réelle de 5 minutes et la vraie mise en arrière-plan d'un téléphone (simulées).
### Thème C : Protocole socket incohérent
- [x] C1. `socket.emit("volume")` supprimé de `Game.tsx` (événement sans écouteur, le volume est local).
- [x] C2. `room.answers` (3 écritures) et type `PlayerAnswer` supprimés : jamais lus, déjà couverts par les tableaux `*_board` du joueur.
- Testé : tous les scénarios serveur précédents (réponses et scores, paramètres, reconnexion, déconnexions, scénario mobile) passent toujours ; `tsc` OK des deux côtés.

### Thème D : Duplications et gros blocs
- [x] D1. `send_playlist_url` : handler de ~190 lignes à découper.
- [ ] D2. (assumé : le Player du front correspond au PublicPlayer du serveur, le Track du front au PublicTrack) Types dupliqués front/back (déjà divergents).
- [x] D3. Types de résultats Spotify / Apple / Deezer identiques, plus le type littéral recopié.
- [x] D4. `transliterate.ts` : prompt et appel Groq copiés dans deux fonctions.
- [x] D5. Reset message/erreur après 2 s copié dans `Game` et `Lobby`.
- [x] D6. Détection « localhost » copiée deux fois (et `.includes("10.")` trop large).
- [x] D7. `checkAndResetGame` reçoit `rooms` / `io` qui sont des variables de module.

### Thème E : Hygiène
- [x] E1. `loadEnvFile` : un seul appel, dans `servor.ts` (sans cast). `transliterate.ts` le chargeait lui-même parce que `GROQ_MODEL` était lu au chargement du module, avant `servor.ts` (les imports ES passent en premier) : le modèle est maintenant lu à l'appel (`getModel()`). README : Node 20.12+ (au lieu de 18+) car `process.loadEnvFile` n'existe pas avant.
- [x] E2. `import` de `get-artists-tracks.ts` remonté en tête de fichier.
- Testé : serveur lancé depuis 3 dossiers (`.env` avec modèle inexistant : utilisé ; `.env` sans `GROQ_MODEL` : modèle par défaut, 米津玄師 devient Kenshi Yonezu ; pas de `.env` : démarre, clé signalée absente) ; les 6 scénarios serveur passent toujours.
