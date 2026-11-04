# V13 — raport

## Ce am construit

Lumea e un flux de text real: conversația Verbatim din acest repo, 83.544 de caractere. Toți ghicesc caracterul următor înainte să-l vadă, apoi lumea răspunde cu caracterul adevărat și toți învață. Ultimele 15% din text sunt partea de test.

**Perspectiva.** O perspectivă e o *scară* de privire spre trecut:

| Nivel | Cât vede |
|---|---|
| α | 1 caracter |
| 2, 3, 4, 6 | atâtea caractere |
| Ω | cuvinte: cuvântul anterior și cel care se scrie acum |

Fiecare nivel învață numărând ce a urmat după ce. Toți organismele trăiesc același flux și au exact aceleași memorii de niveluri. Se deosebesc **doar** prin felul în care își aleg și își mută perspectiva. Așa se măsoară chiar perspectiva, nu altceva.

**Organismele:**

| Organism | Ce face |
|---|---|
| **A** | doar α, ca celulele independente din A/B/C Text Discovery |
| **B** | scara fixă α → Ω₁ → Ω₂ (1, 2, 3 caractere): structura e fixă, ponderile sunt învățate, într-o singură direcție |
| **C** | constructorul de perspective din A/B/C Text Discovery: la fiecare 28 de caractere alege nivelul care a mers cel mai bine pe validarea lui internă recentă |
| **L, bucla** | are o poziție a perspectivei θ pe un inel de niveluri α … Ω, în care α și Ω sunt vecine. După fiecare caracter, răspunsul lumii dă fiecărui nivel rezistența lui. Rezultatul reintră în buclă și îndoaie θ spre scările care merg acum. Predicția e vederea din jurul lui θ. |
| **L tăiată** | la fel, dar inelul e tăiat într-o linie: α nu mai continuă în Ω |
| **L înghețată** | aceeași vedere, dar θ nu se mișcă; e cea mai bună poziție fixă, aleasă doar pe antrenare |
| **amestec liber** | referință: amestec adaptiv al tuturor nivelurilor, fără geometrie |

## Rezultate

Biți pe caracter pe partea de test (mai puțin = mai bine), pe două împărțiri diferite ale aceluiași text (`results/bench-*.json`). Bucla lentă e varianta implicită (σ = 1, η = 0,05).

| Organism | Împărțirea 1 | Împărțirea 2 |
|---|---|---|
| A | 4,072 | 3,652 |
| B | 2,808 | 2,032 |
| C | 3,005 | 2,043 |
| **L, bucla lentă** | **2,601** | **1,808** |
| L tăiată | 2,605 | 1,806 |
| L înghețată | 2,607 | 1,828 |
| amestec liber | 2,629 | 1,815 |
| L, bucla rapidă | 2,659 | 1,841 |
| L tăiată, rapidă | 2,635 | 1,827 |

**Ce reiese:**

1. **Bucla bate formele A, B și C pe ambele împărțiri:** 7% mai puțini biți decât B la prima împărțire, 11% la a doua. A, B și C sunt fiecare câte o singură formă de perspectivă. L se mișcă între forme.
2. **Mutarea perspectivei ajută, dar puțin.** L bate L înghețată pe ambele împărțiri: 2,601 față de 2,607 și 1,808 față de 1,828.
3. **„α continuă direct în Ω” nu are un efect sigur la text.**
   - **Bucla lentă:** e puțin mai bună decât linia tăiată pe prima împărțire și puțin mai slabă pe a doua. În plus, θ nici nu trece prin gât (0 treceri).
   - **Bucla rapidă:** trece prin gât de sute de ori (466 și 436 de treceri) și iese **mai slabă** decât linia tăiată și decât L înghețată. La prezicerea textului, săritul direct de la α la Ω strică.

## Ce nu e dovedit

- Ideea buclei α → Ω e implementată și se vede pe tor, dar **nu a dat un câștig măsurabil la text**. Poate ajuta într-o lume în care scara cea mai mică și cea mai mare chiar sunt vecine ca sens: de exemplu, celulele și organismul întreg din Octopus. Asta rămâne de încercat.
- **Parametrii** (σ, η, γ) au fost aleși după o căutare pe aceleași date. A doua împărțire a textului și faptul că ordinea L față de A, B și C nu se schimbă la nicio setare reduc riscul ca rezultatul să fie noroc, dar nu-l elimină.
- **Câștigurile față de L înghețată** sunt mici: între 0,2% și 1%.
