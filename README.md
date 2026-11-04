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

## Jak přispívat

Vyvíjí se na větvích, do `main` jde všechno přes pull request. Před novou větví se ujisti, že vycházíš z aktuálního `main`:

```bash
git checkout main && git pull --ff-only origin main
git checkout -b feat/nazev-zmeny
# … práce, npm run typecheck && npm run build …
git push -u origin feat/nazev-zmeny   # a otevři PR na GitHubu
```

Podrobná pravidla (názvy větví, review, nasazení pravidel) jsou v `CLAUDE.md`.

## Jak je to poskládané

```text
src/app/            stránky: / (mapa), /hra, /profil, /zebricek, /napady, /ucitel, /prihlaseni
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

Hlavní cesta: **školní účet Microsoft** (Entra ID, jednotenantní aplikace v tenantu `ghb.cz`, Firebase provider `microsoft.com`). Tenant jde přepsat v `NEXT_PUBLIC_MS_TENANT`. Kdo má z fáze 1 účet s heslem na stejný e-mail, přihlásí se jednou heslem a Microsoft se k účtu připojí (`linkWithCredential`), postup zůstane.

Záloha: školní e-mail `@ghb.cz` + heslo (nutné ověření e-mailu), Google pro učitele. Kdo je mimo doménu, musí být v kolekci `allowedUsers` (`npm run allow`).
Postup registrace v Entra ID a zapnutí ve Firebase je v interních podkladech.

**Admini a testovací účty.** Role jsou v `allowedUsers`: `teacher` vidí správu školy (`/ucitel`), `admin` navíc spravuje seznam učitelů a výjimek a zakládá **testovací účty** (záložka *Testovací účty*). Testovací účet je studentský účet `…@pvk-test.example.com` s heslem, které admin vygeneruje. E-mail se neověřuje a účet se nepočítá do žebříčků (`test: true` v `allowedUsers`, `users` i `stats`). *Vypnout* smaže jen výjimku z `allowedUsers`, takže se účet už nepřihlásí. Záznam ve Firebase Auth a data zůstanou. Prvního admina přidáš skriptem `npm run allow -- email admin "Jméno"`, další už v aplikaci.

## Datový model (Firestore)

| Kolekce | Obsah |
| --- | --- |
| `users/{uid}` | profil, rok maturity (z e-mailu), studium A/C/D, rozložení klávesnice |
| `progress/{uid}` | hvězdičky po kolech, % kurzu, odemčená kapitola, statistiky kláves |
| `runs/{id}` | každé odehrané kolo včetně logu úhozů (pro audit) |
| `stats/{uid}_{rok}` | agregát pro žebříčky (per školní rok, s třídou) |
| `grades/{uid}_{rok}` | žádost o známku → potvrzení učitelem → zámek na rok |
| `allowedUsers/{email}` | učitelé, admini, výjimky a testovací účty (`test: true`) |
| `suggestions/{id}` | nápady na vylepšení (#N, kategorie, stav, hlasy `voters`/`votes`, řešitel, odkaz na PR) |
| `suggestions/{id}/comments/{id}` | komentáře k návrhu (`staff: true` = odznak TÝM) |
| `counters/suggestions` | čítač pořadových čísel návrhů |

Třída se odvozuje z roku maturity v e-mailu (`2027anovak@ghb.cz` → maturita 2027) a z volby studia v profilu (A = osmileté, C/D = čtyřleté).

## Nápady na vylepšení

`/napady` — každý přihlášený může navrhnout vylepšení nebo nahlásit chybu, hlasovat ▲ a komentovat. Návrh prochází stavy **Nový → Schváleno → Ve vývoji → Hotovo** (nebo **Zamítnuto**). Záložka *Vývoj* je nástěnka po stavech: studenti vidí, na čem se pracuje, učitel/admin přetahuje karty mezi sloupci a v detailu doplní, kdo na tom dělá a odkaz na PR. Autor může svůj návrh upravit nebo smazat, dokud je ve stavu Nový.

## Známkování

Dobrovolné. % kurzu → známka: 10 % = 5, 20 % = 4, 40 % = 3, 65 % = 2, 95 % = 1. Student požádá v profilu, učitel v `/ucitel` potvrdí předmět a tím se známka na školní rok zamkne.
