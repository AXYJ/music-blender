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

## À traiter (par ordre d'impact)

0. [ ] **CRASH serveur (trouvé en test, bug existant)** : quand un joueur se déconnecte, `disconnect` pose `player.disconnectTimeout` (objet `Timeout`) puis émet `room_updated` avec `room.players`. Le `Timeout` est circulaire : socket.io plante en `RangeError: Maximum call stack size exceeded` (`hasBinary`) et tout le serveur s'arrête. Se produit si l'hôte se déconnecte avec d'autres joueurs, ou un non-hôte dans le lobby / en fin de partie.
1. [x] `submit_answer` : score répétable, `turn` fourni par le client. Corrigé : le tour est recalculé côté serveur (`getCurrentTurn`) et une seule réponse par joueur et par tour est acceptée. La phase « devinette » n'est volontairement pas imposée : le client envoie sa réponse pile à la fin du chrono, une vérification stricte rejetterait des réponses légitimes à cause de la latence.
2. [ ] `start_game` / `music_amount` / `time` : pas de contrôle hôte, pas de validation
3. [ ] Code de room : collision possible
4. [ ] CORS : liste d'origines sans effet
5. [ ] Reconnexion dupliquée dans `join_game` + indentation cassée
6. [ ] `send_playlist_url` : handler de ~190 lignes
7. [ ] `socket.emit("volume")` : événement inexistant côté serveur
8. [ ] Timer local qui dérive du serveur
9. [ ] `isGameOver` jamais posé par le serveur en fin de partie
10. [ ] `useSocketListeners` : dépendances d'effet incomplètes (`t`, `playerId`)
11. [ ] Effet de reconnexion auto : `join_game` émis trop souvent
12. [ ] Types dupliqués front/back
13. [ ] Types de résultats plateformes dupliqués (Spotify/Apple/Deezer)
14. [ ] `transliterate.ts` : prompt et appel Groq dupliqués
15. [ ] Reset message/erreur après 2 s dupliqué
16. [ ] Détection « localhost » dupliquée (et `.includes("10.")` trop large)
17. [ ] `loadEnvFile` appelé deux fois avec cast
18. [ ] `import` au milieu de `get-artists-tracks.ts`
19. [ ] `checkAndResetGame` reçoit `rooms`/`io` qui sont des variables de module
20. [ ] `room.answers` écrit mais jamais lu (candidat code mort)
