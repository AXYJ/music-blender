declare module "kuroshiro" {
  export default class Kuroshiro {
    static default: typeof Kuroshiro;
    constructor();
    init(analyzer: unknown): Promise<void>;
    convert(
      str: string,
      options?: {
        to?: string;
        mode?: string;
        romajiSystem?: string;
        delimiter_start?: string;
        delimiter_end?: string;
      },
    ): Promise<string>;
  }
}

declare module "kuroshiro-analyzer-kuromoji" {
  export default class KuromojiAnalyzer {
    constructor(dictPath?: { dictPath?: string });
  }
}

declare module "spotify-url-info";
