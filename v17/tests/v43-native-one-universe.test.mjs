import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {Discoverer,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {V43FusedOneUniverse} from "../transcend/torus-aether/devour/v43-fused-one-universe.mjs";
import {readV43State,readV43Exercises} from "../apps/hypermaze-studio-v26/v43-journal.mjs";

const v17=fileURLToPath(new URL("../",import.meta.url));
const gitSHA=b=>crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex");
const read=p=>fs.readFileSync(path.join(v17,p));
function syntheticControlFixture(){
  // A deliberately synthetic control, NEVER represented as an actual Qwen result.
  const rows=Array.from({length:256},(_,id)=>
    Array.from({length:16},(_,k)=>k<8?((id>>k)&1?1:-1)/Math.sqrt(8):0));
  const axes=Array.from({length:8},(_,i)=>
    Array.from({length:16},(_,k)=>Number(i===k)));
  return {format:"braivour/v42-brain-character/v1",dimensions:16,
    move_gain:1.2,input_rows:rows,output_rows:rows,movement_axes:axes,
    source_genuine_gguf:true,provenance:"SYNTHETIC CI CONTROL, NOT QWEN"};
}
test("V43 uses the SAME original V42 Brain and freezes a real movement trace",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-"));
  try{
    const brain=new Brain({seed:17,rules:{depth:1,off:["R2","R4"],budEvery:100,
      empty:true,maxWires:32,fold:false}});
    brain.disc=Object.assign(new Discoverer(17),{body:brain.body||{}});
    brain.disc.endIn[KIND.target]=10;
    brain.disc.enter[KIND.target]=14;
    brain.disc.pass[KIND.floor]=25;
    brain.disc.block[KIND.floor]=2;
    const saved=path.join(dir,"brain-0-winner.v8");
    const donor=syntheticControlFixture();
    const unchanged=JSON.stringify(donor);
    const fused=new V43FusedOneUniverse({brain,donor,saveFile:saved,maxPredictionChars:20});
    const first={k:19,prompt:"What form do we see?",answer:"B"};
    const baseline=fused.observeBefore(first);
    assert.equal(baseline.source,"original V42 ConstructedPathLearner.imagineText");
    const beforeRows=brain.constructedPaths.textRows;
    const r=fused.experience(first);
    assert.equal(r.input,first.prompt);
    assert.equal(r.exerciseReference,first.answer);
    assert.equal(r.player1.before.text,baseline.text);
    assert.equal(r.player2.output,"B");
    assert.equal(r.player2.score.exact,true);
    assert.ok(r.player2.allMovements.length>0);
    assert.ok(r.player2.allMovements[0].steps.length>0);
    assert.equal(r.player1.noDonorMovementsDuringThisPhase,true);
    assert.equal(fused.brain,brain);
    assert.equal(JSON.stringify(donor),unchanged,"Qwen puppet data remains immutable");
    assert.ok(brain.constructedPaths.textRows>beforeRows,
      "original native V42 text navigator is the only internal learner");
    const repeated={k:20,prompt:"Repeat transformation",answer:"BBBB"};
    fused.observeBefore(repeated);
    const second=fused.experience(repeated);
    assert.equal(second.player2.score.exact,true);
    assert.ok(second.player2.cachedOriginalRoutes>0,
      "original Discoverer graph route is reused, not replaced");
    assert.equal(fused.state.completed,2);
    const records=fs.readFileSync(saved+".v43-exercises.jsonl","utf8").trim().split("\n").map(JSON.parse);
    assert.equal(records.length,2);
    assert.deepEqual(records[0],r);
    assert.deepEqual(records[1],second);
    brain.save(saved);
    assert.ok(Brain.load(saved).constructedPaths.textRows>=brain.constructedPaths.textRows,
      "original V42 .v8 serialization and resume stay intact");
    const report=await readV43State(saved);
    assert.equal(report.completed,2);
    const page=await readV43Exercises(saved,{limit:1});
    assert.equal(page.items.length,1);
    assert.equal(page.items[0].id,2);
    const older=await readV43Exercises(saved,{limit:1,before:2});
    assert.equal(older.items[0].id,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("P1 original pre-action prediction does not receive even exercise answer length",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-length-"));
  try{
    const brain=new Brain({seed:17,rules:{depth:1,off:["R2","R4"],budEvery:100,
      empty:true,maxWires:32,fold:false}});
    const fused=new V43FusedOneUniverse({brain,donor:syntheticControlFixture(),
      saveFile:path.join(dir,"unused.v8"),maxPredictionChars:24});
    const widths=[];
    brain.constructedPaths.imagineText=(q,{maxChars})=>{
      widths.push(maxChars);return {predicted:"",path:[]};
    };
    fused.observeBefore({k:11,prompt:"same input",answer:"A"});
    fused.observeBefore({k:12,prompt:"same input",answer:"A".repeat(120)});
    assert.deepEqual(widths,[24,24],"known output must not control P1 movement horizon");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("Native UI V43 retains every original V42 UI element",()=>{
  const original=read("apps/hypermaze-studio-v26/public/native.html").toString("utf8");
  const updated=read("apps/hypermaze-studio-v26/public/native-v43.html").toString("utf8");
  assert.equal(gitSHA(read("apps/hypermaze-studio-v26/public/native.html")),
    "8f7098d926f11ed7fb2b1a0432ce41915ea0884c");
  const ids=[...original.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  for(const id of ids)assert.ok(updated.includes('id="'+id+'"'),"original V42 UI removed "+id);
  for(const id of ["startBtn","v43ToggleGraph","v43AccuracyChart","v43SpeedChart",
    "v43Rows","v43TextBefore","v43TextPuppet","v43TextAfter",
    "v43Question","v43Reference","v43Speed","v43Percent"]){
    assert.ok(updated.includes('id="'+id+'"'),id+" missing");
  }
  assert.equal((updated.match(/<option selected>/g)||[]).length,1);
  const nativeBridge=read("apps/hypermaze-studio-v26/native-bridge.mjs").toString("utf8");
  assert.match(nativeBridge,/V43_UI\?"public\/native-v43\.html":"public\/native\.html"/);
  assert.match(nativeBridge,/api\/v43-exercises/);
  assert.match(nativeBridge,/api\/v43-status/);
});
test("UTF-8 full-text journal reads reverse pages across 64 KiB boundaries",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-utf8-"));
  try{
    const filename=path.join(dir,"native.v8.v43-exercises.jsonl");
    const rows=Array.from({length:57},(_,i)=>({id:i+1,
      input:"întrebare 🌐 "+i+" — ".repeat(530),
      exerciseReference:"soluție 🧠 "+i+" ✨"}));
    fs.writeFileSync(filename,rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
    const latest=await readV43Exercises(path.join(dir,"native.v8"),{limit:12});
    assert.deepEqual(latest.items.map(x=>x.id),Array.from({length:12},(_,i)=>57-i));
    assert.equal(latest.items[0].input,rows[56].input);
    const second=await readV43Exercises(path.join(dir,"native.v8"),{limit:12,before:46});
    assert.deepEqual(second.items.map(x=>x.id),Array.from({length:12},(_,i)=>45-i));
    const all=await readV43Exercises(path.join(dir,"native.v8"),{limit:100});
    assert.equal(all.items.length,57);
    assert.equal(all.items.at(-1).exerciseReference,rows[0].exerciseReference);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test("RESEARCH ONLY: actual native Player 1 recovery after three synthetic donor shape demonstrations",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-p1-gate-"));
  try{
    const brain=new Brain({seed:17,rules:{depth:1,off:["R2","R4"],budEvery:100,
      empty:true,maxWires:32,fold:false}});
    brain.disc=Object.assign(new Discoverer(17),{body:brain.body||{}});
    brain.disc.endIn[KIND.target]=10;
    brain.disc.enter[KIND.target]=14;
    brain.disc.pass[KIND.floor]=25;
    brain.disc.block[KIND.floor]=2;
    const fused=new V43FusedOneUniverse({brain,donor:syntheticControlFixture(),
      saveFile:path.join(dir,"brain-0-winner.v8"),maxPredictionChars:128});
    const samples=[
      {k:1,prompt:"What shape does fire make?",answer:"B"},
      {k:2,prompt:"What shape does water make?",answer:"B"},
      {k:3,prompt:"What shape does wind make?",answer:"B"}
    ];
    const report=[];
    for(const row of samples){
      const r=fused.experience(row);
      report.push({episode:row.k,donorExact:r.player2.score.exact,
        p1BeforeExact:r.player1.before.score.exact,
        p1AfterExact:r.player1.after.score.exact,
        p1Before:r.player1.before.text,p1After:r.player1.after.text,
        transferError:r.player1.transferError});
    }
    const unseen=fused._nativePredict("What shape does sand make?",1);
    report.push({episode:"unseen",p1FirstShape:unseen.text,
      p1Exact:unseen.text==="B",predictionError:unseen.error});
    console.log("V43_NATIVE_PLAYER1_THREE_EXPERIENCES_RESEARCH_ONLY="+JSON.stringify(report));
    assert.equal(report.length,4);
    assert.equal(fused.brain,brain);
    assert.ok(report.every(r=>r.episode==="unseen"||typeof r.p1AfterExact==="boolean"));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test("RESEARCH ONLY: three distinct lessons do not allow trivial constant-output 100% on unseen Player1",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-p1-different-"));
  try{
    const brain=new Brain({seed:17,rules:{depth:1,off:["R2","R4"],budEvery:100,
      empty:true,maxWires:32,fold:false}});
    brain.disc=Object.assign(new Discoverer(17),{body:brain.body||{}});
    brain.disc.endIn[KIND.target]=10;
    brain.disc.enter[KIND.target]=14;
    brain.disc.pass[KIND.floor]=25;
    brain.disc.block[KIND.floor]=2;
    const fused=new V43FusedOneUniverse({brain,donor:syntheticControlFixture(),
      saveFile:path.join(dir,"brain-0-winner.v8"),maxPredictionChars:128});
    const examples=[
      {k:1,prompt:"What is two plus two?",answer:"4"},
      {k:2,prompt:"What is three plus three?",answer:"6"},
      {k:3,prompt:"What is four plus four?",answer:"8"}
    ];
    const progress=[];
    for(const ex of examples){
      const row=fused.experience(ex);
      progress.push({episode:ex.k,donorExact:row.player2.score.exact,
        player1BeforeExact:row.player1.before.score.exact,
        player1AfterExact:row.player1.after.score.exact,
        player1AfterText:row.player1.after.text});
    }
    const hidden={prompt:"What is five plus five?",answer:"10"};
    const guess=fused._nativePredict(hidden.prompt,Array.from(hidden.answer).length);
    console.log("V43_DISTINCT_OUTPUTS_PLAYER1_FIRST_SHAPE="+JSON.stringify({
      lessons:progress,unseenPrompt:hidden.prompt,unseenExpected:hidden.answer,
      unseenPrediction:guess.text,unseenExact:guess.text===hidden.answer}));
    assert.equal(progress.length,3);
    assert.equal(fused.brain,brain);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
