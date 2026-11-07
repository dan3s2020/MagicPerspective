# V21 — blocaj vizibil la inceputul lotului CUDA: audit si corectie (2026-11-07)

## Cererea utilizatorului

> RAMANE MEREU BLOCAT LA INCEPUT

Aceasta observatie a urmat unui lot CUDA cu aproximativ 229.187 pozitii de text si progres `text CUDA: aliniere 0/229187`. Screenshotul original apartine conversatiei utilizatorului; nici imaginea, nici logul complet al RTX 3050 Ti nu sunt disponibile ca fisier binary aici.

**Regula:** Nu confundati progresul `0/N` cu lipsa datelor: inainte de primul callback CUDA exista mai multe etape CPU care nu erau instrumentate. In acelasi timp, un proces GPU poate deveni efectiv neproductiv; nu presupuneti ca un proces marcat `antreneaza` produce rezultate.

## Defect concret gasit in codul original

In `v17/transcend/torus-aether/gpu/text_gpu.py`:

```python
e[i - 1::-1][:L]
```

Aceasta operatie inverseaza **TOT** prefixul de lungime `i` si abia apoi pastreaza primii `L <= 64` caractere. Se executa repetat pentru fiecare pozitie de text atat in `TextCard.live()`, cat si in `TextCard._imagine()`, inainte de GPU. Pe un document cu `N` caractere, pregatirea contextelor poate acumula cost `O(N^2)` si milioane/miliarde de copii inutile, desi scopul este numai sa citeasca ultimele maximum 64 de simboluri.

S-a inlocuit **in ambele locuri** cu:

```python
e[i - L:i][::-1]
```

Ambele expresii sunt IDENTICE ca rezultat pentru `0 <= L <= min(i,64)`, inclusiv la limitele unei secvente. Noua expresie copiaza numai `L` caractere, `O(L)`, nu intregul prefix `O(i)`. Nu schimba exercitiul, textul, ordinea contextului, algoritmul de predicatie, variabilele trust, greutatile si nici datele held-out.

## A doua cauza pentru statusul apparent blocat la 0

Inaintea primului fragment CUDA, `TextCard._selfidx` trebuie sa construiasca de la zero suffix automaton pentru intregul exercitiu, atat pentru caractere, cat si pentru `form_of` (cifre reduse la simbolul DIG). Codul original lucra in CPU Python si **nu emitea niciun progres** in timp ce construia memoria.

Noul `_selfidx(exs,o,progress=None)` publica acum **numarul real de pozitii procesate** la fiecare 8.192 caractere, pentru ambele pasari (brut + forma), cat si la finalul fiecarei treceri, cu faza `self-index`. Nu modifica automatul suffix, dict-urile sau raspunsurile sale, nu incrementeaza procentul datasetului inainte de completarea lotului. Acest callback trece prin originalul stdout JSON -> Node GpuWorlds -> worker -> /graphs si apare in UI.

Faza `alignment` transmite de asemenea numarul real de pozitii incheiate la fiecare fragment CUDA. Heartbeat-ul Node afiseaza timpul scurs si avertizeaza cand peste 60 secunde nu s-a terminat niciun fragment; nu inventeaza caractere procesate.

## Validare

- `v17/tests/test_v21_context_window_parity.py`: compara vechiul si noul context pentru TOATE pozitiile unor texte scurte, 229.187 caractere aleatoare, contexte 1/4/6/16/48/64/128, si ambele puncte reale din `TextCard`.
- Testul benchmark din acelasi fisier utilizeaza un exercitiu de 170.000 caractere si ultimele 207 pozitii (aproximativ ultimii 20.000 caractere). Masoara timpul operatiilor CPU originale versus cele bounded, cu identitate exacta a contextului si fara a atribui acest ratio performantelor RTX-ului.
- Testul `test_full_exercise_self_index_reports_real_progress_before_first_cuda_chunk` compara rezultatul complet al SAM-ului vechi cu SAM-ul instrumentat si demonstreaza progresul monoton, plus faptul ca un text deja indexat nu este reindexat a doua oara.
- Testele existente `test_v21_cuda_suffix_bounds.py` si `test_v21_cuda_vote_parity.py` compara calculele GPU emulate cu referinta NumPy (testul cu stub pentru self-index a fost adaptat la parametrul optional `progress`).
- Teste V17/V19/V20/V21, Windows PowerShell 5.1, CI descoperiri istorice se executa in workflowul izolat V21.

**Limita:** un benchmark CPU al unei singure copii de context NU demonstreaza 100 exercitii complet antrenate/s pe RTX3050Ti. Antrenarea originala inca construieste doua suffix-arrays pentru intreaga memorie istorica dupa fiecare lot, lucru care creste in timp. Nici mentinerea permanenta a datelor si nici continuitatea pe 1,2M documente nu sunt demonstrate.

## Aplicare pe laptop si verificare

Nu rulati doua procese pe acelasi checkpoint. Salvati si confirmati mesajul de salvare din UI/terminal. Daca modelul este blocat la un lot in desfasurare, salvarea se poate amana pana la sfarsitul lotului; nu afirmati ca s-a salvat doar fiindca ati apasat butonul. Opriti antrenarea curentă (Ctrl+C), apoi:

```powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-V21-Aether-Veil"
if (-not (Test-Path -LiteralPath "$dest\.git")) { throw "V21 repo missing" }
git -C $dest pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "Git refused update; do NOT reset/clean local work" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$dest\v17\START_V21_AETHER_VEIL.ps1" `
  -Data "D:\training\OpenThoughts3-1.2M" `
  -Gpu "cuda:0" -GpuWorlds 32 -GpuTextBatch 2 -Vram 3 -IncludeCognitive -Resume
```

Deschideti `http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1`, Ctrl+F5, observati sub `Ce s-a nascut` faza `self-index`, `alignment` cu contoare reale, timpul de asteptare, apoi `imagination`, `indexing`. In `/graphs`, `graphs[0].gpu.batch` arata `phase`, `done`, `total`, `elapsedSeconds`, `waitingSeconds`. Procentul datasetului si exercitiile/s cresc numai dupa finalizarea unui lot complet, nu in timp ce construieste contextul unui lot.

**Verdict:** defectul de pregatire a contextului este confirmat in cod si corectat, cu teste de echivalenta. Blocajul real pe RTX-ul utilizatorului este inca supus masurarii; arhitectura suffix-index complet reconstituit ramane un cost separat.
