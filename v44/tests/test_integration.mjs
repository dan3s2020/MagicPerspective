import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import readline from "node:readline";

const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function eventually(fn,timeoutMs=90000){
  const started=Date.now(),errors=[];
  while(Date.now()-started<timeoutMs){
    try{const value=await fn();if(value)return value}
    catch(e){errors.push(String(e));}
    await sleep(250);
  }
  throw Error("Timed out waiting for V44 real CPU test progress. Last errors: "+errors.slice(-2).join("; "));
}
test("V44 full HTTP + REAL PyTorch learner + separate reader + journal + control protocol",{
  timeout:120000
},async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v44-ci-"));
  let child=null;
  try{
    let seed=41;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed/4294967296)-.5};
    const dim=8;
    const rows=Array.from({length:256},()=>{const v=Array.from({length:dim},rng),len=Math.hypot(...v);return v.map(x=>x/len)});
    const axes=Array.from({length:dim},(_,i)=>Array.from({length:dim},(_,k)=>Number(i===k)));
    const atlas=path.join(tmp,"SYNTHETIC-UNIT-TEST-NOT-GGUF.json");
    fs.writeFileSync(atlas,JSON.stringify({format:"braivour/v42-brain-character/v1",
      source_genuine_gguf:false,provenance:{donor_path:"SYNTHETIC CPU UNIT TEST"},
      output_rows:rows,movement_axes:axes}));
    const corpus=path.join(tmp,"synthetic-rows.jsonl");
    const QA=Array.from({length:10},(_,i)=>({prompt:"Question "+i+" about actual transform "+i,
      answer:("Answer "+i+": changing structure requires checking heldout "+i+"; ").repeat(8)}));
    fs.writeFileSync(corpus,QA.map(x=>JSON.stringify(x)).join("\n")+"\n");
    const py=process.env.V44_TEST_PYTHON||"python";
    child=spawn(process.execPath,[path.join(here,"server.mjs"),
      "--ci-synthetic","--no-browser","--python",py,
      "--dataset",corpus,"--atlas",atlas,"--runtime",path.join(tmp,"runtime"),"--port","0","--batch","2"],{
        env:{...process.env,V44_ALLOW_CI_SYNTHETIC:"1"},stdio:["ignore","pipe","pipe"]});
    const stderr=[];child.stderr.on("data",data=>stderr.push(data.toString()));
    let address;
    const out=readline.createInterface({input:child.stdout});
    out.on("line",line=>{
      if(line.startsWith("MAGICPERSPECTIVE_V44="))address=line.slice("MAGICPERSPECTIVE_V44=".length);
    });
    const base=await eventually(()=>address,15000);
    const get=async p=>(await (await fetch(base+p)).json());
    const post=async(action,body={})=>{
      const res=await fetch(base+"/api/control",{method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action,...body})});
      if(!res.ok)throw Error(JSON.stringify(await res.json()));
      return res.json();
    };
    const starting=await eventually(async()=>{
      const state=await get("/api/state");
      return state.status==="PAUSED"&&state.train_rows===8?state:null;
    },90000);
    assert.equal(starting.completed,0);
    assert.equal(starting.ci_synthetic_test,true);
    assert.equal(starting.real_dataset,false);
    const page=await fetch(base+"/");
    assert.ok((await page.text()).includes("Language <em>Flow</em>"));
    assert.equal((await fetch(base+"/studio.js")).status,200);
    await post("start");
    const seen=await eventually(async()=>{
      const state=await get("/api/state");
      if(state.status==="ERROR")throw Error("Backend error "+state.last_error);
      return state.completed>=8?state:null;
    },90000);
    assert.equal(seen.completed,8);
    assert.equal(seen.train_rows,8);
    assert.equal(seen.current_source_index,7);
    assert.equal(seen.source_read,8);
    assert.equal(seen.learned_exercises_this_session,8);
    assert.equal(seen.first_shape_verified,65536);
    assert.equal(seen.first_shape_total,65536);
    assert.ok(seen.current.bytes>0);
    assert.equal(seen.current.shape_verified,seen.current.bytes);
    assert.ok(seen.gpu_batch_exercises_per_second>0);
    assert.equal(seen.gpu_batch_characters_per_second>0,false);
    assert.equal(seen.graph.some(e=>e.count>0),true);
    const history=await get("/api/history?limit=8");
    assert.equal(history.items.length,8);
    const replay=await get("/api/exercise?id=7");
    assert.ok(replay.item);
    assert.equal(replay.item.answer,QA[7].answer);
    assert.equal(Buffer.from(replay.item.before_mask,"base64").length,replay.item.bytes);
    assert.equal(Buffer.from(replay.item.shape_mask,"base64").length,replay.item.bytes);
    assert.equal(Buffer.from(replay.item.after_mask,"base64").length,replay.item.bytes);
    await post("save");
    await eventually(async()=>fs.existsSync(path.join(tmp,"runtime","v44-learner.pt")),30000);
    await post("stop");
    await eventually(async()=>{const s=await get("/api/state");return s.status==="STOPPED"?s:null},30000);
    assert.equal(stderr.length,0,"Engine stderr "+stderr.slice(-1).join(""));
  }finally{
    if(child){
      child.kill("SIGTERM");
      await sleep(100);
      if(child.exitCode===null)child.kill("SIGKILL");
    }
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
