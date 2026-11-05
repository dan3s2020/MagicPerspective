// node transcend/torus-aether/measure.mjs [steps] [text-file ...]
// Without files: the engine's synthetic corpus + real English prose from this repo's docs/*.md.
// With files: each ASCII text file (100..100000 chars, >=5 lines of 16+ chars) is its own corpus.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {run, Torus, Aether, splitCorpus} from "./torus.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const keep = s => s.length >= 40 && /^[\x20-\x7e]+$/.test(s) && /^[A-Za-z]/.test(s) && !/[|`{}<>]/.test(s);
export function corpusFromText(text, maxChars = 99000) {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(keep);
  let out = "", i = 0; while (i < lines.length && out.length + lines[i].length + 1 < maxChars) out += lines[i++] + "\n";
  return splitCorpus(out);
}
export const repoDocsCorpus = () => corpusFromText(fs.readdirSync(path.join(root, "docs")).filter(f => f.endsWith(".md")).sort()
  .map(f => fs.readFileSync(path.join(root, "docs", f), "utf8")).join("\n"));

const make = () => ({
  tori: {"torus": new Torus({mode: "crystal"}), "torus-noC": new Torus({mode: "crystal", useC: false})},
  aethers: {"aether": new Aether({mode: "crystal", beta: 0.5})},
});
const show = (name, r) => {
  console.log(`\n== ${name}  steps=${r.steps} heldout=${r.samples} C-perspective=${r.perspective}`);
  for (const k of Object.keys(r.accuracy))
    console.log(`${k.padEnd(10)} acc ${(100 * r.accuracy[k]).toFixed(1).padStart(5)}%   bits/char ${r.bitsPerChar[k].toFixed(3)}` +
      (r.angles[k] ? `   A:B ${(100 * r.angles[k].Ashare).toFixed(0)}:${(100 - 100 * r.angles[k].Ashare).toFixed(0)}  C share ${(100 * r.angles[k].Cshare).toFixed(0)}%  points ${r.angles[k].points}` : "") +
      (r.wires[k] ? `   strongest wires: ${r.wires[k]}` : ""));
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const steps = +(process.argv[2] || 40000), files = process.argv.slice(3);
  if (!files.length) {
    show("synthetic (engine corpus)", run({steps: Math.min(steps, 5000), ...make()}));
    show("real prose (repo docs)", run({corpus: repoDocsCorpus(), steps, ...make()}));
  } else for (const f of files) show(f, run({corpus: corpusFromText(fs.readFileSync(f, "utf8")), steps, ...make()}));
}
