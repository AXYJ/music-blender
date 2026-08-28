import process from "process";
import { Buffer } from "buffer";
import { transliterate } from "transliteration";
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

import { getSpotifyTracksAnonymously, getSpotifyAccessToken, getSpotifyAlbumTracks, fetchTrackImageViaOEmbed } from "./get-from-spotify.js";
import { getPlaylistTracksFromDeezer, getAlbumTracksFromDeezer } from "./get-from-deezer.js";

const kuroshiro = new Kuroshiro.default();
let kuroshiroReady = false;

kuroshiro.init(new KuromojiAnalyzer())
    .then(() => {
        kuroshiroReady = true;
    })
    .catch((err) => {
        console.error("[Kuroshiro connectSpotify] Failed to initialize:", err);
    });

//----------------------------------
// Convertir les noms en version internationale
//----------------------------------

export async function getInternationalName(text) {
    if (!text || typeof text !== "string") return "";

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
            result = `${p1} (${part2})`;
        } else {
            const isPart1Ascii = !/[^\x00-\x7F]/.test(part1);
            const isPart2Ascii = !/[^\x00-\x7F]/.test(part2);

            if (isPart1Ascii && !isPart2Ascii) result = part1;
            if (isPart2Ascii && !isPart1Ascii) result = part2;
        }
    } else {
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        const isCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

        if (isCJK && kuroshiroReady) {
            try {
                const converted = await kuroshiro.convert(text, {
                    to: "romaji",
                    romajiSystem: "hepburn"
                });

                const hasRemainingCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(converted);
                if (hasRemainingCJK) {
                    if (hasKana) {
                        result = transliterate(converted);
                    } else {
                        result = transliterate(text);
                    }
                } else {
                    result = converted;
                }
            } catch (err) {
                console.error("Kuroshiro conversion error:", err);
                if (/[^\x00-\x7F]/.test(text)) {
                    result = transliterate(text);
                }
            }
        } else if (/[^\x00-\x7F]/.test(text)) {
            result = transliterate(text);
        }
    }

    result = result.toLowerCase();
    result = result.replace(/\s+/g, "");

    return result;
}

//----------------------------------
// Résolution des liens courts en URLs complètes
//----------------------------------
async function resolveUrlIfNeeded(url) {
    if (!url || typeof url !== "string") return url;
    
    // Si l'URL contient déjà le motif classique (playlist/id ou album/id), pas besoin de la résoudre
    if (url.match(/(playlist|album)\/([a-zA-Z0-9]+)/)) {
        return url;
    }

    try {
        console.log(`[URL Resolver] Short URL detected. Resolving: ${url}`);
        const response = await fetch(url, { method: "GET", redirect: "follow" });
        console.log(`[URL Resolver] Resolved to: ${response.url}`);
        return response.url;
    } catch (e) {
        console.error(`[URL Resolver] Error resolving short URL ${url}:`, e);
        return url;
    }
}

//----------------------------------
// Fonction principale de sélection des morceaux
//----------------------------------

export default async function selectTracks(playlistUrl, amount, player) {
    let tracks = [];
    if (!playlistUrl || typeof playlistUrl !== "string") {
        return { tracks: [], selectedTracks: [] };
    }

    // Résoudre le lien s'il s'agit d'un lien court (ex: link.deezer.com)
    const resolvedUrl = await resolveUrlIfNeeded(playlistUrl);

    // Le format (playlist ou album) et l'ID sont présents dans les URLs de Spotify comme de Deezer.
    // Exemples Deezer : deezer.com/fr/playlist/5922972724 ou deezer.com/fr/album/96126
    const match = resolvedUrl.match(/(playlist|album)\/([a-zA-Z0-9]+)/);
    const type = match ? match[1] : null;
    const id = match ? match[2] : null;
    let platform = "spotify";
    if (resolvedUrl.includes("deezer.com")) {
        platform = "deezer";
    } else if (resolvedUrl.includes("spotify.com") || resolvedUrl.includes("spotify.link")) {
        platform = "spotify";
    }

    if (id) {
        let playlistTracks = null;

        if (platform === "spotify") {
            if (type === "playlist") {
                // Pour les playlists, on utilise obligatoirement le scraper anonyme.
                // L'API officielle de Spotify requiert une authentification utilisateur (User OAuth) pour les playlists
                // et renvoie systématiquement une erreur 401 (Valid user authentication required) avec les tokens Client Credentials.
                playlistTracks = await getSpotifyTracksAnonymously(type, id);
            } else if (type === "album") {
                // Pour les albums, l'API officielle fonctionne parfaitement avec le flux Client Credentials.
                console.log(`[Spotify API] Fetching album ${id} via official Spotify API...`);
                const token = await getSpotifyAccessToken();
                if (token) {
                    playlistTracks = await getSpotifyAlbumTracks(id, token);
                }

                // Fallback anonyme en cas d'échec de l'API officielle
                if (!playlistTracks || playlistTracks.length === 0) {
                    console.log("[Spotify API] Official album API failed. Falling back to public scraper...");
                    playlistTracks = await getSpotifyTracksAnonymously(type, id);
                }
            }
        } else if (platform === "deezer") {
            if (type === "playlist") {
                console.log(`[Deezer API] Fetching playlist ${id}...`);
                playlistTracks = await getPlaylistTracksFromDeezer(id);
            } else if (type === "album") {
                console.log(`[Deezer API] Fetching album ${id}...`);
                playlistTracks = await getAlbumTracksFromDeezer(id);
            }
        }

        if (playlistTracks && playlistTracks.length > 0) {
            // Ne garder que les morceaux qui ont un extrait audio (previewUrl) disponible
            tracks = playlistTracks
                .filter(t => t.previewUrl)
                .map(t => ({
                    ...t,
                    submittedBy: player.name
                }));
        }
    }

    // Sélectionner aléatoirement la quantité demandée
    const selectedTracks = [];
    const tracksCopy = [...tracks];
    const actualAmount = Math.min(amount, tracksCopy.length);

    for (let i = 0; i < actualAmount; i++) {
        const index = Math.floor(Math.random() * tracksCopy.length);
        selectedTracks.push(tracksCopy[index]);
        tracksCopy.splice(index, 1);
    }

    // Récupérer les vraies images de couverture pour les pistes sélectionnées via Deezer Lookup (avec OEmbed Spotify en Fallback)
    let selectedTracksWithImages = [...selectedTracks];
    if (platform === "spotify") {
        console.log(`[Spotify] Fetching high-quality cover images for ${selectedTracks.length} tracks (Deezer search with Spotify OEmbed fallback)...`);
        selectedTracksWithImages = await Promise.all(selectedTracks.map(async (track) => {
            let realImg = null;
            
            // 1. Essayer de récupérer l'image sur Deezer (qualité supérieure)
            try {
                const query = `${track.internationalArtist} ${track.internationalName}`;
                const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        realImg = data.data[0].album?.cover_big;
                    }
                }
            } catch (e) {
                console.warn(`[Deezer Cover Lookup] Failed to fetch cover for ${track.name} on Deezer:`, e);
            }

            // 2. Fallback sur l'OEmbed officiel de Spotify si Deezer n'a rien trouvé
            if (!realImg && track.url) {
                realImg = await fetchTrackImageViaOEmbed(track.url, track.imageUrl);
            }

            return {
                ...track,
                imageUrl: realImg || track.imageUrl
            };
        }));
    }

    return {
        tracks,
        selectedTracks: selectedTracksWithImages
    };
}