# Deploy — juandiazllc.com + philly-CRM

Deze repo bevat twee volledig onafhankelijke Next.js apps:

| App | Subdomain | Root dir | Next.js | Stack |
|---|---|---|---|---|
| Brand / holding site | `juandiazllc.com` | `.` (repo root) | 15 | React 19 + Three.js + Supabase |
| Philly CRM | `philly.juandiazllc.com` | `philly/` | 16 | React 19 + Prisma 7 + MariaDB + NextAuth + next-intl |

**Principe:** één repo, twee Vercel-projecten, twee subdomeinen. Geen rewrites, geen gedeelde env vars, geen koppeling tussen de apps. Als er één stuk gaat blijft de andere draaien.

---

## 1. Vercel setup — twee projecten uit dezelfde repo

### Project A — `juandiazllc-com` (brand)

1. Vercel dashboard → Add New → Project → import `bongartzdiaz/juandiazllc.com`
2. Root Directory: `./` (default)
3. Framework preset: Next.js
4. Env vars: kopieer de bestaande Supabase keys uit de huidige deploy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (en wat er verder al gezet was)
5. Production domain: `juandiazllc.com` + `www.juandiazllc.com`

### Project B — `philly-juandiazllc` (CRM)

1. Vercel dashboard → Add New → Project → import **zelfde** repo
2. Root Directory: klik "Edit" → typ `philly` → Continue
3. Framework preset: Next.js (auto-detected)
4. Build command: `prisma generate && next build`
   (of pas `philly/package.json` "build" script zo aan)
5. Env vars (zie sectie 2 voor DB-setup):
   - `DATABASE_URL` = MariaDB connection string
   - `NEXTAUTH_URL` = `https://philly.juandiazllc.com`
   - `NEXTAUTH_SECRET` = output van `openssl rand -base64 32`
   - overige uit `philly/DEPLOYMENT.md`
6. Custom domain: `philly.juandiazllc.com`
   - Vercel → Project B → Settings → Domains → Add `philly.juandiazllc.com`
   - DNS: CNAME `philly` → `cname.vercel-dns.com`

### Deploy volgorde
Maakt niet uit — beide projecten zijn onafhankelijk. Aanrader: deploy B eerst zodat je de CRM kan smoke-testen op de `*.vercel.app` auto-URL, dan custom domain erbij.

---

## 2. Database voor philly

Philly draait op **Prisma 7 + MariaDB**. Kies één:

### Optie A — Managed (aanrader voor prod)
- **PlanetScale** — MySQL-compatible, werkt met Prisma 7, gratis tier
- **Railway** — MariaDB add-on ~$5/maand
- **DigitalOcean Managed MySQL** — $15/maand

### Optie B — Zelf hosten op DO server (64.225.74.36)
```bash
docker run -d --name philly-mariadb \
  -e MARIADB_ROOT_PASSWORD=<sterk-password> \
  -e MARIADB_DATABASE=philly \
  -p 3306:3306 \
  -v philly-mariadb-data:/var/lib/mysql \
  --restart always \
  mariadb:11
```

DATABASE_URL format:
```
mysql://root:<password>@<host>:3306/philly
```

### Migrations eenmalig runnen (vanaf laptop)
```bash
cd philly
npm install
DATABASE_URL="mysql://..." npx prisma migrate deploy
DATABASE_URL="mysql://..." npm run seed   # optioneel
```

Alternatief: Vercel Project B "Ignored Build Step" → prisma migrate deploy bij elke build. Let op: dat runt dus bij elke deploy.

---

## 3. Lokale dev

### Brand site (poort 3000)
```bash
npm install
cp .env.example .env.local   # Supabase keys invullen
npm run dev
```

### Philly (poort 3100, aparte terminal)
```bash
cd philly
npm install
cp .env.example .env   # DATABASE_URL + NEXTAUTH_SECRET invullen
npx prisma generate
npm run dev
```

Apps weten niks van elkaar. Brand: `http://localhost:3000`. Philly: `http://localhost:3100`.

---

## 4. Auth

- **Brand** gebruikt Supabase magic-link (`/login` → `/app` stub). Users in Supabase.
- **Philly** gebruikt NextAuth + Prisma adapter. Users in MariaDB (`User` + `Account` + `Session` tabellen).

Gescheiden by design — twee producten onder één merk. Als SSO later nodig is kan via shared IdP (WorkOS / eigen OIDC) worden toegevoegd zonder structuurwijziging.

---

## 5. Rollback per app

| Scenario | Actie |
|---|---|
| Brand stuk | Vercel Project A → Deployments → "Promote to Production" op vorige commit |
| Philly stuk | Idem op Project B |
| Config fout in repo raakt beide | `git revert <bad-sha>` + push, beide Vercel projecten herbouwen |
| Hele integratie terugdraaien | Revert merge van `feat/philly-multizone` naar `main` + verwijder Project B |

---

## 6. Go-live checklist

- [ ] MariaDB up, `DATABASE_URL` getest met `npx prisma db pull`
- [ ] Prisma migrations gerund op prod-DB
- [ ] Vercel Project B deployed op `*.vercel.app`, login werkt
- [ ] DNS CNAME `philly.juandiazllc.com` → `cname.vercel-dns.com` actief + gepropageerd
- [ ] Project B custom domain toegevoegd, SSL groen
- [ ] `NEXTAUTH_URL` = `https://philly.juandiazllc.com`, Project B redeployed
- [ ] Project A (brand) ongewijzigd en blijft draaien
- [ ] Smoke-test: login op philly.juandiazllc.com → dashboard zichtbaar
- [ ] Smoke-test: juandiazllc.com brand site werkt als vanouds

---

## 7. Waarom subdomain i.p.v. path

Initieel overwogen: rewrites + basePath om alles op `juandiazllc.com/philly` te krijgen. Afgezien van die route:

- Geen env var (`PHILLY_URL`) die beide projecten aan elkaar koppelt
- NextAuth werkt out-of-box — callback-URLs onder subpath zijn pijnlijk
- Static asset paths in philly hoeven niet gepatcht
- Twee aparte preview-deploys per PR (één voor brand, één voor philly)
- App-down isolatie: brand merkt philly-crash niet en andersom

Kosten: één DNS CNAME regel. Dat is alles.
