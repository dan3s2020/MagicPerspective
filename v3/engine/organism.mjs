import {makeWorld,shortestPath,blankBelief,observe,execute,mask} from './world.mjs';
import {routeFromBelief,shapeBCE,geometricBaseline,features} from './model.mjs';
export class Organism{
 constructor(seed,net,causal,n=11,family='branched',mode='shape',online=true){
  this.world=makeWorld(seed,n,family);this.net=net;this.causal=causal;this.mode=mode;this.online=online;
  this.position=this.world.start;this.belief=blankBelief(n);this.belief.visits[this.position]=1;
  this.steps=0;this.effort=0;this.resistance=0;this.finished=false;this.history=[];this.onlineEvents=0;
  observe(this.world,this.position,this.belief);this.refresh();
  this.initialPath=mask(this.oracle.path,n);
  this.initial={...this.metrics,prob:this.prob.slice(),route:this.route.slice(),oracleCost:this.oracle.cost};
 }
 refresh(){const w=this.world;this.prob=this.net.predict(this.belief,w.n,this.position,w.goal);
  const estimate=this.mode==='geometric'?geometricBaseline(w.n,this.position,w.goal,this.belief):this.prob;
  this.wallRisk=this.net.predictWalls(this.belief,w.n,this.position,w.goal);
  this.route=routeFromBelief(this.belief,w.n,this.position,w.goal,estimate,this.causal,this.mode==='geometric'?'shape':this.mode,
   this.mode==='shape'?this.wallRisk:undefined);
  this.oracle=shortestPath(w,this.position,w.goal);
  this.metrics=shapeBCE(this.prob,mask(this.oracle.path,w.n));
  this.anchoredMetrics=shapeBCE(this.prob,this.initialPath||mask(this.oracle.path,w.n));
 }
 act(next=undefined){
  if(this.finished)return {event:'finished'};
  const w=this.world,n=w.n;
  if(next===undefined){next=this.route[1];if(next===undefined)return {event:'no-route'};}
  const pos=this.position;
  // Freeze all model inputs before any intervention or new sensory information.
  if(!Number.isInteger(next)||!Number.isInteger(pos)||Math.abs(next%n-pos%n)+Math.abs(Math.floor(next/n)-Math.floor(pos/n))!==1)
   return {event:'invalid'};
  const material=this.belief.material[next]??-1;
  const expected=this.causal.predict(material);
  const actionX=features(this.belief,n,pos,w.goal,next);
  const predictedEffort=this.net.forward(actionX).effort;
  const candidate=[];
  const x=next%n,y=Math.floor(next/n);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)continue;
   const i=yy*n+xx;
   if(this.belief.walls[i]===-1)candidate.push({index:i,input:features(this.belief,n,pos,w.goal,i),forecast:this.net.forward(features(this.belief,n,pos,w.goal,i)).wall});
  }
  const outcome=execute(w,pos,next);
  if(outcome.type==='invalid')return {event:'invalid'};
  if(outcome.type==='blocked'){this.resistance++;this.belief.walls[next]=1;this.belief.material[next]=0;}
  if(outcome.type==='moved'){this.position=outcome.position;this.effort+=outcome.effort;this.belief.visits[this.position]++;}
  const newly=observe(w,this.position,this.belief);
  const beforePostObs=this.net.predict(this.belief,n,this.position,w.goal);
  // The sensor outcome updates the same neural representation used by the shape head.
  // No shortest path, teacher mask, hidden wall grid or ground-truth cost is supplied here.
  let wallMismatch=0,wallCount=0,effortMismatch=null,learned=null;
  if(this.online){
   if(outcome.type==='moved'){
    for(const prediction of candidate){
     if(this.belief.walls[prediction.index]===-1)continue;
     wallMismatch+=Math.abs(prediction.forecast-this.belief.walls[prediction.index]);wallCount++;
     this.net.adapt(prediction.input,'wall',this.belief.walls[prediction.index]);
    }
    const changed=this.net.adapt(actionX,'effort',outcome.effort);effortMismatch=changed.error;
   }
  }
  // Both online and frozen-neural controls receive identical causal-cost learning.
  learned=outcome.type==='moved'?this.causal.learn(material,outcome.effort):null;
  const afterPostObs=this.net.predict(this.belief,n,this.position,w.goal);
  const neuralCorrection=afterPostObs.reduce((s,p,i)=>s+Math.abs(p-beforePostObs[i]),0)/afterPostObs.length;
  if(this.online&&(wallCount||(outcome.type==='moved')))this.onlineEvents++;
  this.steps++;this.finished=this.position===w.goal;
  const event={step:this.steps,from:pos,to:next,type:this.finished?'goal':outcome.type,
   expected,actual:outcome.effort,worldMismatch:outcome.type==='blocked'?1:Math.abs(expected-outcome.effort),
   neuralEffortMismatch:effortMismatch,wallMismatch:wallCount?wallMismatch/wallCount:null,
   newlyObserved:wallCount,neuralCorrection,newCells:newly.length,cost:this.effort};
  this.history.push(event);if(this.history.length>180)this.history.shift();this.refresh();return event;
 }
 // Teacher truth is available exclusively in the HTTP view model and supervised training labels.
 // The learner APIs above never consume the teacher route or wall map for action selection.
 payload(){const w=this.world;return {seed:w.seed,n:w.n,family:w.family,start:w.start,goal:w.goal,position:this.position,
  belief:this.belief,prob:this.prob,wallRisk:this.wallRisk,route:this.route,teacher:this.oracle.path,truth:w.walls,
  material:w.material,initial:{bce:this.initial.bce,iou:this.initial.iou,oracleCost:this.initial.oracleCost},
  metrics:this.metrics,anchoredMetrics:this.anchoredMetrics,online:this.online,onlineEvents:this.onlineEvents,
  neuralOnlineUpdates:this.net.onlineUpdates,neuralWallSamples:this.net.wallSamples,neuralEffortSamples:this.net.effortSamples,
  steps:this.steps,effort:this.effort,resistance:this.resistance,
  finished:this.finished,history:this.history.slice(-45),mode:this.mode,causalSamples:this.causal.samples};}
}
