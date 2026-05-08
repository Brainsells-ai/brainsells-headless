\# Setup Status — 2026-05-08



\## Shopify Headless Sales Channel

\- Channel-Name: Silbe Headless

\- Public Storefront Token: ✅ in Vercel + .env.local

\- Private Storefront Token: ✅ in Vercel + .env.local

\- Storefront API Scopes: ✅ alle Pflicht-Scopes aus MEGAPROMPT §0.5.3 gesetzt

&#x20; - read\_product\_listings, read\_product\_inventory, read\_product\_tags ✅

&#x20; - read\_collection\_listings, read\_metaobjects ✅

&#x20; - write\_checkouts, read\_checkouts ✅

&#x20; - write\_customers ✅

\- Admin API Custom-App: ⏳ erst in Phase 7 nötig

\- Datum der Verifikation: 2026-05-08



\## Vercel Environment Variables

\- NEXT\_PUBLIC\_SHOPIFY\_STORE\_DOMAIN: ✅ Production + Preview

\- NEXT\_PUBLIC\_SHOPIFY\_STOREFRONT\_TOKEN: ✅ Production + Preview

\- SHOPIFY\_STOREFRONT\_PRIVATE\_TOKEN: ✅ Production + Preview

\- PAYLOAD\_SECRET: ✅ Production + Preview (32-char base64, generated via PowerShell)

\- PAYLOAD\_PUBLIC\_SERVER\_URL: ⏳ noch zu setzen → https://brainsells-headless.vercel.app

\- DATABASE\_URI: ✅ Production + Preview (Railway brainsells-headless project)

\- KLAVIYO\_\*: ⏳ kommt in Phase 5

\- COOKIEBOT\_\*: ⏳ kommt in Phase 6

\- GELATO\_\*: ⏳ kommt in Phase 7

\- SHOPIFY\_ADMIN\_TOKEN: ⏳ kommt in Phase 7

\- SHOPIFY\_WEBHOOK\_SECRET: ⏳ kommt in Phase 7



\## Lokale .env.local

\- Pfad: apps/silbe/.env.local

\- Status: ✅ angelegt mit Production-Werten

\- In .gitignore: ✅ verifiziert



\## Postgres Database

\- Provider: Railway (Hobby Tier)

\- Project: brainsells-headless

\- Region: \[hier eintragen welche Region du gewählt hast]

\- Database: railway (Default-Name)

\- Connection: DATABASE\_PUBLIC\_URL mit ?sslmode=require

\- Erreichbarkeit: ⏳ wird in Phase 0 von Claude Code getestet



\## Brain-Repo Klon-Pfad

\- Pfad: \[hier eintragen nach Punkt 5 Test]



\## Pre-Flight-Tests

\- Test 1 (Shopify Storefront API): ⏳ wird in Phase 0 von Claude Code geprüft

\- Test 3 (Postgres erreichbar): ⏳ wird in Phase 0 von Claude Code geprüft



\## Bekannte Abweichungen vom MEGAPROMPT

\- Postgres bei Railway statt Neon (gleichwertig — Railway war bereits im Brainsells-Stack)

\- DATABASE\_URI nur in Production+Preview Scope (nicht Development) — Sensitive-Variables-Constraint von Vercel

\- Lokale Entwicklung läuft über .env.local statt Vercel Development-Scope



\## Status

✅ Phase 0.5 abgeschlossen

🟢 Bereit für Phase 0

