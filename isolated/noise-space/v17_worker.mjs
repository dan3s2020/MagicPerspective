// Real V17 experience runner. Imports the existing V17 Brain; never writes V17 files.
import {parentPort} from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const dir=path.join(here,'runs','real-v17');
fs.mkdirSync(dir,{recursive:true});
const checkpoint=path.join(dir,'brain.v8');
const docs=path.resolve(here,'../../v17/docs/TORUS_AETHER_ABC_20261104.md');
let brain=null, running=false, paused=false, remaining=0, modes=['text','maze','transform'];
let episode=0, idx=0, cursor=0, sourceText='', seenTexts=0, userText=false;
let last={text:null,maze:null,transform:null};
let error=null, lastSave=null, evaluation={};
const ascii=s=>Array.from(s, c=>{const n=c.charCodeAt(0);return n===10||n===9||(n>=32&&n<127)?n:63;});
function ensureBrain(resume=false){
  if(brain)return;
  if(resume&&fs.existsSync(checkpoint))brain=Brain.load(checkpoint);
  else brain=new Brain({seed:11,rules:{}});
}
function getSource(){
  if(userText&&sourceText.trim())return sourceText;
  return fs.readFileSync(docs,'utf8');
}
function splitSource(){
  const chars=ascii(getSource());
  const cut=Math.max(100,Math.floor(chars.length*.8));
  return {train:chars.slice(0,cut),held:chars.slice(cut)};
}
function copyTrace(){
  brain.organismView();
  const s=brain.trace.snapshot(false);
  return {nodes:s.nodes.slice(-2500),edges:s.edges.slice(-2000),U:s.U,flow:s.flow.slice(-40),accC:s.accC,accF:s.accF};
}
function snapshot(){
  return {available:true,real:true,engine:'V17 Brain',running,paused,episode,modes,
    learned:brain?brain.lived:0,chars:brain?brain.chars:0,mazePlayed:brain?brain.mazes.played:0,
    mazeWon:brain?brain.mazes.won:0,transformPlayed:brain?.trans?.played||0,
    transformWon:brain?.trans?.won||0,source:userText?'Pasted text':'V17 repository documentation',
    last,evaluation,lastSave,error,checkpoint:path.relative(here,checkpoint),
    trace:brain?copyTrace():null};
}
function publish(){parentPort.postMessage({type:'state',state:snapshot()});}
function save(){
  ensureBrain();
  const bytes=brain.save(checkpoint);
  lastSave={at:new Date().toISOString(),bytes};
  publish();
}
function textEpisode(){
  const {train,held}=splitSource();
  if(!train.length)throw Error('Training text is empty');
  if(cursor>=train.length)cursor=0;
  const chunk=train.slice(cursor,cursor+Math.min(320,train.length));
  cursor+=chunk.length;
  brain.beginExercise();
  const before=brain.align?.hits||0, seen=brain.align?.lived||0;
  for(const y of chunk){brain.live(y,brain.lived%32===0);brain.chars++;}
  seenTexts++;
  if(seenTexts%4===0&&held.length>20){
    const t=brain.evalText(held.slice(0,Math.min(400,held.length)),400);
    evaluation.text={heldout:true,n:t.n,aligned:t.aligned,live:t.live};
  }
  last.text={world:'text',episode,source:userText?'User supplied':'V17 documentation',
    actual:Buffer.from(chunk).toString('latin1'),characters:chunk.length,
    preHits:before,onlineAccuracy:(brain.align.hits-before)/Math.max(1,brain.align.lived-seen),
    heldout:evaluation.text||null};
}
function mazeEpisode(){
  const r=brain.playMaze(true);
  last.maze={world:'maze',episode,n:r.n,wall:r.wall,path:r.path,start:r.start,goal:r.goal,
    solved:r.solved,steps:r.steps,optimal:r.optimal,shapes:r.shapes.slice(0,200),
    first:r.first,how:r.how,knows:r.knows};
  if(brain.mazes.played%8===0)evaluation.maze=brain.testMazes(6);
}
function transformEpisode(){
  const r=brain.playTransform(true),t=brain.trans.last;
  last.transform={world:'transform',episode,n:r.n,frames:t?.frames||[],goal:t?.goal||[],
    goals:t?.goals||[],solved:r.solved,steps:r.steps,optimal:r.optimal,
    failed:r.failed,predicted:r.predicted,how:r.how,said:r.said};
}
function tick(){
  if(!running||paused)return;
  try{
    ensureBrain(true);
    const mode=modes[idx++%modes.length];
    episode++;
    if(mode==='text')textEpisode();
    else if(mode==='maze')mazeEpisode();
    else transformEpisode();
    if(remaining>0&&--remaining===0)running=false;
    if(episode%12===0)save();
    else publish();
  }catch(e){error=String(e.stack||e);running=false;publish();}
  if(running)setImmediate(tick);
}
parentPort.on('message',m=>{
  try{
    const action=m?.action;
    if(action==='start'){
      if(running)throw Error('Training already active');
      ensureBrain(m.resume!==false);
      const selected=Array.isArray(m.worlds)?m.worlds.filter(x=>['text','maze','transform'].includes(x)):[];
      if(!selected.length)throw Error('Select at least one real training world');
      modes=[...new Set(selected)];
      if(typeof m.text==='string'&&m.text.trim()){sourceText=m.text.slice(0,250000);userText=true;cursor=0;}
      running=true;paused=false;error=null;remaining=m.infinite?0:Math.max(1,Math.min(60,Math.trunc(Number(m.episodes)||3)));
      publish();setImmediate(tick);
    } else if(action==='pause'){paused=true;publish();}
    else if(action==='resume'){if(!running)throw Error('No active run');paused=false;publish();setImmediate(tick);}
    else if(action==='stop'){running=false;paused=false;publish();}
    else if(action==='save'){save();}
    else if(action==='load'){if(running)throw Error('Stop training before loading');brain=Brain.load(checkpoint);publish();}
    else if(action==='state')publish();
    else throw Error('Unknown command');
  }catch(e){error=String(e.message||e);publish();}
});
try{if(fs.existsSync(checkpoint))ensureBrain(true);publish();}
catch(e){error=String(e.message||e);brain=null;publish();}
