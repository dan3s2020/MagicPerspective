# MagicPerspective V17 — Torus-Aether

Un singur creier, care pornește gol și învață mai multe lumi: text (OpenThoughts), labirintele V16 date ca exercițiu întreg, fără nicio explicație, și lumea transformărilor (obiecte, plăci, pârghii, uși). Graful se vede în NestView, cu zoom fractal fluid.

Totul e în acest folder, izolat de v16 și de restul repo-ului. `transcend/epistemic-text/engine.mjs` este fișierul canonic, copiat neschimbat (un test verifică asta byte cu byte).

## Pornire (Windows, din clona repo-ului)

```powershell
cd D:\MagicPerspective
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 4 -Arms stable+many -Mem 3 -Worlds text,maze,transform
```

Pagina se deschide la http://127.0.0.1:8841/. De acolo ai, pentru fiecare graf, start, pauză, save, reset și remove, plus scor pe fiecare lume și setările GPU.

### Pe placa video (CUDA): un creier, multe lumi odată

```powershell
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 1 -Arms stable+many -Worlds maze,transform -Gpu cuda:0 -GpuWorlds 4096 -Vram 6 -GpuUtil 80
```

- `-GpuWorlds`: câte lumi rulează în paralel. Nu există o limită hardcodată.
- `-Vram`: câți GB are voie să încarce.
- `-GpuUtil`: ce procent din GPU folosește.

Prima rulare creează `v17\transcend\torus-aether\gpu\.venv` și instalează PyTorch cu CUDA (`-Cuda cu126` implicit; `-PythonExe` dacă vrei alt Python 3.10–3.12). Apoi rulează un self-test pe placă. Toate setările se pot schimba și din pagină.

### Alte opțiuni

- `-Resume`: fiecare creier continuă din save-ul lui (`runtime-devour\brains`).
- `-Data D:\training\OpenThoughts3-1.2M`: implicit.

## Teste

```powershell
cd D:\MagicPerspective\v17
node --test tests/*.test.mjs
```

Rezultatele și metodele sunt în `docs/TORUS_AETHER_ABC_20261104.md`.

## V41: profil CUDA exact și UI live de viteză

Pentru RTX 3050 Ti 4 GB, profilul verificat care continuă checkpointul original
fără să schimbe arhitectura sau ordinea învățării este:

```powershell
powershell -ExecutionPolicy Bypass -File .\v17\START_V41_SPEED_PROFILE.ps1
```

Launcherul deschide PowerShell-ul trainerului și UI-ul la
`http://127.0.0.1:8952/`. În `04 / CONTROL LIVE` sunt afișate separat viteza
ultimului lot complet, viteza fazei CUDA TextCard și viteza susținută
end-to-end. `Caractere / chunk CUDA` este aplicat la frontiera următorului lot;
valoarea verificată pe placa de mai sus este `4096`, cu reducere automată numai
la un OOM real.

Instrucțiunile complete, rezultatele măsurate și regenerarea kernelului Windows
sunt în [`docs/CUDA_SPEED_V41.md`](docs/CUDA_SPEED_V41.md). Invariantele care
interzic regresia de învățare sunt în
[`docs/CUDA_PORT_INVARIANTS.md`](docs/CUDA_PORT_INVARIANTS.md).


## Experimental: unified real-world transformation learner (isolated)

Branch `feature/V17-UNIFIED-LIVING-PERSPECTIVE-20261106` preserves this V17 trainer and its NestView while adding a common PyTorch state-transition learner, observed maze/transform/text interventions and a frozen held-out evaluation panel. For a separate checkout on Windows, start `v17/START_V17_UNIFIED.ps1` (port 8862, separate run directory) and read `v17/docs/UNIFIED_LIVING_PERSPECTIVE_20261106.md`. The extra model has not demonstrated natural-language semantics, universal transfer or device-level CUDA behavior on the user's GPU; do not equate it with the original maze 100% evaluator.
