# V24 — Recuperare forma originala V17, comparatie CALE GASITA vs CALE BLOCATA, si atlasul de CARACTERE intre lumi

**2026-11-07 · STATUS: INVESTIGATIE EXPERIMENTALA · open issue #25.**

## Ce a cerut utilizatorul (semnificatie si cerinte, fara a substitui Verbatim)

- Sa folosim versiunea care obtinea ~10–15% din forma SOLUTIEI la prima predictie pe text nevazut, NU un alt predictor care afiseaza 100% pe puzzle-uri cu tinta oferita.
- Sa recuperam toate descoperirile existente: V17 original AligningGraph.write/Discoverer.shape, corpus original, V19 transformari observate, V20 observatory, V21 aether/veil, NoiseSpace original, action/body feedback, transfer inter-lumi, shape.
- Sa vedem exact fiecare caracter prezis de V17 inainte de a primi raspunsul, fiecare diferenta fata de referinta, toate rutele candidate si blocajele de graf; apoi sa identificam **o transformare concreta, absentă prin design**, si sa demonstram ca accesul la aceasta permite navigarea.
- FARA demo, FARA inventarea raspunsurilor, FARA a modifica V17 original sau checkpointuri. Testele pot avea sarcini structurate sintetice pentru a demonstra o **cauza specifica**, dar nu pot fi prezentate drept inteligenta generala sau 70% raspunsuri naturale.
- Mesajele utilizatorului sunt pastrate in Verbatim; noile instructiuni pot fi doar adaugate, nu substituite.

## A. Reperul 10–15% — IDENTIFICAT si REPRODUS prin Codul ORIGINAL

Din \`v17/tests/veil-aether.text-migration.test.mjs\`, un checkpoint nativ V17 (64 Q/A antrenate, 5.633 caractere) este evaluat prin \`Brain.evalTextExercises\` dupa \`AligningGraph.write(questionPrefix)\` — **nu** folosind targetul viitor:

- \`shapeSame=0.17647058823529413\` = **17,6470588%** pe fixture-ul sintetic cu raspuns independent de numarul problemei.
- \`generatedShapeChars=57\`, \`generatedPrefix=" Please report the marker for the independently numbered "\`.
- \`v17/tests/veil-aether.shape-boundary-regression.test.mjs\`: pentru intrebare mai lunga de 200 caractere, prefix incomplet fara \`A:\` se raporteaza **NEEVALUABIL** (\`shapeSame=null\`), nu fals 0%; cu markerul complet la indicele 266 se masoara **14,2857%** pe fixture.
- Aceste valori **NU** sunt masuratori OpenThoughts3 ale RTX-ului utilizatorului, si nici corectitudinea raspunsurilor complete.
- Testele de migrare si scoring nu rescriu AligningGraph.write; functia originala este utilizata intacta. CI V24 le ruleaza din nou.

## B. Descoperirea lipsului de cale — ABLATIE controlata, verificabila

### Ce era blocat (V23 - NUMAI nivel de cuvinte)

\`LearnedCognitiveMap.formSolution("mat", {slots:{"0":"mut"}})\` genereaza o lume de stari si muchii pentru care transformarea tokenului complet \`mat → mut\` nu fusese observata. **Nu exista un vecin permis** pornind din \`mat\`. Deci \`Discoverer.shape()\` nu are pe ce „calca”. Diagnostic: \`NO_REACHABLE_GOAL_IN_CURRENT_EVIDENCE_NOT_PROOF_OF_IMPOSSIBILITY\`.

### Ce dovezi reale din alte lumi putem reutiliza (nu suprapunerea tuturor cuvintelor)

Lumi observate independent:

- \`cat flies.\` / \`cot flies.\` si \`bat glows.\` / \`bot glows.\` ofera doua contraste distincte si doua contexte pentru transformarea de **caracter** \`a→o\`.
- \`cot sings.\` / \`cut sings.\` si \`bot rests.\` / \`but rests.\` ofera doua contraste si contexte distincte pentru \`o→u\`.

**Important:** propozitiile sunt date de ANTRENARE, NU raspunsuri-ținta ascunse introduse in test. Sunt contraste OBSERVATE, inca ipoteze semantice pana la feedback. Nu se presupune ca toate cuvintele care difera cu un caracter sunt echivalente ca sens.

### Mecanism exact de deblocare

\`v17/transcend/torus-aether/worlds/character-hypermaze.mjs\`:

- Preia exclusiv evenimentele reale \`cognitive.onAtlasEvidence("rule-evidence")\` din trainingul V19 pe acelasi original corpus, si extrage substitutii, insertii, stergeri si swap-uri **la nivel de caractere Unicode**, nu doar cuvinte.
- Necesita cel putin **doua contraste si doua contexte independente** ca o transformare sa devina muchie transferabila. Un singur exemplu nu poate crea o „autostrada”.
- Atlasul construit la test pastreaza sirul COMPLET in fiecare stare. Muchiile sunt candidate descrise cu dovezi originale; cele respinse in lumea reala sunt blocate doar pentru starea/action respectiva.
- Invoca exact **\`Discoverer.shape()\` ORIGINAL V17** pe noua adiacenta (acelasi camp cu relaxare 0.97, conductance, attractie si noise). Nu e BFS/oracol de distante si nu exista shortcut \`mat→mut\` predefinit.
- **INAINTE de prima actiune:** \`mat → mot → mut\` ; actiunile sunt \`replace(index=1,a,o)\` si \`replace(index=1,o,u)\`; fiecare are \`evidence=2\` din lumi independente.
- Testul de actiune independenta verifica apoi fiecare tranzitie. Fara actiunea efectiva, rezultatul ramane candidatul *shape* prezis, nu reusita semantica.

### Ablatii / controale negative

- Transfer oprit: \`NO_INDEPENDENT_CHARACTER_TRANSFORM_EVIDENCE\`, nicio ruta.
- Nivelul vechi pe cuvinte: ruta negasita.
- Transfer activ: ruta din doua actiuni.
- **O singura observatie**: regula nu devine transferabila.
- \`mat→met\` cu scopul \`e\`: nici \`a→e\`, nici \`o→e\`, nici \`u→e\` nu au fost observate, deci \`MISSING_CHARACTER_TRANSFORMATION_EDGES\`, nu „labirint imposibil”.
- Un feedback real de zid pe \`mat→mot\`: ruta este respinsa la acea stare chiar daca restul clasei se poate aplica in alte lumi.
- Temperatura/noise seeded: acelasi seed si aceeasi stare reiau exact aceeasi forma. Nu modifica dovezile de antrenare.
- Unicode real, spatii/punctuatie, insertion/deletion/swap: codul foloseste codepoints \`Array.from\`; familiile nesigure de editari compuse sunt explicit respinse, nu presupuse.
- **100/100** combinatii NOI de **76 caractere**, cu acelasi scop *charSlots* precizat, pot compune doua transformari observate: doar demonstrarea transferului pe exercitii structurate, **nu** corectitudine in generarea raspunsurilor naturale.
- Test pe server: 18 documente Q/A reale ale unui mic corpus de integrare, **1.528 caractere originale V17 invatate**, **6 reguli transferabile de caractere**, intregul jurnal de peste **501.215 octeti** exportat identic cu datele de pe disc.

## C. Comparatia directă cerută: CE A GHICIT ORIGINAL V17 vs CE NU

Modul \`original-v17-answer-forensics.mjs\` si evaluatorul \`eval-worker.mjs\` folosesc, in aceasta ordine verificabila:

1. \`Brain.evalTextExercises\` genereaza **INAINTE** continuarea \`shape\` numai dupa \`Q:\`, cu \`AligningGraph.write\`. Setul neobservat si limita fixa de caractere se aleg inainte de generare.
2. **DUPA** generatie, evaluatorul compara simbol-cu-simbol toate pozitiile din \`rows\` cu predicția si recalculeaza **exact** vechiul \`shapeSame\`. Orice diferenta de scor este eroare de test, nu „imbunatatire”.
3. In jurnal scrie TOATE pozitiile gresite, toate segmentele gresite si selecteaza (explicit raportat) primele 80 pentru explorarea costisitoare a rutelor post-hoc.
4. Pe acele greseli, codul cauta transformari de caractere din atlasul invatat. Daca exista o ruta \`a→o→u\`, o afiseaza ca **\`POST_HOC_REPAIR_PATH_IN_LEARNED_ATLAS\`**, NICIODATA ca raspuns generat corect din prima.
5. Daca nu exista, arata indicele caracterului, ce a produs V17, ce era corect si **ce caracter/transformare nu este disponibilă**, ori daca limita \`maxNodes/maxDepth\` a oprit explorarea.
6. Toata comparatia este inregistrata in \`.atlas.jsonl\` ca eveniment \`frozen-v17-answer-forensic\` cu \`trainingModelWasFrozen=true\`, \`postHoc=true\`, fara mutarea Brain-ului si fara acces la target in timpul generarii.

Aceasta permite sa vedem **de ce** o predictie V17 a ratat si ce tipuri de cai lipsesc, fara sa ne atribuim o crestere artificiala a scorului original.

## C.1 Rezultat original V17 pe evaluarea reala a workerului CPU V24 (fixture mic)

In [CI V24 (run 42357932423)](https://github.com/dan3s2020/MagicPerspective/actions/runs/42357932423), pe corpusul TEST al integrarii native cu 18 documente invatate, **doua exemple tinute separat**:

- `originalV17HeldoutAnswerShapeSame=0.9252136752136753` = **92,5214%** potrivire POZITIONALA a caracterelor, dar `originalV17WholeCorrectCount=0`: **0/2 raspunsuri complete corecte**. Corpusul are raspunsuri repetitive; asta NU este OpenThoughts3. Demonstratia este tocmai de ce 92,52% caractere identice NU inseamna nici macar un raspuns integral corect.
- `postHocCharacterErrorPositions=60` = pozitiile ratate gasite de comparatorul de raspuns original, cu referinta citita abia DUPA generare. Traseele de reparatie sunt marcate `POST_HOC`, niciodata ca „ghicite”.
- `fullAtlasDiskBytes=534464`, descarcarea JSONL prin HTTP a fost identica octet cu octet cu jurnalul adevarat de pe disc, inclusiv observatiile de caracter, traseele positive/negative si analiza originala.
- Testele pozitive `mat→mot→mut`, controalele negative si blocarea unui perete observat din lumea reala sunt verificabile in aceeasi executie, fara pornirea CUDA.

**Nu prezentam acest test cu scorul mare de caractere ca imbunatatire a modelului semantic.** Metrica exacta a raspunsurilor intregi ramane 0/2 aici.

## D. Unde se vede in UI REAL

Lansatorul ORIGINAL de CPU \`v17/START_V22_CPU_REAL_TEXT.ps1\` pornit pe aceasta ramura continua sa activeze toate cele cinci lumi native: \`text,cognitivemap,hypertext,maze,transform\`; \`--gpu off\`; checkpointurile sunt in directorul distinct \`v17/runtime-v22-cpu-real-text\`, fara modificarea vechilor checkpointuri V21.

In **sectiunea cognitiva originala**:

- \`V24 - LABIRINT PE CARACTERE Unicode\`: contorul din backend pentru dovezi si reguli reale, textarea pentru text real, scop expres \`goal.charSlots\`, noise si budgeturi, \`COMPARA BLOCAT VS DEBLOCAT\`, vizualizare a nodurilor reale si a primei forme.
- \`V17 ORIGINAL: COMPARA FORMA GHICITA VS RASPUNSUL NEVAZUT\`: redirectioneaza la evaluatorul original frozen pe 16 exemple **unice**, folosind \`max=0\` pentru intregul exercitiu si lungime de output fixa INAINTE de scoring; afiseaza \`shapeSame\` V17, raspunsul original, adevarul si fiecare mispozitie.
- \`V23 - ATLAS COMPLET\`: filtre \`character-rule-evidence\`, \`character-planning-attempt\`, \`character-real-action\`, \`frozen-v17-answer-forensic\`, pagina dupa pagina, plus export integral JSONL.
- Linia aurie = forma prezisa; mutarea animata e proiectie vizuala, **nu actiune executata**. Confirmarea/rejectia actiunii se face doar prin endpointul \`/character-observe\`, pe date furnizate de mediul extern.

## E. Limite care raman deschise si NU sunt cosmetizate

1. **Tinta semantica autonoma**: actualul navigator pe caractere are nevoie de un predicat \`goal.charSlots\` explicit. Nu stie singur raspunsul necunoscut; \`AligningGraph.write\` ramane inca generatorul original.
2. **Mai multe fractale/dimensiuni reale**: nu e demonstrata o geometrie fizica 4D/5D, nici ca toate cele 1,21M texte alcatuiesc un graf finit complet accesibil in RAM. Graful de stari are limite explicite, iar jurnalul poate persista TOATE evenimentele observate dupa activare.
3. **Date pre-V24 compactate**: reconstructia din regulile V19 inca prezente in checkpoint este partiala. Jurnalul vechi absent nu poate fi reconstituit octet cu octet din contoare.
4. **Metrica V17 vs obiectiv final**: \`17,647%\` sau \`14,286%\` sunt scoruri pe caracter si pe fixture, NU 70% raspunsuri complete. Castigul corectitudinii OpenThoughts3 pe text mare dupa char atlas este **NEDEMONSTRAT**.
5. **Identitate arhitecturala**: aceeasi clasa \`Brain\` detine V17 original plus V19/V23/V24; ramura ramane experimentala, Issue #25 **OPEN** pana la validare independentă pe corpus real si unificarea functionala a generarii cu planificarea.

**Concluzie verificabila:** am gasit exact doua muchii de caractere absent-permise la nivel de cuvânt, am indus permisiunea de a calca pe ele din dovezi observate in alte lumi si am demonstrat deblocarea controlată, inclusiv ziduri si alternative; nu pretind ca asta a crescut automat shapeSame pe OpenThoughts3.


## F. Validarea finală de integrare CPU și concluziile numerice (aditiv)

**Dovada de CI, run complet GREEN:** [V24 GitHub Actions #42357932423](https://github.com/dan3s2020/MagicPerspective/actions/runs/42357932423) (Windows PowerShell 5.1 + motorul V17 original + cele cinci lumi CPU native + harta textuală V23 + nivelul Unicode V24 + evaluarea pe Q/A înghețate).

Ieșirile brute din testul de integrare păstrate în log:

- `V24_REAL_NATIVE_CAUSAL_PATH_FORENSICS`: **18 documente observate** de harta cognitivă, **1.528 caractere învățate de V17**, **6 clase de reguli transferabile**, `mat→mot→mut` înainte de prima mișcare; `mat→met` rămâne negăsit (ținta `e` nu este în transformările disponibile); **534.464 octeți** în jurnalul atlas exportat identic cu fișierul de pe disc în acest run.
- Comparația frozen V17 în **acest mic fixture diferit**: `originalV17HeldoutAnswerShapeSame=0.9252136752136753` (92,52% **potrivire pozițională pe caractere**) **dar `originalV17WholeCorrectCount=0` răspunsuri întregi corecte din prima**. Valorile sunt compatibile: răspunsuri repetitive au multe caractere comune și totuși pot fi complet greșite. Nu raportăm 92,52% drept acuratețe semantică.
- `V24_ORIGINAL_V17_SHAPE_NOT_REPLACED`: test independent, `shapeSame=0.16666666666666666` (**16,67%**), 46 caractere generate, 45 poziții greșite raportate; modelul original a rămas neînlocuit.
- `V21_NATIVE_QA_RESCUE`: recuperarea scorului original `shapeSame=0.17647058823529413` (**17,65%**), fără ținta ascunsă în prompt; `V21_MISSING_A_BOUNDARY_NOT_FALSE_ZERO`: **14,29%** pe alt fixture complet, dar scor nul/neevaluabil pentru prefixul din care lipsește markerul răspunsului.
- `V24_ACTUAL_BLOCKED_VS_UNLOCKED`: vechiul strat pe cuvinte nu poate face mutația `mat→mut`; cu transferul caracterelor din **două contexte independente per regulă**, planul original `Discoverer.shape()` conține exact două acțiuni. Nu s-a inventat o muchie directă `mat→mut`.
- `V24_UNSEEN_CHARACTER_COMPOSITIONS`: **100/100** probleme structurale noi de 76 de caractere cu *condiția de țintă dată explicit*, comparate cu 0 accesibile fără transfer. Niciuna nu validează răspunsuri semantice arbitrare.
- Testul de regresie extins în `v24-native-character-forensics.test.mjs` transmite **feedback de zid** prin endpointul nativ după epuizarea corpusului finit: checkpointul original primește o copie de siguranță; transformarea `a→o` este blocată numai în starea `mat`, rămâne disponibilă pentru `bat`, iar eroarea și noul traseu negăsit sunt scrise în jurnal. Acest feedback este **injectat explicit de test ca observație externă controlată**, nu inventat ca experiență reală a utilizatorului.
- Noul `character-gap-diagnostics.mjs` identifică indexul exact, dovezile `a→o` și `o→u`, numărul surselor independente și cauza: `TRANSFER_ABLATED_IN_THIS_RUN`, `RULE_WITHOUT_SUFFICIENT_INDEPENDENT_CONTEXTS`, `NO_OBSERVED_CHARACTER_RULE_CHAIN` sau `REAL_WALL_OBSERVED_AT_THIS_POSITION`. Separă clar ipotezele bazate pe contrast de acțiunile efectiv confirmate.
- Optimizare CPU: `character-hypermaze.mjs` pregătește setul de reguli admise o singură dată per căutare. Nu mai reevaluează întregul catalog pentru **fiecare muchie candidată**; ordinea exactă a muchiilor, zgomotul și metoda V17 rămân neschimbate. **Nu există încă un benchmark verificat de sute de exerciții complete/s**.

Acest rezultat este **o deblocare verificabilă a unei căi învățate între exerciții**, NU dovada că V17 poate ghici răspunsul necunoscut OpenThoughts3 cu 70% sau 100%. Evaluările post-hoc pot consulta referința doar DUPĂ predicția inițială; nu au voie să ridice retrospectiv scorul `shapeSame`.

**Statut final: V24 experimental, Issue #25 încă deschis.** Nu se alterează `main`, originalul V17, V23 sau vechile checkpointuri; actualul atlas persisită noi experiențe fără să pretindă că reconstruiește evenimentele istorice deja compactate.
