import { useSyncExternalStore } from "react";

// Lecture / écriture de localStorage avec notification des composants abonnés.
// Avec useSyncExternalStore, le serveur et l'hydratation rendent la valeur par
// défaut, puis le client bascule sur la valeur stockée (pas d'écart d'hydratation
// et pas de setState dans un effet).
const listeners = new Set<() => void>();

export function subscribeLocal(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback); // autres onglets
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stockage indisponible (navigation privée) : on notifie quand même
  }
  listeners.forEach((listener) => listener());
}

export function useLocalValue(key: string, serverValue = ""): string {
  return useSyncExternalStore(
    subscribeLocal,
    () => readLocal(key) ?? serverValue,
    () => serverValue,
  );
}

// Pour useSyncExternalStore : une valeur qui ne change jamais, rien à surveiller
export const subscribeNever = () => () => {};

// false pendant le rendu serveur et l'hydratation, true ensuite côté navigateur
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
