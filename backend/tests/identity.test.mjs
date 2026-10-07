// Identité des joueurs : l'id secret (reconnexion) ne sort jamais du serveur, les autres
// joueurs ne voient qu'un identifiant public, et personne ne peut prendre la place d'un
// autre. Aucun accès réseau externe nécessaire.
import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const connect = async () => {
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => s.on("connect", r));
  return s;
};

const SECRET_A = "secret-alice-0001";
const SECRET_B = "secret-bob-0002";
const SECRET_E = "secret-eve-0003";
const PLAYLIST_SECRET = "https://example.invalid/playlist/mon-lien-prive";

// Tout ce qu'un client reçoit, sérialisé, pour y chercher des fuites
const record = (socket) => {
  const log = [];
  socket.onAny((event, ...args) => log.push(JSON.stringify([event, args])));
  return log;
};

const alice = await connect();
const logAlice = record(alice);
let aliceView = [];
alice.on("room_updated", (_c, players) => (aliceView = players));
alice.emit("create_game", SECRET_A, "Alice");
const code = await new Promise((r) => alice.once("room_created", r));

const bob = await connect();
const logBob = record(bob);
let bobView = [];
bob.on("room_updated", (_c, players) => (bobView = players));
bob.emit("join_game", code, SECRET_B, "Bob");
await sleep(400);

// 1. Pas de fuite : ni id secret ni lien de playlist, y compris après le lancement d'une partie
alice.on("game_started", () => alice.emit("send_playlist_url", PLAYLIST_SECRET));
bob.on("game_started", () => bob.emit("send_playlist_url", ""));
alice.emit("start_game");
await sleep(2500);
// Un nouvel envoi de la liste des joueurs, une fois le lien d'Alice enregistré par le serveur
bob.emit("ready", true);
await sleep(500);
const seenByBob = logBob.join("\n");
const seenByAlice = logAlice.join("\n");
check("l'id secret d'Alice n'est jamais reçu par Bob", !seenByBob.includes(SECRET_A));
check("l'id secret de Bob n'est jamais reçu par Alice (ni par lui-même)", !seenByAlice.includes(SECRET_B) && !seenByBob.includes(SECRET_B));
check("le lien de playlist d'Alice n'est jamais reçu par Bob", !seenByBob.includes("mon-lien-prive"));
check("aucun champ interne dans les joueurs (playlistUrl, tracks, publicId)", !/"(playlistUrl|tracks|publicId|inLobby)"/.test(seenByBob));

// 2. Identifiants publics : distincts, et le joueur se retrouve par sa socket
const pubAlice = bobView.find((p) => p.name === "Alice");
const pubBob = bobView.find((p) => p.name === "Bob");
check("chaque joueur a un identifiant public distinct de son id secret", !!pubAlice?.id && !!pubBob?.id && pubAlice.id !== pubBob.id && pubAlice.id !== SECRET_A && pubBob.id !== SECRET_B);
check("socketId fourni : chacun retrouve sa propre entrée", pubBob?.socketId === bob.id && aliceView.find((p) => p.name === "Alice")?.socketId === alice.id);

// 3. Usurpation : Eve connaît le code de la room et tous les ids publics qu'elle reçoit
const eve = await connect();
let eveView = [];
eve.on("room_updated", (_c, players) => (eveView = players));
eve.emit("join_game", code, SECRET_E, "Eve");
await sleep(400);
const stolenIds = eveView.map((p) => p.id).filter((id) => id !== eveView.find((p) => p.name === "Eve")?.id);
for (const stolen of stolenIds) eve.emit("join_game", code, stolen, "Eve-usurpatrice");
await sleep(500);
const alice2 = aliceView.find((p) => p.name === "Alice");
check("Alice reste hôte avec sa socket après les tentatives d'Eve", alice2?.isHost === true && alice2?.socketId === alice.id);

let settings = [];
alice.on("game-setting", (k, v) => settings.push([k, v]));
eve.emit("music_amount", 9); // Eve essaie d'agir comme hôte
alice.emit("music_amount", 5);
await sleep(500);
check("Eve ne peut pas régler la partie, Alice si", JSON.stringify(settings) === JSON.stringify([["music_amount", 5]]), JSON.stringify(settings));

// 4. Reconnexion légitime avec l'id secret : même identifiant public, toujours hôte
const alice3 = await connect();
let view3 = [];
alice3.on("room_updated", (_c, players) => (view3 = players));
alice3.emit("join_game", code, SECRET_A, "Alice");
await sleep(500);
const back = view3.find((p) => p.name === "Alice");
check("reconnexion avec le bon id secret : même identifiant public et hôte", back?.id === pubAlice.id && back?.isHost === true && back?.socketId === alice3.id);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
