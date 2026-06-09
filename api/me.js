import { getUser } from "../lib/auth.js";

export default async function handler(req, res) {
  try {
    const user = await getUser(req);
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
