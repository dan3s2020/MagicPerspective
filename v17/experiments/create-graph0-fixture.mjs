// Tiny native checkpoint fixture for the Windows PowerShell launcher smoke test.
// This is SYNTHETIC, deliberately unrelated to the user's private saved model.
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
const out = process.argv[2] && path.resolve(process.argv[2]);
if (!out) throw Error("Usage: node create-graph0-fixture.mjs OUTPUT_BRAINS_DIR");
fs.mkdirSync(out,{recursive:true});
const brain = new Brain({rules:"winner",seed:23});
const align = new AligningGraph({g:8});
align.imagineEvery=0;
const text = [
 "Q: How do we reach the maze exit?\nA: Follow a valid passage to the goal.\n\n",
 "Q: What happens if S_v is empty?\nA: A boundary condition may be required.\n\n",
 "Q: What is two plus two?\nA: Four.\n\n"
].join("").repeat(12);
for (const ch of text) align.live(ch.charCodeAt(0));
align.mem.lazy=align.fmem.lazy=true;
align.mem.ready(true);align.fmem.ready(true);
brain.align=align;
// Include observed 5D symbol positions so the geometry causal control is testable.
for(let i=1;i<text.length;i++)brain.trace.geo.learn(text.charCodeAt(i-1),text.charCodeAt(i));
const target=path.join(out,"brain-0-stable+many.v8");
brain.save(target);
console.log(JSON.stringify({fixture:target,bytes:fs.statSync(target).size,synthetic:true}));
