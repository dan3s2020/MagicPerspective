# V21 — vocabular finit versus progresul REAL al datasetului (2026-11-07)

## Semnalul raportat de utilizator

Captura arata **194.790 pasi traiti** si **100 simboluri absorbite**, iar intrebarea literala este:

> DE CE RAMAN SIMBOLURILE ABSORBITE BLOCATE SI NU MAI CRESC?? VREAU SA SI VAD CAT DIN DATASETUL DE TRAINING A CONSUMAT %

Sursa screenshotului este mesajul din conversatia curenta; imaginea binara nu a fost copiata in Git. Cifrele din imagine sunt *date furnizate de utilizator*, nu rezultate reproduse independent pe GPU.

## Cauza confirmata direct in cod

1. In `v17/transcend/torus-aether/ui/app.js`, `stats()` calculeaza `s` iterand `nodes.values()` si numarand doar nodurile cu `type === "sym"`. Scrie `s` in `#symbols`. **Numara simboluri distincte/noduri vizualizate, nu cate documente/exercitii au fost antrenate.**
2. Corpusul original este convertit in ASCII: `v17/transcend/torus-aether/devour/worker.mjs`, functia `ascii(s)`, pastreaza doar codurile 9, 10 si 32...126, iar restul devin `?` (cod 63). Acest alfabet este finit (97 valori ASCII admise, plus simboluri din lumile maze/transform sau alte canale). Repetarea a milioane de caractere nu mareste cardinalitatea simbolurilor distincte.
3. `Brain.live()` creste `brain.lived` pentru toate lumile (text, maze, transform). Un pas trait nu este acelasi lucru cu un rand din OpenThoughts3; CUDA poate procesa un lot de exercitii intregi, in timp ce graful vizual parcurge doar un esantion de simboluri.
4. Implicit, `text-dataset.mjs` retine separat ultimele `HELD_OUT=16` randuri daca corpusul are suficiente exercitii. Pentru 10.000 exercitii originale, numitorul real de training este **9.984**, nu 10.000. Se calculeaza din metadatele Parquet **reale**, nu se presupune fix 10.000 pentru orice dataset.
5. Pentru TXT, numitorul este numarul efectiv de paragrafe eligibile minus paragrafele tinute separat. Pentru mai multe workere, fiecare graf raporteaza progresul *propriei partitii*, fara sa pretinda ca progresul unuia este progresul global al tuturor.

## Modificare nativa V21, fara reset sau UI substituit

- Modul pur, testabil: `v17/transcend/torus-aether/devour/dataset-progress.mjs`, `trainingShardSize` si `trainingProgress`.
- Metadata reala din `devour.mjs`: `source.totalRows`, `source.trainRows`, `source.heldRows`. Pentru `parquet`, datele vin din `openTextDataset`. Pentru TXT, se utilizeaza aceeasi conditie de selectie 0-based/1-based ca in generatorul original.
- Worker nativ `worker.mjs`: fiecare mesaj de tip `graph` sau `test` include `progress`; numeratoarele originale sunt `brain.exercises` pentru training text sau `brain.cognitiveDocuments` daca lumea contine doar observatii V20/V21 fara antrenare a caracterelor V17. Un procent nu poate sa creasca din simpla randare a UI-ului.
- Endpointul existent `GET /graphs`: fiecare graf are progres propriu, iar `corpus` contine totaluri globale train/held-out. `GET /graph?w=0` ofera aceeasi masuratoare impreuna cu graful selectat.
- UI original `index.html`: panou nou **Dataset real - progresul antrenarii**, cu procent (2 zecimale), numar procesate/total, ramase, pastrate nevazute, bara `<progress>` nativa si avertizare pentru partitia individuala.
- UI original `app.js`: `livePull()` actualizeaza noul panou la intervalul original (1,5 s) folosind `/graphs`, adauga procentul la cardul fiecarui graf si pastreaza controalele si vizualizatoarele anterioare.
- Indicatorul vechi nu se sterge: eticheta corectata este **simboluri distincte (alfabet)**, cu nota explicativa. Nu este fortat sa creasca artificial.

### Exemplu numeric, doar pentru explicatia formulei

Pentru un dataset cu metadate `totalRows=10000`, `heldOut=16`, `trainRows=9984`, dupa 1.940 exercitii native invatate:

`percent = 100 * 1940 / 9984 = 19,43%` (rotunjit la 2 zecimale).

**Acest exemplu este explicativ, nu afirma ca antrenarea curenta a utilizatorului a consumat 1.940 exercitii.** Procentul exact este citit live din backend la fiecare rulare.

## Verificari de regresie

- `node --test v17/tests/veil-aether.dataset-progress.test.mjs` verifica metadata Parquet 10k cu 16 held-out, procent real, mai multi workeri, TXT cu split original si lumi fara corpus.
- `node --test v17/tests/veil-aether.http.test.mjs` verifica in procesul original `GET /graphs`, `GET /graph` si existenta noului panou UI, folosind un dataset TXT de 65 randuri si 6 heldout.
- `node --test v17/tests/veil-aether.text-migration.test.mjs` verifica faptul ca un checkpoint V21 hypertext-only reia antrenarea reala V17 si comuta corect indicatorul de la `observed-only` la `native-text`, pastrand 64 randuri eligibile, 7 held-out si fara duplicarea observatiilor V20.
- Sunt pastrate testele originale V19/V20, testele V21 de trasee inghetate, compatibilitatea Windows PowerShell 5.1 si testele istorice separate.

## Cum verifici in runtime

1. Salveaza si opreste curat procesul inainte de `git pull --ff-only`; nu folosi reset/clean pe checkpointuri.
2. Actualizeaza branch-ul V21 si porneste cu `-Resume` pe aceeasi locatie `runtime-v21-aether-veil`, fara `-Out` nou. O sesiune fara `-Resume` porneste alt creier in loc sa continue.
3. Deschide `http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1`. Sus in sectiunea Mediu, citeste bara si cifrele. Compara cu `http://127.0.0.1:8866/graphs` si `http://127.0.0.1:8866/graph?w=0` pentru dovada JSON reala.
4. Daca procentul se opreste, compara `status`, `GPU batch`, `exercises` si `remaining`; alfabetul la 100 nu constituie eroare.
5. `complete=true` se refera doar la parcurgerea randurilor repartizate acelui graf. Nu este o afirmatie ca modelul a invatat corect toate solutiile; verificarea `shapeSame` pe date held-out ramane separata.

## Limite care raman deschise

- Textul non-ASCII convertit in `?` pierde informatie lingvistica. Crearea unui vocabular UTF-8 mai bogat cere separat o schimbare a contractului de intrare, a backendului CUDA si a checkpointului, cu teste de compatibilitate; simpla crestere artificiala a indicatorului de simboluri NU repara asta.
- Componenta V20/V21 de graf contextual ramane Node CPU, iar `--gpu-util 100` nu este un senzor al utilizarii instantanee.
- Issue #25 despre transferul **identic** al mecanismului maze-to-language ramane OPEN.

**Verdict:** plafonarea indicatorului la aproximativ 100 simboluri este explicabila prin cardinalitatea alfabetului distinct; progresul datasetului este alt indicator, care acum este calculat explicit din datele native. Nu se declara o eroare de antrenare numai din plafonarea simbolurilor.
