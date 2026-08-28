import { getInternationalName } from "./get-artists-tracks.js";

/**
 * Fonction générique pour récupérer les morceaux d'une entité Deezer (playlist ou album)
 */
async function fetchDeezerEntityTracks(type, id) {
    try {
        const response = await fetch(`https://api.deezer.com/${type}/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Deezer API] ${type} tracks request failed with status ${response.status}:`, errorText);
            return null;
        }
        const data = await response.json();
        
        // Gérer les erreurs renvoyées dans le corps JSON par l'API Deezer
        if (data.error) {
            console.error(`[Deezer API] Error returned for ${type} ${id}:`, data.error.message || data.error);
            return null;
        }

        if (!data.tracks || !data.tracks.data) {
            console.warn(`[Deezer API] No tracks data found for ${type} ${id}.`);
            return null;
        }

        const fallbackImageUrl = data.picture_medium || data.cover_medium || "";
        const tracks = await Promise.all(
            data.tracks.data.map(async t => {
                const artistName = t.artist?.name || "";
                return {
                    name: t.title || "",
                    artist: artistName,
                    internationalName: await getInternationalName(t.title || ""),
                    internationalArtist: await getInternationalName(artistName),
                    previewUrl: t.preview || "",
                    imageUrl: t.album?.cover_medium || fallbackImageUrl,
                    url: t.link || (t.id ? `https://www.deezer.com/track/${t.id}` : "")
                };
            })
        );
        return tracks;
    } catch (e) {
        console.error(`Error fetching Deezer ${type} tracks:`, e);
        return null;
    }
}

export async function getPlaylistTracksFromDeezer(playlistId) {
    return fetchDeezerEntityTracks("playlist", playlistId);
}

export async function getAlbumTracksFromDeezer(albumId) {
    return fetchDeezerEntityTracks("album", albumId);
}
