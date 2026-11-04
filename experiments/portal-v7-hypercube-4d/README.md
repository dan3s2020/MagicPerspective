# Portal4D V7 — 4D tesseract view contract

## Source and status

**SOURCE:** `verbatim/2026-11-03-USER-4D-HYPERCUBE-NAVIGATION-VERBATIM.txt`.
The source preserves every original byte of the newest user message, including
the linked Wikipedia quotation, spelling, and incomplete diagonal formula.
The requirement is indexed in `verbatim/recent-user-messages.json` and linked
to code, tests and status in `verbatim/implementation-mirror.json`.

**STATUS: 4D projection mathematics + standalone additive component implemented and tested.
NOT integrated or visually verified in the original `Portal_4D_v7_Universal_Graph.zip` application.**
That exact ZIP is available on the user's Windows PC, but its raw source bytes are
not accessible in this editing session. Do NOT patch a different project and claim
to have modified the original V7 application. Existing V7 START 1 / START 2,
A–H worlds, shared 9,745 parameters, CUDA worker and `universal_brain_latest.pt`
have not been changed by this component.

## Exact viewport semantics

1. A true tesseract has **16 vertices, 32 edges**, and four equal-length
   mutually perpendicular edge directions. The longest diagonal of an
   `n`-dimensional unit hypercube is **sqrt(n)**; in 4D it is **2**.
2. Render a **static, always visible tesseract wireframe** in the user's
   2D screen space as a geometric orientation/reference frame.
3. Eight clickable arrows navigate the abstract 4D graph observer in
   **X+, X−, Y+, Y−, Z+, Z−, W+, W−**; the wireframe does NOT move.
   The world appears to move in the opposite direction: a camera-relative
   projection, not a physical claim that the universe itself moved.
4. `W` is a real fourth numeric coordinate in each graph node. **Never
   synthesize W** from 3D coordinates or from simulated animations.
   The viewer must reject incomplete 3D-only graph payloads rather than
   silently displaying them as measured 4D.
5. Optional **3D cross-section at a selected W**, moved through 4D by the
   W arrow and limited with a section-width slider. The 3D section uses
   the exact same 4D graph data as the full view, not a second graph.
   It can show intersections of edges crossing the section plane.
6. Real motor actions, messages, prediction, executed transitions and
   activated cells are colored and animated only when **original V7
   backend events are supplied**. The renderer generates no fake frames
   and declares disconnected status rather than showing a dummy training demo.
7. The same original UI must retain **START 1, START 2, STOP + SAVE, A–H,
   active training, checkpoints, V7 validation and the original CUDA
   control**; the viewer is additive and may not overwrite them.

## Component API (integration contract, NOT original-source integration)

The V7 app must import `viewer.mjs` and `viewer.css` from an actually served
static directory and mount it into its existing original dashboard:

```js
import {bindPortal4DHost} from './viewer.mjs';
const tesseract = bindPortal4DHost(document.getElementById('ACTUAL_V7_PARENT_ELEMENT'));
```

Here `ACTUAL_V7_PARENT_ELEMENT` is **a placeholder, not an invented original
DOM identifier**. Identify it from the extracted source before integration.
Original V7 engine publishes actual 4D graph state:

```js
window.dispatchEvent(new CustomEvent('portal4d:graph4d', {
  detail: {nodes: realNodesWithXYZW, edges: realObservedEdges}
}));
window.dispatchEvent(new CustomEvent('portal4d:frame4d', {
  detail: {
    step: measuredTrainingStep,
    activeNodes: actuallyActivatedNodeIds,
    messages: realNodeToNodeMessages,
    predictedEdges: realModelPredictions,
    executed: actuallyExecutedEdge
  }
}));
```

These variables describe **required real engine values**, not fabricated values
or guessed source names. The adapter that maps actual V7 model outputs into
this contract is **NOT YET IMPLEMENTED** because the exact V7 Python/HTML
source has not been uploaded in this session.

## Tests

```bash
node --check experiments/portal-v7-hypercube-4d/viewer.mjs
node --test experiments/portal-v7-hypercube-4d/tests/geometry.test.mjs
```

Tests require exact hypercube topology, a fixed on-screen reference while
moving the 4D camera, observable X/Y/Z/W projection changes, W slicing,
precise 4D crossing and rejection of missing fourth coordinates.

A geometry test does **not** certify V7 original UI integration or train-time
CUDA evidence. Keep the full VERBATIM compliance gate blocked until exact
source+integration+visual+regression verification are available.

## Extensie: graful REAL crește odată cu fiecare experiență (3 noiembrie 2026)

**VERBATIM:** `verbatim/2026-11-03-USER-4D-REAL-EXPERIENCE-DENSE-GROWTH-VERBATIM.txt`.
Cerința este păstrată textual, indexată cronologic și urmărită drept REQ-11.
Nicio reprezentare decorativă nu se califică drept graf învățat.

### Mecanism, fără noduri hardcoded

- `growth.mjs`: graful începe cu **zero** noduri și muchii. `EvidenceGraph.ingest(event)`
  adaugă noduri numai cu coordonate reale `[x,y,z,w]`, înregistrează exclusiv
  legături observate de motor, mesaje trimise efectiv și tranziții executate.
  Predicțiile rămân suprapuneri temporare, **niciodată legături confirmate**.
  Reutilizarea unui nod sau a unei muchii îi mărește numărul de observații.
  Același ID de nod observat efectiv în mai multe lumi este marcat multi-domeniu.
- `journal.mjs`: evenimentele sunt salvate **înainte** de actualizarea memoriei
  UI. Jurnal JSONL și snapshot atomic, încărcare/restaurare verificată,
  recuperare fără pierderea conexiunilor confirmate anterior.
  Persistența este **separată de** `universal_brain_latest.pt`;
  nu modifică ponderile sau fișierele vechi.
- `growth-server.mjs`: port local 8791, fără autentificare publică și fără
  motor de antrenament fals. `POST /api/experience` primește numai telemetrie
  reală; `GET /api/graph`, `/api/events`, `/api/history` și `/api/health`
  redau memoria confirmată, replay și grafice de evoluție.
- `viewer.mjs`, `growth-view.mjs`, `growth-index.html`, `growth-app.mjs`:
  tesseractul geometric are în continuare **16 puncte / 32 muchii fixe**,
  distincte de graful *învățat*. Nodurile reale apar gradual când sursa le
  transmite. Legăturile confirmate noi primesc o animație de naștere,
  legăturile repetate o grosime măsurată. Rama fixă și săgețile X/Y/Z/W
  funcționează în continuare, fără recentrarea arbitrară a spațiului
  la fiecare nod nou.

### Ce înseamnă densitate, concret

Interfața măsoară:
`total_nodes`, `total_edges`, `unique_problems`, `observed_actions`,
`learned_steps` (doar dacă motorul raportează `weight_delta > 0`),
`cross_domain_nodes`, `cross_domain_edges`, `edges_per_node`,
`directed_density` (număr de **perechi distincte** de noduri conectate,
împărțit la N×(N−1), fără a număra tipurile multiple ca vecinătăți separate).
Aceste valori nu sunt inventate și nu sunt forțate să crească; dacă experiența
nu aduce legături noi, graful nu simulează o schimbare.

Pentru capacitate mare, rețeaua se persistă complet în jurnal/snapshot,
iar viewportul afișează o selecție limitată cu **totalurile reale**
vizibile separat. 14 milioane de experiențe nu sunt încă verificate
ca performanță sau scalabilitate; structura JSONL + instantaneul în memorie
vor necesita un index persistent de nivel SQLite pentru acea scară.

### Pornirea vizualizării adiționale (NU înlocuiește V7 8788)

În folderul `MagicPerspective`, cu Node.js 22+:

```powershell
node experiments/portal-v7-hypercube-4d/growth-server.mjs
```

Se deschide la `http://127.0.0.1:8791`.
Dacă motorul V7 nu transmite niciun eveniment, va afișa corect **0** noduri,
nu un graf de demonstrație.

**Formatul minim de eveniment REAL pe care trebuie să-l furnizeze motorul:**

```json
{
  "event_id": "ID-ul-real-unic-al-actiunii",
  "source": "ID-ul-sursei-originale",
  "domain": "domeniul-original",
  "problem_id": "fingerprint-ul-exercitiului",
  "step": 0,
  "nodes": [],
  "edges": [],
  "messages": [],
  "predictedEdges": [],
  "executed": null,
  "reward": null,
  "model_update": null
}
```

Structura de mai sus este doar **schema**, nu un exemplu care ar genera date.
`nodes` conține nodurile observate cu ID real și poziție 4D;
`edges` conține doar legăturile confirmate. `messages` necesită un
`strength` măsurat numeric; `model_update` necesită
`gradient_norm` și `weight_delta` calculate de antrenamentul real.

Acesta este **un canal de telemetrie, nu motorul neuronal**.
Pentru conectarea efectivă la interfața START 1 / START 2, A–H din
**Portal_4D_v7_Universal_Graph.zip**, trebuie inspectate și instrumentate
cele 11 fișiere sursă extrase pe Windows. Nu au fost puse la dispoziție
în această sesiune; nu există o integrare verificată la portul 8788 și
nu trebuie afirmat că modificarea s-a aplicat deja în V7.

### Validare

```bash
node --test experiments/portal-v7-hypercube-4d/tests/*.test.mjs
node scripts/verbatim-mirror-gate.mjs
```

Testele verifică imposibilitatea fabricării de muchii din predicții,
coordonata W obligatorie, experiențe unice, legături între domenii, numere
de observații confirmate, evoluția reală a grafului, persistența după
restart și HTTP zero-noduri fără sursă. Gate-ul complet VERBATIM
rămâne **BLOCKED** până la conformitate cu întreaga conversație și
toate cerințele originale.

## Correctly starting the ORIGINAL V7 training (not just the 4D observer)

The original user-visible problem was that the read-only observer on port
**8791** showed zero exercises and no START button. This was expected because
it has no training process. Never call that status a running trainer.

On the exact Windows computer with the installed V7 application and saved
`D:\training\Portal4D-v7-UniversalGraph\universal_brain_latest.pt`, use
the repo root launcher:

```powershell
$repo = "$env:USERPROFILE\Downloads\MagicPerspective"
git -C $repo pull --ff-only origin main
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$repo\START_EXACT_PORTAL_V7_WITH_4D_VIEW.ps1"
```

This script:
- launches the exact local `Portal4D_V7_RUN\Portal_4D_v7_Universal_Graph\START_PORTAL_4D_v7.ps1` at **8788**, reusing an existing listener rather than creating a conflicting second V7;
- launches the separate **8791** 4D evidence service if it was not already running;
- opens the combined 8791 page that embeds the real original 8788 V7 START 1 / START 2 / A–H controls in a frame, plus a permanent **DESCHIDE TRAININGUL ORIGINAL** link;
- never kills existing Python/Node processes, resets V7 model weights or rewrites checkpoints;
- cannot bypass framing restrictions that the original V7 may impose; if browser framing fails, the original 8788 link still provides full native controls.

The integrated page has a paginated **exercise journal** using the original
`/api/experience` evidence records. `/api/exercises?after=0&limit=30`
displays exercises actually received, not hardcoded tasks or simulated data.
These records survive journal checkpoints. The old original V7 simulator
**has not been instrumented to POST these events** in this repository.
Hence the new journal honestly reports zero and its source remains
unverified until the 11 original V7 files from
`Portal4D_V7_SOURCE_20261103_211029.zip` are supplied and the model
is instrumented at actual decision, update and per-exercise boundaries.

**Do not claim the original V7 exercise feed or automatic unified 4D graph
is fully integrated yet.** The 8791 page displays original 8788 controls
for immediate training, while the native per-step 4D telemetry is still
a separately tracked requirement.

## Torusul 4D ORIGINAL + graful real, in aceeasi fereastra (4 noiembrie)

Se pastreaza codul original din `MagicPerspective_4D_Torus_Isolated(3).html`,
inclusiv Clifford/Hopf/Resonance si toate controalele lui. Fisierul
`MagicPerspective_4D_Torus_Graf_Real_Complete.html` este o extensie
standalone; nu creeaza nicio muchie/nod al invatarii la pornire.

1. Descarca HTML-ul complet intr-un fisier din
   `%USERPROFILE%\Downloads\MagicPerspective_4D_Torus_Graf_Real_Complete.html`.
2. `git pull --ff-only origin main` in checkout-ul MagicPerspective.
3. `node experiments/portal-v7-hypercube-4d/growth-server.mjs`.
4. Deschide `http://127.0.0.1:8791/torus.html`, NU `file://`, pentru
   acelasi origin ca `/api/graph` si `/api/events`.
5. Alternativ, deschide HTML-ul offline si apasa **IMPORTA JSON/JSONL**
   pentru un export real `nodes[].position=[x,y,z,w]` si `edges[].from/to`.
   In lipsa datelor, afiseaza doar torusul matematic, cu 0 noduri.

Serverul citeste fisierul HTML exact din Downloads la fiecare GET, fara
suprascrierea continutului si fara a modifica versiunea V7.
Calea poate fi indicata explicit prin variabila de mediu
`MAGICPERSPECTIVE_TORUS_HTML` inainte de pornirea serverului.
Daca fisierul lipseste, `/torus.html` intoarce 404 cu o explicatie:
nu inlocuieste proiectul original cu un exemplu fals.

**Limitare:** serverul 8791 continua sa fie jurnal de telemetrie, nu
motorul CUDA original V7. Datele originale V7 nu apar fara un adaptor
real care sa comunice actiunile, nodurile/pozitiile 4D, gradientii si
rezultatele exercitiilor. Un test cu date importate nu certifica
antrenarea originala CUDA.
