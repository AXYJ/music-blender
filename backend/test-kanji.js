import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const kuroshiro = new Kuroshiro.default();

async function run() {
    await kuroshiro.init(new KuromojiAnalyzer());
    const r1 = await kuroshiro.convert("徘徊", { to: "romaji", romajiSystem: "hepburn" });
    console.log("徘徊 (Japanese Word) ->", r1);
    
    const r2 = await kuroshiro.convert("徘徊している", { to: "romaji", romajiSystem: "hepburn" });
    console.log("徘徊している ->", r2);
}

run().catch(console.error);
