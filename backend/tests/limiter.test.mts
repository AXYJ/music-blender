// Briques des limites par IP : fenêtre glissante, lecture de l'adresse du client et
// plafond des caches. Sans serveur ni réseau (l'horloge est simulée).
import { SlidingWindowLimiter, getClientIp, setBounded } from "../scripts/rate-limit.ts";

let ok = true;
const check = (name: string, cond: boolean, extra = "") => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};

// --- Fenêtre glissante ---
let now = 1_000_000;
const limiter = new SlidingWindowLimiter(3, 60_000, () => now);
check("3 événements autorisés", limiter.tryHit("a") && limiter.tryHit("a") && limiter.tryHit("a"));
check("le 4e est refusé", !limiter.tryHit("a"));
check("isBlocked ne consomme rien", limiter.isBlocked("a") && limiter.isBlocked("a"));
check("une autre clé n'est pas touchée", limiter.tryHit("b") && !limiter.isBlocked("b"));
now += 59_000;
check("toujours bloqué à 59 s", limiter.isBlocked("a"));
now += 1_001;
check("débloqué après la fenêtre de 60 s", !limiter.isBlocked("a") && limiter.tryHit("a"));

const joins = new SlidingWindowLimiter(2, 60_000, () => now);
joins.record("x");
check("record compte sans autoriser ni refuser", !joins.isBlocked("x"));
joins.record("x");
check("record : bloqué quand le maximum est atteint", joins.isBlocked("x"));

// --- Adresse du client ---
const handshake = (address: string, forwarded?: string) => ({
  address,
  headers: forwarded === undefined ? {} : { "x-forwarded-for": forwarded },
});
check("sans proxy de confiance, X-Forwarded-For est ignoré (falsifiable)", getClientIp(handshake("1.1.1.1", "9.9.9.9"), false) === "1.1.1.1");
check("avec proxy de confiance, on lit le dernier de X-Forwarded-For (le client ne peut pas s'en inventer un)", getClientIp(handshake("10.0.0.1", "6.6.6.6, 9.9.9.9"), true) === "9.9.9.9");
check("avec proxy de confiance mais sans en-tête : adresse de la connexion", getClientIp(handshake("1.1.1.1"), true) === "1.1.1.1");
check("en-tête vide : adresse de la connexion", getClientIp(handshake("1.1.1.1", ""), true) === "1.1.1.1");

// --- Plafond des caches ---
const cache = new Map<string, number>();
for (let i = 0; i < 10; i++) setBounded(cache, "k" + i, i, 3);
check("le cache garde les 3 entrées les plus récentes", [...cache.keys()].join(",") === "k7,k8,k9");
setBounded(cache, "k7", 70, 3);
check("réécrire une clé la rend la plus récente", [...cache.keys()].join(",") === "k8,k9,k7" && cache.get("k7") === 70);
setBounded(cache, "k10", 10, 3);
check("l'entrée la plus ancienne part en premier", !cache.has("k8") && cache.size === 3);

console.log(ok ? "\nTOUT OK" : "\nECHEC");
process.exit(ok ? 0 : 1);
