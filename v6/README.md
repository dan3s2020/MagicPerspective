# MagicPerspective V6 — organismul care își desenează harta din orizont

Versiune izolată în `v6/`, port **3035**, date proprii în `v6/data/`. V1–V5 rămân neatinse.

## Pornire în Termux

```sh
pkg update -y && pkg install -y git nodejs
cd ~
if [ ! -d MagicPerspective/.git ]; then git clone https://github.com/dan3s2020/MagicPerspective.git; fi
cd MagicPerspective && git switch main && git pull --ff-only origin main
bash v6/run-termux.sh
```

Deschide **http://127.0.0.1:3035**, apasă **Antrenează** (300 de terenuri, ~1 minut), apoi **Rulează testul**.
Teste: `cd v6 && npm test` · Benchmark: `node scripts-benchmark.mjs 400 15 40 17`

## De ce V6

V5 nu putea demonstra ideea: în labirinturi aleatoare, din 3×3 nu există nicio informație despre forma drumului îndepărtat, iar „forma” era de fapt calculată de un algoritm clasic. V6 pune organismul în situația marinarului (mesajul 21): vede exact doar în jur, dar vede **orizontul** — cei mai înalți munți în 16 direcții, aproape / departe / foarte departe — și trebuie să învețe singur ce înseamnă.

## Cele trei niveluri (mesajul 38)

1. **Ce vede** — fereastra 3×3 exactă + orizontul.
2. **Ce reconstruiește** — *organul de reconstrucție* (rețea neuronală) imaginează înălțimea fiecărei celule nevăzute din toate orizonturile văzute; *organul de îndoială* estimează cât poate greși.
3. **Ce prezice** — organismul se uită „de sus” la propria hartă imaginată: linia ghicită e drumul cel mai ieftin acolo, iar norul vine din 10 variante imaginate ale hărții, după îndoială.

**Rezistență → corecție (mesajul 49):** când fereastra arată o celulă, ghicirea de dinainte e comparată cu realitatea și ambele organe se corectează. **Nu există profesor**: nimeni nu-i arată harta sau drumul corect, nici la antrenare. Evaluatorul doar notează.

## Interfața

- Același teren, două organisme alăturate: **cu organ** și **fără organ** (necunoscutul = media a ce a văzut).
- Sub ceața hașurată: „Ce își imaginează” fiecare sau „Terenul real” (doar pentru tine).
- Linii: drumul ghicit acum, drumul ghicit la pasul 0, norul de variante, drumul real cel mai ieftin, drumul mers, cercuri roșii la surprize.
- Bara de timp redă fiecare pas.
- Învățare: curba „cât din drum ghicește la pasul 0” cu organ vs fără organ.
- Test: aceleași 40 de terenuri noi (20 relief + 20 labirint), trei organisme, trei cifre clare.

Fișiere: `engine/world.mjs` (teren, fereastră, orizont), `engine/organ.mjs` (organe, hartă imaginată, nor), `engine/agent.mjs` (episod, surprize, cadre), `engine/training.mjs` (viață, validare, test), `engine/nn.mjs`, `server.mjs`, `public/`, `tests/`. Rezultate: [REPORT.md](./REPORT.md).
