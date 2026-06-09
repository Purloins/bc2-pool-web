import { parseCookies, clearCookie } from "../../lib/auth.js";
import { redis } from "../../lib/redis.js";

export default async function handler(req, res) {
  const { sid } = parseCookies(req);
  if (sid) {
    try { await redis("DEL", "session:" + sid); } catch (e) {}
  }
  res.writeHead(302, { "Set-Cookie": clearCookie(), Location: "/" });
  res.end();
}
