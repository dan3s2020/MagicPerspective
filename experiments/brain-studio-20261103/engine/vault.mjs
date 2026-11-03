// All previous checkpoint files are READ-ONLY source inputs.
// Brain Studio owns data/active.json and data/brains/*.json; it never writes to V1-V7.
import path from 'node:path';
import {readdir,readFile,writeFile,rename,mkdir,stat,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {restoreBrain,KINDS} from './studio.mjs';

export const SOURCES=[
 ['v7-live','V7 · Live','v7','v7/data/live-brain.json'],
 ['v7-best','V7 · Best','v7','v7/data/best-brain.json'],
 ['v6-live','V6 · Live','v6','v6/data/live-brain.json'],
 ['v6-best','V6 · Best','v6','v6/data/best-brain.json'],
 ['graph-live','Graph Dance · Live','graph','experiments/graph-dance-20261103/data/live-rule.json'],
 ['graph-best','Graph Dance · Best','graph','experiments/graph-dance-20261103/data/best-rule.json'],
 ['dynamic-live','Dynamic Perspective · Live','dynamic','experiments/dynamic-perspective-20261103/data/latest.json'],
 ['dynamic-best','Dynamic Perspective · Best','dynamic','experiments/dynamic-perspective-20261103/data/best.json'],
 ['causal-best','Causal Text · Best','causal','experiments/causal-text/data/best-model.json'],
 ['v5-live','V5 · preserved','archive','v5/data/live-brain.json'],
 ['v5-best','V5 · preserved','archive','v5/data/best-brain.json'],
 ['v4-live','V4 · preserved','archive','v4/data/live-brain.json'],
 ['v3-live','V3 · preserved','archive','v3/data/live-checkpoint.json'],
 ['v3-best','V3 · preserved','archive','v3/data/best-checkpoint.json'],
 ['v2-live','V2 · preserved','archive','v2/data/live-checkpoint.json']
];
export function detect(content){
 const s=content?.snapshot||content?.brain||content?.rule||content?.model||content;
 if(!s||typeof s!=='object')throw Error('Invalid snapshot object');
 let kind='archive';
 if(s.schema===1&&s.net?.I===16)kind='universal';
 else if(s.schema===7&&Array.isArray(s.experts))kind='v7';
 else if(s.schema===6&&s.recon&&s.doubt)kind='v6';
 else if(s.schema===7&&Array.isArray(s.w)&&s.w.length===9)kind='graph';
 else if(s.schema===2&&Array.isArray(s.cost)&&Array.isArray(s.gate))kind='dynamic';
 else if(s.schema===6&&Array.isArray(s.w1)&&s.w2)kind='causal';
 return {kind,snapshot:s};
}
export async function readGuarded(file,limit=12*1024*1024){
 const info=await stat(file);if(!info.isFile()||info.size>limit||info.size<2)throw Error('Checkpoint size invalid');
 return JSON.parse(await readFile(file,'utf8'));
}
const safeId=s=>/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/.test(s);
export class Vault{
 constructor(repositoryRoot,home){this.root=repositoryRoot;this.home=home;this.dir=path.join(home,'brains')}
 async setup(){await mkdir(this.dir,{recursive:true});await mkdir(this.home,{recursive:true});}
 async list(){
  await this.setup();const result=[];
  for(const [id,label,expected,rel] of SOURCES){
   const file=path.join(this.root,rel);if(!existsSync(file))continue;
   try{
    const content=await readGuarded(file),{kind,snapshot}=detect(content);
    const compatible=kind!=='archive'&&kind===expected;
    // Check using the actual native class; malformed weights must never be offered for training.
    if(compatible)restoreBrain(kind,snapshot);
    result.push({id,label,kind:compatible?kind:'archive',trainable:compatible,
     source:'Original • read-only',episodes:snapshot.episodes||0});
   }catch(e){result.push({id,label,kind:'archive',trainable:false,source:'Original • invalid: '+e.message})}
  }
  if(existsSync(path.join(this.home,'best.json'))){
   try{
    const raw=await readGuarded(path.join(this.home,'best.json'));
    const {kind,snapshot}=detect(raw);
    if(kind!=='archive')restoreBrain(kind,snapshot);
    result.push({id:'studio-best',label:'STUDIO · BEST VALIDATION',kind,
     trainable:kind!=='archive',source:'Studio · held-out validation',
     episodes:snapshot.episodes||0,savedAt:raw.savedAt||null});
   }catch(e){result.push({id:'studio-best',label:'Best checkpoint unreadable',
    kind:'archive',trainable:false,source:e.message})}
  }
  for(const name of (await readdir(this.dir)).filter(n=>n.endsWith('.json')&&safeId(n))){
   try{
    const item=await readGuarded(path.join(this.dir,name)),{kind,snapshot}=detect(item);
    const compatible=kind!=='archive';if(compatible)restoreBrain(kind,snapshot);
    result.push({id:'saved:'+name.slice(0,-5),label:item.label||name,kind,trainable:compatible,
     source:'Studio • saved',episodes:snapshot.episodes||0,savedAt:item.savedAt||null});
   }catch(e){result.push({id:'saved:'+name.slice(0,-5),label:name,kind:'archive',trainable:false,
    source:'Studio • invalid: '+e.message})}
  }
  return result;
 }
 async load(id){
  let file;
  if(id==='studio-best')file=path.join(this.home,'best.json');
  else if(id.startsWith('saved:')){
   const name=id.slice(6);if(!safeId(name))throw Error('Invalid saved brain identifier');
   file=path.join(this.dir,name+'.json');
  }else{
   const found=SOURCES.find(x=>x[0]===id);
   if(!found)throw Error('Unknown checkpoint identifier');
   file=path.join(this.root,found[3]);
  }
  const content=await readGuarded(file),detected=detect(content);
  if(detected.kind==='archive')return {kind:'archive',snapshot:detected.snapshot,
    label:content.label||id,trainable:false};
  const brain=restoreBrain(detected.kind,detected.snapshot);
  return {kind:detected.kind,brain,label:content.label||id,trainable:true};
 }
 async saveBrain(kind,brain,label){
  if(!KINDS.includes(kind))throw Error('Unknown brain kind');
  label=String(label||kind).trim().slice(0,75);
  if(!label)throw Error('Name required');
  const id=new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+Math.random().toString(36).slice(2,9);
  const content={schema:'studio-1',label,kind,snapshot:brain.snapshot(),savedAt:new Date().toISOString()};
  await this.atomic(path.join(this.dir,id+'.json'),content);
  return 'saved:'+id;
 }
 async import(content,label){
  const raw=typeof content==='string'?JSON.parse(content):content,{kind,snapshot}=detect(raw);
  if(kind==='archive'){
   // Preserve any structurally valid unsupported brain without inventing a weight conversion.
   const title=String(label||raw.label||'Arhivă importată').slice(0,75);
   const id='archive-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+Math.random().toString(36).slice(2,9);
   await this.atomic(path.join(this.dir,id+'.json'),{schema:'studio-archive-1',
    label:title,kind:'archive',snapshot,savedAt:new Date().toISOString()});
   return 'saved:'+id;
  }
  const brain=restoreBrain(kind,snapshot);return this.saveBrain(kind,brain,label||raw.label||('Import '+kind));
 }
 async atomic(file,obj){
  await mkdir(path.dirname(file),{recursive:true});
  const temp=file+'.tmp-'+process.pid;
  await writeFile(temp,JSON.stringify(obj),'utf8');
  await rename(temp,file);
 }
}
