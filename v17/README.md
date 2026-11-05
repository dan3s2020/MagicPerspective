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

Prima rulare creează `v17\transcend\torus-aether\gpu\.venv` și instalează PyTorch cu CUDA (`-Cuda cu124` implicit). Apoi rulează un self-test pe placă. Toate setările se pot schimba și din pagină.

### Alte opțiuni

- `-Resume`: fiecare creier continuă din save-ul lui (`runtime-devour\brains`).
- `-Data D:\training\OpenThoughts3-1.2M`: implicit.

## Teste

```powershell
cd D:\MagicPerspective\v17
node --test tests/*.test.mjs
```

Rezultatele și metodele sunt în `docs/TORUS_AETHER_ABC_20261104.md`.
