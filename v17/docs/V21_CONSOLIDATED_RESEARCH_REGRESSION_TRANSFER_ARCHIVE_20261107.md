# MAGIC PERSPECTIVE — JURNAL CONSOLIDAT DE CERCETARE, REGRESII ȘI TRANSFER (V17–V21)

**Înregistrare:** 2026-11-07 · **Limbă:** RO (termeni originali EN păstrați)  
**Repository:** https://github.com/dan3s2020/MagicPerspective  
**Sursa codului auditat:** branch `experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107`  
**Origine:** V20 `b6a5d3aba4784fe7643509f03906ec4bb1752199`  
**Cerință:** documentarea integrală a lucrului recuperabil, păstrarea versiunii performante și verificarea fiecărei descoperiri înainte de a declara transferul complet.  
**Statut:** arhivă de cercetare și implementare PARȚIALĂ; NU certificare de universalitate, superinteligență, fizică mistică, transfer semantic complet sau transcript integral.

> Regula obligatorie: exactul VERBATIM al utilizatorului are prioritate asupra interpretărilor tehnice. `AGENTS.md`, `VERBATIM_ROOT.md`, `verbatim/SOURCE_POLICY.md`, `REGRESSION_USER_DIRECTIVE_2026-11-06.md` și Issue #25 rămân aplicabile. Nu se închide regresia printr-un simplu test verde.

## Actualizare V21 - indicator simboluri distincte versus procent dataset (2026-11-07)

Dupa o instalare noua, utilizatorul a observat **194.790 pasi traiti** dar **100 simboluri absorbite**. Acesta NU este un prag de 100 exercitii: vizualizatorul numara doar caracterele/simbolurile DISTINCTE din alfabetul finit, in timp ce `Brain.lived` include text si lumi de labirint/transform. Parquet este convertit in ASCII cu un alfabet aproape saturat, deci afisajul distinctelor poate ramane stabil in timp ce antrenarea continua.

V21 a primit masurare reala din metadatele Parquet/TXT (exercitii totale, de antrenare si held-out), fiecare worker raportand `progress.trained/total/remaining/percent` cu dovada backend, noul panou LIVE si bara de progres. In cazul logului cu 10.000 exercitii, 16 held-out lasa 9.984 randuri de antrenare; cifra real consumata NU poate fi dedusa din screenshot, ci este citita din `/graphs` dupa actualizare. Testele Parquet/TXT, partitia pe workeri si procesul HTTP real sunt atasate workflowului.

Document complet: [V21_DATASET_CONSUMPTION_AND_SYMBOL_VOCAB_20261107.md](./V21_DATASET_CONSUMPTION_AND_SYMBOL_VOCAB_20261107.md). Mesajul exact al utilizatorului este pastrat in arhiva Verbatim partiala. Aceasta corectie NU modifica algoritmul, datasetul, checkpointurile sau semnificatia scorului original `shapeSame`.

## 1. Surse, proveniență, lacune

- Cererea de autorizare curentă: `user-intent/2026-11-07-current-chat-authorization.md` (fragment literal: „I allow you to do it”).
- Critica utilizatorului despre 0%, regresii și interdicția de a reveni doar la vechi versiuni: `user-intent/2026-11-07-V21-REGRESSION-DIRECTIVE-verbatim.md`.
- Cererea finală „Documentează tot în repo” și mesajele vizibile suplimentare: `verbatim/2026-11-07-V21-VISIBLE-CHAT-USER-DIRECTIVES-VERBATIM-PARTIAL.md`.
- Contract înainte de cod: `user-intent/changes/V21-AETHER-VEIL-20261107.json`; contractul inițial este păstrat, chiar dacă implementarea a crescut prin corecțiile ulterioare. Actualul registru de stare este `v17/docs/V21_TRANSFER_EVIDENCE_LEDGER_20261107.json`.
- Detalii tehnice originale: `v17/docs/V21_VEIL_AETHER_EVIDENCE.md` și `v17/docs/V21_REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md`.
- Referința publică pentru regresia de arhitectură: https://github.com/dan3s2020/MagicPerspective/issues/25 — **OPEN/BLOCKING** la momentul verificării.
- Media utilizatorului: capturile de ecran originale rămân în chat și NU au fost introduse ca imagini binare în repo. Aici sunt arhivate numai cifrele și mesajele recuperabile; nu se pretinde o arhivare vizuală byte-exact.
- Transcrierea istorică în `main/verbatim/` rămâne incompletă; nu fabricați răspunsuri ale asistentului, date/ore pe mesaj sau text lipsă. Aceasta este o **continuare parțială**, fără a schimba hash-urile arhivei vechi.

## 2. Cronologia verificabilă

1. **V17 bază**: Brain unic cu `Discoverer.shape()` pentru labirinturi, `AligningGraph.write()` pentru răspuns text generat liber, evaluări read-only, experimente cu acțiuni și transformări, UI original. În labirint, forma soluției este anticipată folosind harta disponibilă și propagarea explicită a valorii; nu reduceți rezultatul la „a învățat orice algoritm fără programare”.
2. **V19 cognitiv**: `LearnedCognitiveMap` învață contraste/transformări din text; activarea rămâne explicită `-IncludeCognitive`, dar datele se salvează în Brain-ul original.
3. **V20 Hypermaze**: `TextHypermaze` reține noduri de token unic, succesiuni observate, `V(goal)=1; V(s)=0.97 max(V(successor))`, trasee preacțiune cu ținta cunoscută, replay, baseline 1-token și evaluare frozen. Faptul că un traseu `Q → : → {` este optim pe muchiile observate NU demonstrează un răspuns corect la o întrebare necunoscută.
4. **V21 primul branch**: stare de context din PERECHI de simboluri observate, replanificare și alternative empirice, panou animat în UI-ul V17/V20, endpoint de plan înghețat `POST /veil-plan`, checkpoint comun, surse de experiență originală; fără alterarea funcției maze.
5. **Regresie GPU descoperită de utilizator**: interpreter Python moștenit dintr-un alt mediu conținea PyTorch numai CPU; `torch.cuda.is_available()=false` la `cuda:0`. Lipsa bootstrapului V17 în lansatorul V21 împiedica sarcinile GPU. În plus, workerul putea continua antrenarea doar pentru hypertext: interfața arăta progres în mod înșelător pentru un set de lumi întrerupt.
6. **Corecție CUDA pe V21**: `ENSURE_V21_CUDA.ps1` verifică tensor real CUDA în Python, poate pregăti un venv PRIVAT V21, rulează self-testuri native, transmite `OCTOPUS_PY` validat; workerul dă eroare explicită înainte de ingestie dacă GPU obligatoriu nu pornește și nu salvează un fals succes. NU schimbă alt mediu Python.
7. **Regresie 0% a formei text**: lansatorul V21 selecta `hypertext,maze,transform`, OMITÂND lumea `text`. `TEXT=worlds.includes("text")` controla `Brain.learnTextGPU`/`Brain.live` pentru exercițiile Q/A; astfel `AligningGraph.write()` nu primea antrenare nouă. Celelalte statistici puteau crește fără capabilitatea de a scrie răspunsul înainte de a-l vedea.
8. **Fix în V21, NU rollback**: lansatorul este reconstruit corect; pornește `text,hypertext,maze,transform` și opțional `cognitivemap`. Sunt activate simultan antrenarea originală a răspunsurilor V17 și observațiile V20/V21. Păstrează butoanele originale, graful, teste, checkpointuri și toate ramurile istorice.
9. **Migrare checkpoint**: checkpointuri V21 hypertext-only au `brain.exercises=0` dar `brain.cognitiveDocuments>0`. La `-Resume`, lumea `text` reia învățarea documentelor originale necesare; V19 și V20/V21 au contoare de absorbție SEPARATE, ca să nu dubleze același document și nici să sară datele de antrenare pentru un modul nou activat.
10. **Al doilea defect în cifra 0%**: evaluezi primii 200 de caractere, dar markerul `A:` poate să apară după limita 200. Evaluatorul folosea implicit `a0=0` și putea confunda întrebarea cu răspunsul, marcând eroarea ca 0%. Corecția folosește `a0=-1` până la observarea markerului real, raportează `shapeSame=null` cu `NO_ANSWER_BOUNDARY_IN_EVALUATED_PREFIX`; UI cere limită mai mare sau `0` pentru întregul exercițiu. **Nu se modifică `AligningGraph.write()`.** Captura nu este singură dovadă că acesta a fost exact motivul fiecărui 0%.
11. **Extensia acțiunilor native**: `ObservedCausalField` reține efectele acțiunilor V17 (before, action, after) în limite stricte de memorie; detectează coordonate locale efectiv schimbate, rezultate alternative condiționate de acțiune, ordini AB≠BA OBSERVATE, propagare frozen cu țintă explicită. Se păstrează în checkpointul V21, dar nu controlează încă `AligningGraph.write()` ca un navigator semantic unificat.
12. **UI și dovezi**: scorul original V17 „forma soluției scrisă înainte” este arătat separat de scorurile V20 și V21; graf auriu = predicția pre-acțiune, mov = forma recalculată, albastru = traseul real; panou separat pentru efecte cauzale reale și probe de ordine a acțiunilor.
13. **Arhivare și verificare**: CI este separată în job `aether-veil` pentru integrarea NATIVĂ V21 și `preserved-discovery-controls` care rulează codul originar al descoperirilor istorice, checkout din fiecare branch. O descoperire care trece numai în branch-ul original NU este echivalentă cu transferul ei în funcția nativă de generare text.

## 3. Evaluări: definiții care NU trebuie confundate

| Indicator | Ce măsoară | Ce NU măsoară |
|---|---|---|
| V17 `C singur` sau `graful care se aliniază`, rolling 1000 | predicții/aliniere pe șirurile deja experimentate | corectitudine semantică independentă a răspunsului generat |
| V20 `onlineAccuracy` / acoperire | tokenul următor din muchiile grafului observat | răspuns liber din întrebarea utilizatorului |
| V20/V21 `optimal` și reziduu Bellman ~1e-16 | propagare corectă pe graful CUNOSCUT, țintă CUNOSCUTĂ | că lumea textului a fost înțeleasă |
| V21 scor pe perechi contextuale | efectul memoriei de un simbol anterior, pe poziții cu suport observat | transfer semantic complet |
| V17 `shapeSame` din `AligningGraph.write(prompt)` | fracția caracterelor generate liber și potrivite pozițional cu răspunsul de referință, după ce forma a fost scrisă | criteriu independent de adevăr semantic; 100% acuratețe la caractere nu garantează semantică |
| V17 `answer` teacher forced | ghicirea caracterului real cu caracterele anterioare furnizate de test | generare autonomă a întregului răspuns |
| `answerBoundaryFound=false` | în intervalul selectat nu a fost văzut markerul `A:` | NU este un rezultat de 0% |
| `observedNoncommuting` | AB și BA, ambele trăite, au avut stări finale diferite | holonomie generală învățată, curbură 4D fizică |
| `actualActionAxes` | indecși modificați de acțiuni observate | axe fizice, orientări locale calibrate sau inteligență emergentă |
| `--gpu-util 100` | cerință de planificare GPU în motorul original | utilizare instantanee NVML de 100%; Node V21 rămâne CPU |

**Capturi observate, de arhivat ca date de utilizator, nu benchmark reproduse de CI:**  
- 45.621 pași trăiți, 29 simboluri, C singur 30,0%, C↔A 40,9%, aliniere 51,8%; mai târziu 56.612 pași, C singur 80,4%, C↔A 86,1%, aliniere 86,2%. Aceste scoruri rolling se schimbă rapid și nu pot fi echivalate cu `shapeSame`.
- V20: 200 documente, 2.887.315 tokeni observați, 12.000 noduri, 120.000 tranziții, 16,32% online; unigrama 5,31%; 89,97% acoperire; 2.721.062 predicții, 114.119 noduri și 3.184.113 tranziții omiterea raportată de UI.
- Evaluare frozen V20 în captură: 8 documente neatinse, 117.170 tranziții, 112.029 cu modelul capabil să prezică; 17,44% top-1 pe acoperit, 95,61% acoperire; 5,33% unigrama; 3/3 trasee găsite, `maxResidual≈1.11e-16`.
- V17 pe text de 200 de caractere în captură: mai multe exerciții cu 15–32% predicție caracter, dar `forma scrisă înainte` 0%. La acel moment lansatorul omitea `text` și metrica putea fi afectată de tăierea înainte de `A:`; exactul cauzal per exemplu nu poate fi stabilit doar din imagine.

## 4. Dovezi automate NATIV V21 — CI verificată

**GitHub Actions:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42324536831  
**Status verificat 2026-11-07:** AMBELE joburi SUCCESS. `aether-veil`: **42 teste trecute / 42; 0 failed**. Jobul istoric a trecut separat.

Dovezi concrete din outputul CI:
- `V21_NATIVE_QA_RESCUE`: 5.633 caractere învățate efectiv de V17 după reluare, 64 exerciții text, 64→64 documente V20, 143→143 muchii V20; `shapeSame=0.17647058823529413` **17,65%** pe corpus sintetic fix, cu cerință în test `>=0.10`, după generarea răspunsului ÎNAINTE de compararea cu răspunsul held-out.
- `V21_MISSING_A_BOUNDARY_NOT_FALSE_ZERO`: prefix de 200 de caractere, `shapeSame=null`; exercițiu complet de 273 caractere, marker `A:` la poziția 266, formă originală ~**14,29%** pe acel mic fixture. Nu s-au modificat greutățile pentru a obține scorul.
- `V21_FAIL_CLOSED_BAD_CUDA_PYTHON`: interpreter artificial incompatibil pentru test, GPU obligatoriu → eroare înainte de ingestie, checkpoint fals NEcreat.
- `veil-aether.test.mjs`: câmpul `V(s)=0.97^distance`, reziduu nul numeric pe muchii observate, no-leak, context cu istorie/alternative, serializare.
- `veil-aether.observed-action-field.test.mjs`: efecte observate, rezultate stocastice normalizate, AB≠BA dacă ambele acțiuni s-au văzut, axe locale ca indecși schimbați; NU transfer semantic.
- `veil-aether.http.test.mjs`: procesul original chiar rulează text/maze/transform în test, endpoint, UI și checkpoint.
- Regresiile native V19 și V20 rămân în aceeași suită. PowerShell este analizat sintactic în GitHub Actions; aceasta NU testează driverul NVIDIA al utilizatorului.

Aceste scoruri sunt pe corpus de test controlat, NU rezultate măsurate în execuția Windows cu OpenThoughts3 și RTX 3050 Ti. Nu transformați cifrele istorice din documentația altor branch-uri în acuratețe curentă a V21.

## 5. Descoperiri istorice: matrice de transfer testat vs. neimplementat

| Descoperire / branch original | Rezultat sau control reprodus | Integrare în inferența originală de limbaj V21 |
|---|---|---|
| V17 `Discoverer.shape()` labirinturi | propagare din țintă și traseu înainte de acțiune pe topologia disponibilă | **DA în labirint**, NU aceeași funcție direct pe o lume semantică a textului |
| V19 `LearnedCognitiveMap` | transformări/evidență din corpus; test unificat nou de resume | **DA opt-in** (`-IncludeCognitive`), fără validare semantică independentă |
| V20 wavefront de tokenuri | trasee înghețate și acoperire/reziduu raportate | **DA**, ca graf token/simbol, nu ca soluție semantică |
| V21 stare token anterior+curent | 2-token state, next-token observat, replanificare sampled | **DA**, auxiliar; nu motorul `AligningGraph.write` |
| V21 efecte cauzale din evenimente V17 | before/action/after, axe schimbate, șansă, AB≠BA | **DA ca telemetrie/model empiric**, NU ca politică de scriere |
| Six learned hidden axes — `experiment/V17-LEARNED-AXES-PERSPECTIVE-GATING-20261107` | 6 canale funcționale deduse dintre 64/256/2048 canale artificiale; 200/200 trasee S6 înainte de acțiune, controale randomizate eșuează | **NU** în generatorul de text V21 |
| Cadre locale `experiment/V17-LEARNED-LOCAL-AXES-CAUSAL-ROUTES-20261107` | transport pe muchii withheld 2D–5D 100%, 930/930 sarcini cu cuvinte-acțiuni în lumi artificiale | **NU** transportul cadrului complet în generator |
| NEGATIV: încercarea de reranking geometric real V17 | text original 51,4375% vs cu geometrie 51,2625% în frozen heldout; regresie reală | **NU** se declară îmbunătățire semantică din geometry |
| Coupled state-dependent text axes — `experiment/V17-TEXT-MAZE-COUPLED-AXES-20261107` | teste de exerciții numerice, 70/70 adunare/scădere și 48/48 multiplicare în lumi artificiale; controale fixed delta 0/48 | **NU** calcul simbolic general integrat în motorul V21 |
| Holonomie — `experiment/V17-PATH-HOLONOMY-MEMORY-DIMENSION-20261107` | o coordonată signed-area distinge două trasee ce par să aibă același endpoint; control integrabil fără nevoie de ea | **PARȚIAL** martor AB≠BA, NU memoria matematică signed-area |
| 2048 chance policy — `experiment/V17-2048-HIERARCHICAL-MERGE-20261107` | 64 jocuri × 140 mutări, scor greedy 1556,875 vs chance-aware 1734,875 (+11,43%), fără atingerea tile 2048 | **NU** politică de joc transferată în generator text |
| xD `experiment/V17-XD-SCALE-INVARIANT-TRANSFORMS-20261107` | teste de lift 2D→1024D, operator frozen/rank și saturare; normalizarea prototip limitată, sub baseline bigram | **NU** normalizare xD în `Geometry.learn` |
| Shared core `experiment/V17-ONE-SHARED-TRANSFORMATION-CORE-20261107` | o politică structurală comună pe modele acțiune/efect, nu ontologie semantică universală | **PARȚIAL** telemetrie/callback V21, nu transplant integral al politicii din acel branch |
| Corpus real axis gating `experiment/V17-REAL-CORPUS-AXIS-GATING-20261107` | 26,1878% vs 26,6298% next-token într-un test real mic; diferență insuficientă pentru pragul său de demonstrație | **NU** în writer V21; verdict `NOT_YET_DEMONSTRATED` |
| UI hypercube/torus 4D/5D | controale de vizualizare, proiecții și slice-uri din V17 | **UI păstrat**, nu dovezi de fizică extradimensională |

**Suita CI `preserved-discovery-controls` rulează aceste artefacte ORIGINALE într-un alt checkout GitHub. Aceasta este verificarea reproducibilității istorice, NU dovada transferului V21.**

## 6. Arhitectură curentă, delimitată

```text
        OpenThoughts3 / exerciții Q→A reale, în ordinea datasetului
                              |
                   Brain ORIGINAL V17
          ____________|____________________
         /            |                    \
     text Q/A       maze/transform        cognitivemap (opt-in)
    AligningGraph   Discoverer.shape       V19 learned effects
    write(answer)   physical actions           |
         |                 |                    |
         +---- shared actual before/action/after
                              |
                   V21 ObservedCausalField
               observed-action edges & branches
                              |
                    V20 TextHypermaze
                    (known-goal tokens)
                              |
                   V21 VeilAether pair graph
                     contextual memory
                              |
                     native original UI
           answer-shape | observed graph | action trace
```

Aceste module stau în aceeași aplicație, lucrează cu experiența comună și pot fi salvate în Brain; **nu există încă o demonstrație că un singur mecanism învață și folosește efectiv toate transformările ca să scrie răspunsuri semantic corecte, prin funcția originală `Discoverer.shape()`.**

Geometria „Aether/Veil” este o perspectivă conceptuală pentru ipoteze testabile:
- *Vălul*: observațiile parțiale, variabilele ascunse, diferența world/self și limitele hărții.
- *Aether*: starea comună a lumii și corpului, ipoteza de reprezentare unificată.
- *Perspectiva*: transformarea dintre reprezentări locale, globale, timp și scară.
- *Forma soluției*: o rută sau arbore de viitoruri anticipate ÎNAINTE de primul pas.
- *Holonomia*: două drumuri cu același endpoint vizibil pot avea efecte diferite din cauza istoriei.
- *2048*: acțiunile modifică susținerea distribuției de viitoruri aleatoare; trebuie planificate politicile condiționate, nu trasee rigide.
- *As Above, So Below*: ipoteză măsurabilă de echivarianță a transformărilor între scări, nu o consecință fizică demonstrată.

## 7. Reproducerea pe Windows și păstrarea istoricului

Se pornește **numai după oprirea trainerului anterior cu Ctrl+C**; NU există două procese care scriu în același checkpoint.

```powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-V21-Aether-Veil"
if (-not (Test-Path -LiteralPath "$dest\.git")) { throw "V21 repo absent" }
if (@(git -C $dest status --porcelain).Count -gt 0) { throw "Local edits: no overwrite" }
git -C $dest pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$dest\v17\START_V21_AETHER_VEIL.ps1" `
  -Data "D:\training\OpenThoughts3-1.2M" `
  -Gpu "cuda:0" -GpuWorlds 64 -GpuTextBatch 2 -Vram 3 `
  -IncludeCognitive -Resume
```

- URL existent: `http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1`.
- `-Resume` păstrează checkpointul și face la prima actualizare un backup timestamped al Brain și sidecars; `-Out` diferit pentru o antrenare complet separată.
- `ENSURE_V21_CUDA.ps1`: alege un Python CUDA real, nu un PyTorch CPU-only din alt proiect. Dacă se folosește `-PythonExe`, calea trebuie să indice un interpreter deja compatibil.
- Node V20/V21 este CPU. `-Gpu cuda:0` mută numai căile GPU compatibile din V17; `-GpuTextBatch 2` nu certifică 100% utilizare.
- În Evaluare > Text, alegeți exerciții held-out, T=0, noise=0, lungime 0 = tot exercițiul sau suficientă încât `A:` să fie prezent. Comparați checkpointuri la același număr de caractere, aceleași exerciții/seed, aceleași setări; raportați `shapeSame` și corectitudinea răspunsului separat.
- Logați: versiune/commit, număr de exemple, documente originale și noi, CPU/GPU, VRAM, rată char/s, exact `torch`, CUDA, CPU fallback, metrici heldout/negative control.

## 8. Porți de acceptare încă DESCHISE

- [ ] **Mecanismul ORIGINAL** `Discoverer.shape()` este aplicat direct, nu doar ecuație similară, unei topologii *semantic traversabile* cu stări și acțiuni text observate.
- [ ] Forma completă apare înainte de prima acțiune și fără tokenii viitorului răspuns ori leak de la evaluator.
- [ ] Acțiunile text efectiv executate schimbă lumea și sunt verificate independent față de obiective semantice, nu doar atingerea unor noduri din corpus.
- [ ] Cadre locale per nod, transport între regiuni, holonomie relevantă, politici stocastice și aspectul 4D fractal devin operații folosite de UN SINGUR motor original, fără schimbarea arbitrară a definiției utilizatorului.
- [ ] Controale de ablație pe aceeași unitate de antrenare: original V17, V20, V21 și integrarea completă; testele istorice izolate NU satisfac acest punct.
- [ ] ≥10–15% `shapeSame` verificat pe OpenThoughts3 real, plus îmbunătățirea semantică independentă și teste unseen; nu raportăm ca rezultat al GPU-ului utilizatorului fără loguri.
- [ ] Windows RTX 3050 Ti: CUDA valid, UI complet actualizat, timpi și VRAM măsurați, erorile GPU se propagă fail-closed.
- [ ] Preservare completă a imaginilor originale și a transcriptului istoric, cu hash și ordine.
- [ ] Issue #25 se închide **doar cu dovadă de mecanism echivalent și aprobarea explicită a utilizatorului**.

**Verdict curent:** V21 recuperat funcțional + V20/V21 grafuri și panouri + început de câmp cauzal multilu­me; suita de bază și suita istorică PASS. Transferul COMPLET al tuturor descoperirilor în generatorul real rămâne **PARTIAL / UNVERIFIED**. Nu suprascrieți `main`, nu ștergeți checkpointuri și nu schimbați verdictul în `COMPLETE` fără dovezile cerute.

## 9. Linkuri permanente

- V21 branch: https://github.com/dan3s2020/MagicPerspective/tree/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107
- Teste CI verificate: https://github.com/dan3s2020/MagicPerspective/actions/runs/42324536831
- Audit regresie: [V21_REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md](./V21_REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md)
- Dovezi arhitectură V21: [V21_VEIL_AETHER_EVIDENCE.md](./V21_VEIL_AETHER_EVIDENCE.md)
- Registru machine-readable: [V21_TRANSFER_EVIDENCE_LEDGER_20261107.json](./V21_TRANSFER_EVIDENCE_LEDGER_20261107.json)
- Source directives: [user-intent](../../../user-intent/2026-11-07-V21-REGRESSION-DIRECTIVE-verbatim.md)
- Main original Verbatim policy: https://github.com/dan3s2020/MagicPerspective/blob/main/VERBATIM_ROOT.md
