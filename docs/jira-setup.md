# Nastavení Jiry pro SkillTree

Cíl: každý task má klíč `SKILL-123`, ten se propisuje do názvu větve, commitů a PR, Jira se sama posouvá podle dění na
GitHubu a Release Manager z toho skládá changelog podle toho, **co je skutečně v release větvi**.

## 1. Projekt

1. **Projects → Create project → Software development → Scrum** (sprinty), typ **Team-managed** stačí; pokud chceš
   sdílet workflow mezi projekty (SkillTree + Release Manager), zvol **Company-managed**.
2. Název `SkillTree`, klíč **`SKILL`** (je natvrdo v `branch-policy.yml` – při jiném klíči ho změň i tam).
3. Release Manager může mít vlastní projekt (např. `RM`) – v tom případě uprav regex v jeho repu.

## 2. Typy úkolů a struktura

| Typ | Použití |
|---|---|
| Epic | Velký celek – viz níže |
| Story | Uživatelská funkce („Uživatel si vygeneruje strom přes AI“) |
| Task | Technická práce (CI, migrace, refaktor) |
| Bug | Chyba; produkční chyba = hotfix |

**Components** (Project settings → Components): `mobile`, `backend`, `cms`, `release-manager`, `devops`.
Release Manager podle nich filtruje changelog a CI podle nich může v budoucnu spouštět jen relevantní buildy.

**Labels**: `content-release` pro úkoly, které se nasadí jen přes CMS bez buildu.

### Startovní epiky

1. `SKILL – Backend fáze 1` (hotovo: auth, CMS API, konfigurace, AI stromy)
2. `SKILL – CMS admin` (šablony, Theme Manager s live preview, schvalování, rollback)
3. `SKILL – Mobile app` (onboarding, seznam stromů, canvas stromu, AI generování, cache konfigurace)
4. `SKILL – Release pipeline` (EAS build, GitHub Environments, tagy, changelog)
5. `SKILL – Release Manager` (napojení na Jira API, GitHub API, EAS)
6. `SKILL – Security` (MFA pro adminy, rate limiting, refresh tokeny, bezpečnostní testy)

## 3. Workflow

Project settings → Workflows (company-managed) nebo Board → Columns (team-managed):

```
To Do → In Progress → In Review → QA → Done
```

| Stav | Kdy |
|---|---|
| In Progress | Vytvořena větev `feature/SKILL-…` |
| In Review | Otevřený PR do `develop` |
| QA | PR mergnutý do `develop` (je na stagingu) |
| Done | Release obsahující task je mergnutý do `main` a otagovaný |

Board sloupce namapuj 1:1 na stavy.

## 4. Propojení s GitHubem

1. Jira → **Apps → Explore more apps → „GitHub for Jira“** (od Atlassianu) → Install.
2. **Get started → Connect GitHub organization** → vyber účet a povol přístup k repozitářům `skilltree`
   a `skilltree-release-manager` (stačí tyto dva, ne „All repositories“).
3. Ověření: vytvoř `feature/SKILL-1-test`, pushni commit `SKILL-1 test` – v detailu úkolu se v panelu
   **Development** objeví větev a commit.

Konvence, díky kterým propojení funguje (vynucuje `branch-policy.yml`):

- větev: `feature/SKILL-24-tree-ui`, `bugfix/SKILL-31-xp-rounding`
- commit: `SKILL-24 Add skill tree canvas`
- PR titulek: `SKILL-24 Implement Skill Tree UI`

**Smart commits** (volitelné, Jira Settings → Products → DVCS → Enable Smart Commits):
`SKILL-24 #comment hotový canvas #time 2h`. Přechody stavů raději nech na automatizaci níže.

## 5. Automatizace (Project settings → Automation)

Vytvoř tato pravidla (všechna mají trigger z kategorie **DevOps**):

| Trigger | Podmínka | Akce |
|---|---|---|
| Branch created | stav = To Do | Transition → In Progress, přiřadit tvůrci |
| Pull request created | – | Transition → In Review |
| Pull request merged | cílová větev = `develop` (smart value `{{pullRequest.destinationBranch}}`) | Transition → QA |
| Pull request declined | – | Transition → In Progress |

Přechod do **Done** neřeš v Jiře – udělá ho Release Manager při vydání (viz níže), aby Done znamenalo „je v produkci“.

## 6. Verze (Releases)

- **Releases → Create version** `1.0.0`, `1.0.1` … – stejné číslo jako `release/1.0.0` a tag `v1.0.0`.
- **Fix version** nastavuje Release Manager automaticky podle commitů v release větvi, ne ručně.
  Úkoly s Fix version, které se do větve nedostaly, Release Manager nahlásí jako rozdíl.
- Content release (CMS) nemá Jira verzi; Release Manager ho zobrazuje z `GET /api/v1/admin/config-versions`.

## 7. Přístup pro Release Manager

1. Vytvoř technický účet (např. `release-bot@…`) s rolí v projektu **Member** (potřebuje číst úkoly, měnit stav
   a Fix version, spravovat verze → v company-managed projektu oprávnění *Administer projects* jen pro správu verzí).
2. Na tom účtu **id.atlassian.com → Security → API tokens → Create API token** (s expirací).
3. Ulož do GitHub Secrets repa `skilltree-release-manager` jako `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL`
   (`https://TVUJ-SITE.atlassian.net`). Nikdy ne do kódu ani `.env` v repu.

Užitečné JQL pro Release Manager:

```
project = SKILL AND fixVersion = "1.2.0" ORDER BY key
project = SKILL AND status = QA AND component = mobile
project = SKILL AND labels = content-release AND status != Done
```

## 8. Kontrolní seznam

- [ ] Projekt `SKILL`, workflow To Do → In Progress → In Review → QA → Done
- [ ] Components a label `content-release`
- [ ] GitHub for Jira nainstalované, oba repozitáře připojené
- [ ] 4 automatizační pravidla
- [ ] Verze `1.0.0`
- [ ] Technický účet + API token v GitHub Secrets
- [ ] První úkol prošel celým tokem (větev → PR → merge) a stavy se posunuly samy
