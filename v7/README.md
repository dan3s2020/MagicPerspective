# MagicPerspective V7 — organismul care recunoaște tipuri de lumi

Versiune izolată în `v7/`, port **3036**, date proprii în `v7/data/`. V1–V6 rămân neatinse. Creierul tău V6 de pe telefon (`v6/data/`) este doar **citit**, ca să fie comparat — nu e modificat niciodată.

## Pornire în Termux

```sh
cd ~/MagicPerspective && git pull --ff-only origin main
bash v7/run-termux.sh
```

Deschide **http://127.0.0.1:3036** → **Antrenează** (300 terenuri, ~2 minute) → **Rulează testul** → secțiunea **Ce a învățat**.
Teste: `cd v7 && npm test` · Benchmark: `node scripts-benchmark.mjs 400 15 40 17 v7` (sau `... v6` pentru organul V6).

## Ce s-a schimbat față de V6

Plafonul V6 avea o cauză măsurată: același organ, trăind și relief și labirinturi, reconstruiește relieful mai prost (eroare 0,25) decât unul care a trăit doar relief (0,19) — cele două feluri de lumi se încurcă. Rețele mai mari, citiri mai bogate ale orizontului, a doua trecere și reluarea amintirilor **nu** au rezolvat asta (vezi REPORT).

V7 îl lasă pe organism să **descopere singur tipurile de lumi**: din primele priviri își face o „semnătură” (cât de stâncos e în jur, cât de „tot-sau-nimic” e terenul, cum arată orizontul). Lumile cu semnătură asemănătoare merg la același **specialist**; o lume care nu seamănă cu nimic cunoscut primește un specialist liber (maximum 3). Nimeni nu-i spune ce tip de lume e.

Fiecare specialist are aceleași organe ca V6 (reconstrucție + îndoială) și învață la fel: doar din ce îi arată fereastra.

## Interfața

- **Organismul din stânga**: creierul V7 sau creierul tău V6, pe același teren cu „fără organ”.
- **Test**: aceleași 40 de terenuri noi pentru V7, creierul tău V6 (dacă există pe telefon), organul neantrenat și fără organ.
- **Ce a învățat**:
  - *Cum și-a format imaginația* — același teren văzut de la start de creierul lui după 0, 5, 15, 40, 100… terenuri, plus creierul tău V6; fiecare cu eroarea hărții și drumul ghicit, pe acel teren și în medie pe 12 terenuri fixe.
  - *Tipuri de lumi descoperite* — specialiștii lui și ce fel de lume recunoaște fiecare.
  - *Toată viața lui* — curba de verificare din toate antrenările și istoricul tuturor testelor.
