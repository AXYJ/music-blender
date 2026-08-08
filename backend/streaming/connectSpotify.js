import process from "process";
import { Buffer } from "buffer";

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
        return entity.trackList.map(item => ({
            name: item.title,
            artist: item.subtitle,
            previewUrl: item.audioPreview?.url || "",
            imageUrl: entity.coverArt?.sources?.[0]?.url || "", // fallback to cover art
            uri: item.uri
        }));
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
        return data.items
            .filter(item => item.track)
            .map(item => {
                const t = item.track;
                return {
                    name: t.name,
                    artist: t.artists.map(a => a.name).join(", "),
                    previewUrl: t.preview_url,
                    imageUrl: t.album?.images?.[0]?.url || ""
                };
            });
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
        if (track.uri && track.uri.startsWith("spotify:track:")) {
            const realImg = await fetchTrackImageViaOEmbed(track.uri, track.imageUrl);
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

async function fetchTrackImageViaOEmbed(trackUri, fallbackUrl) {
    if (!trackUri || !trackUri.startsWith("spotify:track:")) return fallbackUrl;
    const trackId = trackUri.split(":")[2];
    try {
        const response = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
        if (response.ok) {
            const data = await response.json();
            return data.thumbnail_url || fallbackUrl;
        }
    } catch (e) {
        console.error(`[Spotify OEmbed] Error fetching cover for ${trackId}:`, e);
    }
    return fallbackUrl;
}