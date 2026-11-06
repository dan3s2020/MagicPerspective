import test from "node:test";
import assert from "node:assert/strict";
import {OnlineSuccessor} from "./successor-online.mjs";
import {LanguageMazeMemory} from "./language-world.mjs";
import {observeCompletedTrainingRows} from "./observe-committed.mjs";

test("actual reverse TD updates learn value of each observed character transition",()=>{
 const model=new OnlineSuccessor({alpha:1,gamma:.9,maxStates:200});
 assert.equal(model.stats().updates,0);
 const r=model.observe("ab");
 assert.equal(r.learned,true);
 assert.equal(model.stats().rows,1);
 assert.equal(model.stats().characters,2);
 assert.equal(model.valueAt(2,"ab").value,1);
 assert.ok(Math.abs(model.valueAt(1,"a").value-.9)<1e-10);
 assert.ok(Math.abs(model.valueAt(0,"").value-.81)<1e-10);
 assert.equal(model.stats().levelUpdates.length,4);
 for(const n of model.stats().levelUpdates)assert.ok(n>0);
});

test("each real finished CUDA batch observation is trained once, while original causal tools can still sample",()=>{
 const m=new LanguageMazeMemory();
 const rows=Array.from({length:37},(_,i)=>({prompt:"Prompt "+i,answer:"response "+i}));
 const expectedChars=rows.reduce((x,row)=>x+[...row.answer].length,0);
 const result=observeCompletedTrainingRows(rows,m);
 assert.deepEqual(result,{observed:37,provided:37});
 assert.equal(m.stats().rowsObserved,37);
 assert.equal(m.stats().successorTraining.rows,37);
 assert.equal(m.stats().successorTraining.characters,expectedChars);
 assert.equal(m.stats().characterTransitionsObserved,expectedChars);
 assert.ok(m.stats().successorTraining.updates>=expectedChars);
 // Existing causal tools' sampled subset is not silently used as a
 // replacement for the complete, independently trained language world.
 assert.ok(m.stats().successorTraining.rows>8);
});

test("original attraction function and stored answer remain unchanged while hybrid uses actual online TD values",()=>{
 const m=new LanguageMazeMemory();
 for(const [q,a]of [
  ["Which gate is open?","East"],
  ["Which gate is open?","West"],
  ["Which gate is open?","East"],
  ["Which gate is open?","East"]
 ])observeCompletedTrainingRows([{prompt:q,answer:a}],m);
 const snapshot=JSON.stringify(m.export());
 const baseline=m.plan("Which gate is open?",{mode:"original"});
 const hybrid=m.plan("Which gate is open?",{mode:"hybrid"});
 assert.equal(baseline.successor.enabled,false);
 assert.equal(hybrid.successor.enabled,true);
 assert.ok(hybrid.successor.onlineCoveredNodes>0);
 assert.ok(hybrid.successor.training.updates>0);
 assert.equal(hybrid.successor.training.rows,4);
 assert.equal(hybrid.successor.onlineSource,"ONLINE_REVERSE_TD_OBSERVED_QA_WITH_FALLBACK");
 assert.deepEqual(baseline.field,hybrid.field,"V17 attraction values must be bit-for-bit identical");
 assert.ok(hybrid.graph.nodes.some(x=>Number.isFinite(x.successorOnline)));
 assert.ok(hybrid.graph.nodes.every(x=>x.successorEmpirical===null||Number.isFinite(x.successorEmpirical)));
 assert.equal(JSON.stringify(m.export()),snapshot,"read-only planning must not train TD");
 m.frozenCompare([{prompt:"Which gate is open?",answer:"East"}],{mode:"hybrid"});
 assert.equal(JSON.stringify(m.export()),snapshot,"frozen evaluation cannot update online learner");
});

test("one Q/A observation is never counted twice when causal text tools process the sampled row",()=>{
 const m=new LanguageMazeMemory();
 observeCompletedTrainingRows([{prompt:"What is A?","answer":"A"}],m);
 const before=m.stats().successorTraining;
 assert.equal(before.rows,1);
 // Another read-only planning call cannot reinsert this completed training row.
 m.plan("What is A?");
 assert.deepEqual(m.stats().successorTraining,before);
});

test("checkpoint preserves trained values and training counters; legacy V18 checkpoints load cold",()=>{
 const m=new LanguageMazeMemory();
 for(const [q,a]of [["find jewel","Under oak"],["find key","Beside rock"]])
  observeCompletedTrainingRows([{prompt:q,answer:a}],m);
 const data=JSON.parse(JSON.stringify(m.export()));
 const restored=LanguageMazeMemory.restore(data);
 assert.deepEqual(restored.export(),data);
 assert.deepEqual(restored.onlineSuccessor.valueAt(3,"Und"),m.onlineSuccessor.valueAt(3,"Und"));
 assert.equal(restored.stats().successorTraining.restored,true);
 assert.equal(restored.stats().successorTraining.rows,2);
 const legacy={...data};delete legacy.successorOnline;
 const cold=LanguageMazeMemory.restore(legacy);
 assert.equal(cold.stats().rowsObserved,2);
 assert.equal(cold.stats().successorTraining.rows,0);
 observeCompletedTrainingRows([{prompt:"new prompt",answer:"new answer"}],cold);
 assert.equal(cold.stats().successorTraining.rows,1);
 assert.equal(restored.stats().successorTraining.rows,2);
});

test("all four temporal resolutions learn from a genuine long complete response without fake goal shortcuts",()=>{
 const m=new OnlineSuccessor({maxStates:10000});
 const answer="a".repeat(262145);
 m.observe(answer);
 assert.equal(m.stats().rows,1);
 assert.equal(m.stats().characters,262145);
 assert.ok(m.stats().levelUpdates.every(x=>x>1),"every scale must be trained");
 assert.ok(m.stats().hierarchicalBridges>=0,"multiscale bridge count must be tracked");
 assert.equal(m.stats().levels.at(-1),262144);
 assert.ok(m.stats().states<=m.maxStates,"memory cap enforced");
 assert.equal(m.stats().lastEpisodeLength,262145);
 assert.ok(Number.isFinite(m.stats().tdAbsMean));
});

test("invalid or empty rows do not train; corrupt checkpoints are refused",()=>{
 const m=new LanguageMazeMemory();
 const r=observeCompletedTrainingRows([null,{},{"prompt":"","answer":"oops"},
   {prompt:"valid",answer:""},{prompt:"valid",answer:"YES"}],m);
 assert.deepEqual(r,{observed:1,provided:5});
 assert.equal(m.stats().successorTraining.rows,1);
 const bad=m.export();bad.successorOnline.states=[["0:0:",{value:Infinity,visits:1}]];
 assert.throws(()=>LanguageMazeMemory.restore(bad),/Corrupt online successor/);
});
