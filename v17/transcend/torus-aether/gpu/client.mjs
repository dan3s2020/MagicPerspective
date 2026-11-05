// Node side of the GPU worlds (worlds_gpu.py): one Python process per brain, one JSON object per line.
// The Python found in OCTOPUS_PY (set by START_V17.ps1 to its own PyTorch-with-CUDA environment), else python3/python.
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
export class GpuWorlds {
  constructor(settings) { this.settings = settings; this.wait = new Map(); this.id = 0; this.buf = ""; this.info = null; this.error = null; this.start(); }
  start() {
    const py = process.env.OCTOPUS_PY || (process.platform === "win32" ? "python" : "python3");
    this.p = spawn(py, ["-u", path.join(here, "worlds_gpu.py")], {stdio: ["pipe", "pipe", "pipe"]});
    this.p.stdout.on("data", d => { this.buf += d; let k; while ((k = this.buf.indexOf("\n")) >= 0) { const line = this.buf.slice(0, k); this.buf = this.buf.slice(k + 1);
      let m; try { m = JSON.parse(line); } catch { continue; } const w = this.wait.get(m.id); if (w) { this.wait.delete(m.id); m.error ? w.reject(new Error(m.error)) : w.resolve(m); } } });
    this.p.stderr.on("data", d => { this.error = String(d).slice(-400); });
    this.p.on("exit", code => { for (const w of this.wait.values()) w.reject(new Error("GPU process ended (" + code + "): " + (this.error || ""))); this.wait.clear(); this.dead = true; });
    this.ready = this.call({cmd: "init", ...this.settings}).then(info => (this.info = info));
  }
  call(m) { return new Promise((resolve, reject) => { const id = ++this.id; this.wait.set(id, {resolve, reject}); this.p.stdin.write(JSON.stringify({...m, id}) + "\n"); }); }
  async configure(settings) { this.settings = {...this.settings, ...settings}; await this.ready; this.info = await this.call({cmd: "init", ...this.settings}); return this.info; }
  close() { try { this.p.stdin.end(); this.p.kill(); } catch {} }
}
