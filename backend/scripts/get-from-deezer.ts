export interface DeezerTrackResult {
  name: string;
  artist: string;
  previewUrl: string;
  imageUrl: string;
  url: string;
}

/**
 * Fonction générique pour récupérer les morceaux d'une entité Deezer (playlist ou album)
 */
async function fetchDeezerEntityTracks(
  type: string,
  id: string,
): Promise<DeezerTrackResult[] | null> {
  try {
    const response = await fetch(`https://api.deezer.com/${type}/${id}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Deezer API] ${type} tracks request failed with status ${response.status}:`,
        errorText,
      );
      return null;
    }
    const data = (await response.json()) as {
      error?: { message?: string } | string;
      tracks?: {
        data?: {
          title?: string;
          artist?: { name?: string };
          preview?: string;
          album?: { cover_medium?: string };
          link?: string;
          id?: number | string;
        }[];
      };
      data?: {
        title?: string;
        artist?: { name?: string };
        preview?: string;
        album?: { cover_medium?: string };
        link?: string;
        id?: number | string;
      }[];
      picture_medium?: string;
      cover_big?: string;
      artist?: { name?: string };
    };

    // Gérer les erreurs renvoyées dans le corps JSON par l'API Deezer
    if (data.error) {
      const errMsg =
        typeof data.error === "object" ? data.error.message : data.error;
      console.error(`[Deezer API] Error returned for ${type} ${id}:`, errMsg);
      return null;
    }

    let tracksData: {
      title?: string;
      artist?: { name?: string };
      preview?: string;
      album?: { cover_medium?: string };
      link?: string;
      id?: number | string;
    }[] = [];
    let fallbackImageUrl = "";

    if (type === "playlist") {
      if (!data.tracks || !data.tracks.data) {
        console.warn(`[Deezer API] No tracks data found for playlist ${id}.`);
        return null;
      }
      tracksData = data.tracks.data;
      fallbackImageUrl = data.picture_medium || "";
    } else if (type === "album") {
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

    const tracks: DeezerTrackResult[] = tracksData.map((t) => {
      const artistName = t.artist?.name || data.artist?.name || "";
      return {
        name: t.title || "",
        artist: artistName,
        previewUrl: t.preview || "",
        imageUrl: t.album?.cover_medium || fallbackImageUrl,
        url: t.link || (t.id ? `https://www.deezer.com/track/${t.id}` : ""),
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
export async function fetchDeezerTracks({
  type,
  id,
}: {
  type: string;
  id: string;
}): Promise<DeezerTrackResult[] | null> {
  return fetchDeezerEntityTracks(type, id);
}
