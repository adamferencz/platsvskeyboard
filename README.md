# Plants vs. Keyboard

Hra na psaní všemi deseti ve stylu Plants vs. Zombies pro studenty Gymnázia Havlíčkův Brod. Zombíci nesou písmena a slova, psaním umírají. Postup odemyká klávesy podle osvědčené osnovy (dfjk → aslů → ei → … → diakritika), škola má žebříčky a učitel může na konci zapsat dobrovolnou známku.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind 4 + Phaser 4 + Firebase (Auth, Firestore)**. Hosting Vercel.

## Spuštění

```bash
npm install
cp .env.example .env.local     # doplň hodnoty z Firebase konzole (Project settings → Web app)
npm run dev                    # http://localhost:3000
```

Skripty s Admin SDK potřebují v `.env.local` ještě `GOOGLE_APPLICATION_CREDENTIALS=./cesta/k/servisnimu-uctu.json`. Servisní účet **nikdy** do gitu (`.gitignore` ho už zakazuje).

```bash
npm run typecheck              # tsc
npm run build                  # produkční build — pouštěj před pushem
npm run allow -- email role    # whitelist učitelů (role teacher | admin); --list, --remove
npm run status                 # co je v databázi
npm run audit -- --days 7      # označí podezřelé běhy podle logu úhozů
npm run deploy:rules           # firestore.rules + indexy do projektu plants-vs-keyboard
```

## Jak je to poskládané

```text
src/app/            stránky: / (mapa), /hra, /profil, /zebricek, /ucitel, /prihlaseni
src/game/           herní jádro — Phaser, žádný React uvnitř
  scenes/           BootScene (textury), LevelScene (dráhy, zombíci, věže, boss)
  content/          curriculum.ts (kapitoly a klávesy), levels.ts (obtížnost), words.ts (generátor slov)
  input/            TypingInput — skrytý <input>, funguje s českou klávesnicí a mrtvými klávesami
  bridge.ts         EventBus React ↔ Phaser (HUD, výsledek kola)
  GameMount.tsx     React obal Phaseru
src/lib/            firebase klient, auth kontext, Firestore vrstva, známkování, metriky, školní rok
scripts/            Admin SDK skripty (whitelist, status, audit)
public/data/        words-cs.json — 20 000 českých slov (wordfreq, CC BY-SA 4.0)
public/game/        sprity (zatím zombie učitel; ostatní jsou generované placeholdery)
firestore.rules     pravidla: student píše jen svoje běhy, meze hodnot, učitel potvrzuje známky
```

Zásady:

- **Hra nesahá na Firestore.** Po kole předá `RunResult` přes bridge, portál ho uloží (`saveRun`).
- **Porovnáváme znaky, ne klávesy.** Z/Y prohození ani rozložení OS hru nerozbije.
- **Obsah je data.** Kapitoly, slovník a obtížnost se ladí bez zásahu do enginu.

## Přihlášení

Fáze 1: školní e-mail `@ghb.cz` + heslo (nutné ověření e-mailu), Google pro učitele. Kdo je mimo doménu, musí být v kolekci `allowedUsers` (`npm run allow`).
Fáze 2: Microsoft (Entra ID, single-tenant) — postup je v interních podkladech.

## Datový model (Firestore)

| Kolekce | Obsah |
| --- | --- |
| `users/{uid}` | profil, rok maturity (z e-mailu), studium A/C/D, rozložení klávesnice |
| `progress/{uid}` | hvězdičky po kolech, % kurzu, odemčená kapitola, statistiky kláves |
| `runs/{id}` | každé odehrané kolo včetně logu úhozů (pro audit) |
| `stats/{uid}_{rok}` | agregát pro žebříčky (per školní rok, s třídou) |
| `grades/{uid}_{rok}` | žádost o známku → potvrzení učitelem → zámek na rok |
| `allowedUsers/{email}` | učitelé a výjimky |

Třída se odvozuje z roku maturity v e-mailu (`2027anovak@ghb.cz` → maturita 2027) a z volby studia v profilu (A = osmileté, C/D = čtyřleté).

## Známkování

Dobrovolné. % kurzu → známka: 10 % = 5, 20 % = 4, 40 % = 3, 65 % = 2, 95 % = 1. Student požádá v profilu, učitel v `/ucitel` potvrdí předmět a tím se známka na školní rok zamkne.
