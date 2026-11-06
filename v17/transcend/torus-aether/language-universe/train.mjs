// MagicPerspective V17: real corpus training in the original Brain + measured language perspectives.
// Run from v17/: node transcend/torus-aether/language-universe/train.mjs --text path.txt --chars 12000
// No replacement of Brain/AligningGraph/Discoverer, no prewritten sentence-rewrite demonstrations.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {Brain} from '../devour/brain.mjs';
import {TextPerspectives} from './perspectives.mjs';

const argv=process.argv.slice(2), option=(name,def)=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:def;};
const flag=name=>argv.includes('--'+name);
const positive=(name,def)=>{const x=Number(option(name,def));if(!Number.isFinite(x)||x<0)throw Error('--'+name+' must be a non-negative number');return Math.floor(x);};
const opts={text:path.resolve(option('text',path.resolve('docs','TORUS_AETHER_ABC_20261104.md'))),
 parquet:option('parquet',null),examples:positive('examples',2000),
 out:path.resolve(option('out',path.join(os.homedir(),'magic-language-universe'))),
 chars:positive('chars',12000),eval:positive('eval',1800),mazeEvery:positive('maze-every',5000),
 transformEvery:positive('transform-every',0),resume:flag('resume'),seed:positive('seed',11),
 maxStates:positive('max-states',85000)};
const asciify=s=>{const out=[];let replaced=0;for(const ch of s){const n=ch.charCodeAt(0);if(n===13)continue;
  const y=n===9||n===10||(n>=32&&n<127)?n:63;out.push(y);replaced+=y===63&&n!==63;}return {out,replaced};};
const atomic=(p,s)=>{const t=p+'.tmp';fs.writeFileSync(t,s);fs.renameSync(t,p);};
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const asUnits=raw=>{const pieces=raw.split(/\n\s*\n/u).filter(s=>s.trim().length);
  const units=[];for(const s of pieces)for(let i=0;i<s.length;i+=1024)units.push(s.slice(i,i+1024)+'\n');return units;};
async function acquire() {
  if(opts.parquet){
    const root=path.resolve(opts.parquet),{openTextDataset}=await import('../data/text-dataset.mjs');
    const ds=await openTextDataset(root),n=Math.min(opts.examples,ds.trainRows);
    if(n<1||ds.held<1)throw Error('Parquet dataset needs training and held-out examples');
    const identity=ds.files.map(f=>{const st=fs.statSync(f.path);return [f.path,f.rows,st.size,st.mtimeMs];});
    const held=[];for(let i=0;i<Math.min(4,ds.held);i++){
      const e=await ds.heldOut(i);held.push('Q: '+e.prompt+'\nA: '+e.answer+'\n\n');
    }
    return {hash:digest(JSON.stringify(identity)),source:root,bytes:null,trainUnits:n,
      getUnit:async i=>{const e=await ds.exercise(i);return 'Q: '+e.prompt+'\nA: '+e.answer+'\n\n';},held:held.join('\n')};
  }
  if(!fs.existsSync(opts.text)||!fs.statSync(opts.text).isFile())throw Error('Text file missing: '+opts.text);
  const text=fs.readFileSync(opts.text,'utf8'),units=asUnits(text);
  if(units.length<2)throw Error('Need at least 2 text chunks (input too short for a held-out test)');
  let cut=Math.max(1,Math.floor(units.length*.85));cut=Math.min(cut,units.length-1);
  return {hash:digest(text),source:opts.text,trainUnits:cut,getUnit:async i=>units[i],
    held:units.slice(cut).join('\n'),bytes:Buffer.byteLength(text),totalUnits:units.length};
}

const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const C={margin:.05,window:400,many:12};
function attachLanguageView(brain,language) {
  // Adds only small, honest perspective telemetry to the SAME original organism trace.
  if(!brain.trace?.node||!brain.trace?.setEdge)return;
  const stats=language.report();brain.trace.node('lang:world','world','language');
  for(const t of stats.trust){const id='lang:perspective:'+t.scale;brain.trace.node(id,'concept',t.scale+' tokens');
    brain.trace.setEdge('lang:world',id,'observed',1+2*(t.accuracy||0),'accuracy='+(t.accuracy?.toFixed(3)??'unknown'));}
}
async function run() {
  const input=await acquire();fs.mkdirSync(opts.out,{recursive:true});const pointer=path.join(opts.out,'latest.json');
  let brain,lang,progress={cursor:0,chars:0,maze:0,transform:0,replaced:0};
  if(opts.resume){
    if(!fs.existsSync(pointer))throw Error('No checkpoint found: '+pointer);
    const meta=JSON.parse(fs.readFileSync(pointer,'utf8'));
    if(meta.hash!==input.hash)throw Error('The corpus changed since checkpoint. Refusing incompatible resume.');
    brain=Brain.load(path.join(opts.out,meta.brain));lang=TextPerspectives.restore(JSON.parse(fs.readFileSync(path.join(opts.out,meta.perspectives),'utf8')));
    progress=meta.progress;console.log(JSON.stringify({event:'RESUMED',progress,brain:meta.brain,perspectives:meta.perspectives}));
  }else{
    if(fs.existsSync(pointer))throw Error('Checkpoint exists: '+pointer+'; use --resume or a different --out (original remains intact)');
    brain=new Brain({rules,c:C,seed:opts.seed});lang=new TextPerspectives({maxStates:opts.maxStates});
  }
  let changed=0;
  const started=Date.now();
  while(progress.cursor<input.trainUnits && changed<opts.chars){
    const u=await input.getUnit(progress.cursor),bytes=asciify(u);
    brain.beginExercise();for(const y of bytes.out)brain.live(y);
    // Same real lived text is also perceived as word/phrase/sentence scales.
    lang.observe(u);brain.chars=(brain.chars||0)+bytes.out.length;
    progress.chars+=bytes.out.length;progress.replaced+=bytes.replaced;progress.cursor++;changed+=bytes.out.length;
    if(opts.mazeEvery&&Math.floor(progress.chars/opts.mazeEvery)>Math.floor((progress.chars-bytes.out.length)/opts.mazeEvery)){
      const r=brain.playMaze(true);progress.maze++;
      console.log(JSON.stringify({event:'MAZE_LIVED_IN_SAME_BRAIN',solved:r.solved,steps:r.steps,predictedFirst:r.first}));
    }
    if(opts.transformEvery&&Math.floor(progress.chars/opts.transformEvery)>Math.floor((progress.chars-bytes.out.length)/opts.transformEvery)){
      const r=brain.playTransform(true);progress.transform++;
      console.log(JSON.stringify({event:'CAUSAL_WORLD_LIVED_IN_SAME_BRAIN',solved:r.solved,steps:r.steps}));
    }
    if(progress.cursor%8===0){
      const st=lang.report(),ms=Math.max(1,Date.now()-started);
      console.log(JSON.stringify({event:'TRAINING',unit:progress.cursor,of:input.trainUnits,chars:progress.chars,
        charsPerSecond:+(changed/(ms/1000)).toFixed(1),perspectiveStates:st.states,laneTrust:st.trust.map(t=>({n:t.scale,accuracy:t.accuracy}))}));
    }
  }
  // Frozen evaluation. The held-out section has never been sent to Brain.live() or lang.observe().
  const held=input.held.slice(0,Math.max(opts.eval*4,1000));
  const langFlat=lang.evaluate(held,{limit:opts.eval,useField:false});
  const langField=lang.evaluate(held,{limit:opts.eval,useField:true});
  const brainHeld=asciify(held).out.slice(0,opts.eval);
  let original=null;
  if(brainHeld.length>0){try{const t=brain.evalText(brainHeld,opts.eval);original={chars:t.n,aligned:t.aligned,original:t.live};}
    catch(e){original={error:e.message};}}
  const start=input.held.trim().split(/\s+/u).slice(0,8).join(' ');
  const predicted=lang.navigate(start,{steps:20,useField:true});
  attachLanguageView(brain,lang);
  const name='checkpoint-'+String(progress.cursor).padStart(7,'0'),br=name+'.v8',pe=name+'.json';
  const brainBytes=brain.save(path.join(opts.out,br));atomic(path.join(opts.out,pe),JSON.stringify(lang.serialize()));
  const meta={version:1,hash:input.hash,source:input.source,brain:br,perspectives:pe,progress,savedAt:new Date().toISOString()};
  atomic(pointer,JSON.stringify(meta,null,2));
  const report={event:'DONE',source:input.source,sourceBytes:input.bytes,trainUnits:input.trainUnits,
    processedUnits:progress.cursor,charactersLivedInOriginalBrain:progress.chars,nonAsciiMappedToQuestionMark:progress.replaced,
    mazeEpisodesShared:progress.maze,causalEpisodesShared:progress.transform,
    frozenHeldout:{originalBrain:original,multiScale:langFlat,fieldGuided:langField},
    predictedPathBeforeSeeingContinuation:predicted,learnedPerspectives:lang.report(),
    checkpoint:{pointer,brain:br,brainBytes,perspectives:pe},
    limitation:'Language continuation is predicted from observed context and a programmer-defined value propagation operator. No verified comprehension, novel grammar induction, or autonomous algorithm invention.'};
  atomic(path.join(opts.out,'last-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
run().catch(e=>{console.error('TRAINING FAILED:',e.stack||e.message);process.exitCode=1;});
