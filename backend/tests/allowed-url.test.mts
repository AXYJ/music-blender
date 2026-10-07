// Validation des liens de playlist : seules les plateformes attendues sont acceptées,
// et un lien court ne peut pas rediriger vers une autre adresse. Sans serveur ni réseau
// (les redirections sont simulées).
import { parseAllowedUrl, resolveAllowedUrl } from "../scripts/allowed-url.ts";

let ok = true;
const check = (name: string, cond: boolean, extra = "") => {
  ok = ok && cond;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};

// --- Liens acceptés ---
const accepted = [
  "https://www.deezer.com/fr/playlist/123456",
  "https://deezer.com/album/302127",
  "https://link.deezer.com/s/abc123",
  "https://deezer.page.link/xyz",
  "https://open.spotify.com/playlist/37i9dQZF1DX?si=abc",
  "https://spotify.link/AbCdEf",
  "https://music.apple.com/fr/playlist/nom/pl.u-123",
  "https://itunes.apple.com/us/album/x/1234",
  "  https://www.deezer.com/playlist/1  ",
];
for (const raw of accepted) check(`accepté : ${raw.trim()}`, parseAllowedUrl(raw) !== null);

const platforms: Array<[string, string]> = [
  ["https://www.deezer.com/playlist/1", "deezer"],
  ["https://open.spotify.com/playlist/1", "spotify"],
  ["https://music.apple.com/fr/playlist/n/pl.1", "apple"],
];
for (const [raw, expected] of platforms) {
  check(`plateforme de ${raw}`, parseAllowedUrl(raw)?.platform === expected);
}

// --- Liens refusés (dont les deux contournements trouvés pendant l'audit) ---
const refused = [
  "http://127.0.0.1:4199/lien-court",
  "http://127.0.0.1:4199/playlist/abc123?x=music.apple.com",
  "https://127.0.0.1/playlist/abc123?x=music.apple.com",
  "https://localhost/playlist/abc",
  "https://169.254.169.254/latest/meta-data/playlist/abc",
  "https://evil.com/playlist/abc?x=deezer.com",
  "https://evil.com/deezer.com/playlist/abc",
  "https://deezer.com@evil.com/playlist/abc",
  "https://deezer.com.evil.com/playlist/abc",
  "https://notdeezer.com/playlist/abc",
  "https://www.deezer.com:8443/playlist/1",
  "http://www.deezer.com/playlist/1",
  "ftp://www.deezer.com/playlist/1",
  "javascript:alert(1)",
  "pas un lien",
  "",
];
for (const raw of refused) check(`refusé : ${raw || "(vide)"}`, parseAllowedUrl(raw) === null);

// --- Résolution des liens courts, avec un faux fetch ---
const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });
const fakeFetch = (routes: Record<string, () => Response>, calls: string[] = []) =>
  (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const route = routes[url];
    if (!route) throw new Error("adresse inattendue : " + url);
    return route();
  }) as typeof fetch;

{
  const calls: string[] = [];
  const r = await resolveAllowedUrl("https://www.deezer.com/fr/playlist/123", fakeFetch({}, calls));
  check("lien de playlist direct : aucun appel réseau", r !== null && calls.length === 0);
}
{
  const calls: string[] = [];
  const r = await resolveAllowedUrl(
    "https://link.deezer.com/s/abc",
    fakeFetch({ "https://link.deezer.com/s/abc": () => redirect("https://www.deezer.com/fr/playlist/123?x=1") }, calls),
  );
  check("lien court Deezer : résolu vers la playlist", r?.url.pathname === "/fr/playlist/123" && r.platform === "deezer" && calls.length === 1);
}
{
  const r = await resolveAllowedUrl(
    "https://spotify.link/abc",
    fakeFetch({
      "https://spotify.link/abc": () => redirect("https://spotify.app.link/xyz"),
      "https://spotify.app.link/xyz": () => redirect("https://open.spotify.com/playlist/37i9dQ?si=1"),
    }),
  );
  check("lien court Spotify en deux redirections : résolu", r?.url.hostname === "open.spotify.com" && r.platform === "spotify");
}
{
  const r = await resolveAllowedUrl(
    "https://link.deezer.com/s/abc",
    fakeFetch({ "https://link.deezer.com/s/abc": () => redirect("/fr/playlist/9") }),
  );
  check("redirection relative : résolue sur le même domaine", r?.url.href === "https://link.deezer.com/fr/playlist/9");
}
for (const [label, target] of [
  ["service interne en http", "http://127.0.0.1:4199/secret"],
  ["adresse de métadonnées cloud", "http://169.254.169.254/latest/meta-data/"],
  ["autre domaine en https", "https://evil.com/playlist/1"],
] as const) {
  const calls: string[] = [];
  const r = await resolveAllowedUrl(
    "https://link.deezer.com/s/abc",
    fakeFetch({ "https://link.deezer.com/s/abc": () => redirect(target) }, calls),
  );
  check(`redirection vers ${label} : refusée et jamais appelée`, r === null && calls.length === 1);
}
{
  const calls: string[] = [];
  const r = await resolveAllowedUrl(
    "https://link.deezer.com/s/loop",
    fakeFetch({ "https://link.deezer.com/s/loop": () => redirect("https://link.deezer.com/s/loop") }, calls),
  );
  check("boucle de redirections : abandon après 6 appels", r === null && calls.length === 6, `(${calls.length} appels)`);
}
{
  const r = await resolveAllowedUrl("https://link.deezer.com/s/abc", (async () => {
    throw new Error("réseau coupé");
  }) as typeof fetch);
  check("erreur réseau : refus propre", r === null);
}

console.log(ok ? "\nTOUT OK" : "\nECHEC");
process.exit(ok ? 0 : 1);
