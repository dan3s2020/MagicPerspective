// No synthetic server: the ORIGINAL V17 Node trainer with all four worlds,
// shared graph, endogenous noise, code lock and embodied perspective.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const port=()=>new Promise((ok,no)=>{const s=net.createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});
test('one ORIGINAL live V17 brain trains text, maze, transform, self-code and own noise with perspective and saved graph', {timeout:120000},async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mp-allworlds-'));
  const textPath=path.join(temp,'corpus.txt'),out=path.join(temp,'output');
  const p=await port();
  fs.writeFileSync(textPath,Array.from({length:18},(_,i)=>
    'Question '+i+': what changes when an observation is remembered through a new frame? Answer: transform the learned experience into an action.').join('\n\n'));
  const proc=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
    '--workers','1','--arms','stable+many','--worlds','text,maze,transform,selfcode',
    '--endogenous-noise','--gpu','off','--maze-every','180','--every','50000',
    '--text',textPath,'--out',out,'--port',String(p),'--mem','2',
    '--chars','1500','--start'],{cwd:v17,detached:true,stdio:['ignore','pipe','pipe']});
  let logs='';
  for(const stream of [proc.stdout,proc.stderr])stream.on('data',buf=>{logs=(logs+String(buf)).slice(-9000);});
  const url='http://127.0.0.1:'+p;
  try{
    let ready=false;
    for(let i=0;i<150;i++){
      try{const r=await fetch(url+'/graphs');if(r.ok){ready=true;break;}}catch{}
      if(proc.exitCode!==null)break;await sleep(100);
    }
    assert.ok(ready,'Original V17 server did not start: '+logs);
    const page=await(await fetch(url+'/transcend/torus-aether/ui/index.html?live=1')).text();
    assert.match(page,/id="perspectiveBox"/);
    assert.match(page,/id="selfcodeBox"/);
    assert.match(page,/id="agentNoiseBox"/);
    assert.match(page,/id="languageBox"/);
    assert.match(page,/id="constructedBox"/);
    let view=null;
    for(let i=0;i<400;i++){
      try{const r=await fetch(url+'/graph?w=0');if(r.ok){
        const g=await r.json();
        if(g.perspective?.episodes>0&&g.selfcode?.ticks>0&&g.endogenousNoise?.decisions>0&&
          g.language?.observedTokens>0&&g.constructedPaths?.pairedWorlds>0&&
          g.constructedPaths?.textQARows>0&&g.chars>0){
          view=g;break;
        }
      }}catch{}
      if(proc.exitCode!==null)break;await sleep(150);
    }
    assert.ok(view,'Four REAL world streams never converged in same original Brain: '+logs);
    assert.ok(view.nodes.some(x=>String(x[0]).startsWith('code:')));
    assert.ok(view.selfcode.originalUnchanged,'Original source modified');
    assert.ok(view.selfcode.lock.locked,'Independent code lock opened without successful test');
    assert.ok(view.perspective.last?.trace?.length>0,'No real egocentric replay');
    const graph=(await(await fetch(url+'/graphs')).json()).graphs[0];
    assert.deepEqual(graph.worlds,['text','maze','transform','selfcode']);
    assert.ok(graph.perspective?.episodes>0);
    assert.ok(graph.selfcode?.ticks>0);
    assert.ok(graph.constructedPaths?.pairedWorlds>0);
    assert.ok(graph.constructedPaths?.textQARows>0);
    const blindResp=await fetch(url+'/constructed-paths-eval?w=0&count=3&seed=102',{method:'POST'});
    assert.ok(blindResp.ok);
    const blindReport=await blindResp.json();
    assert.ok(!blindReport.error,'Frozen incomplete-world path construction: '+JSON.stringify(blindReport));
    assert.equal(blindReport.count,3);
    assert.equal(blindReport.results.length,3);
    assert.ok(blindReport.results.every(x=>x.blindAtDecision&&x.initialUnknowns>0));
    assert.equal(blindReport.frozen,true);
    const resp=await fetch(url+'/perspective-eval?w=0&count=4&seed=101',{method:'POST'});
    assert.ok(resp.ok);
    const evalReport=await resp.json();
    assert.ok(!evalReport.error,'Perspective frozen eval: '+JSON.stringify(evalReport));
    assert.equal(evalReport.learned.count,4);
    const languageResp=await fetch(url+'/language-eval?w=0&limit=150',{method:'POST'});
    assert.ok(languageResp.ok);
    const languageReport=await languageResp.json();
    assert.ok(!languageReport.error,'Frozen original language learning eval: '+JSON.stringify(languageReport));
    assert.ok(languageReport.frozen);
    assert.ok(languageReport.tokenPrediction.tokens>0);
    assert.equal(typeof languageReport.preActionShape.continuation,'string');
    // The real host owns the save action and does not need a reset.
    const save=(await fetch(url+'/control?do=save&w=0',{method:'POST'}));
    assert.ok(save.ok);
    const brainFile=path.join(out,'brains','brain-0-stable+many.v8');
    let saved=false;
    for(let i=0;i<100;i++){if(fs.existsSync(brainFile)&&fs.statSync(brainFile).size>0){saved=true;break;}await sleep(100);}
    assert.ok(saved,'Original Brain checkpoint not created');
    console.log('V17_REAL_ALL_WORLDS '+JSON.stringify({lived:view.lived,chars:view.chars,
      perspectiveEpisodes:view.perspective.episodes,languageTokens:view.language.observedTokens,
      maskPairs:view.constructedPaths.pairedWorlds,learnedCharPaths:view.constructedPaths.textQARows,
      codeTicks:view.selfcode.ticks,
      noiseDecisions:view.endogenousNoise.decisions,lock:view.selfcode.lock.locked}));
  }finally{
    try{process.kill(-proc.pid,'SIGTERM');}catch{try{proc.kill('SIGTERM');}catch{}}
    await sleep(300);
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
