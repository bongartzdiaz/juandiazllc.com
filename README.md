# juandiazllc.com

Personal brand + holding site for Juan Diaz, LLC. Dark-green, futuristic, operator-built.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Three.js for the hero scene (displaced icosahedron + particle halo)
- Supabase (Postgres + Auth) — newsletter, leads, login
- No Tailwind — hand-written CSS in `app/globals.css`

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

## Deploy

Import to Vercel, wire env vars, point DNS for `juandiazllc.com` at Vercel. Subdomains (`philly.`, `hmb.`, etc.) live in their own repos and Vercel projects.

## Database

Tables: `subscribers`, `leads`, `profiles`. RLS on all. See `supabase/` migrations if regenerating.

## Pages

- `/` — landing
- `/story` — long-form about
- `/work` — ventures
- `/signals` — writing (empty for now)
- `/contact` — direct line
- `/login` — magic-link auth
- `/app` — protected stub (authed dashboard hub)
