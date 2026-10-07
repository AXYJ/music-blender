import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const alive = async () => {
  try {
    return (await fetch(URL)).ok;
  } catch {
    return false;
  }
};
const connect = async () => {
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => s.on("connect", r));
  return s;
};

// Salon : Alice (hôte), Bob, Carol, tous dans le lobby
const a = await connect();
a.emit("create_game", "id-a", "Alice");
const code = await new Promise((r) => a.once("room_created", r));
const b = await connect();
const c = await connect();
let lastUpdate = null;
c.on("room_updated", (_code, players) => (lastUpdate = players));
b.emit("join_game", code, "id-b", "Bob");
c.emit("join_game", code, "id-c", "Carol");
await sleep(500);

// 1. L'hôte se déconnecte alors que d'autres joueurs sont là (cas qui plantait)
a.disconnect();
await sleep(500);
check("serveur vivant après déconnexion de l'hôte", await alive());
check(
  "room_updated reçu, joueurs sérialisables sans minuteur",
  Array.isArray(lastUpdate) && lastUpdate.length === 3 && !JSON.stringify(lastUpdate).includes("disconnectTimeout"),
  `(${lastUpdate?.map((p) => p.name + (p.leavedPlayer ? "[off]" : "")).join(", ")})`,
);
check("Alice marquée déconnectée", lastUpdate?.find((p) => p.name === "Alice")?.leavedPlayer === true);

// 2. Un non-hôte du lobby se déconnecte
b.disconnect();
await sleep(500);
check("serveur vivant après déconnexion d'un non-hôte", await alive());

// 3. Alice revient (même id) dans le délai de grâce : elle redevient active et hôte
const a2 = await connect();
a2.emit("join_game", code, "id-a", "Alice");
await sleep(500);
const alice = lastUpdate?.find((p) => p.name === "Alice");
check("Alice reconnectée : active et hôte", alice?.leavedPlayer === false && alice?.isHost === true);

// 4. leave_game après un minuteur posé : pas de crash
c.disconnect();
await sleep(300);
a2.emit("leave_game");
await sleep(500);
check("serveur vivant après leave_game", await alive());

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
