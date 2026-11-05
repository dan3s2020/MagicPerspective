import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {EpistemicText} from "../transcend/epistemic-text/engine.mjs";
import {LeanC} from "../transcend/torus-aether/lean-c.mjs";
import {distC} from "../transcend/torus-aether/torus.mjs";

const text = fs.readdirSync("docs").filter(f => f.endsWith(".md")).sort().map(f => fs.readFileSync("docs/" + f, "utf8")).join("\n");
const d = Array.from(text.slice(0, 60000), c => Math.min(127, c.charCodeAt(0)));

test("LeanC decides exactly like the engine's C (predictions, promotions, beliefs)", () => {
  const a = new EpistemicText(), b = new LeanC(); let checked = 0;
  for (let i = 4; i < d.length; i++) {
    const ctx = [1, 2, 3, 4].map(j => d[i - j]);
    assert.equal(b.predict(ctx), a.predict(ctx), `step ${i}`);
    if (i % 97 === 0) { const pa = distC(a, ctx), pb = distC(b, ctx); for (let k = 0; k < 128; k++) assert.ok(Math.abs(pa[k] - pb[k]) < 1e-12); checked++; }
    a.observe(ctx, d[i]); b.observe(ctx, d[i]); assert.equal(b.active, a.active);
  }
  assert.ok(checked > 100);
});
