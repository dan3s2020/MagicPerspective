// Node side of the GPU worlds (worlds_gpu.py): one Python process per brain, one JSON object per line.
// The Python found in OCTOPUS_PY (set by START_V17.ps1), else v17's own PyTorch-with-CUDA environment (gpu/.venv) when it
// exists, else python3/python. Any failure (no Python, no PyTorch, no CUDA, no answer) is an error shown on the page: no CPU fallback.
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
const here = path.dirname(fileURLToPath(import.meta.url));
export class GpuWorlds {
  constructor(settings) { this.settings = settings; this.wait = new Map(); this.id = 0; this.buf = ""; this.info = null; this.error = null; this.start(); }
  start() {
    const venv = path.join(here, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const py = this.py = process.env.OCTOPUS_PY || (fs.existsSync(venv) ? venv : process.platform === "win32" ? "python" : "python3");
    this.p = spawn(py, ["-u", path.join(here, "worlds_gpu.py")], {stdio: ["pipe", "pipe", "pipe"], windowsHide: true});
    const fail = msg => { if (this.dead) return; this.dead = true; for (const w of this.wait.values()) w.reject(new Error(msg)); this.wait.clear(); };
    this.p.on("error", err => fail("could not start " + py + ": " + err.message));
    this.p.stdin.on("error", err => fail("GPU process (" + py + ") is not reading: " + err.message + " " + (this.error || "")));
    this.p.stdout.on("data", d => { this.buf += d; let k; while ((k = this.buf.indexOf("\n")) >= 0) { const line = this.buf.slice(0, k); this.buf = this.buf.slice(k + 1);
      let m; try { m = JSON.parse(line); } catch { continue; } const w = this.wait.get(m.id); if (w) {
        if (m.type === "progress") { try { w.onProgress?.(m); } catch {} continue; }
        this.wait.delete(m.id); m.error ? w.reject(new Error(m.error)) : w.resolve(m);
      } } });
    this.p.stderr.on("data", d => { this.error = String(d).slice(-400); });
    this.p.on("exit", code => fail("GPU process " + py + " ended (" + code + "): " + (this.error || "")));
    let timer; const limit = new Promise((_, reject) => { timer = setTimeout(() => { reject(new Error("GPU process " + py + " did not answer in 180 s: " + (this.error || ""))); this.close(); }, 180000); });
    this.ready = Promise.race([this.call({cmd: "init", ...this.settings}), limit]).then(info => (this.info = info), err => { this.close(); this.dead = true; throw err; }).finally(() => clearTimeout(timer));
  }
  call(m, {onProgress, stallMs} = {}) { return new Promise((resolve, reject) => {
    if (this.dead) return reject(new Error("GPU process is not running: " + (this.error || "")));
    const id = ++this.id;
    // The original protocol had no timeout for text_learn: a blocked Python
    // kernel could leave the UI waiting forever after the first real batch.
    // This is an INACTIVITY deadline, reset by every legitimate Python
    // training-progress event. It never claims training has progressed.
    const inactivityMs = Math.max(1000, Number(stallMs || this.settings?.stallMs || 360000));
    let timer = null;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    const arm = () => {
      clear();
      timer = setTimeout(() => {
        const why = "GPU request "+m.cmd+" had no progress for "+Math.round(inactivityMs/1000)+
          " seconds (not a completed training batch). Python process will be stopped; original Brain checkpoint is unchanged.";
        this.error=why;
        this.dead=true;
        const waits=[...this.wait.values()]; this.wait.clear();
        for(const waiter of waits) waiter.reject(new Error(why));
        this.close();
      }, inactivityMs);
      timer.unref?.();
    };
    this.wait.set(id, {
      resolve: value => { clear(); resolve(value); },
      reject: err => { clear(); reject(err); },
      onProgress: value => { arm(); onProgress?.(value); }
    });
    arm();
    try { this.p.stdin.write(JSON.stringify({...m, id}) + "\n"); }
    catch (err) { clear(); this.wait.delete(id); reject(err); }
  }); }
  async configure(settings) { this.settings = {...this.settings, ...settings}; await this.ready; this.info = await this.call({cmd: "init", ...this.settings}); return this.info; }
  close() { try { this.p.stdin.end(); this.p.kill(); } catch {} }
}
