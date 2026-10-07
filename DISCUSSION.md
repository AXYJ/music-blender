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
7. **Aucun test dans le repo.** Les tests écrits pendant l'audit (réponses, déconnexions, paramètres, reconnexion mobile, horloge) sont dans le dossier temporaire de la session. On peut les ajouter au repo (`backend/tests/`, lancés avec `tsx`) pour les rejouer.
8. **Erreurs de lint déjà présentes** : `react-hooks/set-state-in-effect` dans `GameContext.tsx` (3) et `LanguageContext.tsx` (1), `react-hooks/refs` dans `useSocketListeners.ts` (2). Demandent de repenser l'initialisation depuis `localStorage` (état initial paresseux) plutôt que `setState` dans un effet.
9. **Variables inutilisées dans `Game.tsx`** : `restart` et `quitGame` sont déclarés et jamais utilisés.
10. **README en retard** : cite `servor.js` (le fichier est `servor.ts`), ne parle pas de `AUDIT.md` ni de `DISCUSSION.md`, et la section « Structure » ne mentionne ni `types/` ni `utils/gameClock.ts`.
11. **Erreurs de service worker en développement** : `SW registration failed ... sw.js` dans la console du navigateur intégré. À vérifier dans un vrai navigateur et en production avant de conclure que c'est sans conséquence.
