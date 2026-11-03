# MagicPerspective V11 — Portalul

V11 e un singur abstract network persistent care trăiește nouă lumi diferite. Înainte de prima acțiune, în fiecare lume, ghicește forma soluției.

V11 continuă V10 și implementează și cele 12 mesaje păstrate în `verbatim/`. Fiecare cerință e legată de citatul ei exact în `VERBATIM_MAP.md`. Cifrele măsurate sunt în `REPORT.md`.

## Pornire

**Windows cu placă NVIDIA (CUDA)**, din PowerShell, în clona ta (de exemplu `D:\MagicPerspective`):

```powershell
cd D:\MagicPerspective
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\v11\START_V11_CUDA.ps1
```

- **Prima pornire:** scriptul creează `v11\.venv` și instalează PyTorch cu CUDA și NumPy.
- **Verificare:** rulează `selftest.py`, care compară pe GPU calculul și gradienții cu varianta de referință NumPy. Apoi pornește serverul.
- **Dacă CUDA nu merge,** scrie de ce și pornește pe CPU.
- **Date în altă parte:** adaugă `-Data D:\training\v11`.

**Termux (CPU):**

```
git pull
bash v11/run-termux.sh
```

Deschizi apoi http://127.0.0.1:3047. V11 are portul, datele și creierul lui (`v11/data/`). Celelalte versiuni rămân neatinse.

## Ce vezi

- **Portalul:** graful viu. În centru e nucleul persistent: câte un nod pentru fiecare etichetă din toate lumile trăite. În jurul lui sunt nodurile exercițiului curent. Auriul e forma soluției. Nodurile se aprind în ordinea reală în care le schimbă rețeaua. Cometa cyan e decizia. Unda roșie e locul unde lumea a contrazis predicția. Butonul „4D” arată axa timpului.
- **Lumea reală:** ce vede numai profesorul. Traseele optime sunt verzi, linia prezisă e aurie, drumul mers e gri.
- **Antrenare:** bifezi lumile. Sliderul alege câte lumi unice rulează în paralel. Martorul are aceeași rețea, dar fără organul formei. Fiecare lume trăită intră în registrul de lumi unice.
- **Polymath:** graful care rămâne de la o lume la alta, cu punțile dintre lumi pe care rețeaua le-a făcut asemănătoare.
- **Testele decisive:** aceleași lumi nevăzute pentru organism și pentru toți martorii.

## Din linia de comandă

```
cd v11
python -m unittest discover -s tests -v
python bench.py --families maze2d,maze3d,dynamic,graph,sat,symbols,car,text,voter --episodes 2700 --parallel 4 --count 16
python transfer.py specialists --episodes 300
python selftest.py --device cuda
```
