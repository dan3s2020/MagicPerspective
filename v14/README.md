# MagicPerspective V14 — Vorbitorul

V14 e un singur graf, același pentru orice exemplu, care învață să vorbească din fișierul tău OpenThoughts3 și cu care poți conversa.

## Pornire (Windows, placă NVIDIA)

```powershell
cd D:\
if (-not (Test-Path D:\MagicPerspective)) { git clone https://github.com/dan3s2020/MagicPerspective.git }
cd D:\MagicPerspective
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\v14\START_V14.ps1
```

Ce face scriptul:

1. **Prima dată**, creează `v14\.venv` și instalează PyTorch cu CUDA, NumPy și PyArrow. Durează câteva minute.
2. **Testul pe placa video.** Rețeaua trebuie să învețe două mini-conversații în 300 de pași. Dacă testul nu trece, scriptul se oprește și îți arată de ce.
3. **Fișierul tău.** Citește primele rânduri din `D:\training\OpenThoughts3-1.2M\train-00015-of-00120.parquet` și îți arată o întrebare și începutul răspunsului.
4. **Pagina** se deschide la http://127.0.0.1:3049.

Creierul, istoria și mostrele se salvează în `D:\training\MagicPerspective-v14\brain.pt`, la fiecare 5 minute și la oprire. Repornești oricând și continuă de unde a rămas.

Ca să antrenezi pe alt fișier sau pe un folder întreg de fișiere `.parquet`, scrie calea în pagină și apasă **Încarcă**.

## Lumea (jocul)

Fiecare rând din fișier are `conversations`: întrebarea (`from: human`) și răspunsul. Un episod arată așa:

```
[Q] întrebarea  [A]  ← aici, înainte de prima literă, își prezice FORMA răspunsului (lungimea și literele pe care le va folosi)
               răspunsul, byte cu byte  [E]
```

Profesorul, adică răspunsul adevărat, îi dă eroarea exactă a fiecărei litere și a formei. Graful nu se schimbă de la un exemplu la altul; prin el curge doar alt text.

## Graful

- **Nodurile de intrare și ieșire:** 256 de noduri-byte, plus trei marcaje (întrebare, răspuns, sfârșit). Merge cu orice limbă.
- **Nivelurile de perspectivă:** 6 niveluri, α … Ω. α se schimbă la fiecare literă; fiecare nivel următor se schimbă de 2 ori mai încet, așa că Ω ține minte contextul cel mai larg.
- **Bucla:** legăturile formează un inel de niveluri, în care fiecare nivel vorbește cu vecinii lui, iar α și Ω sunt vecine. Ce face α intră în Ω, iar Ω îndoaie ce face α la pasul următor.
- **De unde vorbește:** la fiecare literă, rețeaua alege singură de la ce niveluri vorbește. În pagină, asta se vede caracter cu caracter.
- **Zgomotul:** zgomot în starea internă. La antrenare îl face mai robust; în conversație e butonul de „halucinație”.

## La ce să te aștepți (cinstit)

Fișierul e în engleză: probleme de matematică, cod și științe, cu răspunsuri care încep cu `<think>`. După antrenare, Vorbitorul va scrie în stilul lor, de exemplu „<think> Okay, so I need to …”. Va scrie cuvinte și fraze în engleză, probabil fără răspunsuri corecte la probleme.

Cât de bine vorbește depinde de cât îl antrenezi, câte ore și câte fișiere. Cifra care arată progresul e numărul de **biți pe byte** pe conversațiile ținute deoparte: textul la întâmplare are 8, iar un text învățat bine coboară spre 1–2.
