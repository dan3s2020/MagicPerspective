// V17 opt-in self-code universe. Only data in Brain.selfCode is mutable.
// Uses the existing Brain.live, Brain.observeShared, GraphTrace and native checkpoint.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HOME=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCES=['devour/brain.mjs','devour/trace.mjs','worlds/causal.mjs','worlds/exercise.mjs'];
const OPS={
 add:(x,p)=>(x+p)&15,
 xor:(x,p)=>x^p,
 rotate:(x,p)=>((x<<(p%4))|(x>>>(4-p%4)))&15,
 multiply:(x,p)=>(x*(2*p+1))&15
};
const FAMILIES=Object.keys(OPS);
const GENES=[
 {id:'portal-offset',op:'add',param:1},
 {id:'portal-mask',op:'xor',param:2},
 {id:'portal-turn',op:'rotate',param:1},
 {id:'portal-stride',op:'multiply',param:1}
];
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const clone=v=>JSON.parse(JSON.stringify(v));
const byte=c=>{const x=c.charCodeAt(0);return x===10||x===9||(x>=32&&x<127)?x:63;};
export function sourceMap(paths=SOURCES.map(x=>[x,path.join(HOME,x)])){
 const files=[],nodes=[],edges=[];
 for(const [label,filename] of paths){
  const code=fs.readFileSync(filename,'utf8');
  if(code.length>1200000)throw Error('Source exceeds introspection budget');
  const lines=code.split(/\r?\n/),local=[];
  for(let i=0;i<lines.length;i++){
   const m=lines[i].match(/\b(?:export\s+)?(?:class|function)\s+([\w$]+)|^\s*(?:async\s+)?([\w$]+)\s*\([^)]*\)\s*\{/);
   if(!m)continue;
   const n={id:'code:src:'+label+':'+(i+1),label,name:m[1]||m[2],line:i+1,
    preview:lines.slice(Math.max(0,i-1),i+3).join('\n').slice(0,250)};
   nodes.push(n);local.push(n);if(nodes.length>=600)break;
  }
  for(let i=1;i<local.length;i++)edges.push([local[i-1].id,local[i].id]);
  files.push({label,sha256:hash(code)});
 }
 return {files,nodes,edges};
}
export function newCodeState(seed=11){
 return {version:1,seed,episodes:0,genes:clone(GENES),examples:{},visits:{},
  value:{},portals:[],edits:[],lockHistory:[],codeUnlocked:false,lockTests:0,
  lockAccuracy:0,baseline:0,sourceHashes:null,noiseRate:.30,noiseBudget:10000,
  predictions:0,hits:0,portalCost:0};
}
export class CodeSemantics{
 constructor(state){this.state=state;}
 ranking(id){
  const examples=this.state.examples[id]||[];
  return FAMILIES.map(op=>({op,error:examples.reduce((n,v)=>n+(OPS[op](v.x,v.p)!==v.y),0)}))
   .sort((a,b)=>a.error-b.error||FAMILIES.indexOf(a.op)-FAMILIES.indexOf(b.op));
 }
 predict(id,x,p){
  const examples=this.state.examples[id]||[],r=this.ranking(id);
  if(examples.length<3||r[0].error===r[1].error)return null;
  return OPS[r[0].op](x,p);
 }
 uncertainty(id){
  const examples=this.state.examples[id]||[],r=this.ranking(id);
  return examples.length<3?1:1/(1+Math.max(0,r[1].error-r[0].error));
 }
 learn(id,x,p,y){
  const e=this.state.examples[id]||(this.state.examples[id]=[]);
  e.push({x,p,y});if(e.length>96)e.shift();
 }
}
export class SelfCodeWorld{
 constructor(brain,{sourcePaths=null,evalSeed=19071}={}){
  if(!brain||typeof brain.live!=='function'||!brain.trace)throw Error('Native Brain required');
  this.brain=brain;this.map=sourceMap(sourcePaths||undefined);
  this.state=brain.selfCode||(brain.selfCode=newCodeState(brain.seed));
  const s=this.state,hashes=this.map.files.map(f=>f.sha256);
  if(s.version!==1)throw Error('Unknown self-code checkpoint version');
  if(s.sourceHashes&&JSON.stringify(s.sourceHashes)!==JSON.stringify(hashes))
   throw Error('Source code changed since this brain learned it');
  s.sourceHashes=hashes;this.model=new CodeSemantics(s);this.evalSeed=evalSeed;
  this.registerGraph();
 }
 registerGraph(){
  const t=this.brain.trace;
  t.node('o:self','self','eu');t.node('code:universe','code','codul meu');
  t.node('code:lock','lock','cod incuiat');
  t.setEdge('o:self','code:universe','inside',3);
  t.setEdge('code:universe','code:lock','locked',4);
  for(const n of this.map.nodes){t.node(n.id,'code',n.name);t.setEdge('code:universe',n.id,'source',.2);}
  for(const [a,b] of this.map.edges)t.setEdge(a,b,'code-flow',.3);
  for(const g of this.state.genes){
   t.node('code:gene:'+g.id,'code',g.id);
   t.setEdge('code:universe','code:gene:'+g.id,'contains',2);
  }
 }
 rand(){return this.brain.rand?.()??0.5;}
 choose(){
  const s=this.state;
  const rated=s.genes.map(g=>{
   const n=s.visits[g.id]||0;
   const uncertainty=this.model.uncertainty(g.id);
   const usefulness=(s.value[g.id]||0)/(n||1);
   const execution=OPS[g.op](s.episodes&15,g.param)/15;
   return {g,score:usefulness+.35*uncertainty+
    .15*Math.sqrt(Math.log(s.episodes+2)/(n+1))+.08*execution};
  });
  if(s.noiseBudget>0&&this.rand()<s.noiseRate){
   s.noiseBudget--;s.portalCost++;return rated[Math.floor(this.rand()*rated.length)].g;
  }
  if(s.noiseBudget>0){s.noiseBudget--;s.portalCost++;}
  return rated.reduce((a,b)=>a.score>b.score?a:b).g;
 }
 perceive(text){
  for(const c of text.slice(0,300))this.brain.live(byte(c),false);
 }
 step(){
  const s=this.state,t=this.brain.trace,g=this.choose();
  const x=1+Math.floor(this.rand()*14),p=1+Math.floor(this.rand()*3);
  const old=OPS[g.op](x,g.param);
  const prediction=this.model.predict(g.id,x,p);
  const actual=OPS[g.op](x,p);
  if(prediction!==null){s.predictions++;s.hits+=Number(prediction===actual);}
  const n=this.map.nodes[Math.floor(this.rand()*this.map.nodes.length)];
  this.perceive('\n[CODE WORLD] '+n.name+': '+n.preview.slice(0,100)+
   '\nCODE '+g.id+' input='+x+' before='+old+' patch='+p+' after='+actual+'\n');
  this.model.learn(g.id,x,p,actual);
  s.episodes++;s.visits[g.id]=(s.visits[g.id]||0)+1;
  const gain=prediction===null?.2:prediction===actual?.06:-.08;
  s.value[g.id]=(s.value[g.id]||0)+gain;
  const node='code:gene:'+g.id;
  t.fire(node);t.fire('code:universe');
  t.setEdge(n.id,node,'portal',1+Math.max(0,gain)*5);
  t.setEdge(node,'code:lock','seeks',s.codeUnlocked?.1:2);
  s.portals.push({episode:s.episodes,from:n.id,to:node,gain,
   prediction,observed:actual});
  if(s.portals.length>80)s.portals.shift();
  // The exact same V17 PyTorch shared learner sees these real code-state changes.
  this.brain.observeShared?.({domain:'code',before:[x,g.param,old],
   action:'rewrite:'+g.id+':'+p,after:[x,p,actual],context:'self-code'});
  if(s.episodes%48===0&&!s.codeUnlocked)this.testLock();
  if(s.codeUnlocked&&!s.edits.length)this.tryEdit();
  return this.status();
 }
 testLock(){
  const s=this.state,results=[];let seed=(this.evalSeed+s.lockTests*167+s.seed)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // The hidden outcomes are never passed to the training stream.
  for(const g of s.genes)for(let i=0;i<20;i++){
   const x=1+Math.floor(random()*14),p=1+Math.floor(random()*3);
   const actual=OPS[g.op](x,p),prediction=this.model.predict(g.id,x,p);
   results.push([Number(prediction!==null&&prediction===actual),
    Number(OPS[g.op](x,g.param)===actual)]);
  }
  const accuracy=avg(results.map(x=>x[0])),baseline=avg(results.map(x=>x[1]));
  const unlocked=accuracy>=.90&&accuracy>=baseline+.15;
  s.lockTests++;s.codeUnlocked ||=unlocked;
  s.lockAccuracy=accuracy;s.baseline=baseline;
  s.lockHistory.push({test:s.lockTests,accuracy,baseline,unlocked});
  if(s.lockHistory.length>40)s.lockHistory.shift();
  if(unlocked){
   this.brain.trace.fire('code:lock');
   this.brain.trace.setEdge('o:self','code:lock','understands',5);
  }
  return {accuracy,baseline,unlocked};
 }
 tryEdit(){
  const s=this.state,g=s.genes.find(g=>g.id==='portal-offset');
  const unseen=[2,3,5,7,9,11,13];
  const fitness=p=>avg(unseen.map(x=>1-
   Math.min(8,Math.abs(OPS[g.op](x,p)-((x+3)&15)))/8));
  const old=fitness(g.param);
  const best=[1,2,3].map(p=>({p,fitness:fitness(p)}))
   .sort((a,b)=>b.fitness-a.fitness)[0];
  if(best.fitness>old+.03&&this.model.predict(g.id,5,best.p)!==null){
   const edit={episode:s.episodes,code:g.id,from:g.param,to:best.p,
    beforeFitness:old,afterFitness:best.fitness};
   g.param=best.p;s.edits.push(edit);
   this.brain.trace.setEdge('code:lock','code:gene:'+g.id,'unlocked-edit',5);
   return edit;
  }
  return null;
 }
 status(){
  const s=this.state;
  return {episodes:s.episodes,unlocked:s.codeUnlocked,
   lockAccuracy:s.lockAccuracy,baseline:s.baseline,
   portalCost:s.portalCost,codeEdits:s.edits.slice(-3),
   predictionAccuracy:s.predictions?s.hits/s.predictions:null,
   portals:s.portals.slice(-12),lockHistory:s.lockHistory.slice(-8)};
 }
}
