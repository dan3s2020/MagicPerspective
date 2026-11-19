# 2026-11-20 — Native V42 Brain în lumea SHA-256: rezultate REALE, controale, limite

**STATUS:** Testul original Brain V42 a fost **executat cu succes** în GitHub Actions, pe ramură izolată bazată exact pe `ac205b5bc561274b957584a7dee058a1110ab6f8`. **NU există inversare SHA-256 generalizată sau vulnerabilitate demonstrată.**

## 1. Sursa exactă / respectarea organismului
- Sursa originală nemodificată: `v17/transcend/torus-aether/devour/brain.mjs`, `worlds/exercise.mjs`, același `Brain` + `Discoverer`.
- Cod izolat: `research/sha256-labyrinth-20261119/native_sha256_motors_v2.mjs`. Copia precedentă din Braivour era blocată de GitHub Actions pentru repo privat. Aceasta rulează direct în repository-ul public MagicPerspective, fără download extern.
- Constructor original `Brain({rules:{depth:2},c:{cap:4},seed:43})`. Se apelează `brain.live` pe simbolurile fizice și pe TOATE cele 64 stări complete SHA-256 pentru fiecare mesaj, `D.learnStep` după acțiuni fizice observate, `D.endEpisode`, `D.shapeGraph` și `Brain.predict` pe intrare blind.
- **Nu se atribuie valori manuale** `pass`, `enter`, `endIn` sau `lastEntered`. Tipul propriei poziții, efectele motoare și atracția au fost învățate din experiențe, deși acțiunile din setul de antrenament au fost demonstrate de un teacher.
- Lumea fizică este o **transpunere 9×9 în șarpe** a celor 65 stări ale SHA-256 (starea inițială + 64 runde). Motoarele învățate controlează mișcarea pe hartă, **nu calculează independent inversa algebrei SHA-256**. Conținutul fiecărei stări SHA de 256 biți este conservat fără pierderi în șirul senzorial Base64 (32 octeți).
- Mesaje de antrenament de un octet distinct, hash validat cu `node:crypto`; date noi disjuncte. La testul digest-only, conținutul mesajului original NU este furnizat către Brain; evaluatorul verifică `sha256(candidate)===target`.

## 2. Rulări native confirmate, cu dovezi
### Smoke: 2 lumi train, 4 digesturi blind
- [Run 44629102416](https://github.com/dan3s2020/MagicPerspective/actions/runs/44629102416): **SUCCESS**. 2/2 drumuri cunoscute, simbol propriu 3, 3 efecte motoare, 128 runde adevărate experimentate, 0/4 preimagini blind; artifact `native-sha256-original-brain-smoke`.

### Extins: 8 lumi train, 32 digesturi blind (config cap4)
- [Run 44629246781](https://github.com/dan3s2020/MagicPerspective/actions/runs/44629246781): **SUCCESS**, exit 0, toate etapele executate, artifact ID `14579524712`.
- 8 lumi cunoscute × 64 runde = **512 tranziții fizice reale** cu `D.learnStep`.
- `brain.lived=27376` simboluri trăite. `D.self()=3`; **3 motoare** cu efect observat; `D.attract(KIND.target)=0.8888888888888888`.
- **8/8** trasee cunoscute reconstruite de `D.shapeGraph` după demonstrație.
- **32/32** lumi cu **harta completă dezvăluită**: transfer înghețat al mapării motor->deplasare, cu topologie 65 noduri. Control cu fizica motoarelor permutată: **0/32**. Acest succes măsoară transferul de acțiuni pe aceeași familie de hartă, nu găsirea mesajului din digest.
- **0/32** preimagini necunoscute recuperate la o singură propunere nativă/hash; baseline 1 propunere aleatorie/hash **0/32**. **0/32** obiective digest-only conectate în atlasul de tranziții observate.
- Pentru **toate cele 32 de hash-uri noi**, candidatul `Brain.predict` a fost **`5c`**, care era chiar unul dintre cele 8 mesaje de antrenament. În acest protocol, predicția s-a redus la o singură propunere memorată și nu a folosit util variațiile hash-ului.

### Diagnostic suplimentar
- `research/sha256-labyrinth-20261119/native_sha256_context_diagnostic.mjs` compară un context original de 4 cu un context mărit în condiții identice, plus recall pe train pentru a testa dacă Brain poate folosi chiar exemplele cunoscute.
- [Run 44629718737](https://github.com/dan3s2020/MagicPerspective/actions/runs/44629718737): la context 4, **1/8 recall train**, 1 singur candidat distinct pe train și blind, **0/32 blind**, 32/32 full map. Context 32 **anulat intenționat** (generatorul `candidates(maxLag)` din sursa originală are complexitate exponențială `2^maxLag`; nu este un test economic sau legitim pentru hardware-ul utilizatorului).
- Comparația sigură context 4/8 este în [workflow 44630176327](https://github.com/dan3s2020/MagicPerspective/actions/runs/44630176327); **nu raporta niciun scor pentru context 8 fără a citi logul încheiat și artifact-ul**.

## 3. Concluzie fără confuzii
**Confirmat:** Braivour/MagicPerspective original Brain V42 rulează efectiv, trăiește runde SHA-256 prin `Brain.live`, învață corpul/motoarele prin propriul `Discoverer.learnStep`, transferă motorul la lumi noi cu hartă completă și are un test blind reproductibil.

**Nerezolvat:** Transformările SHA-256 nu au devenit acțiuni fizice interne inversabile ale organismului. În lumea de aici, acțiunile sunt pași printr-un lanț văzut și nu alegeri ale valorilor ascunse `W[t]`. Grafurile observate nu includ drumurile preimaginilor necunoscute. `Brain.predict` nu a produs variație pe 32 digesturi, deci nu există o metodă de inversare blind demonstrată.

**Următorul blocaj cauzal real:** transformarea spațiului de acțiune, astfel încât organismul să poată alege/interveni asupra unor coordonate SHA reale și să observe consecința lor, păstrând constrângerile globale `W[0..63]` și preimaginea strict ascunsă la test. Numai un avantaj verificat față de bruteforce pe același buget permite afirmarea unei vulnerabilități.

Păstrați **main**, checkpointurile, algoritmul original și ramurile celorlalți agenți intacte. Nu trageți concluzii din scorurile de hartă completă ca dintr-un atac criptografic.
