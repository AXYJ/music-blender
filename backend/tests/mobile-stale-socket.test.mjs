// Scénario mobile : l'hôte quitte pour Spotify, le téléphone coupe la socket (vieille socket
// encore "vivante" côté serveur), le client se reconnecte avec une NOUVELLE socket, puis
// l'ancienne socket est enfin détectée comme morte par le serveur.
// Le serveur de test utilise un délai de grâce de 3 s au lieu de 5 min.
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

for (const withGuest of [true, false]) {
  console.log(`\n--- ${withGuest ? "avec un invité dans la room" : "hôte seul"}`);
  const old = await connect();
  old.emit("create_game", "id-h", "Hote");
  const code = await new Promise((r) => old.once("room_created", r));
  let guest = null;
  let view = null; // vue des joueurs côté invité (ou côté nouvelle socket si seul)
  if (withGuest) {
    guest = await connect();
    guest.on("room_updated", (_c, players) => (view = players));
    guest.emit("join_game", code, "id-g", "Invite");
    await sleep(300);
  }

  // Retour sur le site : nouvelle socket, même id, join_game (comme l'effet de reconnexion)
  const fresh = await connect();
  fresh.on("room_updated", (_c, players) => !withGuest && (view = players));
  fresh.emit("join_game", code, "id-h", "Hote");
  await sleep(300);

  // Le serveur détecte enfin la mort de l'ancienne socket
  old.disconnect();
  await sleep(500);
  const host = () => view?.find((p) => p.name === "Hote");
  check("hôte toujours marqué connecté juste après la mort de l'ancienne socket", host()?.leavedPlayer === false, `(leavedPlayer=${host()?.leavedPlayer})`);

  // Après le délai de grâce (3 s dans ce serveur de test) l'hôte doit rester hôte
  await sleep(3500);
  check("hôte toujours hôte après le délai de grâce", host()?.isHost === true, `(isHost=${host()?.isHost})`);
  if (!withGuest) {
    const probe = await connect();
    probe.emit("join_game", code, "id-probe", "Probe");
    const err = await Promise.race([new Promise((r) => probe.once("error", r)), sleep(500).then(() => null)]);
    check("la room existe toujours", err !== "room_not_found", `(error=${err})`);
    probe.disconnect();
  }
  fresh.disconnect();
  guest?.disconnect();
  await sleep(200);
}

console.log(results.every(Boolean) ? "\nTOUT OK" : "\nECHEC");
process.exit(results.every(Boolean) ? 0 : 1);
