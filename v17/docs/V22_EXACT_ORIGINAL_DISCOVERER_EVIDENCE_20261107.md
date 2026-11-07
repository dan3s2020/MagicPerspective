# V22 — AUDIT DE FIDELITATE, LABIRINT TEXTUAL, NOISE SI POARTA DE ACCEPTARE

**Data:** 2026-11-07  
**Status:** `V22_EXPERIMENTAL / PARTIAL / BLOCKING_ISSUE_25_OPEN`  
**Sursa cererii literale:** [REGRESSION_USER_DIRECTIVE_2026-11-07-V22-NO-SUBSTITUTION.md](https://github.com/dan3s2020/MagicPerspective/blob/main/REGRESSION_USER_DIRECTIVE_2026-11-07-V22-NO-SUBSTITUTION.md) si `user-intent/changes/V22-EXACT-DISCOVERER-SOLUTION-SHAPE-20261107.json`. Originale, nu parafraze in locul instructiunilor.

## 1. Niciun byte al originalului V17 pierdut

- Commit V21 original baza V22: `f06d845d6c3e54772ec13933147d478cdfd2b748`. V22 este un descendent al acestui commit.
- Copia integrala originala: `v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs`. Git blob SHA **`e34d787467b7238c7422a0509173b1f785eb2342`**, identic cu originalul V21 `exercise.mjs`, 13.947 caractere UTF-8 decodate (hashul Git verifica octetii).
- Toate celelalte fisiere originale V21 raman accesibile intact prin commitul V21 si prin istoria Git. [Registrul SHA pe fișiere](./V22_EXACT_SOURCE_AND_SCIENTIFIC_ACCEPTANCE_LEDGER_20261107.json) arata hashul original al fiecarui fișier modificat.
- [GitHub Actions `v22-exact-original-discoverer.yml`](https://github.com/dan3s2020/MagicPerspective/actions/workflows/v22-exact-original-discoverer.yml) verifica in mod automat ca baza V21 este stramosul branch-ului V22, nu s-au sters sau redenumit fisiere originale, iar blobul complet V17 este identic.
- `main` a primit numai insemnari documentare in `AGENTS.md`, `README.md`, `VERBATIM_ROOT.md` si in regresia literala; **niciun cod de runtime V22 nu a fost fuzionat in `main`**. Issue #25 ramane OPEN.
- Fisiere originale de chat, media, alte ramuri: neaccesibile ca byte-for-byte in acest schimb = `UNVERIFIED`, nu sunt rescrise sau inventate; toate originalele deja existente in repo raman nemodificate.

## 2. Ce s-a IMPLEMENTAT efectiv in V22

### SAME ACTUAL original organism function (nu copie de ecuatie)

`v17/transcend/torus-aether/worlds/exercise.mjs`: `Discoverer.shape(ret,n,me,topology=null)`.

- Cu `topology=null`, functioneaza identic cu V17: patru vecini `nextStep`, camp de atractie, `conduct`, praguri `.2` si `.5`, relaxare `0.97`, urcare stricta, temperatura si RNG. Intreg codul din afara functiei originale ramane identic.
- Cu `topology` de la `LearnedCognitiveMap.buildWorld()`, **aceeasi functie** foloseste N noduri si vecini de grade arbitrare invatati din observatii. Acesta este un graf de stari si transformari, nu o retea latenta 32D/8D ori un predictor simplu de tokenuri.
- `v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs` invoca **direct** `actor.shape(kinds,0,start,{neighbors,conduct,attract,onField})`, si in `formSolution` si in `formObservedWorld`. V19 `shapeOnLearnedTopology` ramane istoric pentru alte utilizari, dar nu calculeaza traiectoria V22.

### Real learning and action physics boundaries

- `observeWorld(text)` absoarbe propozitii COMPLETE si deduce ipoteze de efecte locale din contraste. `observeActionResult` poate invata editari observate; `observeIntervention` marcheaza ziduri/efecte reale si abtine de la reguli contradictorii.
- `formSolution(initial,goal)` ingheata intregul traseu inainte de orice actiune, folosind predicate de scop **explicite** `goal.slots`. Acestea sunt date de problema, nu un raspuns complet copiat din corpusul held-out.
- `execute(plan,{step})` solicita un callback de mediu extern si compara predicția cu starea observata dupa actiune. Nu considera un plan executat doar pentru ca exista in graf.
- Temperatura `temp>0` activeaza softmax-ul stochastic original intre vecini care urca; cu seed identic, rezultatul se reproduce. Noise-ul de actiune al V17 original este pastrat in 2D; lumea text V22 nu are inca o politica proprie completa de explorare cu output aleator si feedback in trainingul CUDA implicit.
- `v17/transcend/torus-aether/worlds/frozen-text-shape-observatory.mjs` si `ui/v22-original-text-labyrinth-live.js` proiecteaza in 2D **graful real** si forma aurie prezisa de `Discoverer.shape()`. Animatia este numai planul, nu o actiune; evenimentele confirmate sunt separate.
- V17/V19/V20/V21 UI, controale, model Q/A CUDA, checkpointuri si sidecaruri nu au fost sterse.

## 3. Teste si rezultate reale, fara amestecarea metricilor

| Verificare | Domeniu explicit | Verdict |
|---|---|---|
| Original V17 sursa integrala | blob SHA identic, toate caracterele | PASS |
| V17 maze exact | 84 episoade pe 7×7, 9×9, 11×11, patru combinatii noise/temperatura, matching complet de planuri/actiuni/memorii/RNG | PASS |
| Forma cognitiva V22 | direct `Discoverer.shape`, stari invatate, tinta explicita, predictie pre-actiune, no-leak | PASS |
| 100 teste NOI de 80 tokenuri | schimbarea primului token al unei propozitii cu 79 tokenuri neschimbate, dupa 2 propozitii observate; `goal.slots[0]` este explicit dat | **100/100 doar in acest task structurat** |
| Noise + cai alternative | 128 seeds repartizate, randare determinista pentru acelasi seed, efect stochastic pe alternative reale | PASS |
| Feedback de actiune | acceptare/rejectie independenta, ziduri invatate, replanificare fara reutilizarea actiunii respinse | PASS |
| Native V19 si V21 | HTTP worker real, cold start, UI original + canvas, checkpointuri, frozen results | PASS in CI |
| Windows PowerShell 5.1 | analiza sintactica a lansatorului original | PASS |
| Raspunsuri OpenThoughts3 neatinse, mari, corecte din prima | semantica arbitrară, fara scop dat direct din raspuns | **NEIMPLEMENTAT / NEVERIFICAT** |
| Training text CUDA implicit pe aceeasi politica N-D | text original CUDA ramane `TextCard.live`, iar V22 navigatorul functioneaza in harta cognitiva; nu a fost unit complet | **NEIMPLEMENTAT / BLOCAJ** |
| Sute de exercitii COMPLETE/s pe RTX 3050 Ti | hardware Windows real, latenta si acuratete neatinse | **NEVERIFICAT** |

CI verde inseamna ca aceste teste efectiv scrise au trecut, NU ca obiectivul ultim (arbitrar text mare, 100% corect) a fost atins. Fara benchmark pe corpusul real si traseul complet al raspunsului, `-Resume` nu poate fi prezentat drept arhitectura finala.

## 4. Ce lipseste in continuare, exact

1. Inferarea obiectivului semantic al unei intrebari din propria perceptie si experienta, fara `goal.slots` furnizat explicit sau raspuns de referinta consultat.
2. Traseul complet text N-D anticipat, apoi executat ca politica nativa de antrenare in aceeasi componenta care devoreaza OpenThoughts3, cu alegeri fizice de actiune, noise, feedback, ziduri si corectare; V22 `formSolution` este inca o componenta a hartii cognitive, nu politica `TextCard` CUDA.
3. Compatibilitate cu intreaga topologie de transformari, axe locale si holonomie in aceeasi politica, nu doar reproduceri separate ale experimentelor istorice.
4. Raspunsuri lungi exact corecte pentru un set important si cu adevarat neobservat de intrebari naturale; numar de exemple/s, char/s, acuratete semantica, predictie preact si controale negative, masurate simultan.
5. Dovada ca se pastreaza fiecare control al V17 UI, persistenta pe GPU RTX3050 Ti si performanta asupra intregului dataset de 1,21M; CI nu are acces la calculatorul utilizatorului.
6. Confirmarea explicita a utilizatorului pentru inchiderea regresiei [#25](https://github.com/dan3s2020/MagicPerspective/issues/25).

## 5. Concluzie si poarta de release

**Ramura V22 este EXPERIMENTALA. Nicio comanda de lansare nu este autorizata de rezultatele curente ca si cum cerinta completa ar fi gata.** Aceasta nu este o demonstratie de 100% inteligenta generala; rezultatul 100/100 este controlat si cu tinta furnizata explicit. Codul si toate problemele de fidelitate raman documentate si verificabile, iar varianta functionala V21 ramane intacta.

Link CI folosit pentru faza cu vizualizarea nativa: https://github.com/dan3s2020/MagicPerspective/actions/runs/42341252772.
