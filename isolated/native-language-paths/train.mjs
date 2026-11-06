// Real OpenThoughts3 Parquet -> ORIGINAL V17 Brain (character learner and
// Discoverer maze learner) + corpus-observed Q/A graph. Strict held-out scoring.
// This is retrieval-plus-path-field research, not proof of open-domain reasoning.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {openTextDataset,DEFAULT_TEXT_ROOT} from '../../v17/transcend/torus-aether/data/text-dataset.mjs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {ObservedQAAtlas,wordF1} from './atlas.mjs';
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {inspectNativeVsSuccessor} from './multipath.mjs';
import {repeatedWindowFraction} from './repetition.mjs';

const args=process.argv.slice(2);
const val=(name,fallback)=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:fallback;};
const number=(name,defaultValue,min,max)=>{
  const v=Number(val(name,defaultValue));
  if(!Number.isInteger(v)||v<min||v>max)throw Error('--'+name+' must be an integer between '+min+' and '+max);
  return v;
};
const data=path.resolve(val('data',DEFAULT_TEXT_ROOT));
const out=path.resolve(val('out',path.join(process.cwd(),'native-language-run')));
const rows=number('rows',1000,1,1000000);
const bytes=number('bytes',120000,1000,1000000000);
const maze=number('maze',160,1,100000);
const evalN=number('eval',8,1,16);
const candidates=number('candidates',8,1,24);
const answerCap=number('answer-cap',320,20,2000);
const loopWindow=number('loop-window',24,4,96),loopPenalty=number('loop-penalty',4,0,50);
const gamma=Number(val('gamma',.9));
if(!(gamma>0&&gamma<1))throw Error('--gamma must be strictly between 0 and 1');
const resume=args.includes('--resume'),strict=args.includes('--strict');
const enc=s=>Array.from(String(s),ch=>{
  const code=ch.charCodeAt(0);
  return code===10||code===9||(code>=32&&code<127)?code:63;
});
const atomicJson=(file,obj)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const t=file+'.tmp';
  fs.writeFileSync(t,JSON.stringify(obj,null,2),'utf8');fs.renameSync(t,file);};
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const brainFile=path.join(out,'brain.v8'),atlasFile=path.join(out,'atlas.json');
const progressFile=path.join(out,'progress.json'),reportFile=path.join(out,'report.json');
fs.mkdirSync(out,{recursive:true});
const ds=await openTextDataset(data);
if(ds.held<1)throw Error('No held-out rows. Refusing to present training scores as unseen results.');
const source={root:data,total:ds.total,trainRows:ds.trainRows,held:ds.held};
let brain,atlas,progress;
if(resume){
  if(!fs.existsSync(brainFile)||!fs.existsSync(atlasFile)||!fs.existsSync(progressFile))
    throw Error('Incomplete checkpoint. Refusing unsafe resume.');
  progress=JSON.parse(fs.readFileSync(progressFile,'utf8'));
  if(JSON.stringify(progress.source)!==JSON.stringify(source))throw Error('Dataset fingerprint changed. Refusing resume.');
  brain=Brain.load(brainFile);atlas=ObservedQAAtlas.restore(JSON.parse(fs.readFileSync(atlasFile,'utf8')));
  atlas.maxEntries=Math.max(atlas.maxEntries,rows);
  if(atlas.examples.length!==progress.examples)throw Error('Checkpoint inconsistency.');
}else{
  if([brainFile,atlasFile,progressFile].some(f=>fs.existsSync(f)))
    throw Error('Run directory already has checkpoints. Use --resume or choose a NEW --out; no overwriting.');
  brain=new Brain({rules,c:{margin:.05,window:400},seed:11});
  atlas=new ObservedQAAtlas({maxEntries:rows});
  progress={source,nextRow:0,trainingChars:0,examples:0,mazeEpisodes:0,nonAsciiReplaced:0};
}
function save() {
  // If interrupted between saves, strict checkpoint consistency detects mismatches.
  brain.save(brainFile);atomicJson(atlasFile,atlas.snapshot());
  progress.examples=atlas.examples.length;atomicJson(progressFile,progress);
}
console.log('MAGICPERSPECTIVE native V17, real-corpus goal-path comparison');
console.log('Dataset:',data,'rows:',ds.total,'training:',ds.trainRows,'held-out:',ds.held);
console.log('Isolated output:',out,'resume:',resume);
const t0=performance.now();
let lastSave=performance.now();
while(progress.mazeEpisodes<maze){
  brain.playMaze(false);
  progress.mazeEpisodes++;
  if(progress.mazeEpisodes%20===0)
    console.log('Maze lived:',progress.mazeEpisodes,'self:',brain.disc.self(),
      'target attraction:',brain.disc.attract(KIND.target).toFixed(4));
}
if(brain.disc.attract(KIND.target)<=.2)throw Error('Original Discoverer did NOT learn goal attraction; refuse to fake a text-field success.');
if(brain.disc.conduct(KIND.floor)<.5)throw Error('Original Discoverer did NOT learn floor traversability.');
const totalRows=Math.min(rows,ds.trainRows);
let interrupted=false;
process.once('SIGINT',()=>{interrupted=true;console.log('Ctrl+C: finishing current real training row and saving');});
for(let k=progress.nextRow;k<totalRows&&!interrupted;k++){
  const e=await ds.exercise(k),text='Q: '+e.prompt+'\nA: '+e.answer+'\n\n';
  const coded=enc(text);
  if(!e.prompt?.trim()||!e.answer?.trim()){progress.nextRow=k+1;continue;}
  if(progress.trainingChars+coded.length>bytes)break;
  brain.beginExercise();
  for(const y of coded)brain.live(y,false);
  brain.chars+=coded.length;
  progress.trainingChars+=coded.length;
  progress.nonAsciiReplaced+=Array.from(text).filter(ch=>ch.charCodeAt(0)>127).length;
  atlas.observe(e.prompt,e.answer,e.index);
  progress.nextRow=k+1;progress.examples=atlas.examples.length;
  if((k+1)%25===0||performance.now()-lastSave>20000){
    save();lastSave=performance.now();
    console.log('Observed real Q/A:',progress.examples,'native characters:',progress.trainingChars,
      'elapsed seconds:',((performance.now()-t0)/1000).toFixed(1));
  }
}
save();
if(interrupted){console.log('Checkpoint saved. Resume with --resume');process.exit(130);}
if(!atlas.examples.length)throw Error('No valid real Q/A records learned.');

const evaluations=[],n=Math.min(evalN,ds.held);
let fieldF1=0,hybridF1=0,lexicalF1=0,charF1=0,guardF1=0;
let fieldExact=0,hybridExact=0,lexicalExact=0,charExact=0,guardExact=0;
let charRepeats=0,guardRepeats=0,hybridReached=0,tieSteps=0,changedSteps=0;
let routes=0,unseen=0,valid=0,referenceLeak=0;
for(let i=0;i<n;i++){
  const e=await ds.heldOut(i),q=String(e.prompt),truth=String(e.answer).slice(0,answerCap);
  // Read the held-out reference ONLY for scoring. Never feed it to any learner.
  const g=atlas.plan(q,brain.disc,{candidates});
  const observedGraph=atlas.build(q,{candidates});
  const alternatives=inspectNativeVsSuccessor(observedGraph,brain.disc,{gamma});
  const endNode=observedGraph.nodes[alternatives.successorTie.path.at(-1)];
  const hybrid=String(alternatives.successorTie.reached?endNode?.completeAnswer||'':'').slice(0,answerCap);
  const lexical=atlas.similarities(q,1)[0]?.answer?.slice(0,answerCap)||'';
  const char=brain.chat([['you',q]],{T:0,max:answerCap,learn:false,seed:11+i}).text.slice(0,answerCap);
  const field=String(g.answer||'').slice(0,answerCap);
  const promptBytes=enc('Q: '+q+'\nA: ');
  const guardedBytes=brain.align?.write(promptBytes,{
    max:answerCap,T:0,loopPenalty,loopWindow,
    stop:(y,o)=>y===10&&o.at(-1)===10
  })||[];
  if(guardedBytes.length&&guardedBytes.at(-1)===10)guardedBytes.pop();
  const guarded=String.fromCharCode(...guardedBytes).slice(0,answerCap);
  const scores={
    nativeField:wordF1(truth,field),successorTie:wordF1(truth,hybrid),
    lexicalRetrieval:wordF1(truth,lexical),nextCharacter:wordF1(truth,char),
    loopResistantCharacter:wordF1(truth,guarded)
  };
  fieldF1+=scores.nativeField;hybridF1+=scores.successorTie;
  lexicalF1+=scores.lexicalRetrieval;charF1+=scores.nextCharacter;guardF1+=scores.loopResistantCharacter;
  fieldExact+=Number(field.trim()===truth.trim());hybridExact+=Number(hybrid.trim()===truth.trim());
  lexicalExact+=Number(lexical.trim()===truth.trim());charExact+=Number(char.trim()===truth.trim());
  guardExact+=Number(guarded.trim()===truth.trim());
  const oldRepeats=repeatedWindowFraction(char,loopWindow);
  const newRepeats=repeatedWindowFraction(guarded,loopWindow);
  charRepeats+=oldRepeats;guardRepeats+=newRepeats;
  hybridReached+=Number(alternatives.successorTie.reached);
  tieSteps+=alternatives.successorTie.actualTieSteps;
  changedSteps+=alternatives.successorTie.changedSteps;
  routes+=Number(g.ok);valid+=Number(g.ok&&g.steps.length>1);
  unseen+=Number(!atlas.examples.some(x=>x.sourceIndex===e.index));
  referenceLeak+=Number(atlas.examples.some(x=>x.sourceIndex===e.index));
  evaluations.push({
    heldOutIndex:e.index,questionSha256:sha(q),referenceSha256:sha(truth),
    route:g.steps,
    graph:{matched:g.matched||0,nodes:g.graphNodes||0,edges:g.graphEdges||0,
      goalReached:!!g.ok,evidenceIndex:g.evidenceIndex??null,
      evidenceQuestion:g.evidenceQuestion||'',reason:g.reason},
    alternatives:{
      originalRoute:alternatives.native.path,
      successorTieRoute:alternatives.successorTie.path,
      shortestPathCount:alternatives.shortest.count,
      shortestDistance:alternatives.shortest.length,
      shortestChoices:alternatives.shortest.choices,
      successorOccupancyStart:alternatives.successor.start,
      fieldValueStart:alternatives.field.start,
      actualTies:alternatives.successorTie.actualTieSteps,
      tieBreakChanges:alternatives.successorTie.changedSteps,
      nativeReached:alternatives.native.reached,
      successorTieReached:alternatives.successorTie.reached,
      graphSize:alternatives.graph
    },
    repetition:{window:loopWindow,original:oldRepeats,loopResistant:newRepeats},
    scores,
    predicted:{nativeField:field,successorTie:hybrid,lexicalRetrieval:lexical,
      nextCharacter:char,loopResistantCharacter:guarded},
    reference:truth
  });
  console.log('Held-out',i+1+'/'+n,
    'V17-shape',scores.nativeField.toFixed(3),
    'SR-tie',scores.successorTie.toFixed(3),
    'lexical',scores.lexicalRetrieval.toFixed(3),
    'character',scores.nextCharacter.toFixed(3),
    'loop-resist',scores.loopResistantCharacter.toFixed(3),
    'shortest-paths',alternatives.shortest.count,
    'actual-ties',alternatives.successorTie.actualTieSteps);
}
const mean=v=>Math.round(10000*v/n)/10000;
const report={
  timestamp:new Date().toISOString(),
  branch:'experiment/V17-MULTIPATH-SUCCESSOR-ISOLATED-20261106',
  source,
  training:{...progress,graphVocabulary:atlas.df.size,seconds:(performance.now()-t0)/1000},
  method:'Original V17 Discoverer.shape + observed Q/A text graph; shortest-path multiplicity; SR only for scalar-field ties; optional real V17 aligned output loop resistance; three original/lexical controls.',
  goalDefinition:'A marked node represents a STORED TRAINING answer, never a held-out answer; success at reaching it is not answer correctness.',
  settings:{gamma,loopWindow,loopPenalty,candidates,answerCap},
  metrics:{
    heldOutEvaluated:n,unseenIndexChecksPassed:unseen,referenceIndexLeak:referenceLeak,
    goalFieldReachRate:mean(routes),pathValidityRate:mean(valid),
    successorTieGoalReachRate:mean(hybridReached),actualFieldTies:tieSteps,
    actualTieChanges:changedSteps,
    repeatFraction:{window:loopWindow,original:mean(charRepeats),loopResistant:mean(guardRepeats)},
    wordF1:{nativeShape:mean(fieldF1),successorTie:mean(hybridF1),
      lexicalOnly:mean(lexicalF1),nextCharacter:mean(charF1),
      loopResistantCharacter:mean(guardF1)},
    exactAnswer:{nativeShape:mean(fieldExact),successorTie:mean(hybridExact),
      lexicalOnly:mean(lexicalExact),nextCharacter:mean(charExact),
      loopResistantCharacter:mean(guardExact)}
  },
  limitations:[
    'Observed Q/A lexical graph is NOT a learned natural-language causal world.',
    'Shortest path counts are exact only on this observed graph; they do not count unknown semantic solutions.',
    'Successor occupancy is discounted expected goal reaching under a uniform edge policy, NOT an exact count.',
    'A high goal-reach rate is NOT proof of a correct held-out answer.',
    'Loop-resistance alters generation-time selection; it does NOT establish learned language semantics.',
    'No quantum phase, unitary interference, quantum hardware, or quantum advantage is claimed.',
    'Semantic transfer from the original V17 maze remains UNVERIFIED.',
    'New graph evaluator is CPU JavaScript, not a CUDA training claim.',
    'Original V17 non-ASCII characters still become question marks in its byte learner.'
  ],
  evaluations
};
atomicJson(reportFile,report);
console.log('\nMETRICS (actual held-out Parquet rows):');
console.log(JSON.stringify(report.metrics,null,2));
console.log('Real evidence, routes, models, checkpoints:',out);
if(referenceLeak||unseen!==n)throw Error('Held-out training isolation audit failed.');
if(strict&&mean(hybridF1)<=Math.max(mean(fieldF1),mean(charF1),mean(lexicalF1),mean(guardF1)))
  throw Error('No measured hybrid advantage over all original and lexical baselines; experiment NOT accepted under --strict.');
