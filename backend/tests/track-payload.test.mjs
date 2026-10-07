// Ce que les clients reçoivent des morceaux : les champs internes de correction des
// réponses (_normalizedName, _requiredArtists…) restent sur le serveur, qui continue de
// corriger. Joue une vraie partie avec un album Deezer : accès internet requis.
import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const ALBUM = "https://www.deezer.com/album/302127"; // Discovery (Daft Punk)
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
a.emit("create_game", "payload-a", "Alice");
const code = await new Promise((r) => a.once("room_created", r));
const b = await connect();
b.emit("join_game", code, "payload-b", "Bob");
await sleep(300);

const raw = [];
a.on("data_loaded", (toPlay) => raw.push({ event: "data_loaded", toPlay }));
a.on("game_started", () => a.emit("send_playlist_url", ALBUM));
b.on("game_started", () => b.emit("send_playlist_url", ""));
a.emit("start_game");
for (let i = 0; i < 300 && !raw.length; i++) await sleep(200);
check("la partie démarre (data_loaded reçu)", raw.length === 1);
if (!raw.length) process.exit(1);

// Reconnexion en cours de partie : game_reconnected contient aussi les morceaux
const a2 = await connect();
a2.on("game_reconnected", (data) => raw.push({ event: "game_reconnected", toPlay: data.toPlay }));
a2.emit("join_game", code, "payload-a", "Alice");
await sleep(800);
check("game_reconnected reçu", raw.some((r) => r.event === "game_reconnected"));

for (const { event, toPlay } of raw) {
  const internalKeys = [...new Set(toPlay.flatMap((t) => Object.keys(t)).filter((k) => k.startsWith("_")))];
  check(`${event} : aucun champ interne (_*)`, internalKeys.length === 0, JSON.stringify(internalKeys));
  check(
    `${event} : les champs utiles au jeu sont là`,
    toPlay.length > 0 && toPlay.every((t, i) => t.order === i + 1 && t.name && t.artist && t.previewUrl && "imageUrl" in t),
  );
}

// Le serveur corrige toujours les réponses avec ses champs internes
const first = raw[0].toPlay[0];
a2.emit("submit_answer", first.artist, first.name, 1);
await sleep(600);
a2.emit("get_final_scores");
const players = await new Promise((r) => a2.once("final_scores", r));
check("bonne réponse corrigée côté serveur : 2 points", players.find((p) => p.name === "Alice")?.score === 2, `(score=${players.find((p) => p.name === "Alice")?.score})`);

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
