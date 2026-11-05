// Read-only V17 episode exporter. Output is isolated JSONL, never modifies V17 or its checkpoints.
// Run from a Git clone containing the original v17 tree. Requires Node 20+.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../..'),BASE=path.join(ROOT,'v17/transcend/torus-aether');
const arg=(name,def)=>{const i=process.argv.indexOf('--'+name);return i<0?def:process.argv[i+1];};
const nMaze=Number(arg('maze',12)),nTrans=Number(arg('transform',12)),textFile=arg('text',null),checkpoint=arg('checkpoint',null),seed=Number(arg('seed',11));
if(![nMaze,nTrans,seed].every(Number.isInteger)||nMaze<0||nTrans<0||nMaze>10000||nTrans>10000)throw Error('Invalid episode counts');
const output=path.join(HERE,'runs','v17_events_'+seed+'.jsonl');fs.mkdirSync(path.dirname(output),{recursive:true});
if(fs.existsSync(output))throw Error('Output already exists; rename/archive it before rerunning: '+output);
const {makeMaze,seedOf,SEEDS,Discoverer,playExercise}=await import(path.join(BASE,'worlds/exercise.mjs'));
const {makeLevel,TWorld,TSEEDS,ANY}=await import(path.join(BASE,'worlds/transform.mjs'));
const {CausalOrganism,liveTask}=await import(path.join(BASE,'worlds/causal.mjs'));
let out=fs.openSync(output,'wx'),count=0,summary={maze:[],transform:[],text:[]};
const emit=(v)=>{fs.writeSync(out,JSON.stringify(v)+'\n');count++;};
const observed=(world,exercise,samples,meta={})=>{const history=[];for(let t=0;t<samples.length;t++){
 const v=Number(samples[t]);if(!Number.isFinite(v))throw Error('Non-finite observation '+world+'/'+exercise+'/'+t);
 history.push(v);const h=i=>history[Math.max(0,t-i)]/128;emit({world,exercise,step:t,observation:v,
  coordinates:[h(0),h(1),h(2),h(3),t/Math.max(1,samples.length-1)],...meta});}};
try{
 const D=new Discoverer(seed);
 for(let k=0;k<nMaze;k++){const i=seed*10000+k,w=makeMaze(seedOf(SEEDS.train,i),[7,9,11][k%3]),stream=[];
  const r=playExercise(w,D,y=>stream.push(y),{record:true});observed('maze','maze-'+i,stream);
  summary.maze.push({episode:i,size:w.n,solved:r.solved,steps:r.steps,predictedShape:r.first||null});}
 const A=new CausalOrganism(seed);
 for(let k=0;k<nTrans;k++){const i=seed*10000+k,L=makeLevel(TSEEDS.train+i*7919,{goals:[['object'],['self'],['door']][k%3]});if(!L)continue;
  const r=liveTask(L,new TWorld(L,[0,1,2,3]),A,{record:true,learn:true});const frames=r.frames||[];
  const observations=frames.map(frame=>{const b=frame.b||[];return b.reduce((s,v,idx)=>s+(L.goal[idx]!==ANY&&v===L.goal[idx]?1:0),0)/Math.max(1,L.goal.filter(x=>x!==ANY).length);});
  const history=[];for(let t=0;t<observations.length;t++){const v=observations[t];history.push(v);const p=j=>history[Math.max(0,t-j)];emit({world:'transform',exercise:'transform-'+i,step:t,observation:v,
    action:frames[t]?.o??null,coordinates:[p(0),p(1),p(2),p(3),t/Math.max(1,observations.length-1)]});}
  summary.transform.push({episode:i,solved:r.solved,steps:r.steps,predicted:r.predicted,failed:r.failed});}
 if(textFile){if(!fs.existsSync(textFile))throw Error('Missing input text file: '+textFile);
  const bytes=Array.from(fs.readFileSync(textFile).subarray(0,150000));let brain=null;
  if(checkpoint){const {Brain}=await import(path.join(BASE,'devour/brain.mjs'));brain=Brain.load(checkpoint);}
  const history=[];for(let t=0;t<bytes.length;t++){const y=bytes[t];let prediction=null;
    if(brain&&y<128){const dist=brain.predict(history.slice(-64));prediction=dist.indexOf(Math.max(...dist));}
    history.push(y);const p=j=>history[Math.max(0,t-j)]/255;
    emit({world:'text',exercise:path.basename(textFile),step:t,observation:y,prediction,coordinates:[p(0),p(1),p(2),p(3),t/Math.max(1,bytes.length-1)]});}
  summary.text.push({file:path.basename(textFile),bytes:bytes.length,checkpointReadOnly:!!brain});}
}finally{fs.closeSync(out);}
fs.writeFileSync(path.join(HERE,'runs','v17_export_report_'+seed+'.json'),JSON.stringify({source:'V17 read-only',file:output,events:count,summary},null,2));
console.log(JSON.stringify({output,events:count,worlds:Object.keys(summary),source:'V17 READ ONLY'},null,2));