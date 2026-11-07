# MagicPerspective V17 — MAGIC LIVE STUDIO: un creier, antrenare adevărată, vizualizare a rezultatelor

**Branch:** \`feature/V17-MAGIC-LIVE-STUDIO-REAL-TRAINING-20261107\`  
**Date:** 2026-11-07  
**Status:** ISOLATED WORKING STUDIO ON TOP OF EXISTING REAL V17 TRAINING; NOT FULL CAUSAL INTEGRATION OF ALL NEW LOCAL-AXIS RESEARCH INTO TEXT WRITING.

## Ce face această implementare ACUM

Nu este un ecran care simulează mișcări sau rezultate. Studio-ul este un server LOCAL-ONLY care trimite comenzi reale către \`v17/transcend/torus-aether/devour/devour.mjs\`, exact motorul nativ original (worker threads, existing Brain, save/load, CUDA PyTorch when requested and available, actual text dataset, maze and transform worlds).

- Afișează graful produs chiar de \`Brain.trace.snapshot()\`: noduri, muchii, tipuri, activări, erori, simboluri, metadate și coordonate \`U\` de la \`Geometry\`.
- Proiecția grafică pe canvas este doar o vizualizare din coordonatele V17 5D ale simbolurilor. Nodurile A/C fără coordonate în Geometry folosesc un layout vizual determinist, explicit descris, nu pretinse coordonate învățate.
- Afișează datele REAL TIME din \`/graphs\`, \`/graph\`, \`/telemetry\`, \`/state\`: caractere trăite, noduri, muchii, predicție evaluată pe text ținut separat, trasee de labirint, operatori observați, perechi efective, stări textuale, număr de decizii ale noise-agentului, faza/erorile CUDA, VRAM (numai dacă raportată de motor), creștere în timp.
- Permite Start/Pause/Save (toate sau un creier) și Reset numai cu confirmare; la reset, motorul existent arhivează checkpointurile în directorul \`brains-before-reset\`.
- Adaugă un nou slot real V17 cu selecție \`text\`, \`maze\`, \`transform\`, \`selfcode\` și arm-uri originale. Nu fabrică lumi noi.
- Invocă reale evaluări FROZEN pe checkpointul original: \`/constructed-paths-eval\`, \`/perspective-eval\`, \`/eval\`, \`/shared-eval\`, \`/language-maze\`. Evaluarea nu folosește răspunsul ascuns ca intrare. Se afișează progres, motivul eșecului, predicția, stări de căutare, muchii, ruta inițială, acțiuni ale corpului, schimbări de perspectivă, diferențe, comparări și JSON complet.
- Secțiunea de cercetare poate relansa efectiv testele din codul original \`v17/tests\` folosind \`node --test\`; returnează outputul real și indicatorii din stdout. Numerele din laborator NU sunt prezentate ca metrici live ale creierului V17.
- Porturile sunt legate exclusiv la 127.0.0.1, ruta proxy este o listă explicită permisă de endpointuri V17; nu execută căi sau comenzi arbitrare primite din UI. Nu expune checkpointul sau corpusul prin fișiere statice.

## PowerShell: instalare complet izolată pe D:

Dacă folderul de destinație există, clonarea refuză să îl suprascrie. Rulează din orice terminal PowerShell:

    $ErrorActionPreference = "Stop"
    $repo = "https://github.com/dan3s2020/MagicPerspective.git"
    $branch = "feature/V17-MAGIC-LIVE-STUDIO-REAL-TRAINING-20261107"
    $dest = "D:\MagicPerspective-Magic-Live-Studio"
    if (Test-Path -LiteralPath $dest) { throw "Folderul există. Nu suprascriu niciun proiect." }
    git clone --single-branch --branch $branch $repo $dest
    if ($LASTEXITCODE -ne 0) { throw "Clonarea a eșuat." }
    & "$dest\v17\START_MAGIC_LIVE_STUDIO.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Gpu "cuda:0" -Vram 2.8 -Workers 1 -Worlds "text,maze,transform"

**Studio live:** http://127.0.0.1:8872/  
**Original V17 UI:** http://127.0.0.1:8871/  
**Date separate:** \`D:\MagicPerspective-MagicStudio-Run\native\brains\` și \`D:\MagicPerspective-MagicStudio-Run\magic-studio-logs\`.

Default \`-Resume\` și \`-Start\`: începe sau reia antrenarea reală. Original \`START_V17.ps1\` face self-testurile CUDA și arată eroarea în log dacă nu poate rula; Studio spune explicit „offline”, nu pretinde că antrenarea rulează. Nu se atinge \`D:\MagicPerspective\`, \`D:\MagicPerspective-5D\` sau checkpointurile lor originale. Dacă dorești doar observație pe un V17 deja pornit la portul nativ ales, folosește \`-StudioOnly\` cu \`-NativePort\` corespunzător.

Alte opțiuni launcher: \`-NativePort 8871 -StudioPort 8872 -Arm stable+many -GpuWorlds 16 -GpuTextBatch 2 -MazeEvery 1200 -Every 5000 -Worlds text,maze,transform,selfcode -Out D:\MagicPerspective-MagicStudio-Run\`.

**Important GPU:** CUDA poate executa batch-uri reale de text/maze/transforms prin workerul existent; componentele Node.js, controlul, replanificarea, serverul și laboratorul de cercetare rămân CPU. Nu se pretinde că absolut totul rulează pe CUDA sau că utilizarea va fi 100% constantă. Dacă GPU este indisponibil, nu se face fallback tăcut în modul solicitat \`cuda:0\`.

## Ce nu este încă implementat

- Transportul local de axe din \`v17/research/local-axes\` a fost testat în lumile sale sintetice, dar încă NU generează cuvintele în \`AligningGraph.write()\`.
- Rezultatele 930/930, 2048 de STĂRI, optimizarea 2048 și descoperirea a șase canale funcționale provin din experimente CONTROLATE distincte; nu sunt confundate cu 100% reușită la limbaj natural.
- Înainte de scrierea unui răspuns REAL la o problemă necunoscută, o formă semantică completă nu a fost încă verificată în motorul original. \`language-maze\` construiește un traseu real din operatori de editare deja observați, cu obiective token, iar corpul verifică efectul intern al acțiunii, NU semantică independentă.
- Acest Studio nu poate crea automat o reprezentare generală a sensului, nu învață singur ontologii universale și nu inventează „adevăruri cuantice”.
- Antrenarea cu date private trebuie să rămână în clone/dosare private; niciun fișier de date nu este trimis automat la GitHub. Browserul și backendul comunică exclusiv local.

## Teste / acceptare

    node --check v17/magic-studio/studio-server.mjs
    node --check v17/magic-studio/magic-studio.js
    node --test v17/tests/magic-live-studio.test.mjs

Testul de integrare pornește REAL \`devour.mjs\` într-un proces separat cu o bucată din documentația reală a repository-ului folosită drept corpus; verifică faptul că în snapshot apar caractere învățate, noduri, legături, coordonate geometrice și telemetrie. Pe GitHub Actions folosim CPU, fără a simula CUDA; pe Windows launcherul nativ face selftestul efectiv al GPU. În plus, un test declanșează fișierele de cercetare ca procese \`node --test\` și verifică stdoutul/rezultatele autentice.

## Obiective următoare, fără redenumirea rezultatului

(1) Senzori și contexte native→(2) învață axele/transformările locale ÎN ACELAȘI BRAIN→(3) goal-conditioned solution shape→(4) execuție nativă ce depinde cauzal de axe→(5) noise observație/decizie separat→(6) evaluare frozen pe matematică/limbaj semantic nevăzut cu baseline și ablație→(7) telemetria reală prin Studio.

Nu declara \`all mechanisms completely integrated\` până când acești pași nu sunt efectiv implementați și testați. Acest Studio face vizibile și controlabile părțile verificabile ale creierului deja funcțional, nu substituie corectitudinea științifică printr-o interfață frumoasă.
