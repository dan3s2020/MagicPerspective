import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {requestedExerciseLength, limitExerciseBytes} from "../transcend/torus-aether/devour/eval-text-length.mjs";

test("evaluation text has no fixed 50,000-character cap", () => {
  const bytes = Array.from({length: 250_000}, (_, i) => (i % 94) + 32);
  assert.equal(requestedExerciseLength(200_000), 200_000);
  assert.equal(limitExerciseBytes(bytes, requestedExerciseLength(200_000)).length, 200_000);
  assert.equal(limitExerciseBytes(bytes, requestedExerciseLength(900_000)).length, 250_000);
  assert.equal(limitExerciseBytes(bytes, requestedExerciseLength(0)).length, 250_000);
  assert.deepEqual(limitExerciseBytes(bytes, requestedExerciseLength(17)), bytes.slice(0, 17));
  assert.equal(requestedExerciseLength(""), 20_000);
});
test("invalid negative, fractional and non-finite lengths are rejected explicitly", () => {
  for (const bad of [-1, 1.5, "Infinity", "not a number", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => requestedExerciseLength(bad), RangeError);
  }
});
test("original V17 evaluator UI accepts full exercise and pages rendering without clipping metrics", () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "transcend/torus-aether");
  const html = fs.readFileSync(path.join(dir, "ui/index.html"), "utf8");
  const js = fs.readFileSync(path.join(dir, "ui/app.js"), "utf8");
  assert.match(html, /id="evMax"[^>]*min="0"/);
  assert.doesNotMatch(html, /id="evMax"[^>]*max=/);
  assert.match(js, /T\.slice\(start, end\)/);
  assert.match(js, /data-text-nav="next"/);
  assert.match(js, /\$\("evMax"\)\.value === "" \? 20000 : Number/);
  assert.match(js, /T\.length\.toLocaleString\(\)/);
});
