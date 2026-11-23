# Changelog – SkillTree mobile

Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verze podle [SemVer](https://semver.org/lang/cs/).
Tagy mobilní aplikace mají tvar `mobile-vX.Y.Z` (tag `vX.Y.Z` spouští EAS store build).

## [0.1.0] – 2026-11-09

První veřejná verze mobilní aplikace.

### Přidáno
- **Demo režim** – tlačítko „Try the demo“ na přihlášení. Aplikace běží bez účtu a bez serveru nad ukázkovými
  stromy (TypeScript, španělština, kytara), tréninkem a týdnem studijních sessions. Data zůstávají v telefonu,
  odchodem z dema se resetují.
- **Skill stromy ve vesmíru** – posouvání, zoom a dvojité klepnutí na celé plátno, mapa všech stromů na dvou
  orbitách, animované přepínání obrazovek.
- **Trénink ke skillu** – focus timer, lekce, úkoly a kvíz; odstudované minuty se ukládají.
- **Progres** – graf studijního času za týden, denní streak, úrovně a achievementy.
- **Generování stromu** z tématu, úrovně a cíle (s backendem přes Claude, v demu offline).
- **Vzhled z CMS** – téma a konfigurace se stahují z publikovaného content release, offline z cache
  nebo z vestavěných výchozích hodnot.
- Ikona aplikace s monogramem SK.

### Známá omezení
- Přihlášení účtem, šablony z CMS a generování přes Claude potřebují běžící backend; v releasu je zatím
  dostupný jen demo režim.
- APK je podepsané vývojovým klíčem (instalace mimo Google Play). Pro Google Play bude potřeba vlastní upload key.
- iOS build je jen pro simulátor; instalace na iPhone vyžaduje Apple Developer účet.

[0.1.0]: https://github.com/Avarza/skilltree/releases/tag/mobile-v0.1.0
