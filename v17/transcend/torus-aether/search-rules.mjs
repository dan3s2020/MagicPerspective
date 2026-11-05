// node transcend/torus-aether/search-rules.mjs <phase> <corpus-file> [steps]
// Systematic search over arrangements of the six rules: each rule switched off, alternatives, parameters.
// Prints one JSON line per corpus: held-out top-1 accuracy and bits/char for every configuration.
import fs from "node:fs";
import {runEmergent} from "./measure-emergent.mjs";
import {corpusFromText} from "./measure.mjs";

export const PHASES = {
  ablate: {
    "all 6 rules": {depth: 1},
    "-R2 resistance": {depth: 1, off: ["R2"]},
    "-R3 trust": {depth: 1, off: ["R3"]},
    "-R4 flow": {depth: 1, off: ["R4"]},
    "-R5 budding (1 wire)": {depth: 1, off: ["R5"]},
    "R5 -> all wires born": {depth: 1, off: ["R5all"]},
    "-R6 dissolution": {depth: 1, off: ["R6"]},
    "seeker B instead of C": {depth: 1, seeker: "B"},
  },
  tune: {
    "beta .25": {depth: 1, beta: 0.25},
    "beta 1": {depth: 1, beta: 1},
    "bud every 100": {depth: 1, budEvery: 100},
    "bud every 1600": {depth: 1, budEvery: 1600},
    "leak .02": {depth: 1, leak: 0.02},
    "max 32 wires": {depth: 1, maxWires: 32},
  },
};
const [phase, file, steps = "40000"] = process.argv.slice(2);
const configs = phase.startsWith("{") ? JSON.parse(phase) : PHASES[phase];
const r = runEmergent({corpus: corpusFromText(fs.readFileSync(file, "utf8")), steps: +steps, configs});
console.log(JSON.stringify({file: file.split("/").pop(), acc: Object.fromEntries(Object.entries(r.LIVE).map(([k, v]) => [k, v.acc])),
  bits: Object.fromEntries(Object.entries(r.LIVE).map(([k, v]) => [k, v.bits])), forms: r.forms}));
