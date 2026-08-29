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

        let tracksData = [];
        let fallbackImageUrl = "";

        if (type === "playlist") {
            if (!data.tracks || !data.tracks.data) {
                console.warn(`[Deezer API] No tracks data found for playlist ${id}.`);
                return null;
            }
            tracksData = data.tracks.data;
            fallbackImageUrl = data.picture_medium || "";
        } else if (type === "album") {
            // Pour un album, l'API de Deezer renvoie les morceaux directement dans data.tracks.data ou dans data.tracks
            // si on appelle /album/id, mais attendez ! Voyons la documentation Deezer ou le code initial :
            // data.tracks.data était utilisé de la même manière pour les deux.
            if (data.tracks && data.tracks.data) {
                tracksData = data.tracks.data;
            } else if (Array.isArray(data.data)) {
                tracksData = data.data;
            } else {
                console.warn(`[Deezer API] No tracks data found for album ${id}.`);
                return null;
            }
            fallbackImageUrl = data.cover_big || "";
        }

        const tracks = tracksData.map(t => {
            const artistName = t.artist?.name || data.artist?.name || "";
            return {
                name: t.title || "",
                artist: artistName,
                previewUrl: t.preview || "",
                imageUrl: t.album?.cover_medium || fallbackImageUrl,
                url: t.link || (t.id ? `https://www.deezer.com/track/${t.id}` : "")
            };
        });
        return tracks;
    } catch (e) {
        console.error(`Error fetching Deezer ${type} tracks:`, e);
        return null;
    }
}

// ----------------------------------------------------------------
// Fonction unifiée d'accès aux morceaux
// ----------------------------------------------------------------
export async function fetchDeezerTracks({ type, id }) {
    return fetchDeezerEntityTracks(type, id);
}
