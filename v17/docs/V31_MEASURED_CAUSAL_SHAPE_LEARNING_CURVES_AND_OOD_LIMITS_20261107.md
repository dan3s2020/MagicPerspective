# V31 — Evidență măsurată: din memoria transformărilor la răspunsul produs efectiv de calea Discoverer

Data: 2026-11-07  
Ramură izolată: \`experiment/V31-CAUSAL-PATH-TO-ANSWER-LEARNING-CURVE-20261107\`

**Stare: cercetare experimentală încheiată pentru cazurile controlate; problema semantică generală NU este rezolvată.** Nu s-au schimbat implementarea originală \`Discoverer.shape()\`, \`AligningGraph.write()\`, checkpointurile utilizatorului sau \`main\`. Păstrăm issue #25 și testele de regresie.

## Cerința originală
Textul exact al cererii și al continuării se află în \`verbatim/2026-11-07-USER-V31-TRAINING-SCALING-CONTINUE.txt\`.

## Cauza arhitecturală izolată și corecția reală
- V30 a stabilit că outputul Q/A inițial provine din \`AligningGraph.write()\`, nu din traseul \`Discoverer.shape()\`. Prin urmare, o cale geometrică perfectă nu producea automat răspunsuri corecte.
- V31 adaugă opțional \`path-answer-writer.mjs\`: interpretează **numai** cereri de forma \`Replace "from" with "to" in:\n<text>\`; derivă o condiție de obiectiv pe un slot, construiește graful cognitiv din regulile învățate de modelul ORIGINAL, cere traseul din \`Discoverer.shape()\`, execută doar acțiunile din traseu, și scrie starea terminală ca răspuns.
- Este o **citire cauzală a rezultatului traseului**, nu un model nou de generare, un răspuns copiat din țintă sau o soluție hardcodată în exercițiu. Când lipsește o cale, răspunsul este nul; NU se improvizează.
- \`LearnedCognitiveMap.buildWorld(...,{maxTokens})\` poate primi explicit până la 2048 tokenuri de intrare. Valoarea implicită originală de 96 rămâne neschimbată. Nu pretindem materializarea tuturor stărilor limbajului: \`maxNodes\` și \`maxDepth\` rămân limitări măsurate.

## Evaluările executate în CI (CPU GitHub, Node22)

### Curbă cu 12 transformări, 360 teste înghețate la fiecare etapă
| Lumi observate | Răspunsuri complete corecte din prima |
|---:|---:|
| 0 | 0/360 |
| 6 | 0/360 |
| 12 | 0/360 |
| 18 | 180/360 (50%) |
| 24 | 360/360 (100%) |
| 36 | 360/360 (100%) |

*Nu este o curbă asimptotică dovedită*. Pragurile corespund apariției a două contexte de evidență pentru clasele de schimbare. Obiectivul în sine este dat de instrucțiune. În 60 de cazuri cu operatori complet necunoscuți scorul a rămas **0/60**, ceea ce infirmă ideea că numărul de exemple pentru alte operații ar garanta automat răspunsuri noi.

### Textele complete și păstrarea contextului
- \`v17/tests/v31-long-complete-text-path.test.mjs\`: **32/32** texte întregi, aproximativ **198.685 caractere** verificate, inputuri de 16–1800 tokenuri, operator în poziții variabile. Doar operația specificată și deja învățată a fost executată; întregul text a rămas în starea planificatorului până la răspuns.
- Testul păstrează limita implicită de 96 de tokenuri și atestă o cale explicită de a folosi 201+ și 1800 tokenuri; peste 2048 se refuză explicit. Acest lucru nu echivalează cu modelarea semantică a unui roman de 1800 tokenuri.

### Compunerea obligatorie a trei transformări
Am separat observațiile de origine pentru a elimina o scurtătură falsă produsă prin comparația tuturor variațiilor aceluiași schelet.
- \`tea → coffee → water → juice\` nu are, în aceste date, muchie directă \`tea→juice\`.
- Pe 30 texte nevăzute: **0/30** înaintea dovezilor pentru toate cele trei clase, apoi **30/30** după șase lumi cu contraste în contexte independente, pe **238.308 caractere** comparate.
- Traseul are **exact trei pași**. Eliminarea operatorului \`coffee→water\` elimină răspunsul; două observații noi îi restabilesc disponibilitatea.

### Eșec cauzal care a motivat o corecție
Dacă ambele contexte de antrenare conțin toate cele patru variații sub același subiect/verb, inducția de contraste poate propune o cale directă \`tea→juice\`. În mediul testat ea **nu este executabilă**: fizica permite numai tranzițiile adiacente.
- Fără filtrare, \`Discoverer\` a avut nevoie de **patru încercări** (trei scurtături false respinse) pentru a găsi traseul real de trei pași în primul context.
- Pentru un context nou, respingerile locale nu erau generalizate și scurtătura falsă revenea. Este un **eșec real de proiectare al transferului liber**, nu o eroare de desenare a atlasului.

### Corecția opțională \`minVerifiedContexts\` (implicit 0)
Am adăugat o opțiune izolată, fără efect asupra comportamentului inițial:
- Clasele de transformări portabile sunt eligibile numai după execuții reușite în cel puțin N **stări-sursă independente cu același context local observabil** și fără respingeri cunoscute în acel context.
- Clasificarea este per poziție și contextul local (vecinii stânga/dreapta și limita de propoziție); nu afirmă că am învățat semantica verbelor.
- Acțiunile cauzale promovate ca span rule respectă același filtru (nu pot evita verificarea prin alt mecanism).
- Cu N=2, modelul se abține când nu are confirmări sau după doar una. După experiența fizică din \`Ada keeps …\` și \`Bela keeps …\`, pe **100 contexte noi „keeps”** au reușit **100/100 răspunsuri exacte din prima și 100/100 trasee executabile**.
- În 10 contexte „denies” cu fizică diferită, **10/10 abstinențe** (nu desenează greșit un drum). În modul fără filtru, toate propuneau o cale incorectă.
- N=2 NU dovedește aplicabilitatea în contexte arbitrare sau un mecanism general de raționament verbal. Este un filtru conservator, sensibil la structura contextului.

## Acces în motorul V17 existent
Am adăugat în \`worker.mjs\` și \`devour.mjs\` un endpoint READ-ONLY \`POST /path-answer\` pentru un worker cognitiv real. Acceptă \`question\`, \`maxTokens\`, \`maxNodes\`, \`maxDepth\`, \`minVerifiedContexts\` și ID worker. **Refuză orice referință, answer sau expected** în cerere. Nu mută antrenarea, loghează în atlas întregul graf materializat și toate încercările, inclusiv eșecurile, și răspunde cu rezultatul produs numai din traseu.

\`ui/index.html\` are o nouă secțiune V31 opțională, cu controale și rezultatul traseului, păstrând intacte controalele originale și Atlasul V30. \`atlas-explorer.js\` afișează exact textul produs din traseu; comparația cu răspunsul corect este locală și **doar după generare**.

\`v17/START_V31_REAL_TRAINING.ps1\` folosește originalul \`START_V17.ps1\`, OpenThoughts3 real furnizat de utilizator, lumi \`text,cognitivemap,hypertext,maze,transform\`, CUDA \`cuda:0\` pentru componentele GPU disponibile și un director nou separat. Scriptul nu pornește fără dataset real și protejează checkpointurile. CI Windows verifică parserul PowerShell și blocarea suprascrierii; **NU antrenează GPU în GitHub**.

## Reproducere (ramura izolată)
\`\`\`powershell
git clone --single-branch --branch "experiment/V31-CAUSAL-PATH-TO-ANSWER-LEARNING-CURVE-20261107" https://github.com/dan3s2020/MagicPerspective.git "D:\MagicPerspective-V31-Training"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-V31-Training\v17\START_V31_REAL_TRAINING.ps1" -Data "D:\training\OpenThoughts3-1.2M"
\`\`\`
UI: \`http://127.0.0.1:8895/transcend/torus-aether/ui/index.html?live=1\`, secțiunea „V31 · Răspuns generat din calea originală”. Pentru reevaluări cu semnificație fizică a operatorilor folosește filtrul N=2 **doar după ce transformările au fost confirmate prin execuții**.

Reproducere CI cu Node:
\`\`\`sh
node v17/experiments/v31-causal-learning-curve.mjs
node --test v17/tests/v31-long-complete-text-path.test.mjs
node --test v17/tests/v31-three-hop-composition.test.mjs
node --test v17/tests/v31-spurious-shortcut-recovery.test.mjs
node --test v17/tests/v31-physical-causal-transfer.test.mjs
node --test v17/tests/v31-native-path-answer-http.test.mjs
\`\`\`

## Ce lipsește pentru un 100% real pe OpenThoughts3
**Nu avem** dovezi că mai mult antrenament conduce matematic la 100% first try pe texte naturale; după operatori lipsă, scorul rămâne 0%. Nu avem încă un mecanism demonstrat de inferare semantică a țintei din întrebări variabile, de învățare a cauzalității fiecărui cuvânt, de constrângeri cu rază lungă sau de operare continuă pe texte nelimitate. V31 răspunde doar la un limbaj de instrucțiuni de înlocuire și obiective explicite. Originalul Q/A al Brain rămâne separat; V31 adaugă o cale de output cauzală opțională, nu îl înlocuiește.
