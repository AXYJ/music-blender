// Un joueur ne peut pas faire appeler une adresse arbitraire par le serveur.
// "Cible" = petit serveur HTTP local qui note les requêtes reçues, il joue le rôle d'un
// service interne que le serveur ne doit jamais contacter. Pas d'accès internet requis.
import http from "node:http";
import { io } from "socket.io-client";

const URL = process.env.TEST_URL ?? "http://localhost:4100";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};

const hits = [];
const target = http.createServer((req, res) => {
  hits.push(`${req.method} ${req.url}`);
  res.end("<html></html>");
});
await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
const port = target.address().port;

async function tryLink(label, playlistUrl) {
  hits.length = 0;
  const s = io(URL, { transports: ["websocket"], forceNew: true });
  await new Promise((r) => s.on("connect", r));
  const errors = [];
  s.on("error", (e) => errors.push(e));
  s.on("game_started", () => s.emit("send_playlist_url", playlistUrl));
  s.emit("create_game", "ssrf-" + label, "Testeur");
  await new Promise((r) => s.once("room_created", r));
  s.emit("start_game");
  await sleep(2000);
  s.disconnect();
  return { contacts: [...hits], errors };
}

const liens = {
  "lien court local": `http://127.0.0.1:${port}/lien-court`,
  "faux lien Apple Music": `http://127.0.0.1:${port}/playlist/abc123?x=music.apple.com`,
  "faux lien Deezer en paramètre": `http://127.0.0.1:${port}/playlist/abc123?x=deezer.com`,
  "identifiants dans le lien": `https://deezer.com@127.0.0.1:${port}/playlist/abc123`,
};
for (const [label, lien] of Object.entries(liens)) {
  const { contacts, errors } = await tryLink(label, lien);
  check(`${label} : la cible n'est jamais contactée`, contacts.length === 0, JSON.stringify(contacts));
  check(`${label} : le joueur reçoit une erreur de playlist`, errors.some((e) => String(e).startsWith("playlist_load_error")), JSON.stringify(errors));
}

target.close();
console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
