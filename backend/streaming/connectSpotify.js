import process from "process";
import { Buffer } from "buffer";
import { transliterate } from "transliteration";
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const kuroshiro = new Kuroshiro.default();
let kuroshiroReady = false;

kuroshiro.init(new KuromojiAnalyzer())
    .then(() => {
        kuroshiroReady = true;
    })
    .catch((err) => {
        console.error("[Kuroshiro connectSpotify] Failed to initialize:", err);
    });

async function getInternationalName(text) {
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


async function getSpotifyAccessToken() {
    // 1. Check if a user-supplied access token is configured in .env (for local testing/OAuth bypass)
    const userToken = process.env.SPOTIFY_ACCESS_TOKEN?.trim();
    if (userToken) {
        console.log("[Spotify API] Using user access token from SPOTIFY_ACCESS_TOKEN env variable.");
        return userToken;
    }

    // 2. Otherwise, fall back to Client Credentials Flow
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
        console.warn("[Spotify API] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env variables.");
        return null;
    }

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
            },
            body: "grant_type=client_credentials",
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Spotify API] Token request failed with status ${response.status}:`, errorText);
            return null;
        }
        const data = await response.json();
        return data.access_token;
    } catch (e) {
        console.error("Error getting Spotify token:", e);
        return null;
    }
}

async function getSpotifyTracksAnonymously(type, id) {
    try {
        console.log(`[Spotify Scraper] Fetching public embed page for ${type}: ${id}`);
        const response = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        });
        if (!response.ok) {
            console.warn(`[Spotify Scraper] Failed to fetch embed page: status ${response.status}`);
            return null;
        }
        const html = await response.text();
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!match) {
            console.warn(`[Spotify Scraper] __NEXT_DATA__ script tag not found in embed page.`);
            return null;
        }

        const data = JSON.parse(match[1]);
        const entity = data.props?.pageProps?.state?.data?.entity;
        if (!entity || !Array.isArray(entity.trackList)) {
            console.warn(`[Spotify Scraper] ${type} track list not found in parsed data.`);
            return null;
        }

        console.log(`[Spotify Scraper] Successfully extracted ${entity.trackList.length} tracks via public embed page!`);
        const tracks = await Promise.all(entity.trackList.map(async item => ({
            name: item.title,
            artist: item.subtitle,
            internationalName: await getInternationalName(item.title),
            internationalArtist: await getInternationalName(item.subtitle),
            previewUrl: item.audioPreview?.url || "",
            imageUrl: entity.coverArt?.sources?.[0]?.url || "", // fallback to cover art
            url: item.url || (item.uri ? `https://open.spotify.com/track/${item.uri.split(":")[2]}` : "")
        })));
        return tracks;
    } catch (e) {
        console.error(`[Spotify Scraper] Error scraping ${type} tracks:`, e);
        return null;
    }
}

async function getSpotifyPlaylistTracks(playlistId, accessToken) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 403) {
                console.error(`[Spotify API] Playlist tracks request failed with status 403: Forbidden.\n👉 IMPORTANT : Assurez-vous que la playlist Spotify est configurée en "Publique" dans l'application Spotify (Clic droit -> Partager -> Rendre publique). Les playlists privées ne peuvent pas être lues avec des identifiants d'application généraux.`);
            } else if (response.status === 401) {
                console.error(`[Spotify API] Playlist tracks request failed with status 401: Unauthorized.\n👉 NOTE : Depuis fin 2024, Spotify restreint l'accès aux playlists par Client Credentials. Si vous testez en local, veuillez générer un User Token et le coller dans la variable SPOTIFY_ACCESS_TOKEN de votre fichier .env.`);
            } else {
                console.error(`[Spotify API] Playlist tracks request failed with status ${response.status}:`, errorText);
            }
            return null;
        }
        const data = await response.json();
        if (!data.items) return null;
        const tracks = await Promise.all(
            data.items
                .filter(item => item.track)
                .map(async item => {
                    const t = item.track;
                    const artistsStr = t.artists.map(a => a.name).join(", ");
                    return {
                        name: t.name,
                        artist: artistsStr,
                        internationalName: await getInternationalName(t.name),
                        internationalArtist: await getInternationalName(artistsStr),
                        previewUrl: t.preview_url,
                        imageUrl: t.album?.images?.[0]?.url || "",
                        url: t.external_urls?.spotify || (t.uri ? `https://open.spotify.com/track/${t.uri.split(":")[2]}` : "")
                    };
                })
        );
        return tracks;
    } catch (e) {
        console.error("Error fetching Spotify playlist tracks:", e);
        return null;
    }
}

export default async function selectTracks(playlistUrl, amount, player) {
    let tracks = [];
    if (!playlistUrl || typeof playlistUrl !== "string") {
        return { tracks: [], selectedTracks: [] };
    }

    const match = playlistUrl.match(/(playlist|album)\/([a-zA-Z0-9]+)/);
    const type = match ? match[1] : null;
    const id = match ? match[2] : null;

    if (id) {
        // Essayer d'abord de récupérer les morceaux de manière anonyme via la page embed publique
        let playlistTracks = await getSpotifyTracksAnonymously(type, id);

        // Si cela échoue et que c'est une playlist, fallback sur l'API Spotify officielle
        if ((!playlistTracks || playlistTracks.length === 0) && type === "playlist") {
            console.log("[Spotify API] Scraper failed or returned empty. Falling back to Spotify API...");
            const token = await getSpotifyAccessToken();
            if (token) {
                playlistTracks = await getSpotifyPlaylistTracks(id, token);
            }
        }

        if (playlistTracks && playlistTracks.length > 0) {
            // Keep all tracks from the playlist
            // If a track doesn't have a previewUrl from Spotify, assign a fallback audio URL so it is playable
            tracks = playlistTracks.map((t, idx) => ({
                ...t,
                previewUrl: t.previewUrl || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 10) + 1}.mp3`,
                submittedBy: player.name
            }));
        }
    }

    // Select the requested amount of tracks randomly
    const selectedTracks = [];
    const tracksCopy = [...tracks];
    const actualAmount = Math.min(amount, tracksCopy.length);

    for (let i = 0; i < actualAmount; i++) {
        const index = Math.floor(Math.random() * tracksCopy.length);
        selectedTracks.push(tracksCopy[index]);
        tracksCopy.splice(index, 1);
    }

    // Récupérer les vraies images de couverture pour les pistes sélectionnées via OEmbed si nécessaire
    console.log(`[Spotify] Fetching real cover images for ${selectedTracks.length} selected tracks via OEmbed...`);
    const selectedTracksWithImages = await Promise.all(selectedTracks.map(async (track) => {
        if (track.url) {
            const realImg = await fetchTrackImageViaOEmbed(track.url, track.imageUrl);
            return {
                ...track,
                imageUrl: realImg
            };
        }
        return track;
    }));

    return {
        tracks,
        selectedTracks: selectedTracksWithImages
    };
}

async function fetchTrackImageViaOEmbed(trackUrl, fallbackUrl) {
    if (!trackUrl) return fallbackUrl;
    try {
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`);
        if (response.ok) {
            const data = await response.json();
            return data.thumbnail_url || fallbackUrl;
        }
    } catch (e) {
        console.error(`[Spotify OEmbed] Error fetching cover for ${trackUrl}:`, e);
    }
    return fallbackUrl;
}