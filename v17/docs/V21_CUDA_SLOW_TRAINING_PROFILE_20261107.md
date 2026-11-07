# V21 - de ce RTX 3050 Ti are utilizare CUDA mica si antrenarea text dureaza (2026-11-07)

## Screenshot si date observate (nu benchmark repetat)

Utilizatorul a raportat "DAR TRAININGUL PE CUDA MERGE FOARTE INCET ORICAT AS INCERCA S-AL UMPLU." Screenshotul Task Manager arata RTX 3050 Ti Laptop GPU ~23%, temperatura ~86 C si Intel Iris Xe ~33%. Screenshotul anterior din UI indica **2 lumi/lot** si **1 exercitiu text/lot** cu VRAM 3 GB. Este un instantaneu, nu dovada unei utilizari CUDA medii, a throttling-ului sau a unui throughput masurat. Task Manager poate afisa alte motoare grafice, nu kernelurile CUDA; comparati cu nvidia-smi (NVML) si cu duratele V21.

## Cauze confirmate in codul ORIGINAL

- `v17/transcend/torus-aether/gpu/text_gpu.py`, `TextCard.append()`, reconstruieste ambele indexuri/suffix arrays (`Index(X,self.mem)` si `Index(X,self.fmem)`) dupa fiecare lot de exercitii, pe **intregul istoric acumulat**. Indexarea de tip prefix-doubling sorteaza repetat ranguri; costul poate creste pe masura ce memoria de text se mareste. Acest cod nu este o bucla continua de GEMM-uri GPU.
- `TextCard.live()` aplica multi pasi de cautare/aliniere, calculeaza experimente de "imaginatie", face sincronizari si transferuri GPU->CPU pentru numarari/trust; GPU poate sta neocupat intre kerneluri. `busy` din `worlds_gpu.py` este timpul Python pentru un apel sincronizat, NU senzori SM utilization.
- `processGpuText()` ruleaza ORIGINALUL GPU `Brain.learnTextGPU`, apoi `Brain.live` (trasarea unui exercitiu pentru UI), `LearnedCognitiveMap.observeWorld()` si `TextHypermaze.observeWorld()`/V21 Veil pe CPU Node.js, apoi modelul shared PyTorch si periodic maze/transform. Aceasta secventa este intentionat seriala; sliderul GPU 100% si cresterea rezervarii VRAM nu muta codul Node pe CUDA.
- La **textBatch=1**, fiecare exercitiu provoaca o reconstructie completa a indexurilor. Loturile 4/8 pot amortiza costul reconstruirii, dar schimba frecventa actualizarilor trust si pot creste memoria/depasirile, deci nu sunt automat optime. `GPU worlds=2` inseamna doar 2 labirinturi/transformari per episod si nu accelereaza antrenarea Q/A.
- Temperatura 86 C merita inspectata (posibil throttling/limita de putere pe laptop); temperatura singura NU dovedeste throttling. Nu cresteti orbeste procentul de utilizare cand placa este deja fierbinte.

## Instrumente introduse fara alterarea algoritmului

- `worker.mjs` masoara acum la FIECARE lot (folosind `performance.now()`, fara sincronizare CUDA suplimentara) durata end-to-end, apelul Python pentru text, traseul grafului original V17, V19/V20/V21, shared PyTorch, maze/transform, numarul real de exercitii si caracter/s. Nu introduce un model sau dataset nou si nu sterge checkpointuri.
- `gpu.text.cardMs` include Python + CUDA + reindexare, `gpu.text.mergeMs` este absorbirea efectelor inapoi in `AligningGraph`, iar `gpu.text.hostMs` contine durata fiecarui segment. Ratele nu sunt echivalente cu procentul de utilizare GPU.
- In **acelasi loc cerut de utilizator**: UI-ul `Ce s-a nascut` / `datasetProgressBox` afiseaza `gpuPerformanceInfo` cu fazele reale ale ultimului lot si throughput. Nu modifica UI vechi, reset sau antrenarea.
- `START_V21_AETHER_VEIL.ps1 -ProfileText` activeaza temporar `MP_PROFILE_TEXT=1` pentru Python, unde `text_gpu.py` emite `phaseMs.alignment`, `phaseMs.imagination` si `phaseMs.reindex`. Acest mod adauga sincronizari si poate incetini execuția, deci folositi-l doar pentru un diagnostic scurt; timpii principali sunt disponibili si fara el.
- Testul original HTTP verifica acum ca `gpuPerformanceInfo` exista IN interiorul panoului `Ce s-a nascut` si ca scriptul il actualizeaza. CI nu are acces la RTX 3050 Ti a utilizatorului; nu promite un multiplicator de viteza neatestat.

## Procedura corecta de diagnostic fara pierderea creierului

1. Cu un singur graf complet `#0` pornit si grafurile exclusiv hypertext puse pe pauza, verificati `http://127.0.0.1:8866/graphs` si `http://127.0.0.1:8866/graph?w=0`.
2. Pentru o incercare prudenta pe RTX 3050 Ti de 4 GB, cand temperatura este sub control: `texte/lot GPU = 4`, `lumi odata = 32` sau 64 si `VRAM GB = 3`. Evitati setarea simultana a mai multor workeri CUDA; `Aplica` reporneste procesul Python la urmatoarea frontiera de lot si poate necesita o reincarcare/reindexare completa, deci nu schimbati continuu valorile.
3. Dupa minimum 2-3 loturi, cititi `gpu.text.hostMs`: `card` mare + `reindex` mare => indexarea originala; `causalTextAndCode` mare => analiza CPU V19/V20; `sharedPyTorch` mare => multi-trip Python GPU; `mazeAndTransform` mare => lumi GPU/CPU suplimentare. `card` include si Python, nu numai GPU.
4. Optional, opriti curat procesul, salvati checkpoint, apoi reluati cu `-Resume -ProfileText` pentru detalierea fazelor Python. Opriti profilerul la rularea normala; nu comparati throughput cu / fara profiler ca si cum overhead-ul ar fi zero.
5. Verificati temperatura, frecventele si puterea cu NVIDIA NVML:
   `nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.sm --format=csv -l 2`.
   Daca unealta nu este instalata in PATH, folositi Task Manager cu graficul CUDA/Compute selectat, nu presupuneti echivalenta cu GPU-3D.
6. Evitati sa fortati 100% utilizare cand laptopul raporteaza deja 86 C. Asigurati alimentare, aerisire si verificati frecventele/limitele de putere; un GPU cu "23%" nu este obligatoriu mai rapid daca temperaturile il limiteaza.

## Ce NU s-a reparat in acest patch

Acesta este un patch de **instrumentare si masurare a bottleneckului**, NU o optimizare deja demonstrata a kernelurilor CUDA, a indexului `Index`, a corectitudinii modelului sau un transfer al tuturor lumilor pe GPU. Reconstructia completa a suffix arrays pe fiecare lot continua, pentru a evita schimbarea semantica a algoritmului fara teste de echivalenta. Urmatorul pas poate fi o implementare de index incremental sau planificare batch/memorie cu A/B fata de motorul original, dar numai dupa masurarea etapelor si un test frozen de ne-regresie.
