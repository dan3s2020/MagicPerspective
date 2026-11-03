# MagicPerspective V2 — isolated causal laboratory

V1 (repository root) remains untouched and runnable on port **3030**. V2 lives under [`v2/`](./v2/), runs on **3031** and introduces a separately trained action-effort predictor, weighted physical environments, partial-observation acquisition and serious held-out benchmarking.

**Run from Termux after a normal update:**

```sh
cd ~/MagicPerspective
git pull --ff-only origin main
bash v2/run-termux.sh
```

For a new installation:

```sh
pkg update -y && pkg install -y git nodejs
cd ~
git clone https://github.com/dan3s2020/MagicPerspective.git
cd MagicPerspective
bash v2/run-termux.sh
```

Open `http://127.0.0.1:3031`. V2 is experimental. It does not currently invent new mathematical perspectives or transfer to SAT. Scientific evidence and limitations: [v2/REPORT.md](./v2/REPORT.md).
