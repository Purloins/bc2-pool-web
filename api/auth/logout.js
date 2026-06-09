import { createSession, sessionCookie } from "../../lib/auth.js";

export default async function handler(req, res) {
  const code = req.query?.code;
  if (!code) {
    res.statusCode = 400;
    return res.end("Missing authorization code");
  }
  try {
    // 1. Exchange code for an access token
    const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.OSU_REDIRECT_URI,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error("Token exchange failed");

    // 2. Fetch the logged-in user
    const meRes = await fetch("https://osu.ppy.sh/api/v2/me", {
      headers: { Authorization: "Bearer " + token.access_token },
    });
    const me = await meRes.json();
    if (!me || !me.id) throw new Error("Could not fetch osu! profile");

    const user = { id: me.id, username: me.username, avatar_url: me.avatar_url };

    // 3. Create a session and set the cookie
    const sid = await createSession(user);
    res.writeHead(302, { "Set-Cookie": sessionCookie(sid), Location: "/" });
    res.end();
  } catch (e) {
    res.statusCode = 500;
    res.end("Login failed: " + e.message);
  }
}
