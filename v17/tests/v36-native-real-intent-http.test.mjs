import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const native=path.join(root,'transcend/torus-aether/devour/devour.mjs');
const pause=n=>new Promise(ok=>setTimeout(ok,n));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{
  const p=s.address().port;s.close(e=>e?reject(e):resolve(p));
 });
});
async function post(base,route,body){
 const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 assert.equal(r.status,200);
 return r.json();
}
test('V36 ORIGINAL V17 live native HTTP + same Brain.v8: independent witnessed episode goals, frozen first path, negative controls and disk atlas', {timeout:115000},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),'magicperspective-v36-original-intent-'));
 const data=path.join(temp,'worlds.txt'),out=path.join(temp,'runtime');
 const port=await freePort(),base='http://127.0.0.1:'+port;
 // Actual original V17 TXT-world ingestion. The unseen request answer never
 // occurs in the source training corpus or during frozen inference.
 const documents=Array.from({length:40},(_,i)=>
  'Doc_'+i+' remembers many words. Mira buys tea. Mira buys coffee. '+
  'Ivo likes tea. Ivo likes coffee. World_'+i+' ended.');
 writeFileSync(data,documents.join('\n\n')+'\n');
 const child=spawn(process.execPath,[native,'--workers','1','--arms','stable+many',
  '--worlds','text,cognitivemap','--text',data,'--gpu','off',
  '--out',out,'--port',String(port),'--start'],
  {cwd:root,env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 let log='';
 for(const stream of [child.stdout,child.stderr])stream.on('data',x=>{
  log=(log+x.toString()).slice(-28000);
 });
 try{
  let observed=0;
  const t0=Date.now();
  while(Date.now()-t0<45000){
   if(child.exitCode!==null)throw Error('Original native worker exited: '+log);
   try{
    const x=await(await fetch(base+'/graph?w=0',{signal:AbortSignal.timeout(3500)})).json();
    observed=x.cognitive?.documents||0;
    if(observed>=8)break;
   }catch{}
   await pause(130);
  }
  assert.ok(observed>=8,'Original Brain failed to learn original corpus: '+log);
  const instruction='Brew the refreshment',source='A visitor carries tea.';
  const question={w:0,instruction,source,maxTokens:512};
  const unknown=await post(base,'/instruction-answer',question);
  assert.equal(unknown.answer,null);
  assert.equal(unknown.reason,'UNSEEN_INSTRUCTION_INTENT');
  const first=await post(base,'/instruction-observe',{
   w:0,instruction,states:['Mira buys tea.','Mira buys coffee.'],
   episodeId:'verified-mira-buy',executedTransitionsObserved:true});
  assert.equal(first.ok,true,JSON.stringify(first).slice(0,800));
  const partial=await post(base,'/instruction-answer',question);
  assert.equal(partial.answer,null);
  assert.equal(partial.reason,'INSUFFICIENT_INDEPENDENT_CONTEXTS');
  const second=await post(base,'/instruction-observe',{
   w:0,instruction,states:['Ivo likes tea.','Ivo likes coffee.'],
   episodeId:'verified-ivo-like',executedTransitionsObserved:true});
  assert.equal(second.ok,true,JSON.stringify(second).slice(0,800));
  const complete=await post(base,'/instruction-answer',question);
  assert.equal(complete.found,true,JSON.stringify(complete).slice(0,1600));
  assert.equal(complete.answer,'A visitor carries coffee.');
  assert.equal(complete.originalMethod,'Discoverer.shape');
  assert.equal(complete.evidence.independentContexts,2);
  assert.equal(complete.referenceWasNotProvided,true);
  assert.equal(complete.trainingModified,false);
  assert.equal(complete.actualWriter,
   'ORIGINAL_LEARNED_PATH_TERMINAL_STATE_NOT_NEXT_CHARACTER_MODEL');
  assert.ok(complete.path.some(h=>h.crossWorld));
  const leak=await post(base,'/instruction-answer',
   {...question,reference:'A visitor carries coffee.'});
  assert.match(leak.error,/Gold answer\/goal must NEVER/);
  const fake=await post(base,'/instruction-observe',{
   w:0,instruction,states:['Zara gets tea.','Zara gets coffee.'],
   episodeId:'not-executed',executedTransitionsObserved:false});
  assert.match(fake.error,/Require attested original before\/after/);
  const other=await post(base,'/instruction-answer',{
   w:0,instruction:'Explain general relativity',source,maxTokens:512});
  assert.equal(other.found,false);
  assert.equal(other.reason,'UNSEEN_INSTRUCTION_INTENT');
  const events=await(await fetch(base+'/atlas?w=0&cursor=0&limit=200&kind=planning-attempt')).json();
  const inferred=events.rows.filter(x=>x.goalWasInferred);
  assert.ok(inferred.some(x=>x.pathDrivenAnswer==='A visitor carries coffee.'));
  assert.ok(inferred.some(x=>x.reason==='UNSEEN_INSTRUCTION_INTENT'));
  const savePaths=readdirSync(path.join(out,'brains'),{recursive:true})
   .map(x=>path.join(out,'brains',x)).filter(x=>x.endsWith('.v8'));
  assert.ok(savePaths.length,'Original native worker checkpoint was never saved');
  const savedBrain=Brain.load(savePaths[0]);
  assert.ok(savedBrain.cognitiveMap,'Original Brain.v8 did not persist cognitive map');
  const restored=LearnedCognitiveMap.restore(savedBrain.cognitiveMap);
  assert.equal(restored.instructionGoalMemory.size,1);
  assert.equal(restored.instructionGoalEpisodes,2);
  assert.equal(restored.instructionGoalMemory.get('brew the refreshment')[0].evidence.length,2);
  console.log('V36_REAL_ORIGINAL_WORKER_INTENT_HTTP',JSON.stringify({
   nativeObservedCorpusDocuments:observed,independentObservedTrainingEpisodes:2,
   oneEpisodeAnswerFound:partial.found,
   twoEpisodeAnswerFound:complete.found,firstFrozenAnswer:complete.answer,
   actualOriginalShapePath:complete.path.length,
   persistedSameNativeBrainV8:true,forensicEvents:inferred.length,
   hypotheticalUnexecutedTrainingRejected:true,
   wrongOrUnknownQuestionAbstained:true,goldAnswerBlockedInInference:true,
   externalPhysicalTruthNotIndependentlyVerified:true,
   gpu:'off in GitHub; actual RTX throughput untested'
  }));
 }finally{
  if(child.exitCode===null){
   const ended=new Promise(ok=>child.once('exit',ok));
   child.kill('SIGTERM');await Promise.race([ended,pause(1800)]);
   if(child.exitCode===null)child.kill('SIGKILL');
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
