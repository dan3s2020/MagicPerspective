# MagicPerspective V10 — raport cu numere

V10 e construit de la zero numai din `SPEC.md`, adică din frazele conversației Verbatim (mesajele 1–56). Nu conține orizont, specialiști, dans, vise sau democrație din V6–V9.

Toate cifrele de mai jos sunt măsurate pe lumi pe care organismul nu le-a văzut la antrenare. La test profesorul nu dă niciun semnal, doar notează. Le reproduci cu:

```
node scripts-bench.mjs 1500 7 <seed> 48 7,9      # D1–D3: labirint 7×7 la antrenare, test pe 7×7 și 9×9
node scripts-transfer.mjs 1500 150 <seed> [1]    # D5: transfer labirint → graf → SAT (1 = continuă să trăiască și în labirinturi)
```

## O corectură de măsurare, făcută înainte de cifre

Profesorul notează forma pe toate celulele pe care organismul nu știe că sunt ziduri, inclusiv pe zidurile pe care nu le-a văzut încă. Pe acolo forma nu are voie să treacă.

Evaluarea veche număra doar celulele libere din harta reală, deci altă mulțime decât cea pe care învăța. Acum antrenarea și testul folosesc aceeași mulțime, pentru toți concurenții.

## D1 — forma înainte de prima mișcare

Labirinturi noi, 48 de lumi, două semințe:

| | eroarea formei la pasul 0 (mai mic = mai bine) | F1 al liniei prezise |
|---|---|---|
| **organul formei** | **0,37 / 0,43** | 0,55 / 0,49 |
| aceeași rețea, învățată doar pasul următor | 0,90 / 0,57 | 0,22 / 0,31 |
| organ neantrenat | 0,82 / 0,76 | 0,29 / 0,24 |
| linie dreaptă spre țintă | 0,53 | 0,52 |
| probabilitate constantă | 0,54 | 0,25 |
| navigare clasică (necunoscutul = liber) | 0,78 | 0,52 |

D1 trece pe eroarea formei: organul bate toate referințele, pe ambele semințe.

Ce nu e încă bine: linia completă prezisă la pasul 0 ajunge la țintă doar în 2–6% din lumi. Norul formei e bun; linia trasă din el se rupe în zona necunoscută.

## D3 — corecția prin rezistență

Eroarea formei pe parcursul drumului, la 0% / 25% / 50% / 75%:

- sămânța 7: 0,37 → 0,31 → 0,22 → 0,14
- sămânța 8: 0,43 → 0,36 → 0,33 → 0,23

Controlul „doar pasul următor” rămâne în jur de 0,9 / 0,55 tot drumul. D3 trece.

## D2 — ajută forma la mers?

Pași / drumul optim:

| | sămânța 7 | sămânța 8 |
|---|---|---|
| organul formei | 1,23 | 1,43 |
| aceeași rețea, doar pasul următor | 1,26 | 1,34 |
| navigare clasică | 1,20 | 1,20 |

La 3000 de episoade: organ 1,19 / 1,20 față de control 1,18 / 1,17. **D2 nu trece:** organismul cu forma nu merge încă mai bine decât aceeași rețea fără forma soluției.

## D5 — transfer cu același organism, fără resetare

Veteranul are 1500 de labirinturi în spate. Organismul nou pornește de la zero. Ambii primesc aceleași episoade în lumea nouă.

| eroarea formei la pasul 0 | veteran, 0 episoade | nou, 0 episoade | veteran, 150 | nou, 150 |
|---|---|---|---|---|
| SAT (sămânța 7 / 8) | **0,44 / 0,48** | 0,62 / 0,66 | 0,30 / 0,30 | 0,30 / 0,31 |
| graf de stări (7 / 8) | 0,55 / 0,66 | 0,57 / 0,62 | 0,23 / 0,22 | 0,23 / 0,23 |

Ce arată tabelul:

- Pe constrângeri, ce a învățat în labirinturi se transferă din prima, fără niciun episod.
- Pe graf, transferul e neutru.
- După 150 de episoade, cei doi ajung la fel.

**Uitarea.** Dacă după labirinturi trăiește numai în graf și SAT, își strică labirinturile: eroarea crește de la 0,35 la 0,55 și F1 scade de la 0,59 la 0,37.

Dacă trăiește în continuare și în labirinturi (`mix=1`, și așa face acum și curriculumul din aplicație), pierde puțin: eroarea ajunge la 0,39 și F1 la 0,52. Pe graf și SAT rezultatele rămân aceleași.

## Navigarea pe graf și SAT

După 150 de episoade, organismul se mișcă urmând forma prezisă.

| pași / optim | organul formei | navigare clasică |
|---|---|---|
| graf | 1,65–1,81 | 1,74 |
| SAT | 1,31–1,36 | 1,13 |

Pe graf e la egalitate cu clasicul. Pe SAT pierde.

## Ce rămâne de rezolvat

1. D2: forma trebuie să facă diferența la mers, față de aceeași rețea fără organul formei.
2. Linia completă de la pasul 0 trebuie să ajungă la țintă (acum 2–6%).
3. Navigarea pe SAT trebuie să bată clasicul.
4. D4 (13×13) și lumea cu uși care se mișcă singure sunt măsurate doar în aplicație, după antrenarea de acolo. Le trec aici cu cifre după o antrenare lungă.
