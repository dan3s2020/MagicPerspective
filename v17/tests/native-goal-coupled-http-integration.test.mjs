// REAL V17 HTTP + one ORIGINAL worker thread + ORIGINAL Brain checkpoints.
// The heldout correct answers are NOT in corpus or sent to POST /chat.
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
const port=()=>new Promise((resolve,reject)=>{
  const sock=net.createServer();
  sock.once("error",reject);
  sock.listen(0,"127.0.0.1",()=>{const p=sock.address().port;sock.close(()=>resolve(p));});
});

test("real native V17 live HTTP: learn paired Q/A, plan complete unseen answer, replay learned route, no nextchar", {timeout:115000},async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"v17-native-goal-http-"));
  const corpus=path.join(temp,"actual-observed-qa.txt"),out=path.join(temp,"runtime");
  const paragraphs=[];
  for(let a=0;a<=4;a++)for(let b=0;b<=4;b++)
    paragraphs.push("Q: What is "+a+" plus "+b+"?\nA: "+a+" + "+b+" = "+(a+b)+".");
  fs.writeFileSync(corpus,paragraphs.join("\n\n")+"\n","utf8");
  const p=await port(),base="http://127.0.0.1:"+p;
  const proc=spawn(process.execPath,[
    "transcend/torus-aether/devour/devour.mjs",
    "--workers","1","--arms","stable+many","--worlds","text",
    "--gpu","off","--text",corpus,"--out",out,
    "--every","500000","--port",String(p),"--start","--unified-world"
  ],{cwd:v17,stdio:["ignore","pipe","pipe"],detached:true});
  let logs="";
  for(const stream of [proc.stdout,proc.stderr])
    stream.on("data",b=>logs=(logs+String(b)).slice(-11000));
  const get=async url=>{
    const response=await fetch(base+url,{cache:"no-store"});
    assert.equal(response.status,200,url);return response.json();
  };
  const ask=async q=>{
    const response=await fetch(base+"/chat",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({w:0,history:[["you",q]],opts:{mode:"goal-path",learn:false}})
    });
    assert.equal(response.status,200);return response.json();
  };
  try{
    let ready=false;
    for(let i=0;i<160;i++){
      try{const r=await fetch(base+"/graphs");if(r.ok){ready=true;break;}}catch{}
      if(proc.exitCode!==null)break;
      await sleep(100);
    }
    assert.ok(ready,"Original server did not start: "+logs);
    let complete=null;
    for(let i=0;i<350;i++){
      const g=(await get("/graphs")).graphs[0];
      if(g?.nativeGoalField?.observedNumericQAPairs>=22&&g?.progress.done>=22){
        complete=g;break;
      }
      await sleep(100);
    }
    assert.ok(complete,"ACTUAL V17 worker did not learn 22 paired Q/A from 25 rows with 2 heldout: "+logs);
    assert.equal(complete.progress.total,23);
    assert.ok(complete.nativeGoalField.correlatedTransitions>=8);
    const html=await(await fetch(base+"/transcend/torus-aether/ui/index.html?live=1")).text();
    for(const id of ["tabTrain","tabEval","tabObserve","obsCanvas","mazeCv",
      "transCv","realTextRecent","nativeGoalRoutePane","nativeGoalQuestion",
      "nativeGoalAsk","nativeGoalRouteCanvas","cAnswerMode"]){
      assert.ok(html.includes('id="'+id+'"'),"Original or new UI control missing: "+id);
    }
    const ui=await fetch(base+"/transcend/torus-aether/ui/native-goal-live.js");
    assert.equal(ui.status,200,"Real route visualizer must be served by original V17 server");
    assert.match(await ui.text(),/mountNativeGoalPanel/);
    let count=0;
    for(const [a,b] of [[5,5],[5,7],[6,5],[7,6],[7,7]]){
      const r=await ask("What is "+a+" plus "+b+"?");
      const expected=a+" + "+b+" = "+(a+b)+".";
      assert.equal(r.error,undefined,JSON.stringify(r));
      assert.equal(r.mode,"goal-path");
      assert.equal(r.noNextCharacterFallback,true);
      assert.equal(r.plannedBeforeFirstAction,true);
      assert.equal(r.predictedFullAnswerBeforeFirstCharacter,expected,JSON.stringify(r));
      assert.equal(r.text,expected,JSON.stringify(r));
      assert.equal(r.execution.internalMatch,true);
      assert.equal(r.externallySemanticallyVerified,false);
      count++;
    }
    const unknown=await ask("Explain the full mechanism of stellar fusion.");
    assert.equal(unknown.ready,false);
    assert.equal(unknown.text,"");
    assert.equal(unknown.noNextCharacterFallback,true);
    console.log("REAL_NATIVE_V17_HTTP_WHOLE_ANSWER "+JSON.stringify({
      trained:complete.nativeGoalField.observedNumericQAPairs,
      correlatedTransitions:complete.nativeGoalField.correlatedTransitions,
      heldoutTextRows:complete.progress.heldRows,
      exactUnseenGoalAnswers:count,attempts:5,
      liveOriginalUI:true,characterFallback:false,fullShapeBeforeFirstOutput:true
    }));
  }finally{
    try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
    await sleep(350);
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
