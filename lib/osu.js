// Client-credentials token (for looking up users by name/id when assigning roles).

let appToken = null;
let appTokenExp = 0;

export async function getAppToken() {
  if (appToken && Date.now() < appTokenExp) return appToken;
  const res = await fetch("https://osu.ppy.sh/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: process.env.OSU_CLIENT_ID,
      client_secret: process.env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Could not get osu! app token");
  appToken = data.access_token;
  appTokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return appToken;
}

// key can be a numeric osu! user id or a username.
export async function lookupUser(key) {
  const token = await getAppToken();
  const isId = /^\d+$/.test(String(key).trim());
  const url = `https://osu.ppy.sh/api/v2/users/${encodeURIComponent(String(key).trim())}?key=${isId ? "id" : "username"}`;
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) return null;
  const u = await res.json();
  if (!u || !u.id) return null;
  return { id: u.id, username: u.username };
}

/* ---------- Beatmap fetching + mod stat conversions ---------- */

// Fetch base (NoMod) beatmap data.
export async function getBeatmap(id) {
  const token = await getAppToken();
  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${encodeURIComponent(id)}`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) return null;
  return res.json();
}

// Mod-adjusted star rating via the difficulty attributes endpoint.
export async function getStarRating(id, mods, ruleset) {
  const token = await getAppToken();
  const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${encodeURIComponent(id)}/attributes`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ mods: mods || [], ruleset: ruleset || "osu" }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.attributes?.star_rating ?? null;
}

// AR <-> preempt time (ms)
const arToMs = (ar) => (ar <= 5 ? 1800 - ar * 120 : 1200 - (ar - 5) * 150);
const msToAr = (ms) => (ms > 1200 ? (1800 - ms) / 120 : 5 + (1200 - ms) / 150);
// OD <-> 300 hit window (ms)
const odToMs = (od) => 80 - 6 * od;
const msToOd = (ms) => (80 - ms) / 6;
const clamp10 = (v) => Math.max(0, Math.min(10, v));

// Which mods to request from the SR endpoint for a given pool mod.
export function modsForSR(mod) {
  return ({ HR: ["HR"], DT: ["DT"], HT: ["HT"], EZ: ["EZ"], FL: ["FL"] }[mod]) || [];
}

// Apply a single pool mod to base stats. base = {cs, ar, od, hp, bpm, lengthSec}.
// HR/EZ multiply and cap at the 0-10 stat range; DT/HT convert by time
// (so effective AR/OD can legitimately exceed 10, as tournament sheets show).
export function applyMod(base, mod) {
  let { cs, ar, od, hp, bpm, lengthSec } = base;
  if (mod === "HR") {
    cs = clamp10(cs * 1.3); ar = clamp10(ar * 1.4);
    od = clamp10(od * 1.4); hp = clamp10(hp * 1.4);
  } else if (mod === "EZ") {
    cs = cs * 0.5; ar = ar * 0.5; od = od * 0.5; hp = hp * 0.5;
  } else if (mod === "DT" || mod === "HT") {
    const s = mod === "DT" ? 1.5 : 0.75;
    bpm = bpm * s;
    lengthSec = Math.round(lengthSec / s);
    ar = msToAr(arToMs(ar) / s);
    od = msToOd(odToMs(od) / s);
  }
  return { cs, ar, od, hp, bpm, lengthSec };
}
