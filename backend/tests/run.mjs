// Lanceur de tests : démarre le serveur sur un port de test, exécute chaque fichier
// *.test.mjs / *.test.mts, puis arrête le serveur.
//
//   npm test                      tous les tests
//   npm test -- reset answers     seulement les fichiers dont le nom contient un de ces mots
//   SKIP_NETWORK=1 npm test       sans les tests qui chargent de vraies playlists Deezer
import { spawn, spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backend = dirname(here);
const PORT = process.env.TEST_PORT ?? "4100";
const URL = `http://localhost:${PORT}`;

// Ces tests jouent une vraie partie avec une playlist Deezer : internet requis
const NEEDS_NETWORK = ["answers", "reconnection", "track-payload"];

const filters = process.argv.slice(2);
const files = readdirSync(here)
  .filter((f) => /\.test\.m?[jt]s$/.test(f))
  .filter((f) => filters.length === 0 || filters.some((word) => f.includes(word)))
  .filter((f) => !(process.env.SKIP_NETWORK && NEEDS_NETWORK.some((n) => f.includes(n))))
  .sort();

// Les tests sans serveur (fonctions pures) n'en ont pas besoin
const NO_SERVER = ["front-utils", "allowed-url"];
const needsServer = files.some((f) => !NO_SERVER.some((n) => f.startsWith(n)));

let server = null;
function stopServer() {
  if (!server) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}
process.on("exit", stopServer);
process.on("SIGINT", () => process.exit(130));

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Le serveur de test ne répond pas sur ${URL}`);
}

if (needsServer) {
  // Délai de grâce réduit à 3 s pour tester les déconnexions sans attendre 5 minutes
  server = spawn("npx", ["tsx", "servor.ts"], {
    cwd: backend,
    env: { ...process.env, PORT, GRACE_PERIOD_MS: "3000" },
    stdio: "ignore",
    shell: true,
  });
  await waitForServer();
}

let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", join(here, file)], {
    env: { ...process.env, TEST_URL: URL },
    stdio: "inherit",
  });
  if (result.status !== 0) failed++;
}

stopServer();
console.log(failed === 0 ? `\n${files.length} fichier(s) de test : tout est OK` : `\n${failed} fichier(s) en échec sur ${files.length}`);
process.exit(failed === 0 ? 0 : 1);
