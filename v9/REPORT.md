# V8 — rezultate măsurate (2026-11-03)

`node scripts-benchmark.mjs 800 15 80 <sămânță>` · 800 de lumi trăite (relief, labirint, cu bucle, rețea, pe rând) · test pe 80 de lumi noi (20 din fiecare), aceleași pentru toți · semințe separate pentru antrenare, validare și test. JSON complet în `results/`.

## Rețea abstractă — 3 creiere (17 / 23 / 31)

| | V8 | Organ neantrenat | Fără organ |
|---|---|---|---|
| Drum ghicit la pasul 0 ↑ | **67% / 66% / 70%** | 59% | 58% |
| Abatere a liniei ghicite ↓ | **0,55 / 0,56 / 0,47** | 0,72 | 0,70 |
| Surprize ↓ | **0,9 / 1,2 / 1,2** | 2,8 | 2,3 |
| Cost față de minim ↓ | **1,21× / 1,21× / 1,22×** | 1,54× | 1,52× |

### Dansul — măsurat separat (300 de lumi trăite, 60 de rețele de test, 3 creiere)

| | Cu dans | Fără dans (antrenat și testat fără) |
|---|---|---|
| Drum ghicit la pasul 0 | **65%** | 64% |
| Cost față de minim | **1,26×** | 1,33× |

Dansul ajută puțin dar constant: cost cu ~5% mai mic pe toate trei creierele. Prima versiune a dansului (doar prin legături văzute, ca în Graph Dance) nu ajuta deloc; a început să ajute când unda pornește din ce a perceput fiecare nod și trece și prin legăturile imaginate, după încrederea în ele.

## Relief

| | V8 | Fără organ |
|---|---|---|
| Drum ghicit la pasul 0 | **36% / 41% / 38%** | 15% |
| Surprize | **0,6–0,75** | 9,25 |
| Cost | **1,34× / 1,30× / 1,16×** | 1,49× |

În aplicație, după 400 de lumi: V8 38%, 1,17×; creierul V7 de pe telefon 43%, 1,16×; creierul V6 32%, 1,38×. Pe relief, V8 e la nivelul lui V7: împarte timpul de viață cu încă două tipuri de lumi.

## Labirint cu bucle și labirint — tot fără câștig

| | V8 (fără risc) | V8 (cu risc de stâncă) | Fără organ |
|---|---|---|---|
| Cu bucle · cost | 1,38–1,56× | **1,26–1,29×** | 1,17× |
| Labirint · cost | 1,85–2,05× | **1,72–1,76×** | 1,61× |

Organul de risc a redus mult pierderea, dar în labirinturi organismul tot plătește mai mult decât cel fără organ. Orizontul nu spune nimic despre coridoare, iar „fără organ” presupune optimist că necunoscutul e liber, ceea ce în labirint e mai ieftin decât prudența.

## Limite

- Drumul se caută pe harta/rețeaua **imaginată**; se învață imaginația, nu căutarea.
- Unda țintei din orizontul nodului e un simț dat (grosier, zgomotos); organismul învață să-l interpreteze.
- În labirinturi, organul nu bate „fără organ”.
- Transfer la text / SAT — nedemonstrat.
