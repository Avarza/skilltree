# SkillTree

Mobilní aplikace s AI generovanými skill stromy, vlastní headless CMS pro změny obsahu bez vydání přes App Store /
Google Play a release management přes GitFlow + Jira + GitHub Actions + Expo EAS.

| Část | Složka | Stav |
|---|---|---|
| Backend – Spring Boot 4, Java 17, PostgreSQL | [`backend/`](backend) | ✅ fáze 1 |
| CMS – React + TypeScript + TanStack Query | [`cms/`](cms) | ✅ v1 |
| Mobilní aplikace – React Native 0.88 (bare) + Expo moduly | [`mobile/`](mobile) | ✅ v1 |
| Release Manager | samostatné repo `skilltree-release-manager` | později |

## Spuštění backendu

Bez Dockeru (in-memory H2, profil `dev`):

```bash
cd backend
./mvnw spring-boot:run
```

S PostgreSQL:

```bash
docker compose up -d
cd backend && SPRING_PROFILES_ACTIVE=postgres ./mvnw spring-boot:run
```

Dev admin: `admin@skilltree.local` / `admin12345` (jen lokální profily). AI generování potřebuje
`ANTHROPIC_API_KEY` v prostředí; bez něj endpoint vrací `503 ai_not_configured`.

Testy: `cd backend && ./mvnw test`

Backend běží na portu **8090** (8080 bývá obsazený lokálním Apache), změna přes env `PORT`.

## Spuštění mobilní aplikace

Bare React Native (vlastní `ios/` a `android/`), bez Expo Go a expo-routeru. Z Expa se používají jen moduly
`expo-secure-store` (JWT v Keychain/Keystore), `expo-linear-gradient` a `expo-font`. Bundler je Metro.

```bash
cd mobile && npm install
cd ios && LANG=en_US.UTF-8 bundle exec pod install && cd ..
npx react-native start --port 8088      # 8081 může používat jiný projekt
npx react-native run-ios --port 8088    # nebo run-android
```

- **Konfigurace z CMS:** při startu se načte poslední platná konfigurace z cache (jinak vestavěné výchozí hodnoty),
  pak `GET /api/v1/config` s `If-None-Match`. Při návratu do popředí se kontroluje znovu. Nevalidní konfigurace
  se ignoruje (`src/config/validateConfig.ts`).
- **Téma** (barvy uzlů, primární barva, radius karet, šířka okraje uzlu) se bere z publikovaného tématu (`theme.dark`).
- **Streak a týdenní aktivita** se zatím počítají lokálně z dokončených skillů. Backend endpoint pro aktivitu je TODO.
- Testy: `npx jest`, typecheck: `npx tsc --noEmit`.
- **EAS:** `eas.json` a workflow `mobile-release.yml` (release větev → staging build, tag `v*` → produkce po schválení).
  Před prvním buildem je potřeba jednou spustit `eas init` a přidat secret `EXPO_TOKEN`.

## API

| Metoda | Cesta | Kdo | Popis |
|---|---|---|---|
| POST | `/api/v1/auth/register`, `/login` | veřejné | JWT token |
| GET | `/api/v1/config` | veřejné | Publikovaná konfigurace (ETag / `If-None-Match` → 304) |
| GET | `/api/v1/config/version` | veřejné | Jen číslo verze a checksum |
| GET/POST/PUT/DELETE | `/api/v1/trees` | USER | Vlastní stromy |
| POST | `/api/v1/trees/from-template/{slug}` | USER | Strom ze šablony z CMS |
| POST | `/api/v1/trees/generate` | USER | AI strom (Claude, denní limit z CMS) |
| PATCH | `/api/v1/trees/{id}/nodes/{nodeId}` | USER | Stav uzlu, XP, odemykání |
| GET | `/api/v1/trees/{id}/nodes/{nodeId}/practice` | USER | Trénink ke skillu: lekce, úkoly, kvíz (Claude, cache v DB; bez API klíče záložní obsah) |
| POST | `/api/v1/trees/{id}/nodes/{nodeId}/sessions` | USER | Uložení odstudovaného času (focus timer) |
| GET | `/api/v1/sessions?since=…` | USER | Studijní sessions pro graf a streak |
| GET/POST/PUT | `/api/v1/admin/entries` | EDITOR | CMS obsah (šablony, téma, konfigurace) |
| POST | `/api/v1/admin/entries/{id}/submit` | EDITOR | Draft → Review |
| POST | `/api/v1/admin/entries/{id}/publish`, `/reject`, `/archive` | PUBLISHER | Schválení = nová verze konfigurace |
| POST | `/api/v1/admin/entries/{id}/revisions/{n}/restore` | EDITOR | Obnovení staré revize jako draft |
| GET | `/api/v1/admin/config-versions`, `/preview` | EDITOR | Historie content releasů, náhled |
| POST | `/api/v1/admin/config-versions/{v}/rollback` | PUBLISHER | Rollback |
| GET | `/api/v1/admin/audit-logs` | ADMIN | Audit log |

## Jak funguje CMS

- Obsah má stavy **Draft → Review → Published → Archived**, každá úprava je nová revize.
- Úprava publikované položky vytvoří draft; živá zůstává poslední schválená revize, dokud se nová neschválí.
- Schválení vytvoří nový **neměnný snapshot** v `app_config_versions` (content release). Rollback zkopíruje starší
  snapshot jako novou verzi, takže čísla verzí rostou jen dopředu.
- Obsah se parsuje striktně do typových modelů ([`ContentModels.java`](backend/src/main/java/dev/skilltree/cms/content/ContentModels.java)):
  neznámé klíče, špatné typy a hodnoty mimo rozsah se odmítnou. CMS neumí poslat JavaScript ani měnit bezpečnostní pravidla.
- Princip čtyř očí: v produkci nesmí publikovat autor poslední změny (ADMIN může).
- Každá změna jde do `admin_audit_logs` ve stejné transakci.

Viz také [CONTRIBUTING.md](CONTRIBUTING.md) (GitFlow) a [docs/jira-setup.md](docs/jira-setup.md).
