import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {benchmarkFacts} from './relational.mjs';
import {SpeechWorld,DiscoveredEffects,explore,plan,execute,randomBaseline,greedyBaseline,oracleDistance,trajectoryGraph,same,UTTERANCES} from './engine.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export function runBenchmark({seeds=[11,29,53],tasks=20,n=7,rounds=4,hops=8,oracleSamples=5}={}){
 const rows=[],examples=[],discovery=[],models=[],failures=[];let best=null;
 for(const seed of seeds){const world=new SpeechWorld(seed),model=new DiscoveredEffects();
  const observations=explore(world,model,{seed:seed+700,rounds,lengths:[4,5]});
  discovery.push(...observations.map(x=>({seed,...x})));models.push({seed,trainedInteractions:observations.length,rules:model.report(),ready:model.ready()});
  if(!model.ready())throw Error('Model did not identify actions for seed '+seed);
  for(let i=0;i<tasks;i++){
   const challenge=world.makeChallenge((seed*100003+i*4331)>>>0,n,hops),p=plan(challenge.start,challenge.goal,model,{maxSteps:24});
   const actual=execute(world,challenge.start,challenge.goal,p);
   const rand=randomBaseline(world,challenge.start,challenge.goal,seed*1000+i,24);
   const greedy=greedyBaseline(world,challenge.start,challenge.goal,model,seed*1000+i,24);
   const optimal=i<oracleSamples?oracleDistance(world,challenge.start,challenge.goal):null;
   const row={seed,index:i,n,initial:challenge.start,goal:challenge.goal,planned:p.found,solved:actual.solved,
    pathLength:actual.steps,predictionCorrect:actual.modelMatches,optimal,expanded:p.expanded,fieldSize:p.fieldSize,
    random:rand,greedy,unseenVocabulary:true,unseenLength:![4,5].includes(n)};
   rows.push(row);if(!actual.solved)failures.push({row,reason:p.reason,steps:p.steps});
   if(examples.length<8||!best||((p.steps.length>best.plan.steps.length)&&examples.length<16)){
    const ex={seed,index:i,start:challenge.start,goal:challenge.goal,
      plan:p,execution:actual,graph:trajectoryGraph(p,125),optimal};
    if(examples.length<8)examples.push(ex);
    if(!best||p.steps.length>best.plan.steps.length)best=ex;
   }
  }
 }
 if(best&&!examples.some(e=>e.seed===best.seed&&e.index===best.index))examples.push(best);
 const avg=(arr,f)=>arr.length?arr.reduce((s,x)=>s+f(x),0)/arr.length:null;
 const evidence=rows.filter(x=>x.optimal!==null);
 const result={
  metadata:{research:'Language-as-action: learned transition graph and goal-conditioned reverse-wave navigation',
   description:'Controlled symbolic utterance world. Hidden physics in simulator; learner has a fixed structural permutation hypothesis library and no solution examples.',
   limitations:['Not natural-language understanding, grammar, or semantics','Learned action labels are selected from a predefined set of permutation hypotheses','12D display projection is fixed and not learned','New vocabulary and held-out sequence length do not mean cross-domain transfer from V17'],
   trainingLengths:[4,5],testLength:n,taskCount:rows.length,seeds,rounds,hops,actions:UTTERANCES},
  summary:{trainingActions:discovery.length,learnedActions:models.every(x=>x.ready)?UTTERANCES.length:0,
    tested:rows.length,plannerSuccess:avg(rows,x=>+x.solved),randomSuccess:avg(rows,x=>+x.random),
    greedySuccess:avg(rows,x=>+x.greedy),predictionConsistency:avg(rows,x=>+x.predictionCorrect),
    averagePathLength:avg(rows,x=>x.pathLength),averageExpanded:avg(rows,x=>x.expanded||0),
    oracleSampleCount:evidence.length,optimalMatches:evidence.filter(r=>r.solved&&r.pathLength===r.optimal).length,
    oracleAverageLength:avg(evidence,x=>x.optimal),failures:failures.length},
  models,discovery:discovery.slice(0,80),examples,rows,failures};
 result.relational=benchmarkFacts({seeds,tasks,hops:12});
 result.examples.push(...result.relational.examples);
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const get=(name,defaultValue)=>{const at=process.argv.indexOf('--'+name);return at<0?defaultValue:Number(process.argv[at+1]);};
 const report=runBenchmark({tasks:get('tasks',20),n:get('n',7),rounds:get('rounds',4),oracleSamples:get('oracle',5)});
 const oi=process.argv.indexOf('--out');const out=oi>=0?path.resolve(process.argv[oi+1]):path.join(here,'run-result.json');
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:out,symbolic:report.summary,relational:report.relational.summary},null,2));
}
