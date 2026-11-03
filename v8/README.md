# MagicPerspective V8 — relief, labirinturi și rețele: fiecare nod are orizontul lui

Versiune izolată în `v8/`, port **3039**, date proprii în `v8/data/`. V1–V7 și laboratoarele din `experiments/` rămân neatinse. Creierele tale V6 și V7 de pe telefon sunt doar **citite**, ca să fie comparate.

## Pornire în Termux

```sh
cd ~/MagicPerspective && git pull --ff-only origin main
bash v8/run-termux.sh
```

Deschide **http://127.0.0.1:3039** → **Antrenează** (400 de lumi, ~2 minute) → **Rulează testul** → **Ce a învățat**.
Teste: `cd v8 && npm test` · Benchmark: `node scripts-benchmark.mjs 800 15 80 17`.

## Ce e nou

Patru tipuri de lumi, trăite pe rând: **relief cu munți**, **rețea abstractă**, **labirint cu bucle**, **labirint**.

**Rețeaua abstractă** (din V4/V5 și din Graph Dance): nodurile au nume (indice) și adresă (poziție) publice; ce legături sunt deschise și cât costă e ascuns, după un relief ascuns sub rețea.

Ce vede un nod — orizontul lui:
- fiecare legătură proprie exact (deschisă/blocată, cost);
- pentru **fiecare legătură** — oricâte are, fiecare e o direcție proprie — ce e dincolo la 1, 2 și 3 pași: cea mai scumpă legătură, cât e blocat, cât de aglomerate sunt nodurile și cât de tare ajunge unda țintei (grosier și zgomotos, niciodată distanța).

**Organul de rețea** ghicește pentru fiecare legătură nevăzută: e deschisă? cât costă? cât de sigur e? Din orizonturi, din nume și adresă, din vecinătate și din **dans**.

**Dansul** (din Graph Dance): fiecare nod are o fază; vecinii se trag unul pe altul; ținta are faza 0; unda ei pornește din ce a perceput fiecare nod și trece prin legăturile văzute deschise și prin cele imaginate, după cât de sigur e organismul de ele. E un vot al nodurilor despre unde e ținta, calculat în interiorul organismului.

Învățarea rămâne fără profesor: când ajunge într-un nod, compară ce își imaginase despre legăturile lui cu ce sunt de fapt.

**Pe teren**, specialiștii din V7 au acum și un organ de **risc de stâncă**. Un specialist care a recunoscut singur o lume „tot-sau-nimic” (ziduri și coridoare) planifică cu riscul de a fi blocat, nu cu „noroi”.

## Interfața

- Lumea: relief, rețea, labirint cu bucle, labirint. În stânga: creierul V8 sau creierele tale V7/V6 (doar pe teren).
- Pe rețea: legăturile văzute sunt pline, cele imaginate punctate (mai închise = mai sigur că sunt deschise). Culoarea nodului e faza dansului, aura portocalie e unda țintei. Sub hartă: cât de în fază sunt nodurile și la câte a ajuns unda.
- Test pe 80 de lumi noi (20 din fiecare tip), cu creierele tale V6 și V7 incluse pe teren.
- Ce a învățat: imaginația pe parcursul vieții pentru fiecare tip de lume, tipurile de lumi descoperite plus organul de rețea, toată viața și toate testele.

Detalii și cifre: [REPORT.md](./REPORT.md).
