import * as cheerio from 'cheerio';

async function getAppleMusicTracks(playlistUrl) {
  try {
    const response = await fetch(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    if (!response.ok) {
      console.error(`[Apple Music Scraper] Failed to fetch playlist page: status ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Try modern layout with #serialized-server-data
    const serverDataText = $('#serialized-server-data').html();
    if (serverDataText) {
      const root = JSON.parse(serverDataText);
      const data = root.data;
      if (data && Array.isArray(data) && data.length > 0) {
        const sections = data[0]?.data?.sections || [];
        const trackSection = sections.find(s => s.itemKind === 'trackLockup' || s.id?.startsWith('track-list'));
        if (trackSection && Array.isArray(trackSection.items)) {
          return trackSection.items
            .map(item => ({
              title: item.title,
              artist: item.artistName || 'Unknown Artist'
            }))
            .filter(t => t.title);
        }
      }
    }

    // 2. Legacy fallback with application/ld+json
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      const data = JSON.parse(jsonLd);
      const tracks = [];
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const trackProp = item.track || item.about?.track || item.mainEntity?.track;
        if (trackProp) {
          const trackArray = Array.isArray(trackProp) ? trackProp : [trackProp];
          for (const t of trackArray) {
            tracks.push({
              title: t.name,
              artist: t.byArtist?.name || 'Unknown Artist'
            });
          }
        } else if (item['@type'] === 'MusicPlaylist' && item.track) {
          const trackArray = Array.isArray(item.track) ? item.track : [item.track];
          for (const t of trackArray) {
            tracks.push({
              title: t.name,
              artist: t.byArtist?.name || 'Unknown Artist'
            });
          }
        }
      }
      if (tracks.length > 0) {
        return tracks.filter(t => t.title);
      }
    }

    // 3. Dom fallback
    const domTracks = [];
    $('.track-list-item').each((i, el) => {
      const title = $(el).find('.track-list-item__title').text().trim();
      const artist = $(el).find('.track-list-item__artist').text().trim();
      if (title) {
        domTracks.push({ title, artist });
      }
    });
    return domTracks;

  } catch (e) {
    console.error("[Apple Music Scraper] Error parsing Apple Music page:", e);
  }
  return [];
}

// ----------------------------------------------------------------
// Fonction unifiée d'accès aux morceaux
// ----------------------------------------------------------------
export async function fetchAppleTracks({ type, id, url }) {
    const playlistUrl = url || (id.startsWith('http') 
        ? id 
        : `https://music.apple.com/fr/playlist/${id}`);

    console.log(`[Apple Music] Scraping tracks from playlist URL: ${playlistUrl}`);
    const scrapedTracks = await getAppleMusicTracks(playlistUrl);
    console.log(`[Apple Music] Scraped ${scrapedTracks.length} tracks. Fetching details from iTunes API...`);

    const promises = scrapedTracks.map(async (track) => {
        try {
            const searchTerm = `${track.artist} - ${track.title}`;
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`);
            
            if (!response.ok) return null;
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const iTunesTrack = data.results[0];
                return {
                    name: iTunesTrack.trackName || track.title,
                    artist: iTunesTrack.artistName || track.artist,
                    previewUrl: iTunesTrack.previewUrl || "",
                    imageUrl: iTunesTrack.artworkUrl100 || "",
                    url: iTunesTrack.trackViewUrl || ""
                };
            }
        } catch (error) {
            console.error(`[iTunes API] Error fetching track: ${track.artist} - ${track.title}`, error);
        }
        return null;
    });

    const results = await Promise.all(promises);
    const formatedTracks = results.filter(Boolean);

    console.log(`[Apple Music/iTunes] Successfully resolved ${formatedTracks.length}/${scrapedTracks.length} tracks with previews.`);
    return formatedTracks;
}