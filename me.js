export default function handler(req, res) {
  const clientId = process.env.OSU_CLIENT_ID;
  const redirectUri = process.env.OSU_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    res.statusCode = 500;
    return res.end("Server missing OSU_CLIENT_ID / OSU_REDIRECT_URI");
  }
  const url = new URL("https://osu.ppy.sh/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  res.writeHead(302, { Location: url.toString() });
  res.end();
}
