#!/usr/bin/env node
// V40 REAL HUMAN TEXT TRAINING. This is NOT a DEMO. Reads canonical genuine
// Stanford SQuAD1.1 human questions, trains the unchanged original V34 Brain's
// V39 learned source evidence, saves to a NEW checkpoint, evaluates genuine
// blind article-disjoint DEV questions, and writes FULL failed-path atlas.
// V36 instruction knowledge in an existing original Brain is PRESERVED;
// no fictitious V36 physical action episodes are injected from Q/A labels.
// V32 compact source evidence archive is optional, and stores SOURCE ONLY.
// Runs CPU (original V17 CUDA text learner is unchanged, not used here).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import {Brain} from '../../transcend/torus-aether/devour/brain.mjs';
import {KIND} from '../../transcend/torus-aether/worlds/exercise.mjs';
import {V40OriginalBrainEvidence} from './v40-original-brain-evidence.mjs';
import {openV40OriginalSourceMemory} from './v40-original-source-witness-memory.mjs';

const URL='https://rajpurkar.github.io/SQuAD-explorer/dataset/';
const SHA={
 'train-v1.1.json':'3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955',
 'dev-v1.1.json':'95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9'
};
const help=()=>console.log([
 'REAL HUMAN QA native V40 Brain training:',
 'node v17/research/text-hypermaze/START_V40_REAL_HUMAN_QA.mjs',
 '  --original-brain "D:\\existing-runtime\\brains\\brain-0-winner.v8"',
 '  --out "D:\\isolated-v40\\brains\\brain-0-winner.v8"',
 '  [--archive "D:\\isolated-v40\\real-source.sqlite" --archive-first 80]',
 'Exactly 9000 official SQuAD TRAIN Q/A, two passes, 500 TRAIN-calibration, 650 DEV frozen.',
 'Never overwrites a Brain file. The supplied source Brain bytes are never changed.',
 'No GPU for this specific question/span evidence algorithm; V17 GPU path remains unchanged.'
].join('\n'));
function args(argv){
 const allowed=new Set(['--original-brain','--out','--archive','--archive-first']);
 const out={};
 for(let i=0;i<argv.length;i+=2){
  if(!allowed.has(argv[i])||!argv[i+1]||argv[i+1].startsWith('--'))
   throw Error('Unknown/missing explicit V40 argument: '+argv[i]);
  if(Object.hasOwn(out,argv[i]))throw Error('Duplicate argument '+argv[i]);
  out[argv[i]]=argv[i+1];
 }
 if(!out['--original-brain']||!out['--out'])throw Error('Must explicitly specify existing original Brain and NEW separate output');
 for(const key of ['--original-brain','--out','--archive'])
  if(out[key]&&!path.isAbsolute(out[key]))throw Error('Absolute path required for '+key);
 const source=out['--original-brain'],dest=out['--out'];
 if(!fs.existsSync(source)||!fs.statSync(source).isFile())
  throw Error('Original real trained Brain checkpoint not found: '+source);
 if(source===dest||fs.existsSync(dest)||fs.existsSync(dest+'.results.json')||
  fs.existsSync(dest+'.atlas.jsonl'))
  throw Error('Output already exists or points to ORIGINAL Brain. Nothing changed.');
 if(out['--archive']&&out['--archive']===source)
  throw Error('Cannot overwrite original Brain with SQLite source archive');
 const count=out['--archive-first']===undefined?0:Number(out['--archive-first']);
 if(!Number.isSafeInteger(count)||count<0||count>9000)
  throw Error('Archive-first must be a bounded integer 0..9000');
 if(count>0&&!out['--archive'])throw Error('To archive source motifs, specify a NEW SQLite --archive path');
 return {source,dest,archive:out['--archive']||null,archiveFirst:count};
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const normalize=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ')
 .replace(/\b(a|an|the)\b/gu,' ').replace(/\s+/gu,' ').trim();
const choose=(a,n)=>Array.from({length:n},(_,i)=>a[Math.floor((i+.5)*a.length/n)]);
async function dataset(file){
 const response=await fetch(URL+file,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('Official SQuAD source failed: '+response.status);
 const content=await response.text(),sum=hash(content);
 if(sum!==SHA[file])throw Error('Original human dataset SHA256 mismatch; refuse different source: '+file);
 const raw=JSON.parse(content),rows=[];
 if(raw.version!=='1.1')throw Error('Expected original SQuAD 1.1');
 for(const article of raw.data)for(const p of article.paragraphs)
  for(const qa of p.qas)rows.push({
   id:qa.id,article:article.title,context:p.context,question:qa.question,
   answer:qa.answers[0].text,answerStart:qa.answers[0].answer_start,
   references:qa.answers.map(a=>a.text)
  });
 return {rows,titles:raw.data.map(a=>a.title),sum};
}
function validateOriginal(brain){
 if(!(brain instanceof Brain)||!brain.disc||
    typeof brain.disc.shapeGraph!=='function')
  throw Error('Checkpoint is NOT an original V17/V34 Brain with original shapeGraph');
 const attraction=brain.disc.attract?.(KIND.target);
 if(!Number.isFinite(attraction))
  throw Error('Original attractor state invalid or checkpoint broken');
}
function judge(qa,items,weightMode,atlasOutput=null){
 let exact=0,normalized=0,zero=0,missing=0,rankedWrong=0;
 const frozen=qa.memory.updates;
 for(let i=0;i<items.length;i++){
  const r=items[i];
  // Gold is not supplied to the model; actual plan is completed FIRST.
  const plan=qa.plan({question:r.question,context:r.context,
    weightMode,includeAtlas:!!atlasOutput});
  if(!plan.found)throw Error('Original plan failed for genuine source '+r.id+': '+plan.reason);
  const ok=r.references.includes(plan.predicted),
    canonical=r.references.some(a=>normalize(a)===normalize(plan.predicted));
  exact+=+ok;normalized+=+canonical;
  if(atlasOutput){
   const nodes=plan.atlas?.nodes||[];
   const correctCandidates=nodes.filter(n=>n.type==='observed-source-span'&&
     r.references.some(a=>normalize(a)===normalize(n.text)));
   const category=ok?'exact':canonical?'normalized-only':
      correctCandidates.length?'PRESENT_BUT_WRONG_RANK':'CORRECT_SPAN_NOT_IN_BOUNDED_GRAPH';
   missing+=+(category==='CORRECT_SPAN_NOT_IN_BOUNDED_GRAPH');
   rankedWrong+=+(category==='PRESENT_BUT_WRONG_RANK');
   const a=Array.from(plan.predicted),b=Array.from(r.answer),
     differences=[];
   for(let j=0;j<Math.max(a.length,b.length);j++)
    if(a[j]!==b[j])differences.push({at:j,predicted:a[j]??null,expected:b[j]??null});
   fs.appendFileSync(atlasOutput,JSON.stringify({
    type:'real-external-frozen-answer',questionId:r.id,question:r.question,
    sourceArticle:r.article,reference:r.references,answer:plan.predicted,
    exact:ok,normalizedExact:canonical,category,
    firstMismatch:differences[0]?.at??null,characterDifferences:differences,
    originalMethod:plan.originalMotor,sourceAnswerWasProvided:false,
    candidateCorrectNodes:correctCandidates.length,completeObservedGraph:plan.atlas,
    fullOriginalPath:plan.initialShape,graphStatistics:plan.graph
   })+'\n');
  }
 }
 if(qa.memory.updates!==frozen)throw Error('Frozen human DEV evaluation mutated Brain learning');
 return {n:items.length,exact,normalized,missing,rankedWrong};
}
export async function run(argv=process.argv.slice(2)){
 const opts=args(argv);
 const originalSHA=hash(fs.readFileSync(opts.source));
 const brain=Brain.load(opts.source);validateOriginal(brain);
 const unified=new V40OriginalBrainEvidence(brain);
 if(unified.state.sourceArchiveManifest&&!opts.archive)
  throw Error('Existing original Brain has disk source history; supply its same --archive or refuse silent reset');
 if(opts.archive&&unified.state.sourceArchiveManifest?.file!==undefined&&
  opts.archive!==unified.state.sourceArchiveManifest.file)
  throw Error('Source archive path does not match checkpoint identity');
 console.log('V40_REAL_ORIGINAL_BRAIN_LOADED',JSON.stringify({
  originalFile:opts.source,sha256:originalSHA,
  existingIntentEpisodes:unified.state.observedTaskEpisodes,
  existingSourceWorlds:unified.state.observedTextWorlds,
  originalMazeEpisodes:brain.disc.episodes||0
 }));
 const [train,dev]=await Promise.all([
  dataset('train-v1.1.json'),dataset('dev-v1.1.json')
 ]);
 const trainSet=new Set(train.titles.slice(0,380)),
  calibrationSet=new Set(train.titles.slice(380));
 if(train.titles.length!==442||dev.titles.length!==48||
   [...calibrationSet].some(x=>trainSet.has(x)))
  throw Error('Original 380/62/48 independent human article contract broken');
 const training=choose(train.rows.filter(r=>trainSet.has(r.article)),9000),
  calibration=choose(train.rows.filter(r=>calibrationSet.has(r.article)),500),
  heldout=choose(dev.rows,650);
 if(!calibration.every(x=>!trainSet.has(x.article))||
    !heldout.every(x=>!trainSet.has(x.article)&&!calibrationSet.has(x.article)))
  throw Error('Gold validation article/source leakage!');
 let archive=null,archiveStatus=null;
 try{
  if(opts.archive){
   archive=await openV40OriginalSourceMemory(brain,opts.archive);
   for(let i=0;i<opts.archiveFirst;i++){
    const q=training[i];
    archive.recordEpisode({episode:i+1,question:q.question,context:q.context});
   }
   archiveStatus=archive.status();archive.close();archive=null;
  }
  const report=unified.trainHumanQA(training,{epochs:2,snapshotEvery:200,burnIn:400});
  const internal={
   last:judge(unified.qa,calibration,'last'),
   average:judge(unified.qa,calibration,'average')
  };
  const selected=internal.average.normalized>internal.last.normalized?'average':'last';
  // Checkpoint is saved AFTER training, BEFORE any external DEV gold scoring.
  const frozen=unified.qa.memory.updates;
  fs.mkdirSync(path.dirname(opts.dest),{recursive:true});
  if(fs.existsSync(opts.dest))throw Error('Destination appeared while running; refuse overwrite');
  const bytes=brain.save(opts.dest);
  if(unified.qa.memory.updates!==frozen)
   throw Error('Training unexpectedly changed while saving original checkpoint');
  const first=await Promise.resolve().then(()=>judge(unified.qa,heldout,'last'));
  const second=await Promise.resolve().then(()=>judge(unified.qa,heldout,'average'));
  const output=opts.dest+'.atlas.jsonl';
  if(fs.existsSync(output))throw Error('Atlas path became occupied; cannot overwrite');
  const chosen=judge(unified.qa,heldout,selected,output);
  if(unified.qa.memory.updates!==frozen)throw Error('Frozen external results updated model');
  const restored=new V40OriginalBrainEvidence(Brain.load(opts.dest));
  if(restored.qa.memory.averagedWeights?.size!==unified.qa.memory.averagedWeights?.size||
     restored.state.observedTaskEpisodes!==unified.state.observedTaskEpisodes)
   throw Error('Saved original Brain lost V36 or V39 evidence');
  if(opts.archive&&archiveStatus){
   const verify=await openV40OriginalSourceMemory(restored.brain,opts.archive);
   if(verify.status().indexedExactMotifs!==archiveStatus.indexedExactMotifs){
    verify.close();throw Error('V32 source archive parity mismatch after checkpoint restore');
   }
   verify.close();
  }
  if(hash(fs.readFileSync(opts.source))!==originalSHA)
   throw Error('Original user Brain checksum changed; refusing success');
  const summary={
   kind:'V40_REAL_HUMAN_QA_NATIVE_ORIGINAL_BRAIN_TRAINING',
   originalBrainNeverOverwritten:true,sourceBrainSHA256:originalSHA,
   savedBrain:opts.dest,savedBytes:bytes,
   officialTrainSHA256:train.sum,officialDevSHA256:dev.sum,
   independentSourceArticles:{training:380,calibration:62,external:48},
   genuineTrainingQA:training.length,trainingExposures:report.realQuestionExposures,
   originalV17Discoverer:true,
   learnedHistoricalTaskIntentPreserved:restored.state.observedTaskEpisodes,
   sourceArchive:archiveStatus,
   selectionFromTrainOnly:selected,internalCalibration:internal,
   fullExternal650:{last:first,average:second,selected:chosen},
   originalNaturalLanguageGeneralGenerationSolved:false,
   limitation:'Extractive QA with source passage and supervised TRAIN gold spans; no causal meaning learned from V32 source anchors or unknown text goal'
  };
  fs.writeFileSync(opts.dest+'.results.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
  console.log('V40_REAL_HUMAN_TRAINING_FINISHED',JSON.stringify(summary));
  return summary;
 }finally{archive?.close();}
}
if(process.argv[1]&&
 import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 run().catch(e=>{console.error('V40_REAL_TRAINING_FAILED:',e.stack||String(e));process.exitCode=1;});
}
