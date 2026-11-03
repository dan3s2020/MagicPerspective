# MagicPerspective V5 — Organul formei soluției

Versiune izolată în `v5/`, port **3034**, date proprii în `v5/data/`. V1–V4 și checkpointurile lor nu sunt atinse.

## Pornire în Termux

```sh
pkg update -y && pkg install -y git nodejs
cd ~
if [ ! -d MagicPerspective/.git ]; then git clone https://github.com/dan3s2020/MagicPerspective.git; fi
cd MagicPerspective
git switch main
git pull --ff-only origin main
bash v5/run-termux.sh
```

Deschide **http://127.0.0.1:3034**. Fără npm install, fără dependențe.

Teste: `cd ~/MagicPerspective/v5 && npm test` · Benchmark: `node scripts-benchmark.mjs 1000 9 45 17`

## Ce s-a reparat față de V4 (auditul din 2026-11-03)

| Problemă V4 | V5 |
|---|---|
| Forma nu era antrenată ca formă — doar „următorul pas” | **Organul formei** e antrenat pe întreaga soluție: la fiecare stare, eroarea (BCE) dintre norul prezis și traseul real al evaluatorului |
| Feedback online pedepsea 34% din pașii optimi (distanță fără pereți) | Eliminat. Corecția online vine doar din ce dezvăluie fereastra (organul de trecere), fără etichete greșite |
| Percepție = doar muchiile nodului, deși UI desena 3×3 | Fereastră reală **3×3** (rețea: nodul + vecinii) |
| „Perspectiva” = o constantă 0.66 + un prior | **Câmp de perspectivă**: distanțe interne de la sine și de la țintă sub 3 atitudini față de necunoscut (optimist / echilibrat / prudent), peste probabilitățile învățate |
| Fără nor de probabilitate | Nor peste fiecare relație, desenat pe hartă; decodorul trasează drumul cel mai probabil prin el |
| Adevăr și predicție pe hărți separate | **O singură hartă** cu straturi: nor, predicția pasului 0 (fixă), predicția curentă, traseul real, drumul parcurs, harta reală (opțional), ✕ rezistențe |
| Fără evoluție pe pași | Bară de timp: derulezi fiecare pas (ce credea organismul atunci + traseul real de acolo) și grafic F1/eroare pe pași |
| Control „neutral” euristic | Test orb cu 4 organisme pe aceleași lumi: organ antrenat online, organ înghețat, **același organ neantrenat**, **fără organ** (planificator clasic) |
| Metrici lipsă | F1 și eroare nor la pasul 0, rută validă la pasul 0, F1 mediu pe parcurs, calibrare (ECE), eficiență, rezistențe |
| UI în engleză | UI în română |

## Arhitectura

```
fereastra 3×3 ──► credința B_t (memoria relațiilor văzute)
                     │
                     ├─ ORGANUL DE TRECERE (MLP, auto-supervizat): p(relație deschisă | context local + analogia cu slice-uri văzute)
                     ├─ CÂMPUL DE PERSPECTIVĂ: distanțe interne sine→ și →țintă, la λ = 0 / 1.5 / 4
                     ├─ ORGANUL FORMEI (MLP): q(relație ∈ soluție)  ← norul întregii soluții, ÎNAINTE de primul pas
                     └─ DECODOR: drumul conex cel mai probabil prin nor (Dijkstra pe −log q)
acțiune ─► lumea răspunde ─► relații contrazise = REZISTENȚĂ ─► organul de trecere se corectează ─► formă nouă
```

- Profesorul (harta completă) dă eroarea formei **doar la antrenare**. În testul orb nu există profesor.
- Organul de trecere învață și în test (online), din ce vede fereastra.
- Cei 3 λ și decodorul sunt calcul explicit; ce se învață sunt probabilitățile de trecere și forma (cât contează fiecare perspectivă pentru soluție).

Fișiere: `engine/world.mjs` (lumi, fereastră 3×3), `engine/nn.mjs` (MLP + Adam), `engine/organ.mjs` (organe, câmp de perspectivă, decodor), `engine/agent.mjs` (episod, rezistență, cadre), `engine/training.mjs` (antrenare, validare, test orb), `server.mjs`, `public/`, `tests/`. Rezultate: [REPORT.md](./REPORT.md).
