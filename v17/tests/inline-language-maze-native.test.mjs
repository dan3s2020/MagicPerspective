// No demo: original native V17 server trains actual TXT Q/A examples,
// produces a BEFORE-answer predicted path, then exports the local cursor trace.
// The first training tab must receive everything in /graph, without pressing
// any evaluation, manual target or hidden teacher answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ConstructedPathLearner} from '../transcend/torus-aether/worlds/constructed-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const socket=net.createServer();socket.once('error',reject);
 socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>resolve(p));});
});
test('same real 6-scale learned graph predicts full shape before observing next answer; all body actions, branches, disagreement and replans are recorded',()=>{
 const m=new ConstructedPathLearner({seed:11});
 const q='How does she feel?';
 const before=m.traceLiveTextMaze(q,{maxChars:16});
 assert.equal(before.ready,false);
 for(const answer of ['She is happy.','She is tired.','She is very tired.']){
   assert.equal(m.trainText(q,answer).trained,true);
 }
 const rows=m.textRows,edges=m.scales.map(x=>x.observations);
 const episode=m.traceLiveTextMaze(q,{maxChars:18});
 assert.equal(episode.ready,true);
 assert.equal(episode.status,'frozen-before-current-row-training');
 assert.equal(episode.oracleAnswerUsed,false);
 assert.equal(episode.trainReferenceProvided,false);
 assert.equal(episode.modelRowsBeforeNewObservation,rows);
 assert.deepEqual(episode.scales,[1,2,4,8,16,32]);
 assert.equal(episode.frames[0].stage,'before-first-action');
 assert.ok(episode.globalPrediction.length>0,'No learned global initial route');
 assert.equal(episode.initialShape.at(-1),episode.globalPrediction);
 assert.ok(episode.frames.length>1,'No local cursor moves');
 for(const f of episode.frames.slice(1)){
   assert.equal(f.stage,'after-action');
   assert.equal(f.semanticOracle,false);
   assert.equal(f.effectSource,'same-trained-multiscale-character-graph');
   assert.ok(Array.isArray(f.alternatives)&&f.alternatives.length>0);
   assert.ok(f.alternatives.every(a=>Array.isArray(a.scales)&&a.scales.length===6));
   if(!f.alignedWithInitial&&f.action!=='END')
     assert.ok(Array.isArray(f.correctedShape),'Mismatch did not trigger actual local replan');
 }
 assert.equal(m.textRows,rows,'Preview trained on hidden heldout answer');
 assert.deepEqual(m.scales.map(x=>x.observations),edges,'Preview mutated original transition graph');
 const again=m.traceLiveTextMaze(q,{maxChars:18});
 assert.deepEqual(again.initialShape,episode.initialShape,
   'No answer-dependent oracle or random fake prediction');
 console.log('LIVE_TEXT_SHAPE '+JSON.stringify({
   rows,states:episode.graphStates,global:episode.globalPrediction,
   actions:episode.bodyActions,alternatives:episode.links.length,
   deviations:episode.divergences,replans:episode.replans,
   beforeAnswer:true,sameBrain:true
 }));
});
test('original V17 HTTP automatically exposes its first-page language-maze trace next to 2D maze and transformation game', {timeout:90000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'magic-inline-maze-'));
 const data=path.join(home,'sentences.txt'),out=path.join(home,'runtime');
 fs.writeFileSync(data,[
 'Q: How does she feel?\nA: She is happy.',
 'Q: How does she feel?\nA: She is tired.',
 'Q: How does she feel?\nA: She is calm.',
 'Q: How does he feel?\nA: He is happy.',
 'Q: How does she feel?\nA: She is very happy.',
 'Q: How does he feel?\nA: He is very calm.'
 ].join('\n\n')+'\n','utf8');
 const p=await port(),base='http://127.0.0.1:'+p;
 const proc=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
 '--workers','1','--arms','stable+many','--worlds','text,maze,transform',
 '--gpu','off','--text',data,'--out',out,'--port',String(p),
 '--start','--mem','2','--every','50000','--maze-every','10000'],
 {cwd:root,detached:true,stdio:['ignore','pipe','pipe']});
 let logs='';for(const stream of [proc.stdout,proc.stderr])stream.on('data',v=>logs=(logs+String(v)).slice(-9000));
 try{
   let ready=false;
   for(let i=0;i<140;i++){
     try{if((await fetch(base+'/graphs')).ok){ready=true;break;}}catch{}
     await sleep(80);
   }
   assert.ok(ready,'Original server failed to start: '+logs);
   const html=await(await fetch(base+'/transcend/torus-aether/ui/index.html?live=1')).text();
   const maze=html.indexOf('id="mazeBox"'),trans=html.indexOf('id="transBox"'),
     text=html.indexOf('id="textMazeBox"');
   assert.ok(maze>=0&&trans>maze&&text>trans,
     'TEXT must be on TRAINING under 2D maze and transformation games');
   for(const id of ['textMazeCv','textMazeFrame','textMazePlay','textMazePause',
    'textMazePrev','textMazeNext','textMazeScrub','textMazePlane','textMazeMode'])
    assert.ok(html.includes('id="'+id+'"'),'Missing live training visualizer '+id);
   const moduleResponse=await fetch(base+'/transcend/torus-aether/ui/inline-text-maze.js');
   assert.equal(moduleResponse.status,200);
   assert.match(await moduleResponse.text(),/class InlineTextMaze/);
   let snap=null;
   for(let i=0;i<210;i++){
     try{const r=await fetch(base+'/graph?w=0');if(r.ok){
       const v=await r.json();
       if(v.textMaze?.ready&&v.textMaze?.modelRowsBeforeNewObservation>=1){
         snap=v;break;
       }
     }}catch{}
     await sleep(95);
   }
   assert.ok(snap,'Original worker did not publish automatic BEFORE-answer path: '+logs);
   const ep=snap.textMaze;
   assert.equal(ep.oracleAnswerUsed,false);
   assert.equal(ep.trainReferenceProvided,false);
   assert.equal(ep.source,'original-six-scale-text-learner');
   assert.equal(ep.initialShape.at(-1),ep.globalPrediction);
   assert.equal(ep.frames[0].stage,'before-first-action');
   assert.ok(ep.frames.length>=2);
   assert.ok(ep.links.length>0);
   assert.ok(ep.modelRowsBeforeNewObservation>=1);
   assert.ok(snap.maze?.played>=0,'Original 2D maze was overwritten');
   assert.ok(snap.transform?.played>=0,'Original transformation game was overwritten');
   const side=(await(await fetch(base+'/graphs')).json()).graphs[0];
   assert.ok(side.worlds.includes('text')&&side.worlds.includes('maze')&&
     side.worlds.includes('transform'));
   console.log('REAL_TRAINING_FIRST_PAGE_TEXT_MAZE '+JSON.stringify({
     chars:snap.chars,epoch:ep.epoch,rowsBefore:ep.modelRowsBeforeNewObservation,
     initial:ep.globalPrediction,bodyMoves:ep.bodyActions,
     native2DMaze:snap.maze.played,nativeTransform:snap.transform.played,
     firstPage:true,noManualTest:true,noAnswerLeak:true
   }));
 }finally{
   try{process.kill(-proc.pid,'SIGTERM');}catch{try{proc.kill('SIGTERM');}catch{}}
   await sleep(230);fs.rmSync(home,{recursive:true,force:true});
 }
});
