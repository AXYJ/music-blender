// Démarrage d'un serveur de test : utilisé par le lanceur (run.mjs) et par les tests qui ont
// besoin de leur propre serveur avec une configuration particulière.
import { spawn, spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const backend = dirname(dirname(fileURLToPath(import.meta.url)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startServer(port, env = {}) {
  const child = spawn("npx", ["tsx", "servor.ts"], {
    cwd: backend,
    env: { ...process.env, PORT: String(port), ...env },
    stdio: "ignore",
    shell: true,
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  };
  process.on("exit", stop);

  const url = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return { url, stop };
    } catch {
      // pas encore prêt
    }
    await sleep(200);
  }
  stop();
  throw new Error(`Le serveur de test ne répond pas sur ${url}`);
}
