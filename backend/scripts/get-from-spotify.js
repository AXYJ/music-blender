//----------------------------------
// Scraping des morceaux via la page publique (Scraper anonyme)
//----------------------------------
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
        const tracks = entity.trackList.map(item => ({
            name: item.title,
            artist: item.subtitle,
            previewUrl: item.audioPreview?.url || "",
            imageUrl: entity.coverArt?.sources?.[0]?.url || "", // fallback to cover art
            url: item.url || (item.uri ? `https://open.spotify.com/track/${item.uri.split(":")[2]}` : "")
        }));
        return tracks;
    } catch (e) {
        console.error(`[Spotify Scraper] Error scraping ${type} tracks:`, e);
        return null;
    }
}

//----------------------------------
// Obtention du token d'accès Spotify (fallback)
//----------------------------------
async function getSpotifyAccessToken() {
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

//----------------------------------
// Récupération des morceaux d'un album
//----------------------------------
async function getSpotifyAlbumTracks(albumId, accessToken) {
    try {
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Spotify API] Album tracks request failed with status ${response.status}:`, errorText);
            return null;
        }
        const data = await response.json();
        if (!data.tracks || !data.tracks.items) return null;
        const imageUrl = data.images?.[0]?.url || "";
        const tracks = data.tracks.items.map(t => {
            const artistsStr = t.artists.map(a => a.name).join(", ");
            return {
                name: t.name,
                artist: artistsStr,
                previewUrl: t.preview_url || "",
                imageUrl: imageUrl,
                url: t.external_urls?.spotify || (t.uri ? `https://open.spotify.com/track/${t.uri.split(":")[2]}` : "")
            };
        });
        return tracks;
    } catch (e) {
        console.error("Error fetching Spotify album tracks:", e);
        return null;
    }
}

// ----------------------------------------------------------------
// Récuperer l'image via OEmbed
// ----------------------------------------------------------------
export async function fetchTrackImageViaOEmbed(trackUrl, fallbackUrl) {
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

// ----------------------------------------------------------------
// Fonction unifiée d'accès aux morceaux
// ----------------------------------------------------------------
export async function fetchSpotifyTracks({ type, id }) {
    if (type === "playlist") {
        return getSpotifyTracksAnonymously(type, id);
    } else if (type === "album") {
        console.log(`[Spotify API] Fetching album ${id} via official Spotify API...`);
        const token = await getSpotifyAccessToken();
        let playlistTracks = null;
        if (token) {
            playlistTracks = await getSpotifyAlbumTracks(id, token);
        }

        // Fallback anonyme en cas d'échec de l'API officielle
        if (!playlistTracks || playlistTracks.length === 0) {
            console.log("[Spotify API] Official album API failed. Falling back to public scraper...");
            playlistTracks = await getSpotifyTracksAnonymously(type, id);
        }
        return playlistTracks;
    }
    return [];
}