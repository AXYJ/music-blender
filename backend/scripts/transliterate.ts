import Groq from "groq-sdk";

try {
  if (typeof (process as unknown as { loadEnvFile: () => void }).loadEnvFile === "function") {
    (process as unknown as { loadEnvFile: () => void }).loadEnvFile();
  }
} catch {
  // Ignorer si le fichier .env n'est pas présent ou déjà chargé
}

const getApiKey = () => process.env.GROQ_API_KEY || process.env.apiKey;
const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

export interface TransliterateItem {
  id: string | number;
  artist: string;
  title: string;
}

export interface TransliterateResult {
  id: string | number;
  internationalArtist: string;
  internationalTitle: string;
}

export async function transliterate(
  items: TransliterateItem[],
): Promise<TransliterateResult[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "[Groq transliterate] GROQ_API_KEY non configurée dans le fichier .env.",
    );
    return [];
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a music metadata romanization expert. Romanize artist names and song titles into Latin script / standard Western international names.\n' +
            '- If the artist has a well-known official Western/English stage name (e.g. 周杰伦 -> "Jay Chou", 米津玄師 -> "Kenshi Yonezu", 張學友 -> "Jacky Cheung", 陳奕迅 -> "Eason Chan", 王菲 -> "Faye Wong", 劉德華 -> "Andy Lau", 葉麗儀 -> "Frances Yip", 徐小鳳 -> "Paula Tsui", 陳慧嫻 -> "Priscilla Chan"), always use that official name.\n' +
            '- For Japanese text, use standard Hepburn Romaji.\n' +
            '- For Chinese text, use standard Pinyin or standard Cantonese romanization without tone marks.\n' +
            '- For Korean text, use Revised Romanization.\n' +
            '- Keep text that is already in Latin characters as is.\n' +
            '- Always format output with proper spaces and Capitalized Words (Title Case).\n' +
            'Return a JSON object with a "results" array: { "results": [{ "id": ..., "internationalArtist": "...", "internationalTitle": "..." }] }.',
        },
        {
          role: "user",
          content: JSON.stringify(items),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Réponse vide de Groq");
    }

    const parsed = JSON.parse(content);
    const results: TransliterateResult[] = Array.isArray(parsed)
      ? parsed
      : parsed.results || parsed.items || [];

    return results;
  } catch (error) {
    console.error("[Groq transliterate] Erreur lors de l'appel :", error);
    throw error;
  }
}

export async function transliterateArtists(
  artists: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!artists || artists.length === 0) return result;

  const nonAsciiArtists = Array.from(
    new Set(artists.filter((a) => a && /[^\x00-\x7F]/.test(a))),
  );

  if (nonAsciiArtists.length === 0) {
    for (const a of artists) {
      if (a) result.set(a, a);
    }
    return result;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn(
      "[Groq transliterateArtists] GROQ_API_KEY non configurée dans le fichier .env.",
    );
    return result;
  }

  const groq = new Groq({ apiKey });
  const items = nonAsciiArtists.map((artist, id) => ({ id, artist }));

  try {
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a music metadata romanization expert. Romanize artist names into Latin script / standard Western international names.\n' +
            '- If the artist has a well-known official Western/English stage name (e.g. 周杰伦 -> "Jay Chou", 米津玄師 -> "Kenshi Yonezu", 張學友 -> "Jacky Cheung", 陳奕迅 -> "Eason Chan", 王菲 -> "Faye Wong", 劉德華 -> "Andy Lau", 葉麗儀 -> "Frances Yip", 徐小鳳 -> "Paula Tsui", 陳慧嫻 -> "Priscilla Chan"), always use that official name.\n' +
            '- For Japanese text, use standard Hepburn Romaji.\n' +
            '- For Chinese text, use standard Pinyin or standard Cantonese romanization without tone marks.\n' +
            '- For Korean text, use Revised Romanization.\n' +
            '- Keep text that is already in Latin characters as is.\n' +
            '- Always format output with proper spaces and Capitalized Words (Title Case).\n' +
            'Return a JSON object with a "results" array: { "results": [{ "id": ..., "artist": "...", "internationalArtist": "..." }] }.',
        },
        {
          role: "user",
          content: JSON.stringify(items),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const itemsResult: Array<{
        id?: number | string;
        artist?: string;
        internationalArtist?: string;
      }> = Array.isArray(parsed)
        ? parsed
        : parsed.results || parsed.items || [];

      for (const item of itemsResult) {
        const origArtist =
          item.artist ||
          (typeof item.id === "number" ? nonAsciiArtists[item.id] : undefined);
        if (origArtist && item.internationalArtist) {
          result.set(origArtist, item.internationalArtist.trim());
        }
      }
    }
  } catch (error) {
    console.error(
      "[Groq transliterateArtists] Erreur lors de l'appel :",
      error,
    );
  }

  return result;
}