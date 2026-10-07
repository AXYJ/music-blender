# Points à discuter (après AUDIT.md)

Sujets repérés pendant l'audit qui demandent une décision, pas une simple correction. Aucun n'est traité.

## Sécurité et triche
1. **Usurpation de joueur par son `id`.** Le serveur envoie `room.players` à tous les clients, `id` compris. N'importe quel joueur d'une room peut émettre `join_game(code, idDuVoisin, nom)` et prendre sa place, y compris celle de l'hôte. L'`id` sert à la fois d'identifiant public et de secret de reconnexion. Piste : un jeton secret par joueur, distinct de l'`id` affiché.
2. **La bonne réponse est côté client.** Le serveur envoie `toPlay` en entier (titres et artistes) dès le début, et le texte « La réponse est » est dans le DOM pendant la devinette. Un joueur peut tricher avec les outils de développement. Pour corriger, il faudrait envoyer la réponse seulement au moment de la révélation (le serveur notant déjà les réponses, c'est faisable), au prix d'un changement de protocole et d'une latence à la révélation.
3. **Abus du serveur ouvert** (suite de A4). Rien ne limite le nombre de sockets, de rooms ou d'appels `send_playlist_url` (Deezer, iTunes, Spotify, Groq). Piste : limite de débit par IP.

## Architecture
4. **Les rooms vivent en mémoire.** Un redémarrage du serveur (déploiement, crash, hébergeur qui met en veille) supprime toutes les parties en cours. Le front envoie un ping toutes les 5 minutes pour éviter la mise en veille (`useSocketListeners`). À décider : on assume (README : « aucune base de données ») ou on prévient les joueurs plus proprement.
5. **Estimation de l'écart d'horloge.** `gameClock.ts` ignore la latence réseau (`offset = serverNow - Date.now()` à la réception). Erreur de l'ordre de la moitié du temps aller, donc quelques dizaines de ms. Acceptable pour un tour de 37 s, à améliorer seulement si on veut une synchro plus fine entre joueurs.
6. **Types dupliqués front/back** (D2 de l'audit) : déjà divergents. Choix de fond : dossier partagé, paquet de types, ou duplication assumée.

## Qualité et outillage
7. ~~Aucun test dans le repo.~~ **Fait** : `npm test --prefix backend` (7 fichiers dans `backend/tests/`, serveur de test lancé automatiquement, `SKIP_NETWORK=1` pour éviter Deezer). Reste à décider si on veut les brancher sur une CI.
8. ~~Erreurs de lint déjà présentes.~~ **Fait** : `npm run lint` à 0 erreur et 0 warning (15 erreurs et 14 warnings au départ, dans 12 fichiers). Les lectures de `localStorage` passent par `useSyncExternalStore` (`utils/useLocalStorage.ts`) et la socket par `utils/socket.ts`.
9. ~~Variables inutilisées dans `Game.tsx`.~~ **Fait** (avec les autres warnings : imports inutiles, datalist de code de room jamais alimentée).
10. ~~README en retard.~~ **Fait** : `servor.ts`, structure complète, variables Groq et Spotify (optionnelles), section « Lancer les tests », Node 20.12+.
11. **Service worker : à confirmer dans un vrai Chrome.** Le fichier `sw.js` est valide (syntaxe vérifiée, servi en 200 `application/javascript`). Le navigateur intégré à l'app Claude refuse **même un service worker d'une ligne** (« unknown error occurred when fetching the script ») : le problème vient de ce navigateur, pas du projet. À vérifier à la main : ouvrir `http://localhost:3000` dans Chrome, DevTools, onglet Application, Service Workers : `sw.js` doit être « activated and running ». Point à surveiller ensuite : le service worker est enregistré par `InstallPrompt`, donc seulement sur les pages qui l'affichent (Home, Lobby), et aussi en développement.
