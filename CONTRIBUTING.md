# GitFlow ve SkillTree

| Větev | Účel | Vzniká z | Merguje se do | CI/CD |
|---|---|---|---|---|
| `main` | Produkční verze | – | – | Produkční release po manuálním schválení |
| `develop` | Integrace funkcí | `main` | – | Testy + staging build |
| `feature/SKILL-24-tree-ui` | Vývoj Jira tasku | `develop` | `develop` | Lint, testy, security |
| `release/1.0.0` | Stabilizace vydání | `develop` | `main` + `develop` | QA + release candidate build |
| `hotfix/1.0.1` | Kritická produkční oprava | `main` | `main` + `develop` | Testy + patch release |

## Postup pro Jira task

```bash
git switch develop && git pull
git switch -c feature/SKILL-24-tree-ui
# ...práce...
git commit -m "SKILL-24 Add skill tree canvas"
git push -u origin feature/SKILL-24-tree-ui
```

PR do `develop` s titulkem `SKILL-24 Implement Skill Tree UI`. Workflow **Branch policy** odmítne PR se špatným názvem
větve, cílem nebo bez Jira klíče.

## Release

1. `release/1.2.0` z `develop`, jen opravy a změna verze.
2. PR `release/1.2.0 → main`, schválení, merge.
3. Tag `v1.2.0` na merge commitu v `main` (spouští produkční workflow se schválením v GitHub Environment `production`).
4. PR `main → develop`, aby se změny z release větve neztratily.

Hotfix stejně, jen z `main` a s patch verzí.

## Ochrana větví (GitHub → Settings → Rules)

- `main`, `develop`: zákaz přímého push, merge jen přes PR, povinné checky `Build & test` a `Branch policy`, aspoň 1 schválení.
- Tagy `v*`: vytvářet jen správci.
- Environment `production`: required reviewers.
- Secrets (`EXPO_TOKEN`, signing credentials, `ANTHROPIC_API_KEY`, `JWT_SECRET`) jen v GitHub Secrets / Environments, nikdy v repu.

## Dva typy vydání

- **Application release** – změna kódu: Jira → GitFlow → GitHub Actions → EAS Build → Release Manager → App Store / Google Play.
- **Content release** – změna v CMS: validace → preview → schválení → publikace konfigurace → aplikace si ji stáhne sama. Bez buildu.
