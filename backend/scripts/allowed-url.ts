// Liens de playlist saisis par les joueurs : le serveur ne doit appeler que les plateformes
// attendues. Sans cette vérification, un joueur peut faire appeler n'importe quelle adresse
// (service interne de l'hébergeur, 127.0.0.1…) par le serveur.
export type Platform = "spotify" | "deezer" | "apple";

// Vérifiés sur le nom d'hôte analysé par new URL, jamais sur le texte du lien :
// "https://evil.com/?x=deezer.com" ou "https://deezer.com@evil.com" ne passent pas.
const ALLOWED_HOSTS: Record<Platform, RegExp> = {
  deezer: /^(?:[\w-]+\.)?deezer\.com$|^deezer\.page\.link$/,
  spotify: /^(?:[\w-]+\.)?spotify\.com$|^spotify\.link$|^spotify\.app\.link$/,
  apple: /^(?:music|itunes)\.apple\.com$/,
};

const PLAYLIST_PATTERN = /(playlist|album)\/([a-zA-Z0-9]+)/;
const MAX_REDIRECTS = 5;

export interface AllowedUrl {
  url: URL;
  platform: Platform;
}

export function parseAllowedUrl(raw: string): AllowedUrl | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port) return null;

  const host = url.hostname.toLowerCase();
  for (const [platform, pattern] of Object.entries(ALLOWED_HOSTS)) {
    if (pattern.test(host)) return { url, platform: platform as Platform };
  }
  return null;
}

// Résout un lien (court ou non) en lien de playlist d'une plateforme autorisée.
// Un lien court est suivi redirection par redirection, chaque étape devant rester
// sur un domaine autorisé. Renvoie null pour tout lien refusé.
export async function resolveAllowedUrl(
  raw: string,
  doFetch: typeof fetch = fetch,
): Promise<AllowedUrl | null> {
  let current = parseAllowedUrl(raw);

  for (let hop = 0; current && hop <= MAX_REDIRECTS; hop++) {
    // Déjà un lien de playlist ou d'album : rien à résoudre
    if (PLAYLIST_PATTERN.test(current.url.href)) return current;

    let response: Response;
    try {
      response = await doFetch(current.url.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      return null;
    }
    const location = response.headers.get("location");
    if (!location) return current;
    current = parseAllowedUrl(new URL(location, current.url).href);
  }
  return null;
}
