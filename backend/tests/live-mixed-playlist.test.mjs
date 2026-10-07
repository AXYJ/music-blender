// Bout en bout avec une vraie playlist Spotify mêlant japonais, chinois et latin : le serveur la
// charge (lecture Spotify, romanisation Groq si une clé est configurée, sinon traitement local),
// puis on vérifie ce que reçoivent les joueurs. Internet requis ; dépend de cette playlist
// publique et de la page de lecture de Spotify (un changement de l'un ou de l'autre fait échouer
// le test : c'est voulu, il avertit que le chargement des playlists ne marche plus).
import { io } from "socket.io-client";
import { prepareTrack, scoreAnswer } from "../scripts/answers.ts";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const PLAYLIST = "https://open.spotify.com/playlist/7tJqeQnOrMHg0H7zXoLwAy?si=2cd3d184faab4102";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};
// Une romanisation Groq peut garder des voyelles longues (ō, ā) : la correction les ignore,
// on accepte donc les accents mais plus aucune autre écriture
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const isLatin = (s) => /^[\x00-\x7F]*$/.test(stripAccents(s));
const hasOddSpaces = (s) => /[ 　 -  ]/.test(s);

const a = await io(URL, { transports: ["websocket"], forceNew: true });
await new Promise((r) => a.on("connect", r));
a.emit("create_game", "live-mixed", "Alice");
await new Promise((r) => a.once("room_created", r));
a.emit("music_amount", 30);
await sleep(200);

let data = null;
const errors = [];
a.on("error", (e) => errors.push(e));
a.on("data_loaded", (toPlay, artists, tracks) => (data = { toPlay, artists, tracks }));
a.on("game_started", () => a.emit("send_playlist_url", PLAYLIST));
a.emit("start_game");
for (let i = 0; i < 450 && !data && !errors.length; i++) await sleep(200);
a.disconnect();

check("la playlist est chargée", !!data, JSON.stringify(errors));
if (!data) process.exit(1);
const { toPlay, artists, tracks } = data;
const nonAscii = tracks.filter((t) => /[^\x00-\x7F]/.test(t.name)).length;
console.log(`  (${tracks.length} titres dans la base d'autocomplétion, dont ${nonAscii} non ASCII ; ${artists.length} artistes ; ${toPlay.length} morceaux joués)`);

check("la playlist est bien mélangée : plus de 30 % de titres non ASCII", tracks.length > 0 && nonAscii / tracks.length > 0.3);
check("au moins 80 titres chargés", tracks.length >= 80, `(${tracks.length})`);

// Ce que voit le joueur dans la liste d'autocomplétion
check("chaque titre a une version internationale latine non vide", tracks.every((t) => t.internationalName && isLatin(t.internationalName)), JSON.stringify(tracks.filter((t) => !t.internationalName || !isLatin(t.internationalName)).slice(0, 3)));
check("chaque artiste a une version internationale latine non vide", artists.every((a) => a.internationalArtist && isLatin(a.internationalArtist)), JSON.stringify(artists.filter((a) => !a.internationalArtist || !isLatin(a.internationalArtist)).slice(0, 3)));
check("aucune espace insécable ou pleine largeur dans les noms", [...tracks.map((t) => t.name), ...artists.map((a) => a.artist), ...toPlay.flatMap((t) => [t.name, t.artist])].every((s) => !hasOddSpaces(s)));
check("la base ne contient pas deux fois le même titre", new Set(tracks.map((t) => t.name.toLowerCase())).size === tracks.length);

// Les morceaux joués : la correction accepte l'écriture d'origine comme la version internationale
const full = { artistScore: 1, trackCorrect: true };
const bad = [];
for (const t of toPlay) {
  const p = prepareTrack(t, 0);
  const original = scoreAnswer(p, t.artist, t.name);
  const international = scoreAnswer(p, t.internationalArtist, t.internationalName);
  if (JSON.stringify(original) !== JSON.stringify(full) || JSON.stringify(international) !== JSON.stringify(full)) {
    bad.push({ artist: t.artist, name: t.name, ia: t.internationalArtist, in: t.internationalName, original, international });
  }
}
check(`morceaux joués (${toPlay.length}) : réponse d'origine et réponse internationale acceptées`, bad.length === 0, JSON.stringify(bad.slice(0, 2)));
check("morceaux joués : aucun champ interne de correction envoyé", toPlay.every((t) => Object.keys(t).every((k) => !k.startsWith("_"))));

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
