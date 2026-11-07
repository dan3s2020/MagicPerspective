// Controlled experiment: actual 4D physics is PRIVATE to this environment.
// The engine imports NO ground truth; it sees fragmented observations only.
import fs from 'node:fs';
import {ACTIONS,STATES,SIDE,encode,decode,seeded,move,CausalAtlas4D} from './atlas-engine.mjs';
const axisOf=a=>Math.floor(a/2);
const controller=[1,2,3,0,2,3];
const realDelta=(from,a,{alterAction=-1}={})=>{
  const axis=axisOf(a),sign=a%2===0?1:-1;
  let effective=sign;
  if(a<6&&decode(from)[controller[a]]%2===1)effective*=-1;
  if(a===alterAction)effective*=-1;
  const d=[0,0,0,0];d[axis]=(effective+SIDE)%SIDE;return d;
};
const physics=(from,a,opts={})=>move(from,realDelta(from,a,opts));
const wordObservation=e=>'World '+e.world+': at four-axis position ('+decode(e.from).join(',')+'), action '+e.action+' produced position ('+decode(e.to).join(',')+').';
export function evidence(seed=17,{worlds=32,perWorld=76,corrupt=0}={}){
  const r=seeded(seed),events=[],byWorld=[];
  for(let w=0;w<worlds;w++){
    const two=[w%8,(w+3)%8],rows=[];
    for(let i=0;i<perWorld;i++){
      const a=two[i%2],s=Math.floor(r()*STATES),wrong=r()<corrupt,act=wrong?Math.floor(r()*8):a;
      rows.push({world:w,from:s,action:ACTIONS[a],to:physics(s,act),id:String(seed)+'-'+w+'-'+i});
    }
    byWorld.push(rows);
  }
  // Interleave fragments of ALL worlds; learner does not get one huge maze.
  for(let i=0;i<perWorld;i++)for(let w=0;w<worlds;w++)events.push(byWorld[w][i]);
  return {events,byWorld,fragments:byWorld.map(rows=>rows.map(wordObservation).join('\n'))};
}
export function world(seed){
  const r=seeded(seed),passable=Uint8Array.from({length:STATES},()=>+(r()>.14));
  // Goals are selected independently AFTER the hidden maze is created.
  for(let t=0;t<1000;t++){
    const start=Math.floor(r()*STATES),goal=Math.floor(r()*STATES);
    if(start===goal||!passable[start]||!passable[goal])continue;
    const plan=oracle(start,goal,passable);if(plan&&plan.length>=5)return {seed,start,goal,passable,oracleLength:plan.length};
  }
  throw Error('world generator did not find a solvable length>=5 route');
}
function oracle(start,goal,map,opts={}){
  const queue=[start],seen=new Uint8Array(STATES),prev=new Int32Array(STATES).fill(-1);seen[start]=1;
  for(let i=0;i<queue.length;i++){
    const s=queue[i];if(s===goal)break;
    for(let a=0;a<8;a++){
      const next=physics(s,a,opts);if(!map[next]||seen[next])continue;
      seen[next]=1;prev[next]=s;queue.push(next);
    }
  }
  if(!seen[goal])return null;
  let path=[];for(let s=goal;s!==start;s=prev[s])path.push(s);return path.reverse();
}
function execute(w,trace,{alterAction=-1}={}){
  if(!trace)return {solved:false,at:w.start,wrong:null};
  let at=w.start,wrong=null;
  for(let index=0;index<trace.length;index++){
    const edge=trace[index],action=ACTIONS.indexOf(edge.action),next=physics(at,action,{alterAction});
    if(edge.from!==at||next!==edge.to){wrong={index,from:at,action:edge.action,predictedTo:edge.to,actualTo:next,reason:'learned-transformation-mismatch'};return {solved:false,at,wrong};}
    if(!w.passable[next]){wrong={index,from:at,action:edge.action,actualTo:next,reason:'wall'};return {solved:false,at,wrong};}
    at=next;
  }
  return {solved:at===w.goal,at,wrong};
}
function fixedAtlasFrom(events){const atlas=new CausalAtlas4D();for(const e of events)atlas.observe(e);atlas.fit();
  for(const [action,model] of atlas.model){if(!model.ready)continue;
    const rows=atlas.events.filter(x=>x.action===action),cnt=new Map();for(const e of rows)cnt.set(e.delta,(cnt.get(e.delta)||0)+1);
    const v=[...cnt].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
    model.kind='fixed';model.axis=null;model.classes=[v[0]];model.errors=rows.length-v[1];model.confidence=v[1]/rows.length;
  }return atlas;
}
function evalOne(atlas,w,opts={}){
  const plan=atlas.route(w.start,w.goal,w.passable,opts),out=execute(w,plan.found?plan.trace:null);
  return {solved:out.solved,optimal:out.solved&&plan.length===w.oracleLength,plan,actual:out};
}
export function benchmark({seed=17,worlds=96,prefix=2432,details=false,corrupt=0}={}){
  const train=evidence(seed,{corrupt}),examples=train.events.slice(0,prefix),atlas=new CausalAtlas4D();for(const e of examples)atlas.observe(e);atlas.fit();
  const fixed=fixedAtlasFrom(examples),last=new CausalAtlas4D();for(const e of train.byWorld.at(-1))last.observe(e);last.fit();
  const sampled=[],results={seed,trainingWorlds:32,trainingObserved:examples.length,full:0,optimal:0,fixed:0,oneWorld:0,rank2:0,failures:[],shapeExamples:[],worlds,conditionalRules:[...atlas.model].filter(([a,m])=>m.kind==='conditional').map(([a])=>a)};
  for(let i=0;i<worlds;i++){
    const w=world(seed*100009+101+i*19),actual=evalOne(atlas,w);
    results.full+=+actual.solved;results.optimal+=+actual.optimal;
    results.fixed+=+evalOne(fixed,w).solved;results.oneWorld+=+evalOne(last,w).solved;
    results.rank2+=+evalOne(atlas,w,{rank:2}).solved;
    if(!actual.solved)results.failures.push({worldSeed:w.seed,start:decode(w.start),goal:decode(w.goal),reason:actual.plan.reason||actual.actual.wrong?.reason||'suboptimal',frontier:actual.plan.frontier?.slice(0,30)});
    if(details)sampled.push({worldSeed:w.seed,start:decode(w.start),goal:decode(w.goal),correct:actual.solved,optimal:actual.optimal,
      shape:actual.plan.shape||[],route:actual.plan.trace||[],failure:actual.actual.wrong||null,blockedEdges:actual.plan.frontier?.length||0});
    if(i<3)results.shapeExamples.push({seed:w.seed,start:decode(w.start),goal:decode(w.goal),oracleLength:w.oracleLength,predicted:actual.plan.shape,correct:actual.solved});
  }
  const topology=atlas.completeAtlas();results.atlas={states:topology.states,possibleEdges:topology.possibleEdges,observedExact:topology.observedExact,inferred:topology.inferred,transforms:topology.transforms};
  results.holdoutNeverTrains=atlas.events.length===examples.length;
  if(details)results.worldTraces=sampled;
  return {results,atlas,train};
}
export function learningCurve({seed=17,worlds=96}={}){
  const sizes=[32,64,96,128,192,320,512,768,1280,2432];
  return sizes.map(prefix=>{const b=benchmark({seed,worlds,prefix});return {observations:prefix,correct:b.results.full,optimal:b.results.optimal,fixed:b.results.fixed,oneWorld:b.results.oneWorld,conditionalRules:b.results.conditionalRules.length};});
}
export function shiftedPhysicsDiagnostic({seed=17}={}){
  const {atlas}=benchmark({seed,worlds:1});const graph=atlas.completeAtlas();
  const errors=graph.edges.filter(e=>physics(e.from,ACTIONS.indexOf(e.action),{alterAction:0})!==e.to).map(e=>({at:decode(e.from),action:e.action,predicted:decode(e.to),actual:decode(physics(e.from,0,{alterAction:0})),why:'context-dependent-rule-changed-in-new-world',source:e.source,evidenceIds:e.evidenceIds}));
  return {total:graph.edges.length,wrong:errors.length,examples:errors.slice(0,20),wrongByAction:Object.fromEntries(ACTIONS.map(a=>[a,errors.filter(e=>e.action===a).length]))};
}
export function fullResearch({includeTraces=true}={}){
  const runs=[17,29,47].map(seed=>benchmark({seed,worlds:96,details:includeTraces}));
  const metrics={experiment:'LEARNED_CROSS_WORLD_CONDITIONAL_TRANSFORMATION_ATLAS',kind:'structured 4D worlds, not unrestricted language Q/A',
    runs:runs.map(x=>x.results),aggregate:{worlds:288,full:runs.reduce((s,x)=>s+x.results.full,0),optimal:runs.reduce((s,x)=>s+x.results.optimal,0),
      fixed:runs.reduce((s,x)=>s+x.results.fixed,0),oneWorld:runs.reduce((s,x)=>s+x.results.oneWorld,0),rank2:runs.reduce((s,x)=>s+x.results.rank2,0)},
    curves:[17,29,47].map(seed=>({seed,points:learningCurve({seed,worlds:96})})),physicsShift:shiftedPhysicsDiagnostic({seed:17})};
  const graph=runs[0].atlas.completeAtlas();
  return {metrics,graph,trainingEvidence:runs[0].train.fragments};
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split(/[\\/]/).at(-1))){
  const t=Date.now(),data=fullResearch({includeTraces:true});const out=process.argv[2];
  if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/results.json',JSON.stringify(data.metrics,null,2));fs.writeFileSync(out+'/atlas-2048-edges.json',JSON.stringify(data.graph,null,2));fs.writeFileSync(out+'/training-fragments.json',JSON.stringify(data.trainingEvidence,null,2));}
  const x=data.metrics;console.log(JSON.stringify({durationMs:Date.now()-t,aggregate:x.aggregate,perSeed:x.runs.map(x=>({seed:x.seed,success:x.full,fixed:x.fixed,oneWorld:x.oneWorld,rank2:x.rank2,atlas:x.atlas})),physicsShift:x.physicsShift,curves:x.curves},null,2));
}
