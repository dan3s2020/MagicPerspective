# MagicPerspective V10 — specificația, extrasă cuvânt cu cuvânt din `CONVERSATIE_COMPLETA_DIN_CONTEXT.md`

Regula acestei versiuni: **nimic nu intră în V10 dacă nu vine dintr-o frază a conversației**, și fiecare cerință are un test care o verifică. V10 se construiește de la zero (mesajele 54–55: „definim noi de la 0 ce ne trebuie în loc să adaptăm”), fără cod din Octopus și fără mecanismele adăugate în V6–V9 (orizont în 16 direcții, specialiști, dans, vise, democrație).

## A. Ce este organismul

| # | Cerință | Sursa | Verificare |
|---|---|---|---|
| A1 | Organismul **prezice forma soluției înainte de a o executa**; „cel mai important organ … înainte de a începe problema, ghicește forma soluției” | 36, 37, 53 („Z_Γ înainte de prima acțiune”) | test: predicția există la pasul 0, înainte de orice acțiune |
| A2 | Nu vede harta de sus; vede doar local, propriile acțiuni și consecințele lor | 21, 36.1, 38 (tabel), 55 | test: nicio intrare a organismului nu conține harta |
| A3 | Își construiește harta din ce vede și din ce face („ca un marinar”) — perspectivă internă din slice-uri locale | 21, 22, 37, 38.2 | memoria internă M_t, vizibilă în UI |
| A4 | h_t = E(o_{0:t}, a_{0:t-1}); z = F(h_t, g); (Γ̂, U) = D(z) | 38.3 | arhitectura din cod urmează exact aceste trei funcții |
| A5 | Forma = simultan: linie anticipată, distribuție de probabilitate peste regiuni, structură de puncte și conexiuni | 38.3 | toate trei sunt produse și afișate |
| A6 | Prezice și **incertitudinea formei**, nu o singură linie obligatorie; când două lumi arată la fel, exprimă incertitudine | 38.2, 53.5, 55.4 | metrică: calibrarea incertitudinii |
| A7 | „Nu programăm în latent ce înseamnă un drum corect”; îl antrenăm să descopere regularitățile | 38.3 | forma vine din rețea antrenată, nu din căutare programată |
| A8 | Învață relația percepție – acțiuni – consecințe – forma globală | 36.5, 38.5 | modelul tranzițiilor învățat |
| A9 | Prezice consecințele **mai multor acțiuni posibile înainte să aleagă una** (imaginație predictivă) | 49 | test: acțiunea e aleasă după consecințe imaginate |
| A10 | Sine operațional: distinge propriile acțiuni de schimbările externe | 49 (proprietatea 1) | lume cu schimbări externe; test de atribuire |
| A11 | Perspectivă → Predicție → Acțiune → Rezistență → Corecție | 48, 49 | bucla din cod; rezistența = consecință prezisă vs observată |
| A12 | Organul relațiilor: ordinea, asemănările, diferențele, conexiunile dintre slice-uri; geometrie internă din relații (ordonare / MDS); dimensionalitatea nu e impusă | 44, 45 | organul relațiilor + afișarea geometriei interne |
| A13 | Perspectiva = felul în care organizează ce știe și ce presupune; poate schimba **cum** o construiește (coordonate vs conexiuni) | 55.3 | test: aceeași memorie servește lumi cu și fără geometrie |
| A14 | Γ = (S_Γ, T_Γ, C_Γ, U_Γ): stări, tranziții, constrângeri, incertitudine | 55.2 | structura de ieșire |

## B. Cum învață

| # | Cerință | Sursa | Verificare |
|---|---|---|---|
| B1 | Entitatea superioară (noi / simulatorul cu harta completă) îi spune **dacă** forma e corectă și **exact cât** greșește | 13, 15, 36.4, 38.4 | profesorul dă eroare numerică pe formă la antrenare |
| B2 | Pașii: prima observație → **forma înainte de prima mișcare** → evaluare → semnal numeric → modifică parametrii → mișcare → formă revizuită | 38.4 | ordinea din codul de antrenare |
| B3 | Referința prin BFS/A*; **nu penalizăm un drum valid doar pentru că diferă** de al profesorului | 38.4 | ținta = toate drumurile optime |
| B4 | Pornește de la zero; probleme mici întâi, apoi complexitate crescătoare | 29, 30, 38.5, 55 | curriculum de mărimi |
| B5 | La evaluare profesorul **nu mai dă feedback** despre problema curentă | 38.4, 55.4 | test: evaluarea nu apelează profesorul |
| B6 | Organismul nu primește informație globală ascunsă pe o cale indirectă | 53.5 | test anti-scurgere |
| B7 | Scopul e capacitatea transferabilă, nu memorarea hărților | 36, 38.5 | lumi noi la test |

## C. Lumile

| # | Cerință | Sursa |
|---|---|---|
| C1 | Labirint procedural 2D; fereastră locală 3×3; patru acțiuni; memorie în episod; indiciu despre țintă (poziția relativă); harta completă doar la evaluator | 38.1, 38.6, 55.4 |
| C2 | Primul experiment: hărți 7×7, vedere 3×3 | 38.6 |
| C3 | Lumi 2D cu reguli schimbătoare și observații incomplete | 38.5 |
| C4 | Lume de grafuri: transformă stări, descoperă conexiuni, alte reguli de transformare | 49.4, 53, 55.6 |
| C5 | Lume de constrângeri logice: găsește o configurație validă (3-SAT mic) | 49.4, 53.4 |
| C6 | Interfață comună: stare, constrângere, transformare, decizie, obiectiv, succesiune de stări | 38.5 (tabel) |

## D. Testele decisive

| # | Test | Sursa |
|---|---|---|
| D1 | **Predicție înainte de mișcare**: forma inițială pe hărți noi e statistic mai bună decât o referință fără învățare | 38.6, 53.5 |
| D2 | Îmbunătățirea contribuie efectiv la navigare | 38.6 |
| D3 | **Corecție prin rezistență**: eroarea scade după observații relevante | 53.5 |
| D4 | **Generalizare**: performanța se menține pe lumi noi | 53.5 |
| D5 | **Transfer**: același organism, fără resetare, în labirint → graf → constrângeri; experiența dintr-o familie ajută în alta | 49.4, 53.5, 55.6 |
| D6 | Comparații cu **aceeași capacitate fără organul formei**, cu navigare clasică pe aceleași observații și cu organisme martor | 38.6, 53.5, 55.6 |
| D7 | Metricile: eroarea la pasul 0; eroarea după fiecare observație; % trasee valide; lungime față de optim; calibrarea incertitudinii; performanță pe lumi noi | 38.4 |

## E. Interfața

| # | Cerință | Sursa |
|---|---|---|
| E1 | Simultan: traseul real, traseul prezis, evoluția erorii, acțiunile organismului | 36 |
| E2 | Harta reală (doar observatorul), regiunile descoperite, traseul prezis de rețea, traseul optim calculat independent | 38.6 |
| E3 | Linie trasată peste hartă de la organism până la finish | 19 |
| E4 | Norul de probabilitate: regiunile mai luminoase pe măsură ce crește încrederea | 47 |
| E5 | Predicția galbenă evoluează după fiecare observație; predicțiile inițiale pe probleme noi după antrenare | 55.5 |
| E6 | Rulează în Termux cu `git pull` | 56 |

## F. Ce NU se afirmă

Succesul pe labirinturi nu demonstrează P = NP (24, 28, 36, 38); nu se afirmă conștiință sau entități fizice (49.2, 49.5).
