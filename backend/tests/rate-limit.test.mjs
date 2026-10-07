// Limites par adresse IP sur un vrai serveur. Ce test lance son propre serveur avec des
// limites très basses ; X-Forwarded-For (TRUST_PROXY=1) sert à simuler plusieurs adresses.
import { io } from "socket.io-client";
import { startServer } from "./server.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

const port = Number(process.env.TEST_PORT ?? 4100) + 1;
const server = await startServer(port, {
  TRUST_PROXY: "1",
  RATE_LIMIT_ROOMS: "3",
  RATE_LIMIT_PLAYLISTS: "2",
  RATE_LIMIT_BAD_JOINS: "3",
  MAX_SOCKETS_PER_IP: "6",
});

// Un client dont l'adresse est ip. Les erreurs et les événements reçus sont enregistrés.
async function client(ip) {
  const s = io(server.url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
    extraHeaders: { "x-forwarded-for": ip },
  });
  s.log = { errors: [], created: 0, events: [] };
  s.on("error", (e) => s.log.errors.push(e));
  s.on("room_created", () => s.log.created++);
  s.onAny((event) => s.log.events.push(event));
  await new Promise((resolve, reject) => {
    s.on("connect", resolve);
    s.on("connect_error", reject);
  });
  return s;
}

try {
  // 1. Créations de room : 3 par minute et par adresse
  const a = await client("10.0.0.1");
  for (let i = 0; i < 4; i++) a.emit("create_game", "a" + i, "A");
  await sleep(500);
  check("3 rooms créées puis la 4e refusée", a.log.created === 3 && a.log.errors.includes("rate_limited"), JSON.stringify(a.log.errors));
  const b = await client("10.0.0.2");
  b.emit("create_game", "b0", "B");
  await sleep(300);
  check("une autre adresse peut créer une room", b.log.created === 1);

  // 2. Codes inexistants : 3 essais, puis même un code valide est refusé
  const owner = await client("10.0.0.4");
  owner.emit("create_game", "owner", "Owner");
  const validCode = await new Promise((r) => owner.once("room_created", r));
  const scanner = await client("10.0.0.3");
  for (let i = 0; i < 3; i++) scanner.emit("join_game", "ZZZZZ" + i, "scan", "Scanner");
  await sleep(400);
  check("3 codes inexistants : room_not_found", scanner.log.errors.filter((e) => e === "room_not_found").length === 3, JSON.stringify(scanner.log.errors));
  scanner.log.errors.length = 0;
  scanner.emit("join_game", validCode, "scan", "Scanner");
  await sleep(400);
  check("4e essai avec un code VALIDE : refusé (rate_limited)", scanner.log.errors.includes("rate_limited") && !scanner.log.events.includes("room_updated"), JSON.stringify(scanner.log.errors));
  const friend = await client("10.0.0.5");
  friend.emit("join_game", validCode, "friend", "Friend");
  await sleep(400);
  check("une autre adresse rejoint normalement", friend.log.events.includes("room_updated") && friend.log.errors.length === 0, JSON.stringify(friend.log.errors));

  // 3. Chargements de playlists : 2 par minute, le 3e joue sans playlist sans bloquer la partie
  const p = await client("10.0.0.6");
  p.emit("create_game", "p1", "Joueur");
  await new Promise((r) => p.once("room_created", r));
  p.on("game_started", () => p.emit("send_playlist_url", "https://127.0.0.1/playlist/abc"));
  const cycles = [];
  for (let i = 0; i < 3; i++) {
    p.log.errors.length = 0;
    p.log.events.length = 0;
    p.emit("start_game");
    await sleep(1500);
    cycles.push({ errors: [...p.log.errors], noPlaylist: p.log.events.includes("no_playlist") });
  }
  check("chargements 1 et 2 : lien traité (refusé comme non autorisé)", cycles[0].errors.some((e) => e.startsWith("playlist_load_error")) && cycles[1].errors.some((e) => e.startsWith("playlist_load_error")), JSON.stringify(cycles.slice(0, 2)));
  check("chargement 3 : rate_limited, et la partie n'est pas bloquée (no_playlist)", cycles[2].errors.includes("rate_limited") && cycles[2].noPlaylist, JSON.stringify(cycles[2]));

  // 4. Connexions simultanées : 6 par adresse
  const sockets = [];
  for (let i = 0; i < 6; i++) sockets.push(await client("10.0.0.7"));
  let refused = null;
  try {
    await client("10.0.0.7");
  } catch (e) {
    refused = e.message;
  }
  check("7e connexion simultanée refusée", refused === "too_many_connections", String(refused));
  sockets[0].disconnect();
  await sleep(300);
  let reopened = true;
  try {
    (await client("10.0.0.7")).disconnect();
  } catch {
    reopened = false;
  }
  check("une place libérée permet de se reconnecter", reopened);
  const other = await client("10.0.0.8");
  check("une autre adresse n'est pas touchée", other.connected);
  other.disconnect();
  sockets.forEach((s) => s.disconnect());
} finally {
  server.stop();
}

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
