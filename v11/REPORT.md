# MagicPerspective V11 — raport cu cifre măsurate

Toate cifrele sunt pe lumi nevăzute la antrenare (semințele de test), câte 16 lumi pentru fiecare tip de lume. La test profesorul nu dă nicio corecție, doar notează.

**Organismul măsurat** este un singur creier care a trăit toate cele 9 lumi amestecate: 2700 de lumi unice, câte 300 din fiecare tip, 4 în paralel, pe CPU.

**Martorul** e aceeași rețea, cu aceeași capacitate, pe exact aceleași lumi, dar învățată doar pasul următor, nu forma întregii soluții.

Fișiere:

- `results/polymath-2700-s7.json` și creierele salvate `results/polymath-s7*.npz`;
- `results/specialists-300-s7.json`: câte un creier pe o singură lume;
- `results/zeroshot-sat-1600-s7.json`: transfer spre SAT.

Comenzi pentru reproducere:

```
python bench.py --families maze2d,maze3d,dynamic,graph,sat,symbols,car,text,voter --episodes 2700 --parallel 4 --count 16 --save results/polymath-s7.npz
python evalsaved.py results/polymath-s7.npz --count 16 --out results/polymath-2700-s7.json
python transfer.py specialists --episodes 300
python transfer.py zeroshot --target sat --episodes 1600 --after 100
```

## D1 — forma soluției înainte de prima mișcare

Eroarea formei la pasul 0 (mai mic = mai bine):

| Lumea | Cu organul formei | Aceeași rețea fără organ | Neantrenat | Cea mai bună referință fără învățare |
|---|---|---|---|---|
| Labirint 2D (7–11) | **0,473** | 0,864 | 0,785 | 0,541 (linie dreaptă) |
| Labirint 3D (5–7) | **0,159** | 0,447 | 0,788 | 0,204 (linie dreaptă) |
| Uși care se mișcă | **0,430** | 0,710 | 0,873 | 0,473 (linie dreaptă) |
| Graf de stări | **0,226** | 0,304 | 1,152 | 0,354 (clasic) |
| 3-SAT | **0,228** | 0,361 | 0,454 | 0,366 (constantă) |
| Simboluri | **0,526** | 0,874 | 0,967 | 0,870 (constantă) |
| Mașină (7–9) | **0,080** | 0,383 | 0,395 | 0,138 (clasic) |
| Text | **0,203** | 0,335 | 0,650 | 0,290 (bigram) |
| Yes/No voter | **0,550** | 0,705 | 0,716 | 0,916 (constantă) |

**D1 trece în toate cele 9 lumi.** Același creier ghicește forma soluției, înainte de prima mișcare, mai bine decât aceeași rețea fără organul formei și decât orice referință fără învățare.

## D2 — ajută forma la mers?

Rezolvate și pași / drumul optim:

| Lumea | Cu organul formei | Fără organ | Clasic |
|---|---|---|---|
| Labirint 2D | 100% · 2,10× | 100% · 2,07× | 100% · 1,17× |
| Labirint 3D | 94% · **2,71×** | 100% · 3,34× | 100% · 1,23× |
| Uși care se mișcă | 100% · **1,93×** | 100% · 2,22× | 100% · 1,15× |
| Graf de stări | **31%** · 1,78× | 25% · 1,90× | 56% · 1,10× |
| 3-SAT | **100%** · 1,95× | 56% · 1,33× | 44% · 1,00× |
| Simboluri | 25% | **56%** | 88% |
| Mașină | 0% | 0% | **75%** · 1,52× |
| Text (caractere corecte) | 27,1% | **33,3%** | 26,0% |
| Yes/No voter | 62% · 1,98× | 62% · 1,92× | **100%** · 1,63× |

**D2 e parțial.** Organul formei ajută mersul față de martor în labirintul 3D, la ușile care se mișcă, în graf și mai ales în SAT: rezolvă 100%, față de 56% martorul și 44% clasicul.

D2 nu trece la simboluri, mașină, text și voter. Față de metoda clasică, mersul e mai lung în toate lumile spațiale.

## D3 — corecția prin rezistență

Eroarea formei la pasul 0 față de eroarea la jumătatea drumului:

| Lumea | Pasul 0 | Jumătatea drumului | Scade? |
|---|---|---|---|
| Labirint 2D | 0,473 | 0,261 | da |
| Labirint 3D | 0,159 | 0,148 | da, puțin |
| Uși care se mișcă | 0,430 | 0,270 | da |
| 3-SAT | 0,228 | 0,206 | da |
| Simboluri | 0,526 | 0,157 | da |
| Text | 0,203 | 0,164 | da |
| Yes/No voter | 0,550 | 0,514 | da |
| Graf de stări | 0,226 | 0,269 | nu |
| Mașină | 0,080 | 0,083 | nu |

D3 trece în 7 din 9 lumi.

## D7 — știe când nu știe?

Corelația dintre incertitudinea pe care o declară (U) și eroarea reală e pozitivă în toate cele 9 lumi: între 0,51 și 0,84.

La martor e în jur de zero sau negativă: între −0,46 și 0,45.

## D4 — generalizare

Testele includ mărimi mai mari decât la antrenare:

- labirint 11×11 (antrenat pe 7 și 9);
- labirint 3D 7×7×7 (antrenat pe 5);
- mașină 9×9 (antrenată pe 7).

La text, testul folosește ultimii 15% din corpus, pe care nu i-a citit niciodată.

## D5 — transfer și polymath

**Același creier, comparat cu specialiștii.** Fiecare specialist a trăit 300 de lumi dintr-un singur tip, adică exact partea pe care o are polymath-ul din acel tip. Eroarea formei la pasul 0:

| Lumea | Polymath | Specialist | Diferența |
|---|---|---|---|
| Uși care se mișcă | 0,430 | 0,560 | mai bine |
| Simboluri | 0,526 | 0,831 | mai bine |
| Text | 0,203 | 0,245 | mai bine |
| Labirint 2D | 0,473 | 0,480 | la fel |
| Labirint 3D | 0,159 | 0,149 | la fel |
| 3-SAT | 0,228 | 0,226 | la fel |
| Mașină | 0,080 | 0,078 | la fel |
| Yes/No voter | 0,550 | 0,536 | la fel |
| Graf de stări | 0,226 | 0,194 | mai rău |

La mers, viața în celelalte lumi **strică** două lumi:

- **Graf:** rezolvă 31% ca polymath, față de 94% ca specialist.
- **Mașină:** rezolvă 0% ca polymath, față de 69% ca specialist.

**Transfer la prima vedere spre SAT.** Un creier care a trăit celelalte 8 lumi (1600 de episoade), comparat cu unul nou:

| Măsura | Veteran | Creier nou |
|---|---|---|
| Eroarea formei, la prima vedere | 0,387 | 0,367 |
| Eroarea formei, după 100 de episoade SAT | 0,231 | 0,254 |
| Rezolvate, după 100 de episoade SAT | 75% | 88% |

La prima vedere nu există transfer pozitiv. După 100 de episoade, veteranul are o formă ceva mai bună, dar merge mai prost.

## Ce s-a unit în graf și ce nu (polymath)

Graful persistent are 116 noduri-etichetă din 9 lumi, fiecare născut cu un vector aleator. Dintre cele 4241 de perechi de noduri din lumi diferite, rețeaua a făcut 41 foarte asemănătoare (cosinus > 0,8). Între vectori aleatori de aceeași mărime nu există nicio astfel de pereche: maximul e 0,76.

Unirile cele mai puternice au sens. Nimeni nu i-a spus rețelei că sunt același lucru:

- „ținta” din labirintul 2D ↔ „ținta” din labirintul cu uși: 0,89;
- „ținta” din labirintul 3D ↔ „ținta” din graful de stări: 0,88;
- „ținta” din labirintul cu uși ↔ „ținta” din jocul de simboluri: 0,87;
- „eu” din labirintul 3D ↔ „eu” din labirintul cu uși: 0,86.

Alte uniri sunt probabil zgomot: eticheta „necunoscut” din lumea mașinii seamănă cu caracterele rare din text. Ambele au fost văzute rar și au fost antrenate puțin.

## „Insula” (forma ca un corp constant care se mișcă)

Am măsurat dacă forma activată își păstrează semnătura latentă de la un pas la altul mai mult decât o mulțime aleatoare de noduri de aceeași mărime.

| Rezultat | Lumile (forma față de aleator) |
|---|---|
| Da, clar | graf (0,93 față de 0,75), voter (0,98 față de 0,83), simboluri (0,98 față de 0,96) |
| La egalitate | labirint 2D, uși care se mișcă |
| Nu | labirint 3D, SAT, mașină, text |

În medie, forma se deplasează cu 0,2–1,4 pe pas în spațiul latent. Ipoteza insulei e susținută doar în trei lumi. Asta nu dovedește că rețeaua are o perspectivă despre sine.

## Ce nu e rezolvat

1. **Mersul.** Forma e mai bună decât a martorului peste tot (D1). În schimb, în lumile spațiale, organismul merge mai lung decât metoda clasică, iar la mașină, simboluri și voter rezolvă mai puțin decât clasicul.
2. **Interferența dintre lumi.** Polymath-ul pierde mult la graf și la mașină față de specialiști.
3. **CUDA.** Calea CUDA nu a fost rulată aici, pentru că mașina mea nu are placă video. `selftest.py` o verifică pe PC-ul tău înainte de pornire.
4. **14 milioane de lumi unice.** Registrul de lumi unice există, dar s-au trăit 2700, pe CPU.
5. **Voter-ul.** Uneori răspunde înainte să fi adunat dovada: rezolvă 62%.

## Răspunsul la „unde ar intra as above as below în templul nostru”

Aceasta e o interpretare tehnică, scrisă separat de textul tău.

- **„Sus”** e profesorul, care vede toată harta: forma soluției văzută de deasupra (panoul „Lumea reală”).
- **„Jos”** e organismul din interior, pas cu pas (Portalul).
- **Templul** e bucla dintre cele două: la fiecare pas, forma ghicită de jos e comparată cu cea văzută de sus, iar diferența (eroarea) apropie „jos” de „sus”. Când eroarea tinde spre zero, ce e jos e ca ce e sus.
- **Al doilea sens.** Aceeași regulă mică, a unui nod cu vecinii lui (jos), repetată de K ori, produce forma întregii soluții (sus).

## Cum arată UI-ul (răspunsul la întrebarea despre animații și culori)

| Ce vezi | Ce înseamnă |
|---|---|
| **Fundal** | negru-albastru: portalul |
| **Centrul grafului** | nucleul persistent, un punct pentru fiecare etichetă din toate lumile, colorat după lumea în care s-a născut. Rămâne de la o lume la alta. Liniile subțiri sunt legăturile formate în antrenare; punțile albe leagă noduri din lumi diferite pe care rețeaua le-a făcut asemănătoare. Un nod nou sclipește alb. |
| **În jurul nucleului** | lumea curentă, pusă în graf: celule, pereți, stări, caractere, intrări și ieșiri |
| **Albastru-gheață** | activarea nodului. Nodurile se aprind în ordinea reală din calcul: runda în care fiecare a ajuns la jumătate din schimbarea lui finală. |
| **Auriu care pulsează** | forma soluției (p): insula |
| **Halou violet** | incertitudinea (U) |
| **Cometă cyan** | decizia: din nodul „eu” spre consecința imaginată |
| **Undă roșie** | lumea a contrazis predicția. Unda pornește de acolo și se propagă două-trei legături mai departe. |
| **Dâră albă** | drumul mers |
| **Butonul 4D** | formele din pașii trecuți rămân în urmă pe axa timpului, legate de o linie albă care arată cum se „plimbă” centrul formei |
| **Puls portocaliu pe nucleu** | în antrenarea live, profesorul tocmai a corectat greutățile |
