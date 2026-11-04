# MagicPerspective V16 — Țesătura vie

Graful este viu și animat. În stânga se vede țesătura, iar în dreapta labirintul. Pe măsură ce A merge prin labirint, graful se aprinde pentru fiecare acțiune.

## Ce vezi în graf

Fiecare element are culoarea și animația lui. Toate vin din ce a învățat organismul:

- **Lumea** apare ca 9 pătrățele: fereastra 3×3 din jurul lui A. Fiecare pătrățel e legat de conceptul lui: *liber*, *perete* sau *în afară*.
- **Ținta** este o stea verde care pulsează. E legată de unitățile din α care o simt cel mai tare.
- **Bucla de niveluri α → 2 → 3 → Ω** are 4 × 16 unități, iar Ω e vecin cu α. Legăturile dintre unități sunt cele mai puternice ponderi învățate. Particulele albe sunt mesajele care circulă pe buclă.
- **A** (roșu) stă lângă α și primește particule roșii din α. Când se lovește de un perete sau e surprins de ce s-a întâmplat, pleacă o undă roșie de rezistență, care se întoarce în α.
- **B** (auriu) stă lângă Ω și citește Ω. Razele aurii arată perspectiva lui, adică cât din fiecare nivel îl lasă pe A să vadă. Tot B ține forma drumului: următoarele 6 mișcări, desenate cu linie aurie întreruptă în labirint.
- **Acțiunile** ↑ → ↓ ← sunt noduri care cresc după probabilitate. Acțiunea aleasă trimite o cometă.

**Cum se mișcă nodurile.** Fiecare legătură e un arc: cu cât ponderea e mai mare, cu atât arcul e mai scurt. Nodurile prea apropiate se resping, iar nodurile active în același pas se atrag. Așa se adună insula activă. Poți trage orice nod cu mouse-ul. Legăturile se recitesc din ponderi la fiecare câțiva pași, așa că graful se reorganizează pe măsură ce organismul învață.

**Antrenarea** pornește din pagină, cu butonul *Pornește antrenarea*. A+B și martorul (aceeași buclă, fără corpurile A și B) învață pe exact aceleași labirinturi unice.

## Pornire

Windows, din D:\:

```
cd D:\MagicPerspective ; git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\v16\START_V16.ps1
```

Termux:

```
cd ~/MagicPerspective && git pull && bash v16/run-termux.sh
```

Adresa este http://127.0.0.1:3051. Versiunea e izolată: folder propriu, port 3051 și nicio dată pe disc.

## Fișiere

- `web/autograd.mjs`: diferențiere automată scrisă de mână, verificată numeric de `tests/gradcheck.mjs`.
- `web/engine.mjs`: lumea (labirinturile), organismul (bucla, A, B, martorul) și evaluarea.
- `web/app.js`: graful viu și labirintul.
- `bench.mjs`: comparația serioasă. `npm test` rulează testele.
