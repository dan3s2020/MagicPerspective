// Falsifiable 4D corpus + heldout world harness. Hidden physics only here!
// Atlas-engine.mjs never imports it. A task document supplies 256 terrain
// observations plus start/goal, NEVER the operator definitions or oracle route.
import fs from 'node:fs';import path from 'node:path';
import {CrossWorldAtlas,PRNG,tuple,advance,code} from './atlas-engine.mjs';
export const ACTIONS=['fold','echo','lift','drift','phase','curl','arc','sweep'];
const side=4,dims=4,N=side**dims;
export function actualStep(state,action){
 const x=tuple(state,dims,side),a=ACTIONS.indexOf(action);
 if(a<0)throw Error('Unknown action');const delta=[0,0,0,0],d=Math.floor(a/2),forward=a%2===0;
 let amount=forward?1:-1;if(d>0&&x[d-1]%2===1)amount=forward?2:-2;
 delta[d]=amount;return advance(state,delta,side,dims);
}
const sample=(R,n)=>Math.floor(R()*n);
const shuffle=(arr,R)=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=sample(R,i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
export function trainWorlds({seed=1181,worlds=32,examples=76,noise=.055}={}){
 const R=PRNG(seed),atlas=new CrossWorldAtlas({dims,side,actions:ACTIONS}),fragments=[];
 for(let w=0;w<worlds;w++){
  const action=ACTIONS[w%8],lines=[];
  for(let i=0;i<examples;i++){
   const from=sample(R,N),real=actualStep(from,action),to=R()<noise?sample(R,N):real;
   const x=tuple(from,dims,side).join(","),y=tuple(to,dims,side).join(",");
   const row=i%4===0?"Archive witness: "+action+" changed observed state ("+x+") into ("+y+").":
    i%4===1?"In another world, from ("+x+") the action "+action+" led to ("+y+").":
    i%4===2?"A life recorded path ("+x+"), and after "+action+" arrived at ("+y+").":
    "Observation of ("+x+") becoming ("+y+") under action "+action+".";
   lines.push(row);
  }
  lines.push("Field note: the world did not expose the definitions of other operators.");
  const text=lines.join("\n"),report=atlas.ingestTextDocument(text,{world:"episode-"+w});
  if(report.accepted!==examples)throw Error("Cross-world TEXT training missed observations in world "+w);
  const samples=report.evidenceIds.map(id=>({id,from:atlas.events[id].from,action,to:atlas.events[id].to}));
  fragments.push({world:"episode-"+w,action,count:examples,samples,text,ignored:report.ignored});
 }
 return{atlas,fragments,trainingEvents:atlas.events.length};
}
export function oracleShortest(start,goal,cells){
 const queue=[start],prev=new Map([[start,null]]);
 for(let head=0;head<queue.length;head++){
  const s=queue[head];if(s===goal)break;
  for(const action of ACTIONS){const next=actualStep(s,action);if(!cells[next]||prev.has(next))continue;prev.set(next,{from:s,action});queue.push(next);}
 }
 if(!prev.has(goal))return null;
 const route=[];for(let at=goal;at!==start;){const p=prev.get(at);route.push(p.action);at=p.from}return route.reverse();
}
export function holdoutWorld(seed){
 const R=PRNG(seed),cells=new Uint8Array(N);for(let i=0;i<N;i++)cells[i]=+(R()>.22);
 let start=-1,goal=-1,oracle=null;
 for(let i=0;i<1200;i++){
  const a=sample(R,N),b=sample(R,N);if(!cells[a]||!cells[b]||a===b)continue;
  const path=oracleShortest(a,b,cells);
  if(path?.length>=5&&path.some(v=>ACTIONS.indexOf(v)>=4)){start=a;goal=b;oracle=path;break}
 }
 if(!oracle)throw Error('Cannot find reachable heldout maze');
 const facts=[];
 for(let i=0;i<N;i++){
  const pos=tuple(i,dims,side).join(',');
  const statement=i%3===0?'Chamber ('+pos+') is '+(cells[i]?'open':'sealed')+'.':
   i%3===1?'Evidence for ('+pos+') confirms '+(cells[i]?'passable':'blocked')+' terrain.':
   'The atlas mark ('+pos+') describes '+(cells[i]?'traversable':'impassable')+' space.';
  facts.push(statement);
 }
 for(let j=0;j<80;j++)facts.push('Historical language note #'+j+': a recursive hyperdimensional trajectory may require knowledge inherited from another world. This sentence includes no chamber coordinates, transition effects, action targets or answers.');
 return{seed,cells,start,goal,oracle,document:shuffle(facts,R).join('\n')};
}
export function parseTerrain(document){
 const cells=new Uint8Array(N),seen=new Uint8Array(N);
 for(const line of document.split('\n')){
  const m=line.match(/\((\d),(\d),(\d),(\d)\)/);if(!m)continue;
  const point=m.slice(1).map(Number);if(point.some(x=>x>=side))throw Error('Invalid coordinate');
  const pos=code(point,side);if(seen[pos])throw Error('Repeated terrain fact');
  const pass=/\b(?:open|passable|traversable)\b/.test(line),wall=/\b(?:sealed|blocked|impassable)\b/.test(line);
  if(pass===wall)throw Error('Ambiguous terrain fact');cells[pos]=+pass;seen[pos]++;
 }
 const missing=seen.reduce((n,x)=>n+(x!==1),0);if(missing)throw Error('Maze incomplete: '+missing+' unobserved chambers; cannot honestly invent walls');
 return cells;
}
export function firstDifferentChar(a,b){
 for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])return{
  index:i,predicted:a[i]??'<end>',expected:b[i]??'<end>',prefix:a.slice(Math.max(0,i-36),i)};
 return null;
}
export function evaluate({seed=1181,worlds=96,examples=76,noise=.055}={}){
 const data=trainWorlds({seed,examples,noise}),conditional=data.atlas;
 conditional.fit({allowContext:true});
 const flat=CrossWorldAtlas.restore({...conditional.saveJSON(),allowContext:false});
 const single=new CrossWorldAtlas({dims,side,actions:ACTIONS});
 for(const r of data.fragments[0].samples)single.observe({world:'only-one-episode',from:r.from,action:r.action,to:r.to});
 single.fit({allowContext:true});
 const baseline={correct:0,optimal:0,noPath:0,mismatches:0,classified:{},firstFailures:[]},
  transfer={correct:0,optimal:0,noPath:0,mismatches:0,firstFailures:[],successful:[]},
  oneWorld={correct:0,noPath:0};
 let textChars=0,heldoutAnswers=0,sampleAtlas=null;
 const attempts=[];
 for(let i=0;i<worlds;i++){
  const w=holdoutWorld(seed*1109+i*31+17),cells=parseTerrain(w.document);
  textChars+=w.document.length;
  if(cells.some((v,j)=>v!==w.cells[j]))throw Error('Terrain parser mismatches observed test map');
  const attempt={worldSeed:w.seed,start:tuple(w.start,dims,side),goal:tuple(w.goal,dims,side),
   documentChars:w.document.length,referenceActionsForPosthocEvaluation:w.oracle};
  for(const [name,learner,stats] of [['flat',flat,baseline],['conditional',conditional,transfer],['single',single,oneWorld]]){
   const p=learner.plan(w.start,w.goal,cells),r=learner.evaluate(p,actualStep,cells);
   attempt[name]={found:p.found,success:r.success,initialShape:p.solutionShape||[],reason:p.reason,
    explored:p.explored||0,firstWrongCharacter:firstDifferentChar(r.predictedOutput,w.oracle.join(' ')),
    firstMismatch:r.firstMismatch,
    executedTrace:r.trace.map(t=>({from:t.from,action:t.action,predictedTo:t.predictedTo,actualTo:t.actualTo,matched:t.matched,blocked:t.blocked})),
    missingActions:p.missingActions||[],rejectedWallCount:p.rejected?.length||0};
   stats.correct+=+r.success;stats.noPath+=+(!p.found);
   if(stats.mismatches!==undefined)stats.mismatches+=+(r.firstMismatch!==null);
   if(stats.optimal!==undefined)stats.optimal+=+(r.success&&p.route.length===w.oracle.length);
   if(name==='flat'&&(!r.success||!p.found)){
    const reason=!p.found?p.reason:(r.firstMismatch?.condition||'CONTEXT_CONDITION_MISSING');
    baseline.classified[reason]=(baseline.classified[reason]||0)+1;
    if(baseline.firstFailures.length<12)baseline.firstFailures.push({
     world:w.seed,start:tuple(w.start,dims,side),goal:tuple(w.goal,dims,side),
     predictedActions:p.solutionShape||[],actualOracleActions:w.oracle,firstMismatch:r.firstMismatch,
     firstWrongCharacter:firstDifferentChar(r.predictedOutput,w.oracle.join(' ')),
     pathExists:p.found,reason,explored:p.explored||0});
   }
   if(name==='conditional'&&(!r.success||!p.found)&&transfer.firstFailures.length<12)
    transfer.firstFailures.push({seed:w.seed,reason:p.reason,firstMismatch:r.firstMismatch});
   if(name==='conditional'&&r.success&&transfer.successful.length<5)transfer.successful.push({
    seed:w.seed,start:tuple(w.start,dims,side),goal:tuple(w.goal,dims,side),
    initialShape:p.solutionShape,allLearnedPaths:p.route,oracleLength:w.oracle.length,
    executedTrace:r.trace,alternativePlans:[2,3].map(k=>learner.plan(w.start,w.goal,cells,{alternative:k})).filter(x=>x.found).map(x=>x.solutionShape)});
   if(name==='conditional'&&i===0){
    const graph=conditional.completeAtlas(cells);
    if(graph.edges.length+graph.gaps.length!==N*ACTIONS.length)throw Error('Incomplete candidate atlas');
    const flatRoute=flat.plan(w.start,w.goal,cells),flatOutcome=flat.evaluate(flatRoute,actualStep,cells);
    sampleAtlas={...graph,world:{seed:w.seed,start:w.start,goal:w.goal,documentChars:w.document.length,
     beforeActionShape:p.solutionShape,oracleActionsUsedOnlyForEvaluation:w.oracle,
     executedTrace:r.trace,missingModelActions:p.missingActions,frontier:p.frontier,
     rejectedWalls:p.rejected,flatPlan:flatRoute,flatOutcome,
     firstWrongCharacter:firstDifferentChar(flatOutcome.predictedOutput,w.oracle.join(' ')),
     correctedPath:p.route,correctedOutcome:r}};
   }
  }
  heldoutAnswers+=w.oracle.join(' ').length;attempts.push(attempt);
 }
 const snap=conditional.saveJSON(),restored=CrossWorldAtlas.restore(snap),probe=holdoutWorld(seed*1109+17);
 if(JSON.stringify(conditional.plan(probe.start,probe.goal,probe.cells).solutionShape)!==
    JSON.stringify(restored.plan(probe.start,probe.goal,probe.cells).solutionShape))
  throw Error('Checkpoint changed pre-action solution shape');
 const result={benchmark:'cross-world-hypermaze-transformation-atlas',seed,worlds,
  trainingWorlds:data.fragments.length,trainingEvents:conditional.events.length,
  sourceWorldFragments:data.fragments.map(f=>({world:f.world,action:f.action,observations:f.count})),
  textCharacters:textChars,oracleActionAnswerCharacters:heldoutAnswers,
  atlas:conditional.summary(),flatAtlas:flat.summary(),singleWorldAtlas:single.summary(),
  baseline,transfer,oneWorld,attempts,checkpointRestoresIdenticalShape:true,
  sampleWorld:sampleAtlas?.world||null,
  caveats:['Operators inferred from observed numeric states, not raw arbitrary natural language',
  'Heldout worlds provide all terrain facts, not operator definitions',
  'Conditional parity is a pre-specified hypothesis family, chosen from evidence',
  'Output is an action-string, not a free-form OpenThoughts response',
  'Oracle is used after planning solely for judging validity and optimal length']};
 return{result,sampleAtlas,model:snap};
}
export function saveBenchmark(dir,options={}){
 fs.mkdirSync(dir,{recursive:true});const {result,sampleAtlas,model}=evaluate(options);
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(dir,'atlas.json'),JSON.stringify(sampleAtlas,null,2));
 fs.writeFileSync(path.join(dir,'learned-transforms.json'),JSON.stringify(model,null,2));
 const training=trainWorlds({seed:options.seed??1181,examples:options.examples??76,noise:options.noise??.055});
 fs.writeFileSync(path.join(dir,'training-documents.json'),JSON.stringify(training.fragments.map(x=>({world:x.world,action:x.action,text:x.text,ignored:x.ignored})),null,2));
 return result;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split(/[\\/]/).at(-1))){
 const output=process.argv[2]||'atlas-output',r=saveBenchmark(output);
 console.log(JSON.stringify({output,seed:r.seed,worlds:r.worlds,optimal:r.transfer.optimal,
   baseline:r.baseline.correct,oneWorld:r.oneWorld.correct,observed:r.trainingEvents,chars:r.textCharacters}));
}
