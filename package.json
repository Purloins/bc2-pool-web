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
