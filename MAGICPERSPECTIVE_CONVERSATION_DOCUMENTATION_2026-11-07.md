# MagicPerspective — indexul documentării conversației din 7 noiembrie 2026

**Ramura:** `experiment/V17-PERSISTENT-HYPERMAZE-ATLAS-20261107`. **Tip:** documentație și audit, nu release și nu o schimbare de motor.  
**Stare:** toate informațiile **recuperabile din contextul accesibil** sunt organizate în documentele de mai jos. **Nu este transcrierea completă a conversației**: există mesaje marcate `Skipped N messages` și imaginile originale nu sunt disponibile ca fișiere, motiv pentru care `verbatim` rămâne blocat.

## Dosarul complet al muncii din această conversație

1. **[Istoric complet recuperabil: ce s-a discutat, cerințe, UI, cod, cronologie, rezultate și nereușite](v17/docs/2026-11-07_CONVERSATION_COMPLETE_RECOVERABLE_WORKLOG.md)** — inclusiv interpretarea noise/temperatură, axele hiperdimensionale, labirintul textului, 2048 și stochasticitatea, folosirea aceluiași motor V17, memory replay, atlas, Windows/TinyStories/CUDA.
2. **[Mesajele utilizatorului recuperabile ca text literal și fragmentele PowerShell](verbatim/2026-11-07-RECOVERABLE-HYPERMAZE-CONVERSATION-EXCERPTS.md)** — nu modifică ortografia originală; marchează clar ce nu a putut fi recuperat.
3. **[Dovezi CI, teste, rezultate exacte, regresia Windows și pașii nerezolvați](v17/docs/2026-11-07_HYPERMAZE_ATLAS_TESTS_REGRESSIONS_AND_NEXT_STEPS.md)** — 100/100 doar pe gramatică structurată; 950 tokeni; 35 exerciții, 31 lumi vechi/62 repetiții; 603 noduri/987 muchii/111 frontiere; 69/49 tranziții maze/transform; 5-axis budget ablation; limitările semantice.
4. **[Inventarul descoperirilor din alte ramuri V17, V22, V23, V30, V31, V32, V35 și V37](v17/docs/2026-11-07_CROSS_BRANCH_HYPERMAZE_DISCOVERY_INDEX.md)** — ce e dovedit independent, ce ar putea ajuta, ce NU este integrat în motorul curent, inclusiv clasarea greșită în SQuAD.
5. **[Matricea atomică cerință → cod → test → stare și goluri verbatim](verbatim/audits/2026-11-07-HYPERMAZE-CONVERSATION-ATOMIC-REQUIREMENTS-AND-GAPS.md)** — 22 cerințe/gate-uri vizibile și poziția lor precisă, fără a declara 100% acoperire a conversației.
6. Contract vechi, păstrat: **[STOPSHIP pentru regresia care a înlocuit motorul](REGRESSION_STOPSHIP_HYPERMAZE_20261107.md)** și **[politica arhivei verbatim](verbatim/SOURCE_POLICY.md)**.

## Fapte esențiale de păstrat pentru următorul agent
- **Nu schimba Original V17 Brain, `Discoverer.shape/shapeGraph` sau `NoiseAgency` cu un motor de frecvențe/next-byte**; păstrează toate checkpointurile originale și ramurile experimentale.
- **Învățarea din lumi fragmentate funcționează în exemple controlate**: 10 lumi vechi recitite, două transformări descoperite, rezultat nevăzut în doi pași; replay automat după 32 episoade în original worker.
- **Limita poate fi arhitecturală**, demonstrat cu exact aceeași memorie: maxDepth 4 sau 8 stări nu găsește calea, dar 5 pași + spațiu permis o găsește fără antrenare nouă.
- **Nu avem demonstrată acuratețea semantică generală 100% din prima**, nici beneficiul cauzal 5D/noise pentru răspunsuri naturale, nici GPU CUDA susținut pe laptopul utilizatorului. 100/100 test înseamnă compunerea unui text cu 5 axe ale căror ținte sunt specificate, nu generare liberă.
- **Ultima rulare CI verificată a fost ROȘIE pe Windows**: [run 42363798128](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363798128), `EPERM` la `fsync` pentru jurnalul atlasului, Linux PASS. Nu afirma că totul este funcțional pe Windows până nu este remediat și verificat independent.
- **Nu inventa mesajele lipsă sau imaginile originale** pentru a satisface o cerere „verbatim complet”; solicită exportul nativ când devine disponibil. Nu schimba flagurile `verbatim`.

**Această înregistrare a fost creată prin commituri noi, numai documentație, în ramura izolată**. Nu a reparat implicit regressionarea Windows, nu a inițiat antrenare pe GPU-ul utilizatorului și nu a marcat release-ul ca acceptat.
