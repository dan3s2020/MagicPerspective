# MagicPerspective V10

Organul formei soluției, construit de la zero numai din conversația Verbatim.

- `SPEC.md` leagă fiecare cerință de mesajul din care vine.
- `REPORT.md` are cifrele măsurate: ce trece și ce nu.

## Pornire în Termux

```
git pull
bash v10/run-termux.sh        # http://127.0.0.1:3046
```

V10 e separat de celelalte versiuni: are portul 3046 și creierul în `v10/data/brain.json`.

## În aplicație

- **Lumea reală**: harta și toate traseele optime. Doar profesorul le vede.
- **Perspectiva organismului**: ce a descoperit cu fereastra 3×3, norul formei, linia prezisă acum și cea prezisă la pasul 0.
- **Geometria internă**: locurile așezate după starea latentă a organului (MDS).
- **Învățare**: curriculum de la labirint 7×7 la 9×9, apoi graf de stări și constrângeri 3-SAT, intercalate ca să nu uite. Pentru rezultate reale ai nevoie de minimum 2000 de episoade.
- **Testele decisive D1–D5**: pe lumi nevăzute, comparate cu aceeași rețea fără organul formei, cu un organ neantrenat, cu navigarea clasică și cu linia dreaptă.

## Din linia de comandă

```
cd v10 && npm test
node scripts-bench.mjs 1500 7 7 48 7,9
node scripts-transfer.mjs 1500 150 7 1
```
