# Braivour / MagicPerspective pe ADN — rezultate, importanță și potențialul antrenării

**Data:** 19 noiembrie 2026  
**Stare:** rezultate reale executate și confirmate în GitHub Actions; comparația directă cu AlphaGenome 2 **nu a fost realizată**.

## 1. Ce am realizat exact

Am folosit `Brain.live()` și `Brain.predict()` din organismul original V42, fără să-i înlocuim algoritmul cu un clasificator genomic. În timpul antrenării, organismul a primit ADN real plus clasa corectă; la evaluare, clasa a fost ascunsă. Problema a fost clasificarea unui segment de ADN de 60 de nucleotide în trei clase: exon-intron (EI), intron-exon (IE) și niciuna (N).

Datele provin din setul UCI Molecular Biology / Splice-junction Gene Sequences, cu 3.190 secvențe autentice. Experimentul documentat a folosit 900 secvențe la antrenare, 400 în dezvoltare și 197 secvențe suplimentare într-o confirmare cu configurația fixată anterior.

### Rezultatul final pe cele 197 de exemple

| Metodă | Acuratețe | F1 macro |
|---|---:|---:|
| **Organism V42, perspectivă de 4 nucleotide** | **77,66%** | **76,97%** |
| Control: clasa majoritară | 52,79% | 23,03% |
| Control: regula biologică GT/AG | **88,83%** | **87,44%** |
| Organismul cu regiunea centrală ADN amestecată | 42,13% | 29,65% |

Au fost corecte 153 dintre cele 197 de predicții. Organismul a depășit controlul clasei majoritare cu **24,87 puncte procentuale**, dar a rămas sub regula GT/AG cu **11,17 puncte procentuale**.

## 2. Ce este cu adevărat interesant

### A. Perspectiva a contat enorm

În prima variantă, toate cele 60 de nucleotide erau prezente în observație, dar ultimele simboluri înaintea deciziei nu conțineau informația relevantă. Organismul prezicea mereu aceeași clasă: 58,50% acuratețe și 24,61% F1 macro pe dezvoltare.

Am păstrat algoritmul și numărul de exemple, dar am reordonat observația astfel încât patru nucleotide din zona de joncțiune să intre direct în fereastra sa temporală activă. Acuratețea a urcat la 78,25%, iar F1 macro la 76,76%.

Asta susține că **forma și poziția informației în percepția organismului** pot modifica puternic învățarea. Nu dovedește încă descoperirea autonomă a perspectivei: poziția nucleotidelor a fost stabilită manual.

### B. Predicțiile s-au schimbat când am intervenit asupra ADN-ului

Am păstrat organismul antrenat și am amestecat nucleotidele centrale în intrările din test. Acuratețea a coborât de la 77,66% la 42,13%. Acesta este un control important: rezultatul nu poate fi atribuit doar predominanței clasei N.

Dar amestecarea poate distruge chiar motivele biologice GT/AG. Nu putem spune că organismul a descoperit reguli de biologie necunoscute.

### C. O perspectivă mai mare nu a însemnat automat un rezultat mai bun

Varianta cu opt nucleotide codificate în patru simboluri a avut 78,75% acuratețe de dezvoltare, puțin peste varianta cu patru nucleotide (78,25%), dar F1 macro a scăzut de la 76,76% la 66,18%. Este un avertisment real: un procent global mai bun poate ascunde degradarea unor clase.

### D. Avem o confirmare separată, nu doar un demo

Am ales varianta cu F1 macro mai bun înainte de a verifica cele 197 de exemple finale. Rezultatul de 77,66% a fost obținut după fixarea regulii de selecție. Totuși setul de date este mic și vechi, iar gruparea după prefixul identificatorului nu dovedește separare completă între familii de gene similare.

## 3. Ce ar putea aduce mai mult antrenament

**Ce avem:** 900 exemple folosite; 2.408 exemple unice eligibile în partiția de antrenare a aceluiași dataset.

**Ce putem testa:** dacă mai multe secvențe unice ajută la diferențierea claselor rare sau dacă organismul a atins deja o limită dată de fereastra sa scurtă de percepție. Nu avem încă o curbă de performanță în funcție de numărul de exemple, deci **nu știm** câte procente aduce antrenarea suplimentară.

Există trei direcții distincte:

1. **Mai multe exemple** — seria 75 / 150 / 300 / 600 / 900 / 1.200 / 1.800 / 2.408 exemple, pe mai multe semințe, pentru a identifica dacă limita este cantitatea de date. Se cere o nouă evaluare independentă, nu refolosirea celor 197 de exemple ca test „nevăzut”.
2. **Organismul descoperă singur unde să privească** — cea mai interesantă ipoteză. În loc să-i punem manual nucleotidele potrivite la finalul contextului, același Brain/Discoverer ar învăța prin acțiuni proprii să navigheze prin regiuni ADN și să aleagă perspectiva care conține informația relevantă.
3. **Predicția efectului unei mutații** — organismul primește secvența de referință, secvența modificată și condiția celulară, apoi prezice cum se schimbă un rezultat biologic măsurabil. Aceasta este o problemă mult mai apropiată de AlphaGenome 2 decât clasificarea GT/AG.

Mai mult antrenament poate aduce stabilitate și performanță, dar poate și accentua memorarea, dezechilibrul claselor sau dependența de patru nucleotide. **Nu există justificare pentru a estima acum 90%, 95% sau un nivel AlphaGenome 2.**

## 4. Ce ar putea însemna pentru cercetare, dacă vom reuși

- Un organism care **își descoperă singur perspectiva** ar transforma observația manuală actuală într-un mecanism adaptiv verificabil.
- Dacă aceeași memorie nativă ar fi utilă și pe o nouă problemă biologică, am putea investiga **transferul între lumi/sarcini**, nu doar reantrenarea de la zero.
- Dacă performanța s-ar menține pe sarcini dificile cu mult mai puține date și cost măsurat, am avea un argument solid privind **eficiența**, nu doar originalitatea arhitecturală.
- Dacă ar prezice efecte reale de mutații în diferite celule, am putea în sfârșit evalua organismul pe o sarcină apropiată de AlphaGenome 2.

Acestea sunt **ipoteze și oportunități**, nu rezultate deja obținute.

## 5. Ce am putea prezenta responsabil unei echipe precum DeepMind

Rezultatul interesant de prezentat nu este „am bătut AlphaGenome 2”. Este:

> Un organism computațional original, neschimbat, a fost aplicat pe ADN real. O schimbare controlată a perspectivei a crescut puternic performanța, iar confirmarea separată a arătat 77,66% acuratețe și 76,97% F1 macro. Dorim să investigăm dacă organismul poate învăța singur transformarea perspectivei și o poate transfera la predicția efectelor mutațiilor.

Acesta este un **punct de pornire verificabil**, nu dovada unei descoperiri revoluționare sau a superiorității față de AlphaGenome 2.

## 6. Ce rămâne neobținut

- Nu am rulat AlphaGenome 2 pe aceleași secvențe și sarcină.
- Nu am bătut nici controlul biologic simplu GT/AG.
- Nu există încă predicții de expresie genetică, efecte funcționale ale mutațiilor sau condiționare pe tipuri celulare.
- Nu am antrenat suplimentar cele 2.408 exemple într-o curbă de scalare.
- Nu am demonstrat că organismul își alege singur perspectiva.
- Nu am verificat transfer de inteligență din GGUF și nu am modificat proiectul Braivour original.

## 7. Fișierele verificabile

- [Rezultate experimentale și limitări](./RESULTS.md)
- [Rezultatul brut al confirmării](./results/confirmatory-untouched-real-uci.json)
- [Protocolul fixat înaintea confirmării](./CONFIRMATORY_PROTOCOL.md)
- [Explicația științifică detaliată](./SCIENTIFIC_SIGNIFICANCE_AND_HYPOTHESES.md)
- [Planul de antrenament și generalizare](./TRAINING_SCALE_AND_GENERALIZATION_PLAN.md)
- [Prezentarea scurtă pentru evaluare de cercetare](./DEEPMIND_RESEARCH_BRIEF.md)

Surse externe: [AlphaGenome 2 — Google DeepMind](https://deepmind.google/blog/alphagenome-2-deciphering-how-cells-read-dna-to-better-understand-disease/); [datasetul UCI](https://archive.ics.uci.edu/dataset/69/molecular+biology+splice+junction+gene+sequences).

**Statut final:** rezultat promițător de adaptare la observație, confirmat pe o sarcină modestă; descoperirea autonomă a perspectivei, avantajul din antrenare suplimentară și competiția cu AlphaGenome 2 rămân obiective deschise.
