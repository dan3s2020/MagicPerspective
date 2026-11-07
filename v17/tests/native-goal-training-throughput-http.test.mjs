// Original V17 runtime, no fake worker and no next-character trainer:
// ingest ALL actual Q/A paragraphs, measure sustained end-to-end wall time,
// check original UI and real PRE-observation whole-answer probe events.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{
  const s=net.createServer();s.once("error",reject);
  s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});

test("actual V17 goal-training consumes complete real Q/A rows, streams whole-answer blind probes, measures throughput honestly", {timeout:180000},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v17-goal-throughput-"));
  const file=path.join(dir,"real-qa.txt"),out=path.join(dir,"out");
  const rows=[];
  for(let a=0;a<25;a++)for(let b=0;b<20;b++)
    rows.push("Q: What is "+a+" plus "+b+"?\nA: "+a+" + "+b+" = "+(a+b)+".");
  fs.writeFileSync(file,rows.join("\n\n")+"\n","utf8");
  const p=await freePort(),base="http://127.0.0.1:"+p,start=Date.now();
  const proc=spawn(process.execPath,[
    "transcend/torus-aether/devour/devour.mjs",
    "--workers","1","--arms","stable+many","--worlds","text",
    "--gpu","off","--goal-training","--unified-world",
    "--text",file,"--out",out,"--port",String(p),"--start",
    "--every","1000000","--mem","2"
  ],{cwd:v17,detached:true,stdio:["ignore","pipe","pipe"]});
  let logs="";
  for(const stream of [proc.stdout,proc.stderr])
    stream.on("data",b=>logs=(logs+String(b)).slice(-12000));
  const json=async route=>{
    const r=await fetch(base+route,{cache:"no-store"});
    assert.equal(r.status,200,route);return r.json();
  };
  try{
    let ready=false;
    for(let i=0;i<250;i++){
      try{const r=await fetch(base+"/graphs");if(r.ok){ready=true;break;}}catch{}
      if(proc.exitCode!==null)break;
      await sleep(70);
    }
    assert.ok(ready,"Original V17 server failed: "+logs);
    let snapshot=null;
    for(let i=0;i<650;i++){
      const result=await json("/graphs"),g=result.graphs[0];
      assert.equal(result.goalTraining,true,"Not the genuine structural goal training mode");
      if(g?.progress?.done>=450&&g?.nativeGoalField?.observedNumericQAPairs>=450){
        snapshot=g;break;
      }
      await sleep(100);
    }
    assert.ok(snapshot,"Real Q/A goal training did not fully process 450/450 train rows: "+logs);
    assert.equal(snapshot.progress.total,450);
    assert.equal(snapshot.progress.done,450);
    assert.ok(snapshot.nativeGoalField.correlatedTransitions>100);
    const wallSec=(Date.now()-start)/1000,rate=450/wallSec;
    const live=await json("/goal-stream?w=0");
    assert.equal(live.goalTraining,true);
    assert.ok(live.events.length>=12,JSON.stringify(live));
    const first=live.events[0],last=live.events.at(-1);
    assert.ok(first.trainedBeforeRow<first.exercise);
    assert.ok(last.observedBytes>0);
    assert.ok(typeof last.actualAfterPlanning==="string");
    assert.equal(last.noNextCharacterFallback,true);
    assert.ok(last.frozenRoute);
    const chat=await fetch(base+"/chat",{method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({w:0,history:[["you","What is 27 plus 21?"]],
        opts:{mode:"goal-path",learn:false}})});
    assert.equal(chat.status,200);
    const answer=await chat.json();
    assert.equal(answer.mode,"goal-path");
    assert.equal(answer.noNextCharacterFallback,true);
    assert.equal(answer.text,"27 + 21 = 48.");
    assert.equal(answer.predictedFullAnswerBeforeFirstCharacter,answer.text);
    const final=await json("/graphs");
    assert.equal(final.graphs[0].goalTraining,true);
    assert.equal(final.graphs[0].nativeGoalField.observedNumericQAPairs,450);
    // Score ALL 50 completely unseen source Q/A pairs, not only a few chosen
    // follow-up queries or teacher-forced next-character probabilities.
    const held=final.graphs[0].nativeGoalHeldout;
    assert.equal(held?.tested,50,"Entire actual heldout split must be scored");
    assert.equal(held?.exact,50,JSON.stringify(held));
    assert.equal(held?.referenceAnswerUsedOnlyAfterFullPlan,true);
    const phases=final.graphs[0].goalPipeline?.phases||{};
    for(const stage of ["language-perspectives","constructed-path-and-coupled-axes",
      "observed-text-transformations","causal-actions-shared-experience"])
      assert.equal(phases[stage]?.calls,450,"Missing actual learned stage: "+stage);
    assert.equal(final.graphs[0].goalPipeline?.sourceRows,450);
    assert.ok(final.graphs[0].goalPipeline?.measuredRowsPerSecond>0);
    console.log("REAL_NATIVE_GOAL_TRAINING_THROUGHPUT "+JSON.stringify({
      sourceRows:500,trainingRows:450,heldoutRows:50,
      trainedRows:450,wallSeconds:+wallSec.toFixed(3),
      measuredRowsPerSecond:+rate.toFixed(2),correlatedEffects:snapshot.nativeGoalField.correlatedTransitions,
      blindProbes:live.events.length,firstBlind:!!first.frozenRoute,
      frozenHeldoutCompleteAnswersExact:held.exact,
      frozenHeldoutCompleteAnswersTotal:held.tested,
      workerMeasuredRate:final.graphs[0].goalPipeline?.measuredRowsPerSecond,
      sourceStageTimings:phases,
      unseenCompleteAnswer:answer.text,legacyCharacterMode:false,
      caveat:"Short structured Q/A fixture; NOT user's OpenThoughts or RTX CUDA benchmark"
    }));
  }finally{
    try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
    await sleep(350);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
