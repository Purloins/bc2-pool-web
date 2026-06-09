import crypto from "node:crypto";
import { redis } from "./redis.js";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days (seconds)

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i === -1) return;
    out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}

export async function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  // store only stable identity fields; role is resolved fresh each request
  const payload = { id: user.id, username: user.username, avatar_url: user.avatar_url };
  await redis("SET", "session:" + token, JSON.stringify(payload), "EX", String(SESSION_TTL));
  return token;
}

export function sessionCookie(token) {
  return `sid=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`;
}
export function clearCookie() {
  return `sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Resolve a user's role. The OWNER_OSU_ID env var is always "host" (bootstrap admin).
export async function getRole(osuId) {
  const owner = process.env.OWNER_OSU_ID;
  if (owner && String(osuId) === String(owner)) return "host";
  const raw = await redis("HGET", "roles", String(osuId));
  if (!raw) return "user";
  try { return JSON.parse(raw).role || "user"; } catch { return "user"; }
}

export async function getUser(req) {
  const { sid } = parseCookies(req);
  if (!sid) return null;
  const raw = await redis("GET", "session:" + sid);
  if (!raw) return null;
  const user = JSON.parse(raw);
  user.role = await getRole(user.id);
  return user;
}
