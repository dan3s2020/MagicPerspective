# V7 — rezultate măsurate (2026-11-03)

`node scripts-benchmark.mjs 400 15 40 <sămânță> v7|v6` · 400 terenuri trăite (jumătate relief, jumătate labirint) · test pe 40 de terenuri noi 15×15 (20 + 20), aceleași pentru toți. JSON în `results/`. Organul V6 rulat prin același script (aceeași regulă de alegere a creierului) pentru comparație directă.

## Relief

| | V7 (17 / 23 / 31) | V6 (17) | Fără organ |
|---|---|---|---|
| Drum ghicit la pasul 0 ↑ | **48% / 43% / 47%** | 34% | 15% |
| Abatere medie a liniei ghicite (celule) ↓ | **1,48 / 1,44 / 1,42** | 1,98 | 2,23 |
| Drum ghicit, media pe parcurs ↑ | **74% / 74% / 75%** | 71% | 50% |
| Surprize pe drum ↓ | **0,55 / 0,55 / 0,45** | 0,70 | 9,5 |
| Cost plătit față de minim ↓ | **1,20× / 1,20× / 1,20×** | 1,44× | 1,57× |

Față de V6: drum ghicit +9…14 puncte, linia ghicită mai aproape de cea reală cu ~0,5 celule, cost cu ~17% mai mic. Față de „fără organ”: de ~3× mai mult drum ghicit, de ~19× mai puține surprize, cost cu 24% mai mic. Identic pe toate cele trei creiere.

## Labirint (martor fără indicii)

| | V7 | V6 | Fără organ |
|---|---|---|---|
| Drum ghicit la pasul 0 | 13% / 14% / 13% | 16% | 13% |
| Cost față de minim | 1,68× / 1,67× / 1,68× | 1,68× | **1,58×** |

Orizontul nu spune nimic despre coridoare; aici organul nu ajută și rămâne cu ~6% mai scump decât „fără organ”.

## Ce am încercat și NU a mers (păstrat ca să nu repetăm)

| Încercare | Rezultat |
|---|---|
| Citiri complete ale orizontului din 3 puncte (28 intrări) | eroare hartă relief 0,235 vs 0,186 — mai rău |
| A doua trecere peste propria ghicire (vede forme) | câștig ~0,01, neglijabil |
| Reluarea amintirilor între lumi („somn”) | fără câștig |
| Rețea de 48–64 neuroni, antrenare mixtă | 0,221–0,229 vs 0,186 la antrenare doar pe relief — nu rezolvă interferența |
| Organ de „risc de stâncă” pentru labirint | labirint 1,59× (≈ fără organ), dar relief 1,42–1,44× — l-am scos |

## Limite

- Linia ghicită e drumul cel mai ieftin pe harta **imaginată**; se învață harta, nu căutarea.
- Numărul maxim de specialiști (3) și pragul de „lume nouă” sunt fixate.
- Transfer la text / SAT — nedemonstrat.
