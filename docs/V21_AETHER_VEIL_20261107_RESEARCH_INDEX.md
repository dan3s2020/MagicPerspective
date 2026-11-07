# MagicPerspective V21 — arhivă de descoperiri, regresii, reparații și dovezi

**Data:** 2026-11-07. **Intrare documentară pe `main` — fără transfer de cod experimental către `main`.**

## Unde este documentată cercetarea

Toate detaliile recuperabile privind V17–V21, limitele experimentelor, rezultatele CI, continuarea parțială de Verbatim, eroarea CUDA, regresia la 0% a formei, corecția evaluării trunchiate, migrarea checkpointurilor, perspectiva mistică Aether/Veil și defectul de codificare PowerShell 5.1 sunt documentate și versionate în ramura **izolată**:

**[V21 Aether/Veil branch](https://github.com/dan3s2020/MagicPerspective/tree/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107)**

- [Jurnal consolidat V17–V21](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_CONSOLIDATED_RESEARCH_REGRESSION_TRANSFER_ARCHIVE_20261107.md)
- [Audit regresii și adevăratul transfer al descoperirilor](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md)
- [Dovezi arhitecturale Aether/Veil și limite](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_VEIL_AETHER_EVIDENCE.md)
- [Blocaj la inceputul CUDA: inversare de prefix O(N²) eliminata, SelfMem progres real si test pe 229.187 caractere](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_FIRST_CUDA_BATCH_STALL_CONTEXT_COPY_20261107.md)
- [Audit de performanta CUDA V21: alocari GPU, sincronizari, indexul text si setari fara reset](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_CUDA_SLOW_TRAINING_PROFILE_20261107.md)
- [Obiectiv măsurabil: >=100 exerciții complete/secundă, accelerări CUDA testate și limita actuală nevalidată](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_100_EXERCISES_PER_SECOND_TARGET_20261107.md)
- [Postmortem Windows PowerShell 5.1: U+2014, codificare ANSI și test real Windows](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_WINDOWS_POWERSHELL51_POSTMORTEM_20261107.md)
- [Registru JSON al dovezilor native, istorice, incomplete](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/v17/docs/V21_TRANSFER_EVIDENCE_LEDGER_20261107.json)
- [Mesaje USER și loguri PowerShell din conversația vizibilă — parțial](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/verbatim/2026-11-07-V21-VISIBLE-CHAT-USER-DIRECTIVES-VERBATIM-PARTIAL.md)
- [Contract suplimentar de documentare](https://github.com/dan3s2020/MagicPerspective/blob/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107/user-intent/changes/V21-AETHER-VEIL-20261107-DOCUMENTATION-ADDENDUM.json)

## Ce s-a demonstrat, ce nu s-a demonstrat

- La 2026-11-07, [suita V21 cu 42/42 teste native și verificări istorice separate](https://github.com/dan3s2020/MagicPerspective/actions/runs/42324536831) era verde. Proba de recuperare a formei originale scrise înainte a dat **17,65%** pe un exercițiu **sintetic** după migrarea de checkpoint (nu pe OpenThoughts3).
- Eroarea de lansare `The string is missing the terminator` provenea dintr-un caracter `—` la linia 92 în fișierul PowerShell UTF-8 fără BOM; corectat cu `-`. [Verificarea Windows PowerShell 5.1 real a trecut](https://github.com/dan3s2020/MagicPerspective/actions/runs/42326210472).
- Ramurile istorice cu axe ascunse, axe locale, holonomie, experimente numerice text, 2048 stochastic, xD și shared-world au fost retestate în checkouturi separate. **Reproductibilitatea experimentelor originale nu este sinonimă cu transferul lor în politica de text V21.**
- Originalul `Discoverer.shape()` funcționează în lumea maze, iar `AligningGraph.write()` a fost reactivat pe lumea `text`. Nu există încă demonstrația că exact motorul original anticipează soluția semantică în lumea textului. Nici RTX 3050 Ti din mașina utilizatorului cu întregul OpenThoughts3 nu a fost verificat independent în aceste teste.
- [Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25) rămâne **OPEN/BLOCKING**. `VERBATIM_ROOT.md`, `AGENTS.md` și cerința de păstrare a algoritmului original rămân canonice. Materialul vechi de conversație și imaginile lipsă nu sunt reconstruite fictiv.

## Regula de lucru

**Nu reveniți pur și simplu la versiunile vechi și nu declarați transferul complet pe baza unui demo, a unui reziduu Bellman apropiat de 0 sau a unor teste istorice separate.** Comparați un checkpoint nou cu aceeași suită frozen din versiunea de referință și același corpus, cu toate lumile selectate pornite efectiv, verificarea propriei forme scrise înainte de acțiune, controlul de non-leakage, UI original, GPU și checkpointuri protejate.

Această intrare este un **index de documentare în `main`**. Nu face merge al codului experimental V21 și nu alterează sursa veche, motorul de antrenare ori checkpointurile.
