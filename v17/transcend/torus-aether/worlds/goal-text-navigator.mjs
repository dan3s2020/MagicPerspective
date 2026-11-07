// Learned goal-conditioned 4D text-world path navigator for the ORIGINAL V17 Brain.
// The model contains NO simulator physics, NO answer-specific templates and NO
// next-character predictor. Its source entities and 4-digit coordinates remain
// a fixed input ontology, so this is NOT unrestricted semantic parsing.
export const SIDE=4,DIM=4,N=SIDE**DIM;
export const ACTIONS=['fold','echo','lift','drift','phase','curl','arc','sweep'];
export const SOURCES=['ledger','dream','rumor'];
const key=a=>a.join(',');
export function rng(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/2**32}}
function shuffled(a,R){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
export const enc=v=>v.reduce((a,x)=>a*SIDE+x,0);
export const dec=s=>{let v=new Array(DIM);for(let j=DIM-1;j>=0;j--){v[j]=s%SIDE;s=Math.floor(s/SIDE)}return v};
export const move=(s,delta)=>enc(dec(s).map((x,i)=>(x+delta[i]+SIDE)%SIDE));
const words=s=>String(s).toLowerCase().match(/[a-z]+/g)||[];
const features=s=>{let w=words(s),z=new Set();for(const t of w)z.add('w:'+t);for(let i=0;i+1<w.length;i++)z.add('b:'+w[i]+' '+w[i+1]);return z};
export class LearnedClaim {
 constructor(){this.yes=new Map();this.no=new Map();this.totalYes=0;this.totalNo=0;this.seen=0}
 observe(text,claim){const f=features(text),m=claim?this.yes:this.no;for(const token of f)m.set(token,(m.get(token)||0)+1);if(claim)this.totalYes++;else this.totalNo++;this.seen++}
 predict(text){const f=features(text);let evidence=0,active=0;
  // Ground lexical predicate from real supervised observations. A heldout
  // sentence is classified without a regex for its full sentence order.
  for(const token of f){const y=this.yes.get(token)||0,n=this.no.get(token)||0;
   if(y+n<3)continue;
   evidence+=Math.log((y+1)/(this.totalYes+2))-Math.log((n+1)/(this.totalNo+2));active++}
  return {passable:evidence>=0,margin:evidence,active}
 }
}
export class TextWorldNavigator {
 constructor(){this.predicates=new LearnedClaim();this.effects=new Map();this.sources=new Map();this.transitions=0;this.claims=0;this.reliabilitySeen=0}
 observeAction(before,action,after){const x=dec(before),y=dec(after),delta=key(y.map((v,j)=>(v-x[j]+SIDE)%SIDE));let m=this.effects.get(action);if(!m){m=new Map();this.effects.set(action,m)}m.set(delta,(m.get(delta)||0)+1);this.transitions++}
 effect(action){const x=this.effects.get(action);if(!x)return null;return [...x].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number)}
 learnClaim(phrase,claim){this.predicates.observe(phrase,claim);this.claims++}
 observeReliability(source,claim,truth){let p=this.sources.get(source)||{right:0,wrong:0};if(claim===truth)p.right++;else p.wrong++;this.sources.set(source,p);this.reliabilitySeen++}
 trust(source){const p=this.sources.get(source)||{right:0,wrong:0};return (p.right+1)/(p.right+p.wrong+2)}
 parseEvidence(line){
  // Only the coordinate syntax/source identifier are pre-specified. Both
  // word order and the passable/blocked predicate are inferred from training.
  const tuple=line.match(/\b[0-3]\s*,\s*[0-3]\s*,\s*[0-3]\s*,\s*[0-3]\b/);
  if(!tuple)return null;
  const source=SOURCES.find(s=>new RegExp('\\b'+s+'\\b','i').test(line));
  if(!source)return null;
  const position=tuple[0].split(',').map(x=>Number(x.trim()));
  const clean=line.replace(tuple[0],' ').replace(new RegExp('\\b'+source+'\\b','ig'),' ');
  return {where:enc(position),source,position,...this.predicates.predict(clean)}
 }
 reconstruct(document){const groups=Array.from({length:N},()=>[]);let observations=0;
  for(const line of document.split('\n')){const d=this.parseEvidence(line);if(d){groups[d.where].push(d);observations++}}
  const map=new Uint8Array(N),conflicts=[];let uncertain=0;
  for(let i=0;i<N;i++){
   const entries=groups[i];if(entries.length<3)throw Error('Missing source evidence at state '+i);
   const sorted=entries.slice().sort((a,b)=>this.trust(b.source)-this.trust(a.source));
   map[i]=+sorted[0].passable;
   if(entries.some(x=>x.passable!==sorted[0].passable)){uncertain++;conflicts.push(i)}
  }
  return {map,observations,uncertain,conflicts};
 }
 path(start,goal,map,{rank=4,seed=0}={}){
  let effects=ACTIONS.map(a=>this.effect(a));
  if(rank<4)effects=effects.map(d=>d?.slice(rank).some(x=>x!==0)?null:d);
  const queue=[start],prev=new Int32Array(N).fill(-1),used=new Uint8Array(N);used[start]=1;
  const random=seed?rng(seed):null;
  for(let i=0;i<queue.length;i++){
   const u=queue[i];if(u===goal)break;
   const options=ACTIONS.map((action,j)=>({action,delta:effects[j]})).filter(x=>x.delta);
   const ordered=random?shuffled(options,random):options;
   for(const {action,delta}of ordered){const v=move(u,delta);if(!map[v]||used[v])continue;used[v]=1;prev[v]=u;queue.push(v)}
  }
  if(!used[goal])return null;
  const shape=[];for(let v=goal;v!==start;v=prev[v]){
   const p=prev[v],a=ACTIONS.find(x=>{const d=this.effect(x);return d&&move(p,d)===v});
   if(!a)throw Error('Unable to reconstruct learned route');shape.push({from:p,to:v,action:a})
  }
  return shape.reverse()
 }
 predictShape(document,start,goal,opts={}){const decoded=this.reconstruct(document);const shape=this.path(start,goal,decoded.map,opts);return {shape,initialActions:shape?.map(x=>x.action)||[],...decoded,goal,start,preAction:true}}
 execute(world,prediction,{chance=0,replan=false,seed=9,physics}={}){
  if(!physics)throw Error('Physical world step function required; planner must never read hidden physics');
  const R=rng(seed),map=prediction.map;let at=world.start,path=prediction.shape?.slice()||[],mistakes=0,changes=0;
  const initial=path.map(x=>x.action),max=replan?80:path.length;
  for(let t=0;t<max;t++){
   if(at===world.goal||!path.length)break;
   const chosen=path.shift(),intended=physics(at,chosen.action);
   if(R()<chance||!world.cells[intended]){mistakes++}else at=intended;
   if(replan&&at!==world.goal){path=this.path(at,world.goal,map)||[];changes++}
  }
  return {solved:at===world.goal,at,mistakes,changes,initial,oracle:world.oracle?.length||null}
 }
 snapshot(){return {version:1,transitions:this.transitions,claims:this.claims,reliabilitySeen:this.reliabilitySeen,
  effects:[...this.effects].map(([k,v])=>[k,[...v]]),sources:[...this.sources].map(([k,v])=>[k,{...v}]),
  predicates:{totalYes:this.predicates.totalYes,totalNo:this.predicates.totalNo,seen:this.predicates.seen,
   yes:[...this.predicates.yes],no:[...this.predicates.no]}}}
 static restore(s){if(s?.version!==1)throw Error('Unsupported text-world model version');let a=new TextWorldNavigator();
  a.transitions=s.transitions;a.claims=s.claims;a.reliabilitySeen=s.reliabilitySeen;
  a.effects=new Map(s.effects.map(([k,v])=>[k,new Map(v)]));a.sources=new Map(s.sources);
  a.predicates=new LearnedClaim();Object.assign(a.predicates,{totalYes:s.predicates.totalYes,totalNo:s.predicates.totalNo,seen:s.predicates.seen,
   yes:new Map(s.predicates.yes),no:new Map(s.predicates.no)});return a}
 frozenFingerprint(){return JSON.stringify(this.snapshot())}
}
