# V16 — raport măsurat

**Configurație**
- Bucla: 4 niveluri × 16 unități (α, 2, 3, Ω, cu Ω vecin cu α).
- Observația: fereastra 3×3 de concepte, direcția spre țintă, ultima acțiune și dacă s-a mișcat.
- Antrenarea: drumurile optime ale profesorului, toate acceptate. Profesorul există doar la antrenare.
- Evaluarea: 100 de labirinturi nevăzute, de mărime 7, 9 și 11.

## 5000 de episoade (`node bench.mjs 5000 <seed>`)

| seed | A+B rezolvate | A+B pași/optim | martor rezolvate | martor pași/optim |
|---|---|---|---|---|
| 7 | 92% | 1.35 | 95% | 1.30 |
| 8 | 93% | 1.33 | 93% | 1.39 |
| 9 | 97% | 1.26 | 98% | 1.30 |

Forma lui B la pasul 0, adică ce parte din primele 6 mișcări prezise sunt corecte, este ≈ 0.55–0.57. Martorul are aceeași valoare.

## Concluzie

Ambele organisme învață repede să rezolve labirinturi pe care nu le-au văzut. După aproximativ 100 de episoade rezolvă deja în jur de 50%, iar după 5000 rezolvă peste 90%.

**A și B nu dau un avantaj clar față de martor.** Diferențele sunt în zgomotul dintre seed-uri. Într-o rulare scurtă, în pagină (1352 de episoade), A+B a rezolvat 97% față de 90% pentru martor. Și aceea e o singură măsurătoare pe 30 de labirinturi, deci nu e dovadă.

V16 le face vizibile: se vede ce face fiecare și unde se activează. Nu demonstrează încă că A și B îmbunătățesc rezultatul.
