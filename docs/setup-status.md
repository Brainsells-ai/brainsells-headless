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



\## Vercel Environment Variables (Project: brainsells-headless)

\- NEXT\_PUBLIC\_SHOPIFY\_STORE\_DOMAIN: ✅ Production + Preview

\- NEXT\_PUBLIC\_SHOPIFY\_STOREFRONT\_TOKEN: ✅ Production + Preview

\- SHOPIFY\_STOREFRONT\_PRIVATE\_TOKEN: ✅ Production + Preview

\- PAYLOAD\_SECRET: ✅ Production + Preview (32-char base64, generated via PowerShell)

\- PAYLOAD\_PUBLIC\_SERVER\_URL: ✅ Production + Preview + Development (https://brainsells-headless.vercel.app)

\- DATABASE\_URI: ✅ Production + Preview (Railway brainsells-headless project)

\- KLAVIYO\_\*: ⏳ kommt in Phase 5

\- COOKIEBOT\_\*: ⏳ kommt in Phase 6

\- GELATO\_\*: ⏳ kommt in Phase 7

\- SHOPIFY\_ADMIN\_TOKEN: ⏳ kommt in Phase 7

\- SHOPIFY\_WEBHOOK\_SECRET: ⏳ kommt in Phase 7



\## Lokale .env.local

\- Pfad: C:\\Users\\Administrator\\Developer\\brainsells-headless\\apps\\silbe\\.env.local

\- Status: ✅ angelegt mit Production-Werten (alle 6 Variables synchron zu Vercel)

\- In .gitignore: ✅ verifiziert



\## Postgres Database

\- Provider: Railway (Hobby Tier)

\- Project: brainsells-headless (separates Railway-Projekt, NICHT die agentcommerce-dev Postgres)

\- Region: EU

\- Database: railway (Default-Name)

\- Connection: DATABASE\_PUBLIC\_URL mit ?sslmode=require

\- Erreichbarkeit: ⏳ wird in Phase 0 von Claude Code getestet



\## Brain-Repo

\- Pfad: C:\\Users\\Administrator\\Developer\\brainsells-brain

\- Status: ✅ geklont (60.48 MB, 13607 files) und nach Profile-Cleanup ins Hauptprofil verschoben



\## Headless-Repo

\- Pfad: C:\\Users\\Administrator\\Developer\\brainsells-headless

\- Status: ✅ existiert mit Default-Scaffold + 5 Doc-Files unter docs/

\- Branch: main



\## Windows-System

\- Profil-Verzeichnis: C:\\Users\\Administrator\\ (Account-Name historisch "Administrator", Display-Name "Merlin")

\- whoami: desktop-58hv9a\\merlin

\- $HOME: C:\\Users\\Administrator (konsistent mit Profil-Pfad)

\- Repos liegen unter C:\\Users\\Administrator\\Developer\\

\- Hinweis für Claude Code: absolute Pfade verwenden, alle Pfade beginnen mit C:\\Users\\Administrator\\Developer\\brainsells-headless\\



\## Pre-Flight-Tests

\- Test 1 (Shopify Storefront API): ⏳ wird in Phase 0 von Claude Code geprüft

\- Test 3 (Postgres erreichbar): ⏳ wird in Phase 0 von Claude Code geprüft



\## Bekannte Abweichungen vom MEGAPROMPT

\- Postgres bei Railway statt Neon (gleichwertig — Railway war bereits im Brainsells-Stack)

\- DATABASE\_URI nur in Production+Preview Scope (nicht Development) — Sensitive-Variables-Constraint von Vercel

\- Lokale Entwicklung läuft über .env.local statt Vercel Development-Scope

\- Repo-Pfad C:\\Users\\Administrator\\ statt C:\\Users\\Merlin\\ — Account-historische Profil-Bezeichnung, nicht änderbar ohne kompletten Windows-User-Reset



\## Phase-0-Hinweise an Claude Code

\- lib/shopify.ts: Refactoring nötig — derzeit cache: 'no-store' (Probe-Code), MEGAPROMPT §2.1 verlangt ISR mit revalidateTag

\- packages/ui/: behalten als Skeleton für Phase-2-Multi-Brand-Extraktion

\- app/test/: löschen wie in §0.2 spezifiziert



\## Status

✅ Phase 0.5 abgeschlossen

🟢 Bereit für Phase 0

