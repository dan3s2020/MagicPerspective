// DEEPER CAUSAL TEST: unmodified V42 original Brain; 8nt/4-symbol temporal folding.
// Pair-coded donor+acceptor context is visible to its existing cap=4.
// CAUSAL FOLLOW-UP: four actual junction nucleotides enter V42 C cap=4 at decision time.
// No new classifier, native Brain source unchanged, full 60nt sequence preserved.
// Research-only blind DNA benchmark using the ORIGINAL V42 Brain.
// No replacement predictor, no golden answer in Brain.predict(), no changes to V42.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";

const LABELS = ["EI", "IE", "N"];
const CODES = LABELS.map(x => x.charCodeAt(0)); // E, I, N are distinct
const MAX_TRAIN = Number(process.env.GENOME_MAX_TRAIN || 900);
const MAX_TEST = Number(process.env.GENOME_MAX_TEST || 400);
const bytes = s => Array.from(s, c => c.charCodeAt(0));
const hash = s => Number.parseInt(crypto.createHash("sha256").update(s).digest("hex").slice(0, 8), 16);
const counts = rows => Object.fromEntries(LABELS.map(y => [y, rows.filter(r => r.label === y).length]));

function readDataset(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const out = [], rejected = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 3) { rejected.push(i + 1); continue; }
    const label = cols[0].trim().toUpperCase();
    const name = cols[1].trim();
    const dna = cols.slice(2).join(",").replace(/\s/g, "").toUpperCase();
    if (!LABELS.includes(label) || !name || dna.length !== 60 || !/^[A-Z]+$/.test(dna)) {
      rejected.push(i + 1); continue;
    }
    out.push({label, name, dna, group: name.split("-")[0]});
  }
  if (lines.length !== 3190 || rejected.length) {
    throw new Error("Dataset integrity failure: expected 3190 authentic 60nt rows, received " +
      lines.length + ", rejected=" + rejected.slice(0, 20).join(","));
  }
  return {rows: out, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")};
}

function split(rows) {
  // Whole identifier prefix/biological sequence groups never cross train/test.
  // Grouping is conservative but this historical dataset has limited metadata.
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group).push(r);
  }
  const train = [], test = [];
  for (const [group, records] of groups) {
    const bucket = hash("blind-gene-v1:" + group) % 5;
    (bucket === 0 ? test : train).push(...records);
  }
  train.sort((a, b) => hash("train:" + a.name) - hash("train:" + b.name));
  test.sort((a, b) => hash("test:" + a.name) - hash("test:" + b.name));
  // Identical DNA strings may be repeated under different sample identifiers.
  // Exclude all ambiguous/mixed-label repeats rather than learn or leak the answer.
  const trainSeen = new Set(), trainRows = [];
  for (const r of train) if (!trainSeen.has(r.dna)) {
    trainSeen.add(r.dna); trainRows.push(r);
  }
  const testSeen = new Set(), testRows = [];
  let excludedCrossSplit = 0;
  for (const r of test) {
    if (trainSeen.has(r.dna)) {excludedCrossSplit++; continue;}
    if (!testSeen.has(r.dna)) {testSeen.add(r.dna); testRows.push(r);}
  }
  const trainGroups = new Set(trainRows.map(r=>r.group));
  if (testRows.some(r=>trainGroups.has(r.group))) throw Error("Group leakage");
  return {
    train:trainRows.slice(0,MAX_TRAIN),
    test:testRows.slice(0,MAX_TEST),
    availableTrain:trainRows.length,
    availableTest:testRows.length,
    excludedCrossSplit,
    trainGroups:trainGroups.size,
    testGroups:new Set(testRows.map(r=>r.group)).size
  };
}

// An invertible change in perspective: every nucleotide survives unchanged.
// Put the central putative splice junction within the original Brain's short
// context window; do not change Brain's native 32-byte temporal perception.
function perspective(dna) {
  if (dna.length !== 60) throw Error("Invalid DNA length");
  return dna.slice(0,28) + dna.slice(32,60) + dna.slice(28,32);
}
// Distinct physical perspective operator: fold 8 local nucleotides into 4
// symbols seen by the SAME native Brain C with cap=4. 60 raw nucleotides stay.
function packed8(dna) {
  const pair = (i,j) => {
    const a="ACGT".indexOf(dna[i]),b="ACGT".indexOf(dna[j]);
    return a>=0 && b>=0 ? String.fromCharCode(33+a*4+b) : "?";
  };
  return pair(26,27)+pair(32,33)+pair(28,29)+pair(30,31);
}
const prompt = dna => "DNA " + perspective(dna) + packed8(dna);
function perturbJunction(dna, name) {
  const a = dna.split(""), mid = a.slice(20,40);
  let s = (hash("counterfactual:" + name) | 0) || 1;
  for (let j = mid.length-1; j>0; j--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const k = (s >>> 0) % (j + 1);
    [mid[j],mid[k]]=[mid[k],mid[j]];
  }
  return a.slice(0,20).join("") + mid.join("") + a.slice(40).join("");
}
function classify(brain, dna) {
  const p=brain.predict(bytes(prompt(dna)));
  if (!Array.isArray(p) || p.length < 79 || CODES.some(c => !Number.isFinite(p[c]))) {
    throw Error("Original Brain returned invalid class-byte distribution");
  }
  let best=0;
  for (let i=1;i<CODES.length;i++) if (p[CODES[i]]>p[CODES[best]]) best=i;
  return LABELS[best];
}
function measure(rows, predict) {
  const cm=LABELS.map(()=>LABELS.map(()=>0));
  for (const r of rows) cm[LABELS.indexOf(r.label)][LABELS.indexOf(predict(r))]++;
  const n=rows.length, correct=cm.reduce((s,row,i)=>s+row[i],0);
  const perClass=LABELS.map((label,i)=>{
    const tp=cm[i][i], fn=cm[i].reduce((a,b)=>a+b,0)-tp,
      fp=cm.reduce((a,row)=>a+row[i],0)-tp;
    return {label, support:tp+fn, f1:2*tp/(2*tp+fp+fn||1),
      recall:tp/(tp+fn||1)};
  });
  return {n,accuracy:correct/n,
    macroF1:perClass.reduce((s,x)=>s+x.f1,0)/3,
    balancedAccuracy:perClass.reduce((s,x)=>s+x.recall,0)/3,
    perClass,confusion:cm};
}
function motifRule(r) {
  // Fixed non-trained control, using only canonical GT/AG boundary signals.
  if(r.dna.slice(30,32)==="GT") return "EI";
  if(r.dna.slice(28,30)==="AG") return "IE";
  return "N";
}

const dataFile=process.argv[2];
if(!dataFile)throw Error("Usage: node run.mjs PATH_TO_ORIGINAL_UCI_splice.data");
const {rows,sha256}=readDataset(dataFile);
const data=split(rows);
if(data.train.length < 50 || data.test.length < 50)throw Error("Too few blind grouped samples");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16},c:{cap:4},seed:20261119});
brain.liveWorld="text";
const virgin=measure(data.test,r=>classify(brain,r.dna));
let seen=0;
for(const r of data.train){
  // True label is supplied only while learning. A held-out label is NEVER fed
  // to Brain.live and NEVER passed to Brain.predict.
  for(const ch of bytes(prompt(r.dna)+r.label[0]+"\n")) brain.live(ch,false);
  seen++;
}
const lived=brain.lived;
const native=measure(data.test,r=>classify(brain,r.dna));
const perturbed=measure(data.test,r=>classify(brain,perturbJunction(r.dna,r.name)));
if(brain.lived!==lived)throw Error("Evaluation accidentally trained the original Brain");
const majority=LABELS.reduce((a,b)=>counts(data.train)[b]>counts(data.train)[a]?b:a,LABELS[0]);
const baselines={
  majority:measure(data.test,()=>majority),
  canonicalMotif:measure(data.test,motifRule)
};
const result={
  status:"EXECUTED_NATIVE_BRAIN_ONLY",
  experiment:"2026-11-19-AG2-causal-test-8nt-folded-native-perspective",
  source:"UCI Molecular Biology Splice-Junction Gene Sequences (1991), 3190 sequences",
  rawDatasetSha256:sha256,
  scope:"3-class 60nt splice-junction detection; NOT AlphaGenome 2 direct benchmark",
  originalCode:"v17/transcend/torus-aether/devour/brain.mjs:Brain.live/Brain.predict",
  replacedOriginalMethod:false,
  frozenTest:true,
  testLabelSeenAtInference:false,
  trainLimit:MAX_TRAIN,testLimit:MAX_TEST,
  samples:{raw:rows.length,availableTrain:data.availableTrain,availableTest:data.availableTest,
    train:data.train.length,test:data.test.length,
    excludedCrossSplit:data.excludedCrossSplit,trainGenes:data.trainGroups,
    testGenes:data.testGroups,trainLabels:counts(data.train),testLabels:counts(data.test)},
  nativeBrainLearning:{trainingExercises:seen,livedSymbols:brain.lived},
  untrainedNativeBrain:virgin,
  trainedNativeBrain:native,
  shuffledCentralDNAControl:perturbed,
  baselines,
  beatsMajority:native.macroF1>baselines.majority.macroF1,
  beatsCanonicalMotif:native.macroF1>baselines.canonicalMotif.macroF1,
  beatsAlphaGenome2:"NOT_EVALUATED — AG2 predictions and shared target benchmark absent"
};
console.log("GENOME_NATIVE_BRAIN_RESULTS "+JSON.stringify(result));
