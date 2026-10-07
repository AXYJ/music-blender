import { transliterate } from "transliteration";
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

import {
  fetchSpotifyTracks,
  fetchTrackImageViaOEmbed,
} from "./get-from-spotify.js";
import { fetchDeezerTracks } from "./get-from-deezer.js";
import { fetchAppleTracks } from "./get-from-apple.js";
import { PlatformTrack, Track } from "../types/game.js";
import { resolveAllowedUrl } from "./allowed-url.js";
import { setBounded } from "./rate-limit.js";
import {
  needsLlm,
  transliterate as transliterateGroq,
  TransliterateItem,
} from "./transliterate.js";

const kuroshiro = new (Kuroshiro.default || Kuroshiro)();
let kuroshiroReady = false;

kuroshiro
  .init(new KuromojiAnalyzer())
  .then(() => {
    kuroshiroReady = true;
  })
  .catch((err: unknown) => {
    console.error("[Kuroshiro connectSpotify] Failed to initialize:", err);
  });

//----------------------------------
// Translitération locale (Kuroshiro / Japonais si Kana & Fallback transliteration)
//----------------------------------
export async function transliterateText(text: string): Promise<string> {
  if (!text || typeof text !== "string") return "";

  const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);

  if (hasKana && kuroshiroReady) {
    try {
      const converted = await kuroshiro.convert(text, {
        to: "romaji",
        romajiSystem: "hepburn",
      });

      // Reste non ASCII (voyelles longues ō ā ū, kanji absents du dictionnaire, kana
      // oubliés) : la bibliothèque le ramène en lettres latines simples
      if (/[^\x00-\x7F]/.test(converted)) {
        return transliterate(converted);
      }
      return converted;
    } catch (err) {
      console.error("Kuroshiro conversion error:", err);
      if (/[^\x00-\x7F]/.test(text)) {
        return transliterate(text);
      }
    }
  } else if (/[^\x00-\x7F]/.test(text)) {
    return transliterate(text);
  }

  return text;
}

//----------------------------------
// Convertir les noms en version internationale
//----------------------------------

// Espaces insécables ou pleine largeur (fréquents dans les titres japonais et les artistes
// renvoyés par Spotify) remplacés par une espace simple : sinon un nom 100 % latin est pris
// pour du non-ASCII et part inutilement en romanisation
export const cleanSpaces = (text: string): string =>
  (text || "").replace(/\s+/g, " ").trim();

export async function getInternationalName(text: string): Promise<string> {
  if (!text || typeof text !== "string") return "";

  // NFKC : "（FLAME）" devient "(FLAME)", "ＡＢＣ" devient "ABC", les kana demi-chasse
  // deviennent des kana normaux
  text = text.normalize("NFKC");

  let result = text;
  // Use [^()]+ to ensure we match the LAST individual parenthesized block
  const parenthesizedMatch = text.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (parenthesizedMatch) {
    const part1 = parenthesizedMatch[1].trim();
    const part2 = parenthesizedMatch[2].trim();

    // Check if the parentheses contain a featuring artist
    const isFeaturing = /^(feat|featuring|with)\b/i.test(part2);

    if (isFeaturing) {
      // Recursively process the title part, then append the featuring part back
      const p1 = await getInternationalName(part1);
      result = `${p1} (${await transliterateText(part2)})`;
    } else {
      const isPart1Ascii = !/[^\x00-\x7F]/.test(part1);
      const isPart2Ascii = !/[^\x00-\x7F]/.test(part2);

      if (isPart1Ascii && !isPart2Ascii) result = part1;
      else if (isPart2Ascii && !isPart1Ascii) result = part2;
      else result = await transliterateText(part1);
    }
  } else {
    result = await transliterateText(text);
  }

  return result.trim();
}

//----------------------------------
// Caches en mémoire (Playlists & Pochettes)
//----------------------------------
const PLAYLIST_CACHE_TTL = 60 * 60 * 1000; // 1 heure
const playlistCache = new Map<string, { tracks: Track[]; timestamp: number }>();
const coverCache = new Map<string, string>();
// Plafonds : sans eux, la mémoire grandirait avec chaque playlist ou pochette distincte
const MAX_CACHED_PLAYLISTS = 200;
const MAX_CACHED_COVERS = 5000;

//----------------------------------
// Sélection aléatoire de musiques
//----------------------------------

export default async function selectTracks(
  playlistUrl: string,
  amount: number,
  player: { name: string; isHost?: boolean },
): Promise<{ tracks: Track[]; selectedTracks: Track[] }> {
  let tracks: Track[] = [];
  if (!playlistUrl || typeof playlistUrl !== "string") {
    return { tracks: [], selectedTracks: [] };
  }

  // Lien refusé (domaine non autorisé) ou court : résolu sans jamais appeler une autre plateforme
  const resolved = await resolveAllowedUrl(playlistUrl);
  if (!resolved) {
    console.warn(`[selectTracks] Lien refusé ou non résolu: ${playlistUrl.slice(0, 80)}`);
    return { tracks: [], selectedTracks: [] };
  }
  const resolvedUrl = resolved.url.href;
  const platform = resolved.platform;

  // 1. Vérifier si les pistes de cette playlist sont déjà en cache
  const cachedPlaylist = playlistCache.get(resolvedUrl);
  if (
    cachedPlaylist &&
    Date.now() - cachedPlaylist.timestamp < PLAYLIST_CACHE_TTL
  ) {
    console.log(
      `[Playlist Cache] Hit pour ${resolvedUrl} (${cachedPlaylist.tracks.length} pistes en mémoire)`,
    );
    tracks = cachedPlaylist.tracks.map((t) => ({
      ...t,
      submittedBy: player.name,
    }));
  } else {
    const match = resolvedUrl.match(/(playlist|album)\/([a-zA-Z0-9]+)/);
    const type = match ? match[1] : null;
    const id = match ? match[2] : null;
    if (id && type) {
      let playlistTracks: PlatformTrack[] | null = null;

      if (platform === "spotify") {
        playlistTracks = await fetchSpotifyTracks({ type, id });
      } else if (platform === "deezer") {
        playlistTracks = await fetchDeezerTracks({ type, id });
      } else if (platform === "apple") {
        playlistTracks = await fetchAppleTracks({ type, id, url: resolvedUrl });
      }

      if (playlistTracks && playlistTracks.length > 0) {
        playlistTracks = playlistTracks.map((t) => ({
          ...t,
          name: cleanSpaces(t.name),
          artist: cleanSpaces(t.artist),
        }));

        // 1. Détecter les morceaux ayant des caractères non-ASCII à translitérer avec Groq
        const itemsToTranslate: TransliterateItem[] = [];
        playlistTracks.forEach((t, index) => {
          if (needsLlm(t.name, t.artist)) {
            itemsToTranslate.push({
              id: index,
              artist: t.artist,
              title: t.name,
            });
          }
        });

        // 2. Appel Groq en batch (si des morceaux non-ASCII existent)
        const groqTranslations = new Map<
          number,
          { internationalArtist: string; internationalTitle: string }
        >();
        if (itemsToTranslate.length > 0) {
          try {
            console.log(
              `[Groq] Romanisation en batch de ${itemsToTranslate.length} morceaux non-ASCII...`,
            );
            const results = await transliterateGroq(itemsToTranslate);
            for (const r of results) {
              groqTranslations.set(Number(r.id), {
                internationalArtist: r.internationalArtist,
                internationalTitle: r.internationalTitle,
              });
            }
          } catch (e) {
            console.warn(
              "[selectTracks] Fallback sur translitération locale suite à erreur Groq :",
              e,
            );
          }
        }

        // 3. Formater et normaliser les noms de toutes les pistes
        const formattedTracks: Track[] = await Promise.all(
          playlistTracks.map(async (t, index) => {
            const name = t.name || "";
            const artist = t.artist || "";
            const groqResult = groqTranslations.get(index);

            const internationalName = (
              groqResult?.internationalTitle
                ? groqResult.internationalTitle
                : await getInternationalName(name)
            ).trim();

            const internationalArtist = (
              groqResult?.internationalArtist
                ? groqResult.internationalArtist
                : await getInternationalName(artist)
            ).trim();

            return {
              name,
              artist,
              internationalName,
              internationalArtist,
              previewUrl: t.previewUrl || "",
              imageUrl: t.imageUrl || "",
              url: t.url || "",
              submittedBy: player.name,
            };
          }),
        );

        // Ne garder que les morceaux qui ont un extrait audio (previewUrl) disponible
        tracks = formattedTracks.filter((t) => t.previewUrl);

        // Mettre en cache la playlist pour les futures parties
        if (tracks.length > 0) {
          setBounded(
            playlistCache,
            resolvedUrl,
            { tracks, timestamp: Date.now() },
            MAX_CACHED_PLAYLISTS,
          );
        }
      }
    }
  }

  // Sélectionner aléatoirement la quantité demandée
  const selectedTracks: Track[] = [];
  const tracksCopy = [...tracks];
  const actualAmount = Math.min(amount, tracksCopy.length);

  for (let i = 0; i < actualAmount; i++) {
    const index = Math.floor(Math.random() * tracksCopy.length);
    selectedTracks.push(tracksCopy[index]);
    tracksCopy.splice(index, 1);
  }

  // Récupérer les vraies images de couverture pour les pistes sélectionnées (Spotify uniquement : Deezer et Apple fournissent déjà la bonne image)
  let selectedTracksWithImages = [...selectedTracks];
  if (platform === "spotify") {
    selectedTracksWithImages = await Promise.all(
      selectedTracks.map(async (track) => {
        const coverKey = `${track.internationalArtist || track.artist} ${track.internationalName || track.name}`
          .toLowerCase()
          .trim();

        // Vérifier dans le cache de couverture
        if (coverCache.has(coverKey)) {
          return {
            ...track,
            imageUrl: coverCache.get(coverKey) || track.imageUrl,
          };
        }

        // Pochette exacte du morceau via l'OEmbed officiel de Spotify (pas de recherche approximative)
        const realImg = track.url
          ? await fetchTrackImageViaOEmbed(track.url, track.imageUrl || "")
          : null;

        if (realImg) {
          setBounded(coverCache, coverKey, realImg, MAX_CACHED_COVERS);
        }

        return {
          ...track,
          imageUrl: realImg || track.imageUrl,
        };
      }),
    );
  }

  return {
    tracks,
    selectedTracks: selectedTracksWithImages,
  };
}
