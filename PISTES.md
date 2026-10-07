# Défauts repérés, restant à corriger

Trouvés en testant une vraie playlist mêlant japonais, chinois et latin
(<https://open.spotify.com/playlist/7tJqeQnOrMHg0H7zXoLwAy>). Rien de ce qui suit n'est corrigé.
Les défauts de cette même série qui ont été corrigés (espaces insécables, parenthèses pleine
largeur, `feat.` en chinois, voyelles longues et kanji restants) sont couverts par les tests
`backend/tests/mixed-languages.test.mts` et `backend/tests/live-mixed-playlist.test.mjs`.

## 1. Un groupe dont le nom contient « and », « & » ou « with » est noté 0 (le plus important)

Quand le joueur saisit le nom du groupe tel qu'il est écrit, il n'est pas reconnu. Valable pour
toutes les langues, donc probablement déjà vécu par les joueurs.

| Artiste saisi tel quel | Découpage par le serveur | Note obtenue |
|---|---|---|
| `Simon & Garfunkel` | `Simon`, `Garfunkel` | 0 |
| `Hall & Oates` | `Hall`, `Oates` | 0 |
| `Florence and the Machine` | `Florence`, `the Machine` | 0 |
| `Mumford and Sons` | `Mumford`, `Sons` | 0 |
| `Sofia Carson with Alvaro Soler` | `Sofia Carson`, `Alvaro Soler` | 0 (ici c'est normal : deux artistes, mais un seul bloc saisi) |
| `Earth, Wind & Fire` | `Earth`, `Wind`, `Fire` | 0,5 |

**Cause.** `splitArtists` ([backend/scripts/answers.ts](backend/scripts/answers.ts)) coupe l'artiste
sur `,`, `&`, `and`, `feat.`, `with`… pour obtenir la liste des artistes exigés. La saisie du joueur,
elle, n'est coupée qu'aux virgules : « Simon & Garfunkel » reste un seul bloc qui ne correspond à
aucun des deux artistes.

**Piste.** Dans `scoreAnswer`, accepter aussi une saisie dont la version normalisée est égale au nom
complet de l'artiste (écriture d'origine ou version internationale), avec la note 1. Petit
changement, puis un test avec les groupes du tableau (un cas par ligne).

## 2. Sans Groq, le japonais romanisé est collé sans espaces

En repli local, `聖者の行進` devient `seijanokoshin` : une saisie « seija no koshin » est refusée.
Avec Groq, les romanisations ont des espaces (« Toku Ni Nai ») et la casse est ignorée par la
correction, donc le cas ne se pose pas.

**Quand le repli local sert-il ?** Pas seulement sans clé : pendant les tests, j'ai vu Groq refuser
une requête (« Request too large … output tokens per minute (OTPM) : Limit 1000 »). Le serveur
envoie à Groq tous les titres non ASCII de la playlist (pas seulement ceux qui seront joués) ; avec
plusieurs parties dans la même minute, le repli local est donc plausible en production.

**Pistes** (non exclusives) :
- mode « spaced » de Kuroshiro dans `transliterateText` ([backend/scripts/get-artists-tracks.ts](backend/scripts/get-artists-tracks.ts)) ;
- une comparaison qui ignore espaces et ponctuation (`normalizeString` ou une variante) : « seija no
  koshin » et « seijanokoshin » deviennent équivalents, quelle que soit l'origine de la romanisation.

## 3. Sans Groq, un titre en kanji seuls est lu en chinois

Sans kana dans le titre, rien n'indique que c'est du japonais, donc `transliterateText` utilise la
bibliothèque de translittération (pinyin) :

| Titre | Lu en local | Lecture japonaise attendue |
|---|---|---|
| `踊` | `Yong` | `Odoru` |
| `足跡` | `Zu Ji` | `Ashiato` |
| `白夜` | `Bai Ye` | `Byakuya` |
| `記念撮影` | `Ji Nian Cuo Ying` | `Kinen satsuei` |

La réponse dans l'écriture d'origine reste acceptée : seul l'affichage et la saisie en lettres
latines sont touchés.

**Piste.** Si la playlist contient du kana (ou si un autre champ du même morceau en contient), lire
les kanji seuls avec Kuroshiro plutôt qu'en pinyin. Heuristique à la playlist, pas au titre seul.

## 4. Groq n'est pas toujours exact (information, pas d'action prévue)

Exemples : `聖者の行進` romanisé `Seisha No Koushin` (au lieu de `Seija no Kōshin`) ; `Drowing沉陷`
devenu `Drowning Chen Xian` (il corrige l'orthographe). La saisie dans l'écriture d'origine est
toujours acceptée, donc sans conséquence grave pour le score.

## Pour reprendre

- Lancer les tests : `npm test --prefix backend` (tout), ou `npm test --prefix backend -- mixed-languages`
  (seulement les playlists multilingues). `SKIP_NETWORK=1` saute les tests qui chargent de vraies playlists.
- Code concerné : [backend/scripts/answers.ts](backend/scripts/answers.ts) (correction des réponses),
  [backend/scripts/get-artists-tracks.ts](backend/scripts/get-artists-tracks.ts) (version internationale
  des noms), jeu d'essai des tests : [backend/tests/fixtures/mixed-languages.json](backend/tests/fixtures/mixed-languages.json).
