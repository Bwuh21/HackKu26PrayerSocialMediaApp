# Gathered — prayer-centered social web app

Gathered is a calm, premium-feeling feed for **prayer requests**, **updates**, **“I prayed”** interactions, and **answered prayer** history. The frontend is **vanilla HTML/CSS/JS** modules, and the backend is **Supabase** (Auth + Postgres + Row Level Security).

## Quick start (local)

Because the app loads `import` modules and Supabase from a CDN, run a **static server** (not `file://`):

```bash
npx --yes serve .
```

Then open the printed `http://localhost:...` URL.

## Preview mode (no login)

Use **Preview the app** on the landing/login/signup pages to browse **sample UI + static data** (stored in `localStorage` as `gathered_preview=1`). Use **Exit preview** in the nav to return to the marketing page.

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql` end-to-end.
3. In **Authentication → Providers**, enable **Email** (and configure email templates as you like).
4. In **Project Settings → API**, copy **Project URL** + **anon public key** into `js/config.js` (replace the placeholders).

## Project layout

- `index.html`, `login.html`, `signup.html`: marketing + auth
- `dashboard.html`: feed + your active requests
- `profile.html`: your profile + search/follow entry points
- `user.html?id=...`: another user’s profile + follow
- `prayer.html?id=...`: request details, updates, pray interaction, owner tools
- `create-prayer.html`: create flow
- `archive.html`: answered + archived (yours)
- `notifications.html`: inbox (rows are created via DB triggers)
- `css/`: theme tokens + UI system
- `js/`: Supabase client, auth helpers, API layer, nav, rendering helpers
- `supabase/schema.sql`: tables, policies, triggers, grants

## Security model (high level)

- Requests are visible if **you own them**, they’re **public**, or they’re **followers-only** and you **follow** the author.
- Only the owner can edit a request or post updates.
- Anyone who can see a request can see its **updates** and **prayer count**, but only non-owners can create a **pray interaction** for that request.
- Notifications are readable/updatable **only by the recipient**.

## Branding

The visible name is controlled in `js/brand.js`.
