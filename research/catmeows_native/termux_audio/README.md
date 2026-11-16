# Braivour Audio Body — Termux pe Android

Aceasta este interfața LOCALĂ a organismului original MagicPerspective/Braivour, nu o demonstrație animată și nu un model separat.

## Ce face

- Primește înregistrări de la microfonul telefonului sau un fișier audio în browserul Android.
- Transformă efectiv audio în aceeași percepție fizică cu **48 cadre × 9 caracteristici** folosită în cercetarea CatMeows: frecvență, intensitate, armonicitate, 6 benzi spectrale.
- Restaurează checkpointul **adevărat** `Original_Braivour_9D_SoundTransform_Body_chronological.v8` din experimentele verificate: original `Brain`, `Discoverer`, `constructedPaths.links`, 540 episoade de jocuri acustice și transformările reale observate în audio; nu inițializează alt organism.
- La **Răspunde**, începutul acustic și ținta în corp sunt alese în funcție de sunetul încărcat, iar `Discoverer.dream()` determină 47 acțiuni; efectele celor 7 dimensiuni suplimentare se obțin din memoria nativă a transformărilor acustice. Un decodor fizic determinist le transformă în fișier WAV de 0,96 secunde. Acest rezultat este **sinteză acustică experimentală**, nu limbaj felin tradus, și nu e evaluat ca mieunat natural.
- La **Antrenează**, originalul `brain.live()` absoarbe toate fragmentele înregistrării, `constructedPaths.links.observe()` învață noi tranziții de stare și de efect 7D; `Discoverer.learnStep()` joacă episoade reale când se găsesc ținte acustice atinse din sunetul însuși. Dacă nu există ținte valide, raportează zero jocuri, dar memorează observațiile audio reale. Nu inventează jocuri sau semnificații.
- La final salvează *întregul* Brain original în `runtime/termux_cat_audio/checkpoints/active.v8`, verifică restaurarea și păstrează copia `previous.v8`.
- Butoane: înregistrare, oprire, încărcare audio, răspuns, play/download WAV, variație, număr jocuri, antrenare, stop antrenare, salvare. Indicatorii reprezintă observații și episoade citite din adevăratul obiect Brain.

## Cerințe

Termux actual, Android, browser Chrome/Firefox pe același telefon, internet numai la instalare, spațiu liber pentru repository, checkpointuri și înregistrări. Recomandat cel puțin 2 GB RAM liberi la pornire. Pentru microfon Android acordă permisiune browserului; folosește exact `http://127.0.0.1:8765` (localhost este permis ca origine de înregistrare).

Termux folosește de regulă pachetul nativ `python-numpy` în loc de `pip install numpy`, plus `nodejs-lts` și `ffmpeg`.

## Comenzi complete în Termux

```bash
pkg update -y
pkg install -y git nodejs-lts python python-numpy ffmpeg unzip
termux-setup-storage

git clone --depth 1 --single-branch --branch experiment/CATMEOWS-TERMUX-LIVE-CONVERSATION-20261116 https://github.com/dan3s2020/MagicPerspective.git "$HOME/BraivourAudio"
cd "$HOME/BraivourAudio"

bash research/catmeows_native/termux_audio/install.sh
bash research/catmeows_native/termux_audio/start.sh
```

**Checkpointul este necesar.** Descarcă din conversația ChatGPT arhiva oferită anterior `Braivour_Native_9D_Sound_Transform_WAVs_And_Brain.zip` și păstreaz-o în `Downloads` înainte să rulezi `install.sh`. Pentru un alt director, transmite explicit numele ZIP:
```bash
bash research/catmeows_native/termux_audio/install.sh "$HOME/storage/downloads/Braivour_Native_9D_Sound_Transform_WAVs_And_Brain.zip"
```

Dacă ai deja un checkpoint `active.v8`, installerul **nu îl suprascrie**.

După pornire, deschide în browser:

**http://127.0.0.1:8765**

Nu este necesar cont, cloud, API de inteligență extern sau plăți. Închide serverul cu `Ctrl+C` în Termux. Antrenarea salvează automat; pentru răspunsurile fără training nu este necesară o salvare.

## Structura exactă

- `index.html`: UI responsive + captura microfon, încărcare audio, răspuns, control jocuri și salvare.
- `server.mjs`: HTTP local pe `127.0.0.1`, original V17 Brain, încărcare checkpoint, acțiuni din propriul corp și învățare persistentă.
- `audio_codec.py`: percepție identică cu `prepare_generative.sense()`; decodează cu `render_temporal_body_audio.synth()`, numai pentru redare.
- `install.sh`, `start.sh`: comenzi Termux fără resetare.

Sunt utilizate modulele existente ale repo-ului original; nu au fost modificate.

## Verificări obligatorii

1. Încărcarea V8 original: `Brain.disc.episodes` inițial 540, `body.recordingsLived` 252 și original motor effects prezente.
2. Audio 1 și Audio 2 diferite, fără test/fake răspuns preînregistrat; intrare -> ID/semnătură distincte -> traiectorii acustice controlate de intrare. Răspunsul nu este copiat din WAV-ul încărcat.
3. Antrenare pe audio real: număr de noi observații native crește, episoadele cresc numai când există un joc acustic valid.
4. Salvarea și reîncărcarea checkpointului `active.v8` conservă observațiile nativului și episoadele, iar răspunsurile rămân posibile după restart.
5. Audio generat poate fi redat și descărcat în browser.
6. Nu presupune cuvinte / intenții ale pisicii, nu susține descifrarea comunicării; sinteza este fizică aproximativă.

Pentru depanare vezi logurile din Termux: sunt marcate `BRAIVOUR_TERMUX_ORIGINAL_BRAIN_READY`, `BRAIVOUR_ACTUAL_INPUT_CONDITIONED_VOICE` și `TERMUX_BRAIVOUR_REAL_AUDIO_PERCEIVED`.
