import { getUser } from "../lib/auth.js";
import { getBeatmap, getBeatmapset, getStarRating, applyMod, modsForSR } from "../lib/osu.js";

const fmtLen = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const r1 = (v) => Math.round(v * 10) / 10;

export default async function handler(req, res) {
  try {
    const user = await getUser(req);
    if (!user || (user.role !== "host" && user.role !== "mappooler")) {
      return res.status(403).json({ error: "Mappoolers only" });
    }
    const id = req.query?.id;
    const mod = (req.query?.mod || "NM").toUpperCase();
    if (!id) return res.status(400).json({ error: "beatmap id required" });

    // Try as a difficulty (beatmap) ID first.
    let bm = await getBeatmap(id);

    // Fallback: maybe they entered a beatmapSET id — use the hardest difficulty.
    if (!bm || !bm.id) {
      const set = await getBeatmapset(id);
      if (set && Array.isArray(set.beatmaps) && set.beatmaps.length) {
        bm = set.beatmaps.slice().sort((a, b) => (b.difficulty_rating || 0) - (a.difficulty_rating || 0))[0];
        bm.beatmapset = { title: set.title, artist: set.artist, creator: set.creator };
        bm.beatmapset_id = set.id;
      }
    }

    if (!bm || !bm.id) {
      return res.status(404).json({ error: "No beatmap with that ID. Use the difficulty's beatmap ID — the number after #osu/ in the map URL." });
    }

    const base = { cs: bm.cs, ar: bm.ar, od: bm.accuracy, hp: bm.drain, bpm: bm.bpm, lengthSec: bm.total_length };
    const m = applyMod(base, mod);
    const stars = await getStarRating(bm.id, modsForSR(mod), bm.mode || "osu");

    res.json({
      beatmapId: bm.id,
      beatmapsetId: bm.beatmapset_id,
      title: bm.beatmapset?.title || "",
      artist: bm.beatmapset?.artist || "",
      mapper: bm.beatmapset?.creator || "",
      difficulty: bm.version || "",
      mod,
      cs: r1(m.cs), ar: r1(m.ar), od: r1(m.od), hp: r1(m.hp),
      bpm: Math.round(m.bpm),
      length: bm.total_length ? fmtLen(m.lengthSec) : "",
      stars: stars != null ? Math.round(stars * 100) / 100 : (bm.difficulty_rating ?? null),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
