import { getUser } from "../lib/auth.js";
import { redis } from "../lib/redis.js";

const DEFAULT_POOL = { name: "My Tournament", rounds: [] };

export default async function handler(req, res) {
  if (req.method === "GET") {
    const raw = await redis("GET", "pool");
    return res.json({ pool: raw ? JSON.parse(raw) : DEFAULT_POOL });
  }

  if (req.method === "POST") {
    const user = await getUser(req);
    if (!user || user.role !== "host") {
      return res.status(403).json({ error: "Host only" });
    }
    const pool = req.body;
    if (!pool || !Array.isArray(pool.rounds)) {
      return res.status(400).json({ error: "invalid pool" });
    }
    await redis("SET", "pool", JSON.stringify(pool));
    return res.json({ ok: true });
  }

  res.status(405).end();
}
