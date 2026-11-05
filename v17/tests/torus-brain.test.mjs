import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {MAZE_SYMBOLS} from "../transcend/torus-aether/worlds/maze.mjs";

const text = fs.readdirSync("docs").filter(f => f.endsWith(".md")).sort().map(f => fs.readFileSync("docs/" + f, "utf8")).join("\n");
const A = Array.from(text.slice(0, 12000), c => Math.min(126, c.charCodeAt(0))), H = Array.from(text.slice(20000, 21000), c => Math.min(126, c.charCodeAt(0)));
const rules = {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32, fold: false};

test("one brain lives text and maps; saved and restored it is the same brain", () => {
  const b = new Brain({rules, c: {margin: .05, window: 400, many: 12}});
  for (let i = 0; i < A.length; i++) { b.live(A[i]); if (i % 4000 === 0) b.playMaze(); }
  assert.equal(b.mazes.played, 3); assert.ok(b.mazes.last.path.length > 0);
  assert.ok([...b.trace.nodes.keys()].some(id => MAZE_SYMBOLS.has(+id.slice(2))), "the maps' symbols live in the same graph as the text");
  const f = path.join(os.tmpdir(), "torus-brain-test.v8"), before = b.test(H); b.save(f);
  const r = Brain.load(f); assert.deepEqual(r.test(H), before);
  r.live(65); r.playMaze(); assert.equal(r.mazes.played, 4);
  const t = r.testMazes(6); assert.equal(t.n, 6); assert.equal(r.mazes.played, 4, "the frozen test learns nothing");
});
