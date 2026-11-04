# MagicPerspective V15 — A și B în țesătură

Pornește din V14 și îl lasă neatins. Ce e nou:

- **Țesătura** e graful: singurul loc unde se învață reprezentarea lumii. Are 6 niveluri α … Ω legate în buclă și e aceeași pentru orice exemplu.
- **A**, organismul de jos, stă în α și **acționează**: alege byte-ul următor. Privește nivelurile prin perspectiva pe care i-o dă B. Rezistența lui (surpriza la ce a urmat de fapt) intră înapoi în α.
- **B**, organismul de sus, stă în Ω și **alege perspectiva**: prin ce niveluri privește A. Tot B **ține forma** întregului răspuns înainte de prima literă a lui A. Alegerea lui intră înapoi în Ω.
- **Legătura dintre ei.** A și B nu-și trimit nimic direct. Se întâlnesc doar prin țesătură: A → α → … → Ω → B → Ω → … → α → A.
- **Martorul** e graful din V14, fără corpurile A și B. Se antrenează pe exact aceleași date, în același timp, ca să se vadă dacă A și B ajută.

## Pornire (Windows, placă NVIDIA)

```powershell
cd D:\
if (-not (Test-Path D:\MagicPerspective)) { git clone https://github.com/dan3s2020/MagicPerspective.git }
cd D:\MagicPerspective
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\v15\START_V15.ps1
```

Dacă V14 a fost deja instalat, scriptul refolosește bibliotecile lui și nu mai descarcă PyTorch.

Apoi:

1. Testul pe placa video verifică că A și B învață prin țesătură.
2. Pagina se deschide la http://127.0.0.1:3050.
3. Datele se salvează în `D:\training\MagicPerspective-v15`.

## Ce urmărești

- **Curba de antrenare:** linia albă e țesătura cu A și B, linia gri e martorul. Cifra care decide e cea pe conversațiile ținute deoparte: punctele galbene față de cele gri. Dacă galbenul stă constant sub gri, A și B ajută.
- **În conversație:**
  - deasupra răspunsului, forma ținută de B înainte de prima literă;
  - dedesubt, la fiecare caracter, perspectiva aleasă de B (galben), activitatea nivelurilor (albastru) și rezistența lui A (roșu).

Nimic din toate astea nu a fost rulat încă pe un GPU. Rezultatele le dă antrenarea de la tine.
