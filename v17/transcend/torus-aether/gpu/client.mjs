// Node side of the GPU worlds (worlds_gpu.py): one Python process per brain, one JSON object per line.
// The Python found in OCTOPUS_PY (set by START_V17.ps1), else v17's own PyTorch-with-CUDA environment (gpu/.venv) when it
// exists, else python3/python. Any failure (no Python, no PyTorch, no CUDA, no answer) is an error shown on the page: no CPU fallback.
import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";
import fs from "node:fs";
const here = path.dirname(fileURLToPath(import.meta.url));
export class GpuWorlds {
  constructor(settings, {idleTimeoutMs = 180000, hardTimeoutMs = 900000, initTimeoutMs = 180000} = {}) {
    this.settings = settings; this.wait = new Map(); this.id = 0;
    this.buf = ""; this.info = null; this.error = null; this.dead = false;
    this.idleTimeoutMs = Math.max(1000, idleTimeoutMs);
    this.hardTimeoutMs = Math.max(this.idleTimeoutMs, hardTimeoutMs);
    this.initTimeoutMs = Math.max(1000, initTimeoutMs);
    this.activeCommand = null; this.lastGpuProgressAt = null;
    this.start();
  }
  start() {
    const venv = path.join(here, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const py = this.py = process.env.OCTOPUS_PY || (fs.existsSync(venv) ? venv : process.platform === "win32" ? "python" : "python3");
    this.p = spawn(py, ["-u", path.join(here, "worlds_gpu.py")], {stdio: ["pipe", "pipe", "pipe"], windowsHide: true});
    const fail = msg => {
      if (this.dead) return;
      this.dead = true; this.activeCommand = null;
      for (const w of [...this.wait.values()]) w.reject(new Error(msg));
      this.wait.clear();
    };
    this.fail = fail;
    this.p.on("error", err => fail("could not start " + py + ": " + err.message));
    this.p.stdin.on("error", err => fail("GPU process (" + py + ") is not reading: " + err.message + " " + (this.error || "")));
    this.p.stdout.on("data", d => {
      this.buf += d;
      if (this.buf.length > 64 * 1024 * 1024) {
        this.close("GPU protocol exceeded 64 MiB without a newline"); return;
      }
      let k;
      while ((k = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, k); this.buf = this.buf.slice(k + 1);
        let m; try { m = JSON.parse(line); } catch { continue; }
        const w = this.wait.get(m.id);
        if (!w) continue;
        if (m.type === "progress") {
          this.lastGpuProgressAt = Date.now();
          this.activeCommand = {...this.activeCommand, phase: m.phase || null,
            done: m.done ?? null, total: m.total ?? null,
            lastProgressAt: this.lastGpuProgressAt};
          w.touch();
          try { w.onProgress?.(m); } catch {}
          continue;
        }
        m.error ? w.reject(new Error(m.error)) : w.resolve(m);
      }
    });
    this.p.stderr.on("data", d => { this.error = ((this.error || "") + String(d)).slice(-3000); });
    this.p.on("exit", code => fail("GPU process " + py + " ended (" + code + "): " + (this.error || "")));
    // The INIT handshake is bounded too. Every later CUDA RPC must also have
    // a bounded silent period and absolute wall time; progress refreshes only
    // the silence timer, NOT the maximum duration of one enormous batch.
    this.ready = this.call({cmd: "init", ...this.settings},
      {idleMs: this.initTimeoutMs, hardMs: this.initTimeoutMs})
      .then(info => (this.info = info), err => { this.close(err.message); throw err; });
  }
  call(m, {onProgress, idleMs = this.idleTimeoutMs, hardMs = this.hardTimeoutMs} = {}) {
    return new Promise((resolve, reject) => {
      if (this.dead) return reject(new Error("GPU process is not running: " + (this.error || "")));
      const id = ++this.id, startedAt = Date.now(), command = String(m.cmd || "unknown");
      let idleTimer = null, hardTimer = null, settled = false;
      const cleanup = () => {
        clearTimeout(idleTimer); clearTimeout(hardTimer);
        this.wait.delete(id);
        if (this.activeCommand?.id === id) this.activeCommand = null;
      };
      const succeed = value => { if (settled) return; settled = true; cleanup(); resolve(value); };
      const failed = err => { if (settled) return; settled = true; cleanup(); reject(err); };
      const abort = kind => {
        const current = this.activeCommand?.id === id ? this.activeCommand : null;
        const progress = current?.lastProgressAt ?
          ("last valid progress " + Math.round((Date.now()-current.lastProgressAt)/1000) +
            " s ago, phase " + (current.phase||"?") +
            ", done " + (current.done??"?") + "/" + (current.total??"?")) :
          "no valid progress packets received";
        // Previous "last CUDA output: none" inspected STDERR only and could
        // incorrectly hide genuine progress that arrived on STDOUT.
        const reason = "GPU RPC " + kind + " timeout: " + command +
          " (request #" + id + ", elapsed " + Math.round((Date.now() - startedAt) / 1000) +
          " s, CUDA progress: " + progress +
          ", last CUDA stderr: " + (this.error || "none") + "). No CPU fallback.";
        this.close(reason);
      };
      const touch = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => abort("idle"), Math.max(1000, idleMs));
        idleTimer.unref?.();
      };
      this.wait.set(id, {resolve: succeed, reject: failed, onProgress, touch});
      this.activeCommand = {id, cmd: command, startedAt, phase: "submitted",
        done: null, total: null, lastProgressAt: null};
      touch();
      hardTimer = setTimeout(() => abort("hard"), Math.max(idleMs, hardMs));
      hardTimer.unref?.();
      try { this.p.stdin.write(JSON.stringify({...m, id}) + "\n"); }
      catch (err) { failed(err); this.close("GPU IPC write failed: " + err.message); }
    });
  }
  async configure(settings) { this.settings = {...this.settings, ...settings}; await this.ready; this.info = await this.call({cmd: "init", ...this.settings}); return this.info; }
  close(reason = "GPU RPC closed") {
    this.fail?.(reason);
    try { this.p.stdin.destroy(); } catch {}
    try { this.p.kill(); } catch {}
  }
}
