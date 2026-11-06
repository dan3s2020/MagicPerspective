# Rezultate izolate de cercetare — 2026-11-06 (NU sunt metricile creierului live)

**Sursa:** arhiva `MagicPerspective_Puzzle_Research_20261106.zip`, fișierul `FINDINGS.md`, împreună cu `puzzle_lab.py`, `hybrid_experiment.py`, `results.json`, `test_research.py` și celelalte fișiere experimentale din conversația utilizatorului.

**Verificare suplimentară în această conversație:** s-au extras scripturile într-un folder temporar și s-a rulat `python -m unittest test_research -v`; **9/9 teste PASSED**, timp 0.923 s în mediul de verificare. Acestea sunt teste ale portului Python inspectat, nu testele originale V17 și nu rezultatele GPU ale utilizatorului. Repo-ul a fost verificat separat prin workflow-ul V18 Successor GitHub Actions.

## Date istorice pentru panoul Puzzle / Successor

| Experiment | Rezultat din arhivă | Ce demonstrează / NU demonstrează |
| --- | --- | --- |
| V17 max-attraction port Python pe 11×11 cunoscute | 600/600 rezolvate și optime | Valoarea max este deja foarte bună pentru labirinturi deterministe cu hartă și țintă cunoscute; nu dovedește învățarea hărții din text |
| Successor occupancy, politică aleatoare, comparație pe aceleași labirinturi | 600/600 rezolvate, 587/600 optime | Surprinde distribuții de viitor, însă NU este automat superior algoritmului original |
| Stochastic outcome tie-break, original-first vs successor | 4.911/10.000 vs 7.549/10.000 rezultate reușite | Într-un graf special construit, successor distinge două căi cu atracție identică dar șanse diferite; nu dovedește superioritate pe OpenThoughts |
| Transformări simbolice după opt observații | 500/500 ținte simbolice noi, 0/500 cu acțiuni amestecate și 15/500 random | Compoziție reală a unor permutări simple, nu semantica limbajului natural |
| Test de fază cuantică/Grover | 96.1319% cu oracle corect; 6.25% fără oracle pentru 16 opțiuni | Interferența funcționează într-o simulare care știe ce stare să marcheze; nu demonstrează că modelul găsește singur ținta |
| Coridor cunoscut 112.531 pași | 3 niveluri ierarhice, complet în experiment | Scala ierarhică evită dispariția câmpului din cauza toleranței numerice; este un traseu cunoscut, nu o soluție necunoscută dedusă |

## Rezultatele implementării V18

În ramura `experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106`:
- Originalul `Discoverer.shape()` și checkpointurile V17 rămân neatinse.
- `successor-field.mjs` adaugă un câmp clasic de ocupare viitoare peste conexiuni observate în corpus.
- `shape-topology.mjs` folosește câmpul secundar **numai** când atracția originală este exact egală.
- `/language-maze/analyze` compară două rute pe același instantaneu al aceluiași worker real.
- `/language-maze/compare` și `/language-maze/compare-last` oferă acuratețea înghețată pe întrebări Q/A nevăzute din Parquet, când există un checkpoint real.
- `/language-maze/observatory` expune statisticile reale și un prompt observat anterior, marcat explicit drept training.
- Tabul nou `Puzzle · Successor / rezultate` vizualizează V, S, topologia, divergența rutelor, alternativele, datele antrenării și comparațiile de acuratețe fără valori fake.

**Important:** Este posibil ca scorul de acuratețe pe text nevăzut să fie zero, negativ față de original sau încă nemăsurat. Niciun procent din tabelul istoric nu trebuie copiat în locul unui test real OpenThoughts.

CI: [V18 Successor Integration](https://github.com/dan3s2020/MagicPerspective/actions/workflows/v18-successor-integration.yml)
