# V5 — rezultate măsurate (2026-11-03)

Comandă: `node scripts-benchmark.mjs <episoade> <mărime> <lumi> <sămânță>`. JSON complet în `results/`.
Test orb: aceleași lumi nevăzute pentru toate cele 4 organisme (sămânța 5090909), câte o treime din fiecare familie. Validare pe semințe separate (5050505); se păstrează checkpointul cel mai bun la validare.

## 9×9 · 1000 episoade · 45 lumi nevăzute · 3 semințe de inițializare (17 / 23 / 31)

| Metrică | Organ antrenat (17 / 23 / 31) | Organ neantrenat (17 / 23 / 31) | Fără organ (clasic) |
|---|---|---|---|
| F1 formă la pasul 0 ↑ | **0.338 / 0.339 / 0.340** | 0.347 / 0.276 / 0.241 | 0.321 |
| Eroare nor la pasul 0 (BCE) ↓ | **0.334 / 0.340 / 0.362** | 0.745 / 0.799 / 0.778 | 0.412 |
| Calibrare (ECE) ↓ | **0.081 / 0.086** / 0.118 | 0.443 / 0.466 / 0.460 | 0.107 |
| F1 mediu pe parcurs ↑ | **0.753 / 0.754 / 0.760** | 0.704 / 0.667 / 0.657 | 0.723 |
| Rezistențe pe episod ↓ | **3.24 / 3.20 / 3.13** | 2.84 / 6.09 / 5.98 | 4.62 |
| Eficiență (optim / efort) ↑ | 0.855 / 0.847 / 0.856 | 0.839 / 0.806 / 0.840 | **0.858** |
| Succes | 100% | 100% | 100% |

## 13×13 · 600 episoade · 30 lumi

| | Organ antrenat | Neantrenat | Fără organ |
|---|---|---|---|
| F1 pas 0 | **0.327** | 0.292 | 0.315 |
| Eroare nor pas 0 | **0.249** | 0.762 | 0.358 |
| ECE | **0.018** | 0.464 | 0.093 |
| F1 mediu | **0.627** | 0.607 | 0.593 |
| Rezistențe | **7.7** | 7.0 | 13.4 |
| Eficiență | **0.795** | 0.792 | 0.782 |

## Ce arată

- **Confirmat pe toate 3 semințele:** organul antrenat prezice înainte de prima mișcare un nor al soluției mai precis și mai bine calibrat decât organismul fără organ, iar pe parcurs forma lui e mai aproape de traseul real (F1 mediu +0.03). Lumea îl contrazice de ~30% mai rar (rezistențe 3.2 vs 4.6; la 13×13: 7.7 vs 13.4).
- Antrenarea contează: același organ neantrenat e mult mai slab (BCE ~0.77).
- F1 la pasul 0 e doar puțin peste clasic (+0.02). În labirintul perfect, la pasul 0 (doar 3×3 văzut), F1 rămâne ~0.11–0.13 pentru toți — informația lipsește, nu se poate ghici exact.

## Ce NU arată încă

- Navigarea la 9×9 nu e mai eficientă decât planificatorul clasic (0.85 vs 0.86); la 13×13 e ușor mai bună (0.795 vs 0.782), un singur rulaj.
- Corecția online (organul de trecere) nu diferă măsurabil de varianta înghețată.
- Transfer către alte tipuri de probleme (text, SAT) — neimplementat.
