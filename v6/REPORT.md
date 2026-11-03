# V6 — rezultate măsurate (2026-11-03)

`node scripts-benchmark.mjs 400 15 40 <sămânță>` · 400 de terenuri trăite · test pe 40 de terenuri noi 15×15 (20 relief, 20 labirint), aceleași pentru toți · semințe separate pentru antrenare / validare / test. JSON complet în `results/`.

## Relief cu munți — 3 creiere independente (semințele 17 / 23 / 31)

| | Cu organ | Organ neantrenat | Fără organ |
|---|---|---|---|
| Drum ghicit la pasul 0 ↑ | **32% / 33% / 34%** | 14% / 21% / 19% | 15% |
| Drum ghicit, media pe parcurs ↑ | **68% / 71% / 72%** | 55% / 57% / 58% | 50% |
| Surprize pe drum ↓ | **1,4 / 0,8 / 0,8** | 9,9 / 9,4 / 9,6 | 9,5 |
| Cost plătit față de minim ↓ | **1,47× / 1,42× / 1,40×** | 1,58× / 1,44× / 1,58× | 1,57× |
| Eroarea medie a hărții imaginate la pasul 0 ↓ | **0,21** | — | 0,34 |

Cu organ, organismul ghicește de ~2,2 ori mai mult din drum înainte de primul pas, are de ~10 ori mai puține surprize și plătește cu 6–11% mai puțin. Rezultatul se repetă pe toate cele trei creiere; organul neantrenat nu îl are, deci vine din învățare.

## Labirint — martorul fără indicii

| | Cu organ | Organ neantrenat | Fără organ |
|---|---|---|---|
| Drum ghicit la pasul 0 | 12% / 15% / 15% | 14% / 13% / 16% | 13% |
| Cost față de minim | 1,69× / 1,75× / 1,70× | 1,72× / 1,75× / 1,76× | **1,58×** |

În labirint orizontul nu spune nimic despre coridoare. Organul nu ghicește mai bine și navighează mai prost decât „fără organ” (presupune ziduri peste tot, deci evită necunoscutul). Asta confirmă că avantajul pe relief vine din citirea indiciilor, nu dintr-un truc al testului.

## Limite

- Linia ghicită e drumul cel mai ieftin pe harta **imaginată** (căutare pe propria hartă internă). Ce se învață e harta, nu căutarea.
- Orizontul e un simț dat; organismul învață să-l interpreteze, nu și-l inventează.
- Nu e demonstrat transferul la text, SAT sau alte tipuri de probleme.
