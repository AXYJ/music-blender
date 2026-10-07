// Limites par adresse IP, en mémoire (le serveur n'a pas de base de données).

// Fenêtre glissante : au plus `max` événements par clé sur `windowMs`.
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private max: number,
    private windowMs = 60_000,
    private now: () => number = Date.now,
  ) {
    // Nettoyage des clés inactives, sans empêcher l'arrêt du processus
    setInterval(() => this.prune(), windowMs).unref();
  }

  private recent(key: string): number[] {
    const now = this.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length > 0) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  private prune(): void {
    for (const key of [...this.hits.keys()]) this.recent(key);
  }

  // La limite est atteinte (sans rien enregistrer)
  isBlocked(key: string): boolean {
    return this.recent(key).length >= this.max;
  }

  record(key: string): void {
    const list = this.recent(key);
    list.push(this.now());
    this.hits.set(key, list);
  }

  // Enregistre l'événement et renvoie true s'il est autorisé, false s'il dépasse la limite
  tryHit(key: string): boolean {
    if (this.isBlocked(key)) return false;
    this.record(key);
    return true;
  }
}

// Adresse du client. Derrière un reverse proxy, socket.handshake.address est celle du
// proxy : il faut alors lire X-Forwarded-For (TRUST_PROXY=1). Sans proxy, cet en-tête
// est librement falsifiable par le client, donc on ne le lit pas par défaut. Avec un proxy,
// seule la DERNIÈRE adresse est fiable (ajoutée par le proxy) : les précédentes sont celles
// que le client a écrites lui-même.
// ponytail: un seul proxy de confiance ; avec plusieurs, prendre la n-ième en partant de la fin.
export function getClientIp(
  handshake: { address: string; headers: Record<string, string | string[] | undefined> },
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const forwarded = handshake.headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(",")
      .at(-1)
      ?.trim();
    if (first) return first;
  }
  return handshake.address;
}

// Ajoute une entrée en gardant au plus `max` entrées : on retire les plus anciennes
// (une Map conserve l'ordre d'insertion).
export function setBounded<K, V>(map: Map<K, V>, key: K, value: V, max: number): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next().value as K;
    map.delete(oldest);
  }
}
