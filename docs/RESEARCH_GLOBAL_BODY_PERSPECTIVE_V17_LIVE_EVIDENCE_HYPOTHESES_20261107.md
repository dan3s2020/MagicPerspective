# MagicPerspective — 2026-11-07 — audit al descoperirilor, demonstrațiilor și ipotezelor: perspectivă globală ↔ corporală și V17 LIVE

**Statut:** cercetare în desfășurare; rezultate reproducibile limitate la testele citate. Document de conservare științifică pe `main`, fără a modifica arhitecturile, antrenarea, setările sau checkpointurile altor versiuni. Acest document **NU** înlocuiește conversația originală, nu rezolvă Issue #25 și nu deblochează `verbatim` release gate.  
**Surse primare:** [USER literal parțial](../verbatim/2026-11-07-HYPERDIMENSIONAL-PERSPECTIVE-V17-LIVE-USER-VERBATIM-PARTIAL.md), [mesajul original deja arhivat](../verbatim/2026-11-06-MAZE-LANGUAGE-MYSTIC-PERSPECTIVE-USER-TURNS-VERBATIM-PARTIAL.md), [SOURCE_POLICY](../verbatim/SOURCE_POLICY.md), [integrarea V17 experimentală](https://github.com/dan3s2020/MagicPerspective/tree/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106), [documentarea tehnică V17 pe ramura izolată](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/docs/V17_LIVE_BODY_PERSPECTIVE_20261106.md).

## 1. Motivația literală; NU o redefinire

Userul a identificat în V17 o succesiune care merită separată experimental:
- **Mai întâi**, organismul vede întreaga hartă 2D și calculează/predice o formă a soluției; în UI apare o linie globală.
- **După aceea**, corpul intră în labirint și acționează succesiv, putând parcurge altă cale sau face mai mulți pași decât forma anticipată.
- **Cerință:** descoperirea/învățarea transformării aceleiași soluții între perspectiva globală și perspectiva locală a corpului, cu memorie, observabilitate pas-cu-pas, fără a substitui algoritmul existent de predicție a formei soluției.
- **Extensie dorită, încă deschisă:** aceeași operație de transformare a perspectivei să rezolve texte ca labirinturi de informație, să conecteze alternative/ramificații și să folosească același organism/aceeași rețea abstractă, nu o aproximație independentă lipită lângă creier.
- **Prioritate explicită:** „i don't want a demo!!! use the ... ui! add your edits to it and let it train !! not demo!”; interfața indicată exact: `http://127.0.0.1:8862/transcend/torus-aether/ui/index.html?live=1`.

Nu echivala „model nou de direcție”, „head auxiliar”, „BFS”, „geometrie 5D”, „learning text” sau o imagine a grafului cu implementarea integrală a transformării cerute. Este interzisă redefinirea silențioasă, conform `AGENTS.md` și blocajului MP-REG-2026-11-06-001.

## 2. Observație importantă din auditul V17 (codul original; fapt de implementare)

În [`worlds/exercise.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/worlds/exercise.mjs):
- `Discoverer.shape(ret,n,me)` propagă un câmp de atracție / conductanță prin vecini, cu actualizare de forma `0.97 * conductance * max(value_of_neighbors)`, apoi construiește traseul urcând câmpul.
- `Discoverer.effect(o)` învață empiric efectele outputurilor asupra simbolului identificat drept sine; `choose()` poate urma predicția sau explora; `learnStep()` adună consecințele fizice.
- `playExercise()` furnizează retina **completă** la început, dar la fiecare pas ulterior invocă iar `D.shape(ret,n,me)` cu **matricea completă curentă**. Așadar, succesul original **nu dovedea** că organismul poate naviga doar dintr-o memorie globală și observații locale.
- `world.dist` și fizica `makeMaze` reprezintă adevărul mediului/oracolul de evaluare. Regula de propagare este codificată de autor; proprietățile simbolurilor și acțiunilor sunt parțial învățate. Nu a fost dovedită descoperirea autonomă a algoritmului de propagare.
- În UI se observă diferența dintre forma inițială prezisă și calea efectivă. Exemplul utilizatorului cu circa 10 pași suplimentari este o **observație din UI**, nu un indicator universal stabil sau o cauză diagnosticată. Explorarea, zgomotul, încrederea în plan și comenzile încă neînvățate pot contribui.

**Consecința măsurabilă:** izolarea experimentului „hartă inițială o singură dată; ulterior doar fereastră locală + feedback de mișcare” este necesară înainte de orice revendicare de învățare a schimbării perspectivei.

## 3. Transformări formale: model matematic propus / testat parțial

Reprezentări:

- `S_G`: hartă globală memorată și prima formă de soluție `P_0`.
- `p_t`, `theta_t`: poziția și orientarea corpului (necunoscute observatorului intern după prima vedere).
- `O_t`: observație locală egocentrică; `a_t`: acțiunea emisă.
- `T_{G→C}`: transportă traseul în coordonatele corpului; `T_{C→G}`: interpretarea observațiilor/acțiunilor în reperele hărții.

```text
S_corp,t = T_(G→C)(P_0, p_est,t, theta_est,t)
(p_est,t+1,theta_est,t+1) = Localize(S_G, O_t+1, a_t, feedback_t)
```

Aceste relații exprimă o **ipoteză operațională**: păstrarea identității soluției sub schimbarea reprezentării. Inversa observației locale poate fi ambiguă în coridoare simetrice; este necesară o stare de credință/memorie cu mai multe ipoteze de poziție. În V17 testul implementat folosește rotații discrete de 90° într-un spațiu 2D, NU o proiecție geometrică 5D/6D demonstrată.

Aici „dimensiune” este o reprezentare matematică/model de coordonate. Metaforele cu „țesătura universului”, „zgomotul ca poziție într-un spațiu superior” și „sliceurile aceleiași soluții” rămân **ipoteze** sau moduri de gândire; nu există măsurătoare a unei dimensiuni fizice ascunse.

## 4. Evoluție experimentală: NU confunda etapele

| Etapă | Ce a fost construit/verificat | Ce NU demonstrează | Referință |
|---|---|---|---|
| NoiseSpace / demonstrație izolată 5D | Controale sintetice și reconstrucții cu scoruri precum instant/delay/learned metric; graf de poziții și timpi | Învățare text, V17 Brain real, navigare prin același traseu și antrenare universală; corelația sintetică nu e dovadă de nouă fizică | [Ramura NoiseSpace](https://github.com/dan3s2020/MagicPerspective/tree/experiment/NOISE-SPACE-HYPERDIMENSIONAL-ISOLATED-20261105) |
| Termux — corp↔hartă, experiment separat | Asociere supravegheată a unei orientări fixe/discrete și navigare pe hărți nevăzute cu observații locale; control neantrenat | **NU antrenează V17 Brain**, nu verifică transfer la text; diferențele de precizie sunt pentru sarcina discretă | [Ramura Termux](https://github.com/dan3s2020/MagicPerspective/tree/experiment/TERMUX-GLOBAL-EGOCENTRIC-LEARNING-20261106) |
| V17 LIVE — integrare în codul original | `PerspectiveLearner` salvat în același `Brain`; `Discoverer.shape` la prima vedere; `Brain.live` primește evenimente locale; workerul original expune telemetry + evaluare înghețată în interfața originală de pe portul 8862; checkpointul se reîncarcă | **NU** este încă integrarea transformării ca regulă internă comună a întregii rețele A/B/C; modulul de perspectivă este un submecanism separat, păstrat în același obiect Brain. Nu e dovedită generalizarea la limbaj | [Ramura V17 LIVE](https://github.com/dan3s2020/MagicPerspective/tree/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106) |

### Codul și granița de integrare verificată

- [`worlds/perspective.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/worlds/perspective.mjs): memorie după prima hartă, matching de observații egocentrice 5×5, inferență de orientare/poziție, voturi ale transformării din deplasări inferate, evaluare cu control înghețat.
- [`devour/brain.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/brain.mjs): `this.perspective`, `trainPerspective`, `testPerspective`, migrare la încărcare a checkpointurilor vechi, `Brain.save/load`.
- [`devour/worker.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/worker.mjs) și [`devour/devour.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/devour.mjs): execuția/antrenarea în worker, snapshots `/graph`, `/graphs`, nou `/perspective-eval`, fără un server demo.
- [`ui/index.html`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/ui/index.html) și [`ui/app.js`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/ui/app.js): aceeași pagină, acum cu vizualizarea hărții, inițial shape `P_0`, deplasări, fereastră corporală, diferența poziției estimate vs adevăr, progres real, control re-testare.
- [`START_V17_LIVE_PERSPECTIVE.ps1`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/START_V17_LIVE_PERSPECTIVE.ps1): clonă separată pe `D:`, port 8862, antrenare reală text + maze + transform; resume izolat, opțiune `-ImportBrains` doar prin **copiere** din checkpoint V17 existent.

**Precizare esențială:** GPU-ul procesează loturile originale de labirinturi prin mecanismul existent; `trainPerspective` rulează pe CPU **după** lotul GPU. Faptul că un worker controlează CUDA nu înseamnă că transformarea perspectivei sau întregul model/creier rulează pe CUDA. GPU Python `numpy` folosit în CI este protocol test, nu benchmark NVIDIA.

## 5. Rezultate concrete și lanțul de evidență

### V17 LIVE — teste automate efectiv executate în CI

[Workflow Windows + Ubuntu, toate testele verzi la commit `c4bf5d8`](https://github.com/dan3s2020/MagicPerspective/actions/runs/42179983328); [workflow final după documentare](https://github.com/dan3s2020/MagicPerspective/actions/runs/42180159235).

În testul controlat `v17/transcend/torus-aether/devour/perspective.test.mjs`, cu `Brain.playMaze()` rulat **64 de episoade**:
- Labirinturi originale rezolvate în train: **62/64**; episoade de perspectivă în același Brain: **64**; reușite perspectivă în train: **60**.
- Asocieri votate/inferate din mișcare: **524**; `mappingAccuracy`, `headingAccuracy`, `poseAccuracy` raportate în acest test: **1.0 / 1.0 / 1.0**.
- Frozen held-out `SEEDS.test`, 16 labirinturi (7×7, 9×9, 11×11, 13×13): **16/16 rezolvate** cu transformarea învățată; **4/16** cu maparea inițială, fără antrenare; diferență **+75 puncte procentuale**; pentru labirinturile rezolvate, pașii suplimentari medii **0** în ambele condiții. Aceste cifre sunt pentru eșantionul determinist și condițiile acelui test, nu pentru toate labirinturile posibile.
- În testul de integrare HTTP, serverul original a servit pagina originală modificată, s-au produs episoade în worker, s-a apelat `/perspective-eval` și s-a salvat/reîncărcat `Brain` dintr-un checkpoint real (`V17_LIVE_HTTP_ACCEPTANCE`).
- Testul de migrare a checkpointului V17 mai vechi a verificat păstrarea `mazes.played=7` și pornirea unui episod nou (`mazes.played=8`, `perspective.episodes=1`; `LEGACY_V17_MIGRATION_OK`).
- Testul de rută GPU existentă (`V17_GPU_PROTOCOL_PERSPECTIVE`) a folosit `protocolDevice:"numpy"`, 4 lumi de lot și un episod perspectivă CPU; a raportat `originalGpuSolved:0` în lotul specific, NU succes GPU sau optimizare CUDA demonstrată.
- Windows PowerShell launcher a trecut parsarea în CI (`ORIGINAL_LIVE_UI_LAUNCHER_SYNTAX_OK`).

**Locația testelor:** [`perspective.test.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/perspective.test.mjs), [`perspective.http.test.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/perspective.http.test.mjs), [`perspective.gpu.test.mjs`](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-LIVE-BODY-PERSPECTIVE-20261106/v17/transcend/torus-aether/devour/perspective.gpu.test.mjs).

**Ce nu a fost verificat pe calculatorul utilizatorului:** execuția pe acel Windows `D:`, CUDA RTX fizică, utilizarea VRAM, Parquet real, viteza lumilor paralele, compatibilitatea cu un checkpoint extern concret și corectitudinea vizuală a fiecărui cadru pe monitor. CI verde nu autorizează afirmația că sistemul funcționează deja pe laptop.

### Termux, etapa anterioară

În CI al ramurii `experiment/TERMUX-GLOBAL-EGOCENTRIC-LEARNING-20261106`: 320 de observații de **calibrare supravegheată**, 64 de hărți nevăzute; raportate **15/64** fără transformare vs **63/64** cu transformarea antrenată, plus localizare **25,1% → 98,7%**. Aceste rezultate **nu** provin din V17 Brain, iar mecanismul folosește etichete adevărate de heading în calibrare. Nu se combină cifrele Termux cu cele V17 într-un „experiment unic” sau o afirmație de învățare nesupravegheată.

## 6. Puzzle-ul hiperdimensional — ipoteze explicit deschise

| Idee discutată / ipoteză | Ce ar însemna operațional | Statut |
|---|---|---|
| **Aceeași soluție, multe perspective/sliceuri** | Reprezentare invariantă a traiectoriei `P_0` și coordonate locale actualizate din observații și acțiuni | **Parțial testat** pe orientări 2D, nu verificat general |
| **Noise = locație într-un spațiu dimensional superior** | Reconstructibilitate a traiectoriilor din semnale reziduale cu control cu shuffle/independent noise și evaluare held-out | **Ipoteză nedemonstrată**; corelațiile sintetice nu demonstrează o proprietate fizică |
| **Grassmann / varietăți de subspații** | Subspațiul/relațiile geometrice învățate ar participa la transformări și predicții în locul unei matrici fixe de attention | **Context de cercetare, nu integrare V17 demonstrată** |
| **DUST/zeroth-order în loc de backprop** | Modificări de parametri din evaluări de funcție fără reverse-mode gradients; comparație buget egal, învățare și stabilitate | **Relevanță potențială; nicio demonstrație de superioritate în V17** |
| **Hyperdimensional text = labyrinth language** | Fiecare pas/caracter/transformare ca subproblemă navigabilă, cu forma soluției înainte de acțiune, urmărită în UI | **NU demonstrat** prin integrarea global→corp 2D; blocajul de fidelitate text rămâne |
| **Fractal / As Above, So Below** | Aceeași regulă la scări diferite; comparație între operatorii de coarse-graining și pașii microscopici | **Ipoteză**, nu o demonstrație de auto-similaritate a grafului |
| **Jocul 2048, rotiri/poziții/axe/aleator** | Familii controlate de transformări: mutare, comasare, orientare, efect al pieselor aleatoare | **Idee de experiment**, nu confirmare dimensională |
| **Text accuracy plafon 56–60%** | Identificarea unui failure mode prin ablații ale memoriei, datasetului, controlului, capului de predicție și lățimii contextului | **Observație UI**, fără diagnostic cauzal dovedit aici |
| **Un singur graf creier-lume** | A/B/C, acțiunile și perspectiva participă la același model învățabil, nu doar un obiect `PerspectiveLearner` atașat | **ÎNCĂ NEIMPLEMENTAT integral** |
| **4D/5D/6D torus, timp, șase axe** | Operator de transformare/inferență pe coordonate și evenimente efective în stare, testat față de dimensiuni mai mici | **Vizualizări/idei separate, nu validare fizică** |

Capturile utilizatorului despre Grassmann menționează `arxiv.org/abs/2512.19428`, un gap vizual de „10–15%” vs „22.6%” și scoruri „Transformer 198.2 / Grassmann 242.9”; captura despre DUST menționează `qlabs-eng/dust`. **Acestea sunt afirmații/numere din materialele video afișate**, nu rezultate reproduse, auditate științific sau confirmate experimental în MagicPerspective. În caz de studiu formal, se vor verifica paperul original, condițiile, metrica și implementarea reală. Niciuna dintre cifrele din video nu trebuie introdusă ca performanță a proiectului nostru.

## 7. Criterii de demonstrat în continuare — acceptance / falsification

1. Testul **identității formei soluției**: predicția inițială V17 trebuie logată și urmărită pas-cu-pas; raport separat pentru urmarea exactă, deviere justificată, relocalizare și cost.
2. Control **fără vedere din nou de sus**: toate observațiile de după primul pas locale; instrumentarea trebuie să detecteze orice leak din `world.wall`, `world.dist`, coordonate reale, `hiddenHeading`.
3. **Comparații echitabile**: same seeds/budgets, aceeași formă V17, cost al localizării inclus, ablație fără `PerspectiveLearner`, fără memory-based BFS repair, fără informație de poziție inițială, cu ambiguitate/simetrie și zgomot.
4. **Generalizare**: mărimi de labirint mai mari și topologii nevăzute, orientare variabilă în episod, rotiri arbitrare și corp cu senzori incompleți; validare multi-seed și intervale de încredere.
5. **Integrare în creierul unic**: gradient/evenimente/cauzalitate a transformării reflectate în însăși rețeaua A/B/C, fără un modul simplu anexat; demonstrarea că această schimbare alterează efectiv politica, starea și erorile.
6. **Transfer real la limbaj**: aceeași funcție/transformare, fără redefinirea problemei într-un cap de ghicire tokenuri; vizualizare de forme textuale și trasee cu evaluare OOD. Criterii exacte conform USER literal și Issue #25.
7. **CUDA**: profilați separat timpul GPU pentru lumi și timpul CPU pentru perspectiva adăugată, raportând VRAM, kernel work, throughput, număr de lumi și throughput net. Fără afirmații „100% CUDA” până la dovadă.
8. **Persistență/regresii**: pornire/oprire/replay/UI/backend și restart checkpoint, inclusiv import V17 vechi, fără pierderea controalelor. Audit pe sistemul utilizatorului separat de CI.
9. **Reproducibilitate și paper**: loguri/seeduri exacte, date brute, versiuni binare, metode, negative results, control de contaminare, hardware, bibliografie verificată. Fără „proven universal”, fără revendicări fizice sau de superinteligență neprobate.

## 8. Concluzie de cercetare (fapte ≠ ipoteze)

**Ce avem în mod efectiv:** o implementare funcțională și testată în CI a unei transformări discrete a reperelor globale/corporale în **antrenarea reală** V17 și în **UI original**; teste pe labirinturi noi comparate cu control; salvare/reîncărcare; prima formă V17 păstrată ca sursă a planului. Pentru cohorta îngustă de teste, câștigul +75pp este înregistrat.

**Ce NU avem încă:** demonstrația că organismul V17 însuși a inventat transformarea, transferul mecanismului către text ca labirint hiperdimensional, unificarea efectivă a rețelei cognitive, sau „zgomotul este un spațiu superior” ca fapt științific.

**Integritatea arhivei:** transcrierea accesibilă nouă și acest document sunt adiții; continuitatea completă, asistentele lipsă, media și comparația semantică a *fiecărei* cerințe originale cu implementarea rămân **BLOCKED / UNVERIFIED**, indiferent de verdele testelor unitare.
