import { getUser } from "../lib/auth.js";
import { redis } from "../lib/redis.js";
import { lookupUser } from "../lib/osu.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user || user.role !== "host") {
    return res.status(403).json({ error: "Host only" });
  }

  if (req.method === "GET") {
    const flat = (await redis("HGETALL", "roles")) || [];
    const roles = [];
    for (let i = 0; i < flat.length; i += 2) {
      try {
        const v = JSON.parse(flat[i + 1]);
        roles.push({ id: flat[i], username: v.username, role: v.role });
      } catch {}
    }
    return res.json({ roles });
  }

  if (req.method === "POST") {
    const { key, role } = req.body || {};
    if (!key || !role) return res.status(400).json({ error: "key and role required" });
    if (!["host", "mappooler", "user"].includes(role)) {
      return res.status(400).json({ error: "invalid role" });
    }
    const resolved = await lookupUser(key);
    if (!resolved) return res.status(404).json({ error: "osu! user not found" });

    if (role === "user") {
      await redis("HDEL", "roles", String(resolved.id));
    } else {
      await redis("HSET", "roles", String(resolved.id),
        JSON.stringify({ role, username: resolved.username }));
    }
    return res.json({ ok: true, user: resolved, role });
  }

  res.status(405).end();
}
