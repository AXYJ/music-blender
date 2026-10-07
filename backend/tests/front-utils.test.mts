// Fonctions pures du frontend : horloge de partie et détection du réseau local.
// Pas de serveur nécessaire.
import { getClockState } from "../../frontend/src/utils/gameClock.ts";
import { isLocalHost } from "../../frontend/src/utils/config.ts";

let ok = true;
const check = (name: string, cond: boolean, extra = "") => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const eq = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

// --- Horloge : 30 s de devinette, 5 s de révélation, 2 s de transition = 37 s par tour ---
const realNow = Date.now;
const START = 1_000_000_000_000;
const at = (seconds: number, offset = 0, trackCount = 3) => {
  Date.now = () => START - offset + seconds * 1000; // heure locale = heure serveur - offset
  return getClockState({ startTime: START, offset, time: 30 }, trackCount);
};

check("t=0 : tour 1, devinette, 30 s", eq(at(0), { turn: 1, phase: "guessing", timeLeft: 30 }));
check("t=29.9 : devinette, 1 s", eq(at(29.9), { turn: 1, phase: "guessing", timeLeft: 1 }));
check("t=30 : révélation, 5 s", eq(at(30), { turn: 1, phase: "answer", timeLeft: 5 }));
check("t=35 : transition, 2 s", eq(at(35), { turn: 1, phase: "transition", timeLeft: 2 }));
check("t=37 : tour 2, devinette", eq(at(37), { turn: 2, phase: "guessing", timeLeft: 30 }));
check("dernier morceau, fin de révélation : résultats", eq(at(74 + 35), { turn: 4, phase: "answer", timeLeft: 0 }));
check("dernier morceau, encore en révélation", eq(at(74 + 34), { turn: 3, phase: "answer", timeLeft: 1 }));
check("bien après la fin : résultats", at(1000).turn === 4);
check("horloge locale décalée de 10 min : même résultat grâce à offset", eq(at(31, 600_000), { turn: 1, phase: "answer", timeLeft: 4 }));
check("retour de veille (120 s) : résultats", at(120).turn === 4);
check("retour de veille (80 s) : tour 3, devinette", eq(at(80), { turn: 3, phase: "guessing", timeLeft: 24 }));
Date.now = realNow;

// --- Réseau local : jamais le serveur public ---
for (const h of ["localhost", "127.0.0.1", "192.168.1.42", "10.0.0.7", "mon-pc.local"]) {
  check(`${h} est local`, isLocalHost(h));
}
for (const h of [
  "museek.xiao-web.com",
  "music-blender-serv.xiao-web.com",
  "10.example.com",
  "exe10.com",
  "localhost.evil.com",
  "192.168.1.x",
  "8.8.8.8",
]) {
  check(`${h} n'est pas local`, !isLocalHost(h));
}

console.log(ok ? "\nTOUT OK" : "\nECHEC");
process.exit(ok ? 0 : 1);
