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

const a = await connect();
a.emit("create_game", "id-a", "Alice");
const code = await new Promise((r) => a.once("room_created", r));
const b = await connect();
b.emit("join_game", code, "id-b", "Bob");
await sleep(300);
a.emit("music_amount", 7);
a.emit("time", 15);
await sleep(300);

// Retour au lobby : tous les joueurs sont au lobby, la room se réinitialise
const resetA = new Promise((r) => a.once("game_reset", (rules, players) => r({ rules, players })));
const resetB = new Promise((r) => b.once("game_reset", (rules, players) => r({ rules, players })));
a.emit("restart_game");
const [ra, rb] = await Promise.all([resetA, resetB].map((p) => Promise.race([p, sleep(2000).then(() => null)])));
check("game_reset reçu par les deux joueurs avec les règles conservées", ra?.rules?.musicAmount === 7 && ra?.rules?.time === 15 && rb?.rules?.time === 15, JSON.stringify(ra?.rules));
check("joueurs remis à zéro (score 0, hôte prêt, invité non prêt)", ra?.players?.length === 2 && ra.players.every((p) => p.score === 0) && ra.players.find((p) => p.isHost)?.isReady === true && ra.players.find((p) => !p.isHost)?.isReady === false);

// Un joueur quitte : checkAndResetGame est appelé sans erreur, la room continue
let seen = null;
a.on("room_updated", (_c, players) => (seen = players));
b.emit("leave_game");
await sleep(500);
check("départ d'un joueur : room mise à jour, un seul joueur restant", seen?.length === 1 && seen[0].name === "Alice");
const alive = await fetch(URL).then((r) => r.ok).catch(() => false);
check("serveur vivant", alive);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
