# Mappool app — setup

A mappool **viewer** (public), **builder** + **admin** (host only), and **suggestions**
(mappoolers) with **osu! login**. Backend = Vercel serverless functions + Upstash Redis.

## 1. Register an osu! OAuth app
- Go to https://osu.ppy.sh/home/account/edit → **OAuth** → **New OAuth Application**.
- Application Callback URL: `https://YOUR-DOMAIN.vercel.app/api/auth/callback`
  (you can edit this later once you know your Vercel URL).
- Note the **Client ID** and **Client Secret**.

## 2. Create an Upstash Redis database
- https://upstash.com → create a free Redis database.
- Copy the **REST URL** and **REST TOKEN** (the REST ones, not the redis:// URL).

## 3. Find your own osu! user ID
- It's the number in your profile URL: `https://osu.ppy.sh/users/2` → `2`.
- This becomes the bootstrap **host** so you can log in and assign other roles.

## 4. Deploy to Vercel
- Push this folder to a GitHub repo (private is fine), then "Import Project" on Vercel.
  Or run `vercel` with the CLI from this folder.
- In Vercel → Project → **Settings → Environment Variables**, add:

```
OSU_CLIENT_ID        = <from step 1>
OSU_CLIENT_SECRET    = <from step 1>
OSU_REDIRECT_URI     = https://YOUR-DOMAIN.vercel.app/api/auth/callback
OWNER_OSU_ID         = <your osu! user id from step 3>
UPSTASH_REDIS_REST_URL   = <from step 2>
UPSTASH_REDIS_REST_TOKEN = <from step 2>
```

- Redeploy after adding the variables.
- Make sure `OSU_REDIRECT_URI` exactly matches the callback URL in your osu! app settings.

## Roles
- **host** — full admin: builder, admin panel, suggestions, everything. (`OWNER_OSU_ID` is always host.)
- **mappooler** — can submit and view suggestions.
- **user** (default) — can view the pool only.

Hosts assign roles in the **Admin** tab by osu! username or ID.

## Notes
- The pool, roles, sessions, and suggestions all live in Redis (shared across users).
- Sessions are stored server-side; the cookie only holds a random token (HttpOnly, Secure).
- "Add to pool" on a suggestion drops it into the matching round as a new slot;
  fill in the remaining details (stars, BPM, etc.) in the Builder tab.
