// GPU text progress is an intermediate protocol event; it must never resolve a request early.
import test from "node:test";
import assert from "node:assert/strict";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";

test("a real backend text batch streams progress and resolves exactly once", async () => {
  const gpu = new GpuWorlds({device: "numpy"});
  try {
    await gpu.ready;
    const progress = [];
    const exercises = [Array.from("abcdabcd".repeat(8), c => c.charCodeAt(0)),
                       Array.from("abcabc".repeat(6), c => c.charCodeAt(0))];
    const res = await gpu.call({cmd: "text_learn", exercises, trust: [], variants: []}, {
      onProgress: evt => progress.push(evt)
    });
    assert.equal(res.memory, exercises.reduce((n, e) => n + e.length, 0));
    assert.ok(res.seen > 0);
    assert.ok(progress.some(e => e.phase === "alignment" && e.done > 0));
    assert.ok(progress.some(e => e.phase === "indexing"));
    assert.equal(progress.at(-1)?.phase, "completed");
    assert.ok(progress.every(e => e.type === "progress" && Number.isFinite(e.done)));
  } finally { gpu.close(); }
});
