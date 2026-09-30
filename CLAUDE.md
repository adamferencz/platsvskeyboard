# Plants vs. Keyboard (PMA org: GHB)

Hra na psaní všemi deseti (Plants vs. Zombies s klávesnicí) + školní portál (žebříčky, známky). Next.js 15 App Router + TS + Tailwind 4 + **Phaser 4** + Firebase (projekt `plants-vs-keyboard`). Architektura, rozhodnutí a otázky jsou v `management-a-zdroje/` (gitignorováno — obsahuje nahrávky studentů a servisní účet; nikdy neodignorovat).

## Příkazy

```bash
npm run dev            # http://localhost:3000
npm run build          # pouštěj po každé větší změně
npm run typecheck
npm run allow -- email teacher|admin ["Jméno"]   # whitelist; --list, --remove
npm run status / npm run audit -- --days 7
npm run deploy:rules   # firestore.rules + indexy
```

## Pravidla pro práci v repu

- **Repo je veřejné.** Secrets jen v `.env.local` (gitignored). Web config Firebase je veřejný identifikátor, ale i tak patří do env. Servisní účet leží v `management-a-zdroje/`, cesta v `GOOGLE_APPLICATION_CREDENTIALS`.
- **Hra (`src/game/`) nesmí importovat React ani Firebase.** Komunikuje jen přes `bridge.ts` (`hud`, `run-finished`, `exit`). Ukládání dělá `src/lib/firestore/runs.ts`.
- **Klávesnice:** `TypingInput` čte znaky ze skrytého `<input>` (mrtvé klávesy, Z/Y). Phaser má `input.keyboard: false` — nezapínat.
- **Phaser 4 ≠ 3:** `setTintFill(color)` neexistuje → `setTint(color).setTintMode(Phaser.TintModes.FILL)`. Jinak API v3 platí.
- **Osnova kláves** je v `src/game/content/curriculum.ts` (22 kapitol × 6 kol; 100 % kurzu = všechna kola na ≥ 1 ★). Měnit jen tam, `progress.courseCompletion` se z toho počítá.
- **Firestore pravidla hlídají tvar a meze, ne pravdu.** Při změně polí v `runs`/`stats`/`progress` upravit i `firestore.rules` a nasadit.
- Žebříčky čtou přímo `stats` (`where schoolYear [, classId] orderBy pole desc limit 20`) — každá nová kombinace potřebuje index v `firestore.indexes.json`.
- Textury: `BootScene.preload` načítá `/game/*.png`; když soubor chybí, `create` vygeneruje placeholder. Klíče v `TEX` neměnit.

## Datový model

`users`, `progress/{uid}`, `runs`, `stats/{uid}_{rok}`, `grades/{uid}_{rok}`, `allowedUsers/{email}` — popis v README. Školní rok `'2026-27'` počítá `src/lib/schoolYear.ts`; třída = rok maturity z e-mailu + studium (A 8leté, C/D 4leté).
