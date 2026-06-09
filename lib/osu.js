import crypto from "crypto";
import { getUser } from "../lib/auth.js";
import { redis } from "../lib/redis.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Login required" });

  const canSuggest = user.role === "mappooler" || user.role === "host";

  if (req.method === "GET") {
    if (!canSuggest) return res.status(403).json({ error: "Mappoolers only" });
    const raw = (await redis("LRANGE", "suggestions", "0", "-1")) || [];
    const suggestions = raw.map((s) => JSON.parse(s)).reverse(); // newest first
    return res.json({ suggestions });
  }

  if (req.method === "POST") {
    if (!canSuggest) return res.status(403).json({ error: "Mappoolers only" });
    const { round, mod, link, title, comment } = req.body || {};
    if (!link && !title) return res.status(400).json({ error: "link or title required" });
    const item = {
      id: crypto.randomBytes(6).toString("hex"),
      round: round || "",
      mod: mod || "NM",
      link: link || "",
      title: title || "",
      comment: comment || "",
      by: user.username,
      byId: user.id,
      at: Date.now(),
    };
    await redis("RPUSH", "suggestions", JSON.stringify(item));
    return res.json({ ok: true, item });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const raw = (await redis("LRANGE", "suggestions", "0", "-1")) || [];
    const list = raw.map((s) => JSON.parse(s));
    const target = list.find((x) => x.id === id);
    if (!target) return res.status(404).json({ error: "Not found" });
    if (user.role !== "host" && target.byId !== user.id) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await redis("LREM", "suggestions", "0", JSON.stringify(target));
    return res.json({ ok: true });
  }

  res.status(405).end();
}
