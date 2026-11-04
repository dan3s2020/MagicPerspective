# MagicPerspective V13 — Bucla perspectivei

O versiune izolată, construită pe ideea din discuția din 4 noiembrie 2026.

- **A, B și C sunt trei forme de perspectivă.**
- **Geometria torului le lasă să-și mute perspectiva** mai sus sau mai jos: de la Ω, cea mai mare, până la α, cea mai mică.
- **Perspectiva e o buclă:** α își continuă drumul direct în Ω.

Ce s-a măsurat, ce merge și ce nu: `REPORT.md`.

## Pornire

```
git pull
bash v13/run-termux.sh                                                   # Termux
powershell -NoProfile -ExecutionPolicy Bypass -File .\v13\START_V13.ps1   # Windows
```

Pagina se deschide la http://127.0.0.1:3048. Totul rulează în browser, fără dependențe. V13 are portul și fișierele lui; celelalte versiuni rămân neatinse.

## Ce e pe ecran

**Torul.**
- **Scara perspectivei.** Cercul mic al torului e scara de perspective: Ω (cuvinte) pe ecuatorul exterior, apoi 6, 4, 3 și 2 caractere pe partea de sus, iar α (1 caracter) în gât.
- **Întoarcerea directă.** Partea de jos e drumul direct de la α înapoi în Ω.
- **Organismele.** Fiecare meridian e un organism: A, B, C, L (bucla), L tăiată, L înghețată și amestecul liber.
- **Punctul și urma.** Punctul colorat de pe meridian arată de unde privește organismul acum, iar urma arată pe unde s-a mișcat.
- **Greșelile.** Inelul roșu apare când organismul a ghicit greșit caracterul.
- **Nivelurile.** Inelele aurii sunt nivelurile; strălucesc după cât de bine merg acum.
- **Gâtul.** Se luminează când bucla trece direct între α și Ω.

**În dreapta:**
- fluxul de text (conversația Verbatim din acest repo);
- ce ghicește fiecare organism pentru caracterul următor;
- fiabilitatea fiecărui nivel;
- biți pe caracter la antrenare și la test, cu curba lor;
- verdictele măsurate.

## Din linia de comandă

```
cd v13
npm test                   # 5 teste
node bench.mjs 0 grad      # bucla lentă, prima împărțire a textului
node bench.mjs 0.5 grad    # a doua împărțire
node bench.mjs 0 pull      # bucla rapidă
```
