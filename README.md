// Minimal Upstash Redis REST client (no dependencies).
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your env.

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redis(...command) {
  if (!REST_URL || !REST_TOKEN) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  }
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error("Redis HTTP " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}
