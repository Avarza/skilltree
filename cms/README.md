# SkillTree CMS

Webová administrace obsahu SkillTree: React 19 + TypeScript + TanStack Query + React Router, Vite.

```bash
npm install
npm run dev        # http://localhost:5173, API na http://localhost:8090 (VITE_API_URL)
npm test           # vitest
npm run build
```

Lokálně se přihlásíš dev účtem `admin@skilltree.local` / `admin12345` (jen profil `dev` backendu).

## Co umí

| Stránka | Popis |
|---|---|
| Dashboard | Počty podle stavu, co čeká na schválení, živá verze konfigurace |
| Skill Templates | Seznam a editor šablon (skilly, XP, návaznosti) s okamžitou validací (unikátní id, cykly) |
| Theme Manager | Barvy light/dark, tvar karet a uzlů, živý náhled telefonu, kontrola kontrastu WCAG |
| App Config | Limity AI generování, progrese, výchozí jazyk, aktivní téma |
| Content Releases | Historie neměnných snapshotů, náhled draftů, rollback |
| Audit Log | Kdo, kdy a co změnil (jen ADMIN) |

Každá změna jde přes **Draft → Review → Published**. Editor ukládá a odesílá, publisher schvaluje.
Publikace vytvoří novou verzi konfigurace, kterou si aplikace stáhne bez nového buildu.

Bezpečnost: token v `sessionStorage` (končí se zavřením záložky), do CMS se dostanou jen role EDITOR+.
Server validuje vše znovu, klientská validace slouží jen k okamžité zpětné vazbě.
