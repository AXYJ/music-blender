import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const PLAYLIST = "https://www.deezer.com/playlist/3155776842";
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

// --- Partie en cours : Alice (hôte) + Bob, playlist Deezer ---
const a = await connect();
a.emit("create_game", "id-a", "Alice");
const code = await new Promise((r) => a.once("room_created", r));
const b = await connect();
let bPlayers = [];
b.on("room_updated", (_c, players) => (bPlayers = players));
b.emit("join_game", code, "id-b", "Bob");
await sleep(300);

a.on("game_started", () => a.emit("send_playlist_url", PLAYLIST));
b.on("game_started", () => b.emit("send_playlist_url", ""));
const loaded = new Promise((r) => a.once("data_loaded", (toPlay, _a, _t, timing) => r({ toPlay, timing })));
const t0 = Date.now();
a.emit("start_game");
const { toPlay, timing } = await Promise.race([loaded, sleep(60000).then(() => ({}))]);
check("data_loaded envoyé avec l'horloge de partie", !!timing && !!toPlay?.length, JSON.stringify(timing));
if (!timing) process.exit(1);
check(
  "horloge cohérente (démarrage <= maintenant serveur, temps de jeu = 30)",
  timing.gameStartTime <= timing.serverNow && timing.serverNow - timing.gameStartTime < 2000 && timing.time === 30,
);

// --- Reconnexion de Bob avec une nouvelle socket, en cours de partie ---
const b2 = await connect();
const reco = new Promise((r) => b2.once("game_reconnected", r));
b2.emit("join_game", code, "id-b", "Bob");
const state = await Promise.race([reco, sleep(3000).then(() => null)]);
check(
  "game_reconnected : tour 1, devinette, temps restant <= 30, horloge fournie",
  state?.turn === 1 && state.phase === "guessing" && state.timeLeft <= 30 && state.timeLeft >= 1 && !!state.timing && state.timing.gameStartTime === timing.gameStartTime,
  state ? `(turn=${state.turn} phase=${state.phase} timeLeft=${state.timeLeft})` : "(rien reçu)",
);

// --- Un nouveau joueur qui arrive en cours de partie reçoit aussi l'état ---
const c = await connect();
const recoC = new Promise((r) => c.once("game_reconnected", r));
c.emit("join_game", code, "id-c", "Carol");
const stateC = await Promise.race([recoC, sleep(3000).then(() => null)]);
check("nouveau joueur en cours de partie : game_reconnected reçu", stateC?.turn === 1 && !!stateC.timing);

// --- L'hôte quitte pendant la partie : un autre joueur devient hôte ---
let seenByB = null;
b2.on("room_updated", (_c, players) => (seenByB = players));
a.emit("leave_game");
await sleep(500);
const hosts = seenByB?.filter((p) => p.isHost).map((p) => p.name);
check("hôte parti en pleine partie : un joueur restant devient hôte", hosts?.length === 1 && hosts[0] !== "Alice", JSON.stringify(hosts));

// --- Room pleine : un joueur existant peut se reconnecter, un nouveau est refusé ---
const h = await connect();
h.emit("create_game", "id-h0", "H0");
const fullCode = await new Promise((r) => h.once("room_created", r));
const fillers = [];
for (let i = 1; i < 12; i++) {
  const s = await connect();
  s.emit("join_game", fullCode, `id-h${i}`, `H${i}`);
  fillers.push(s);
}
await sleep(500);
const extra = await connect();
const errExtra = new Promise((r) => extra.once("error", r));
extra.emit("join_game", fullCode, "id-new", "Nouveau");
check("13e joueur refusé (room_full)", (await Promise.race([errExtra, sleep(1000).then(() => null)])) === "room_full");
const back = await connect();
let errBack = null;
back.on("error", (e) => (errBack = e));
back.emit("join_game", fullCode, "id-h5", "H5");
await sleep(500);
check("joueur existant d'une room pleine : reconnexion acceptée", errBack === null, `(error=${errBack})`);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
