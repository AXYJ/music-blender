import { Track } from "../types/game.js";

// Correction des réponses : comparaison tolérante (casse et accents ignorés), artistes
// séparés par ",", "&", "feat."… et noms acceptés dans l'écriture d'origine comme en
// version internationale (romanisée).

export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

export function splitArtists(artistStr: string): string[] {
  if (!artistStr || typeof artistStr !== "string") return [];

  const separators =
    /,\s*|&\s*|\s+\/\s+|\s+(?:and|feat\.?|featuring|with)\s+/gi;

  return artistStr
    .split(separators)
    .map((a) => a.trim())
    .filter(
      (a) => a.length > 0 && !/^(feat\.?|featuring|with|&|and)$/i.test(a),
    );
}

// Morceau prêt à jouer : champs par défaut et normalisations précalculées pour
// la correction des réponses (voir scoreAnswer)
export function prepareTrack(track: Track, index: number): Track {
  const originalArtists = splitArtists(track.artist)
    .map((a) => normalizeString(a))
    .filter(Boolean);
  const internationalArtists = splitArtists(track.internationalArtist || "")
    .map((a) => normalizeString(a))
    .filter(Boolean);

  // Pour chaque artiste, les noms acceptés (original et international)
  const requiredArtists = originalArtists.map((orig, idx) => {
    const names = [orig];
    if (internationalArtists[idx]) names.push(internationalArtists[idx]);
    return names;
  });

  return {
    order: index + 1,
    name: track.name || "",
    artist: track.artist || "",
    internationalName: track.internationalName || track.name || "",
    internationalArtist: track.internationalArtist || track.artist || "",
    previewUrl: track.previewUrl || "",
    imageUrl: track.imageUrl || "",
    submittedBy: track.submittedBy || "",
    url: track.url || "",
    _normalizedName: normalizeString(track.name || ""),
    _normalizedIntName: normalizeString(track.internationalName || ""),
    _requiredArtists: requiredArtists,
    _rawArtist: normalizeString(track.artist || ""),
    _rawIntArtist: normalizeString(track.internationalArtist || ""),
  };
}

// Note d'une réponse : artiste 1 (tous trouvés), 0.5 (une partie) ou 0 ; titre juste ou non.
// Les artistes de la réponse sont séparés par des virgules.
export function scoreAnswer(
  track: Track,
  artistGuess: string,
  trackGuess: string,
): { artistScore: number; trackCorrect: boolean } {
  const correctTrack = track._normalizedName ?? normalizeString(track.name);
  const correctIntTrack =
    track._normalizedIntName ?? normalizeString(track.internationalName || "");
  const guessedTrack = normalizeString(trackGuess);
  const trackCorrect =
    guessedTrack === correctTrack || guessedTrack === correctIntTrack;

  const playerGuesses = (artistGuess || "")
    .split(",")
    .map((a) => normalizeString(a))
    .filter(Boolean);

  const requiredArtists = track._requiredArtists ?? [];
  const rawArtist = track._rawArtist ?? normalizeString(track.artist);
  const rawIntArtist =
    track._rawIntArtist ?? normalizeString(track.internationalArtist || "");
  let artistScore = 0;
  // Nom de groupe saisi en entier (« Simon & Garfunkel »)
  if (playerGuesses.some((g) => g === rawArtist || g === rawIntArtist)) {
    artistScore = 1;
  } else if (requiredArtists.length > 0) {
    const matchedCount = requiredArtists.filter((acceptableNames) =>
      playerGuesses.some((guess) => acceptableNames.includes(guess)),
    ).length;
    if (matchedCount === requiredArtists.length) artistScore = 1;
    else if (matchedCount > 0) artistScore = 0.5;
  }

  return { artistScore, trackCorrect };
}
