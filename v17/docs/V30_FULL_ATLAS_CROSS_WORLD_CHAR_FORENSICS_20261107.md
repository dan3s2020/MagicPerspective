# MagicPerspective V30: atlas complet si investigatia traseelor lipsa

**Data:** 2026-11-07. **Ramura:** experiment/V30-FULL-ATLAS-FAILURE-FORENSICS-20261107.

**Status:** cercetare izolata; implementare originala Discoverer.shape reutilizata, nu inlocuita. Main, experientele istorice si checkpointurile utilizatorului nu au fost suprascrise. Issue #25 / pragul de acceptare original raman DESCHISE.

## Cerinta
Mesajul original este pastrat integral la [verbatim](../../verbatim/2026-11-07-FULL-HYPERMAZE-ATLAS-REQUEST.txt). Cerinta esentiala: un graf accesibil din tot ce a invatat organismul, nu numai din actualul segment de text; memorarea si reutilizarea transformarilor din alte lumi; toate incercarile reusite si ratate; cauza pentru fiecare traseu absent si fiecare caracter gresit.

## Cod existent reutilizat
- Originalul V17 [Discoverer.shape](../transcend/torus-aether/worlds/exercise.mjs): camp de atractie cu propagare 0.97, efecte invatate, traseu inaintea actiunii.
- [LearnedCognitiveMap](../transcend/torus-aether/worlds/learned-cognitive-map.mjs): contraste intre stari complete de text, predictia efectelor actiunilor, graf accesibil din operatori cunoscuti; repere MAX_NODES, MAX_DEPTH si lipsa obiectivelor.
- [cross-world-transforms](../transcend/torus-aether/worlds/cross-world-transforms.mjs): transfer ipotetic numai dupa observatii in doua contexte independente, verificare ulterioara prin actiune reala.
- [atlas-journal](../transcend/torus-aether/devour/atlas-journal.mjs): JSONL persistent append-only, paginat dupa offset, inclusiv evenimente esuate si istoricul dovezilor. Endpointuri existente in ramura sursa V23: GET /atlas si GET /atlas-export.
- Native [Brain](../transcend/torus-aether/devour/brain.mjs): text Q/A original generat de AligningGraph.write, care NU a folosit traseul descoperit de Discoverer.shape. Nu confunda scorul campului cu raspunsurile exacte.

## Ce s-a modificat si ce NU
- Am adaugat [UI atlas](../transcend/torus-aether/ui/atlas-explorer.js) in pagina V17 existenta fara stergerea controalelor vechi. Inregistreaza vizual toate nodurile/muchiile din snapshotul unei incercari, culoarea traseului prezis, transfer ipotetic vs verificat, resurse consumate, reason/excludedByDesign, incercari esuate si probele de antrenare. Pagina poate filtra evenimentele si exporta raw JSONL.
- Am adaugat [posthoc answer-forensics](../transcend/torus-aether/devour/atlas-answer-forensics.mjs) si un apel strict dupa evaluarea inghetata in devour.mjs. Raporteaza fiecare caracter gresit, prima divergență, textul prezis si raspunsul de referinta, dar niciun raspuns ascuns nu ajunge la generator inainte de predictie.
- Originalul Discoverer.shape, Brain.evalTextExercises, AligningGraph.write, GPU worker, checkpoint format, noise/seed, celelalte UI, controale de train/save/pause/resume nu au fost schimbate.
- Modelul original V17 nu este doar o demonstratie sau un model de frecvente substituit. Noul UI doar observa datele reale.

## Experimente controlate confirmate, CPU Github Actions
[Execuție CI 42356161057: 33/33 teste trecute](https://github.com/dan3s2020/MagicPerspective/actions/runs/42356161057) la ultima rulare inaintea smoke-testului Chromium.

### Reproducerea unei cai absente si recuperarea
Lumea 1 contine contrastele reale complete: Mira buys tea / Mira buys coffee. O cerere de stare noua Ada keeps tea cu cerinta explicita ca slotul 2 devine coffee NU este rezolvabila: transformarea nu are suficiente contexte independente pentru a putea fi portata.

Lumea 2 contine Ivo likes tea / Ivo likes coffee, confirmand aceeasi structura de schimbare de cuvant intr-un context diferit. Acum acelasi Discoverer.shape planifica un pas, verificat de callbackul de fizica al lumii sintetice. La 100 noi propozitii cu subiect nou si acelasi obiectiv explicit: **0/100 inainte -> 100/100 dupa**. Acesta NU este rezultat de generalizare semantica libera, ci transformare controlata cu obiectiv explicit. Sursele de test nu contin propozitiile finale.

### Inventar pereti si limitari
- Operator necunoscut / lipsa dovezi: transferul nu este inventat; se raporteaza conditia de evidenta insuficienta.
- MAX_DEPTH=1: obiectiv ce cere doua editari ramane nerezolvat; la MAX_DEPTH=4 aceeasi cale devine accesibila. Un gard software nu este un perete al realitatii.
- Interventie real respinsa: se blocheaza strict acea stare+actiune; alte contexte pastreaza conexiunile.
- Rezultat absent: diferentiaza presupusa lipsa de operator de lipsa de obiectiv si limita de noduri, fara a pretinde imposibilitatea universala.

### Persistenta
182 documente, 152 exemple compactate, 32 exemple active; un operator portabil ramane in memorie dupa checkpoint export/restore. Inregistrarile JSONL >160KB, inclusiv caractere Unicode romanesti, au fost refacute fara pierderi la paginarea de cate un eveniment. Un worker nativ real a antrenat 22 documente si a salvat doua incercari succes/esec, cu export JSONL de 213719 bytes.

### Predictia reala a caracterelor: control negativ
Un alt worker original a citit 27 documente Q/A, a evaluat 2 intrebari complet tinute in afara antrenarii, fara a primi raspunsul si cu buget fix. Rezultat **0/2 raspunsuri intregi corecte si 140 pozitii de caractere diferite**. Aceste date sunt NUMAI un mic test controlat, nu scor OpenThoughts. Caracterul nu a fost generat de Discoverer, ci de AligningGraph.write: lipseste puntea cauzala dintre calea globala si caracterele produse.

## Limite reale in continuare
1. Atlasul arata integral graful materializat pentru o incercare instrumentata, plus toata evidenta de la pornirea jurnalului. Nu poate afisa infinite tranzitii ipotetice necunoscute ori evenimente istorice neinregistrate.
2. Scopul este inca specificat in problema structurata; deducerea autonomă a obiectivului din intrebare naturala ramane nedemonstrata.
3. Writerul original de Q/A nu urmeaza calea hiperdimensionala; simpla diagnosticare nu repara aceasta lipsa. Trebuie integrat cauzal si testat prin ablatia unei actiuni ca sa vedem schimbarea raspunsului.
4. Caracterele romanesti non-ASCII nu sunt complet tratate de toate subcomponentele istorice (partea Q/A de bytes Latin-1); compararea Unicode din atlas nu implica generarea Unicode corecta.
5. Nu avem aici benchmark pe OpenThoughts3 si nici pe RTX 3050 Ti CUDA; CI ruleaza CPU Github-hosted.
6. Articolul si codul NU declara finalizarea cerintei de 100% first-try, antrenare semantica libera sau superinteligenta. Regresia project issue #25 ramane OPEN.

## Teste
- v17/tests/v30-full-atlas-diagnostics.test.mjs
- v17/tests/v30-answer-forensics.test.mjs
- v17/tests/v30-native-atlas-http.test.mjs
- v17/tests/v22-long-unseen-shape.test.mjs
- v17/tests/torus-cognitive-learned-map.test.mjs

CI: .github/workflows/v30-native-full-atlas.yml. Pentru reproducere, porneste corpusul tau intr-un OUT NOU, selecteaza un worker cognitiv, apoi foloseste pagina originala pe /transcend/torus-aether/ui/index.html?live=1 si sectiunea ATLASUL COMPLET. Nu muta automat checkpointurile tale existente.
