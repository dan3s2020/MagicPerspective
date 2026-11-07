import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {LiveHyperMaze,parseHeldoutText}
 from "../transcend/torus-aether/devour/live-hypermaze.mjs";

test("fresh model is actually EMPTY: no invented routes, graph edges or accuracy",()=>{
 const m=new LiveHyperMaze();
 assert.equal(m.report().rows,0);
 assert.equal(m.report().learnedEdges,0);
 assert.equal(m.report().learnedStates,0);
 assert.equal(m.report().nextTokenAccuracy,null);
 const r=m.preview("What is the relationship between A and B?");
 assert.equal(r.path.length,0);
 assert.equal(r.answerAvailable,false);
});
test("prediction is made before answer's first token enters the trained graph, with actual alternatives and measured errors",()=>{
 const m=new LiveHyperMaze({maxContexts:300,previewSteps:12});
 const first=m.learn("What is the sky color?", "blue blue blue.",{episode:7});
 assert.equal(first.predictedRoute.length,0);
 assert.equal(first.freeRunTokenMatches,0);
 assert.equal(first.corpusEpisode,7);
 assert.equal(first.answerShownToModelBeforePrediction,false);
 assert.equal(first.comparedBeforeTraining,true);
 const next=m.learn("What is the sky color?", "blue blue green.",{episode:8});
 assert.ok(next.predictedRoute.length>0);
 assert.ok(next.frames.some(x=>x.options.length>0));
 assert.ok(next.frames.some(x=>!x.correct));
 assert.equal(m.report().rows,2);
 assert.ok(m.report().learnedEdges>0);
 assert.equal(m.report().sourceCounts.qa,2);
});
test("prequential model learns on ACTUAL text-like observed Q/A rows and beats a no-context control on repeated context families",()=>{
 const m=new LiveHyperMaze({maxContexts:2000,previewSteps:10});
 const examples=[
   ["The weather in Paris is", "sunny today."],
   ["The weather in London is", "rainy today."],
   ["The weather in Bucharest is", "windy today."],
   ["The weather in Oslo is", "snowy today."]
 ];
 for(let epoch=0;epoch<350;epoch++){
   const [prompt,answer]=examples[epoch%examples.length];
   m.learn(prompt,answer,{episode:epoch});
 }
 const frozen=m.evaluateFrozen(examples.map(([prompt,answer])=>({prompt,answer})));
 assert.ok(frozen.nextTokenAccuracy>frozen.unigramAccuracy,
   JSON.stringify(frozen));
 assert.equal(frozen.trainingRowsBefore,350);
 assert.equal(frozen.trainingRowsAfter,350);
 assert.equal(frozen.noTrainingOnHeldout,true);
 assert.ok(m.report().contextScale>0);
});
test("checkpoint restores learned transitions, histories, progress counters and produces identical frozen predictions",()=>{
 const m=new LiveHyperMaze({maxContexts:250,previewSteps:8,noise:0.2});
 for(let i=0;i<90;i++)m.learn("Question number "+(i%3),i%3===0?"alpha!":i%3===1?"beta!":"gamma!",
  {source:"prose",episode:i});
 const checkpoint=JSON.parse(JSON.stringify(m.export()));
 const restored=LiveHyperMaze.restore(checkpoint);
 assert.deepEqual(restored.report(),m.report());
 const prompt="Question number 1";
 assert.deepEqual(restored.preview(prompt,{seed:123,noise:0}),
   m.preview(prompt,{seed:123,noise:0}));
 const held=[{prompt:"Question number 2",answer:"gamma!"}];
 assert.deepEqual(restored.evaluateFrozen(held),m.evaluateFrozen(held));
 const e=restored.learn("Question number 1","beta!",{episode:90});
 assert.equal(e.episode,91);
 assert.equal(restored.report().rows,91);
 assert.equal(m.report().rows,90);
});
test("held-out evaluation freezes learned graph and can use the original V17 Q/A split without training leakage",()=>{
 const m=new LiveHyperMaze();
 for(let i=0;i<110;i++)m.learn("What's next?","apple orange pear.");
 const before=JSON.stringify(m.export());
 const examples=[
  parseHeldoutText("Q: Question one\nA: Answer one is unobserved.\n\n"),
  parseHeldoutText("Q: Question two\nA: Answer two is also unobserved."),
  parseHeldoutText("A separate sentence. Another sentence.\nNext paragraph.")
 ].filter(Boolean);
 assert.equal(examples.length,3);
 const result=m.evaluateFrozen(examples);
 assert.equal(result.frozen,true);
 assert.equal(result.noTrainingOnHeldout,true);
 assert.equal(result.rows,3);
 assert.equal(result.trainingTokensBefore,result.trainingTokensAfter);
 assert.equal(before,JSON.stringify(m.export()));
});
test("all real UI controls and learner output fields exist in original page and are genuinely wired",()=>{
 const root=new URL("../transcend/torus-aether/",import.meta.url);
 const index=fs.readFileSync(new URL("ui/index.html",root),"utf8");
 const ui=fs.readFileSync(new URL("ui/corpus-hypermaze-live.js",root),"utf8");
 const application=fs.readFileSync(new URL("ui/app.js",root),"utf8");
 const worker=fs.readFileSync(new URL("devour/worker.mjs",root),"utf8");
 const server=fs.readFileSync(new URL("devour/devour.mjs",root),"utf8");
 for(const id of ["hypermazeBox","hypermazeCanvas","hypermazeTimeline",
  "hypermazeRows","hypermazeTokens","hypermazeAccuracy","hypermazeBaseline",
  "hypermazeDepth","hypermazeBits","hypermazeStates","hypermazeEdges",
  "hypermazePlay","hypermazePause","hypermazePrev","hypermazeNext",
  "hypermazeRestart","hypermazeScrub","hypermazeSpeed","hypermazeEval",
  "hypermazeExport","hypermazeNoise","hypermazeEvalOut"]){
  assert.ok(index.includes('id="'+id+'"'),id+" absent from original UI");
  assert.ok(ui.includes('"'+id+'"'),id+" inert in view module");
 }
 assert.ok(application.includes("corpusHyperMaze?.update(gs)"));
 assert.ok(application.includes("corpusHyperMaze?.tick(performance.now())"));
 assert.ok(worker.includes("absorbHyperMaze(row)"));
 assert.ok(worker.includes("absorbHyperMaze(ex)"));
 assert.ok(worker.includes("hyperMaze.evaluateFrozen("));
 assert.ok(server.includes('url==="/hypermaze-eval"'));
 assert.ok(server.includes('url==="/hypermaze-config"'));
});
