import {makeWorld,shortestPath,blankBelief,observe,execute,mask} from './world.mjs';
import {routeFromBelief,shapeBCE,geometricBaseline} from './model.mjs';
export class Organism{
 constructor(seed,net,causal,n=11,family='branched',mode='shape'){
  this.world=makeWorld(seed,n,family);this.net=net;this.causal=causal;this.mode=mode;
  this.position=this.world.start;this.belief=blankBelief(n);this.belief.visits[this.position]=1;
  this.steps=0;this.effort=0;this.resistance=0;this.finished=false;this.history=[];
  observe(this.world,this.position,this.belief);this.refresh();
  this.initial={...this.metrics,prob:this.prob.slice(),route:this.route.slice(),oracleCost:this.oracle.cost};
 }
 refresh(){const w=this.world;this.prob=this.net.predict(this.belief,w.n,this.position,w.goal);
  const estimate=this.mode==='geometric'?geometricBaseline(w.n,this.position,w.goal,this.belief):this.prob;
  this.route=routeFromBelief(this.belief,w.n,this.position,w.goal,estimate,this.causal,this.mode==='geometric'?'shape':this.mode);
  this.oracle=shortestPath(w,this.position,w.goal);
  this.metrics=shapeBCE(this.prob,mask(this.oracle.path,w.n));
 }
 act(next=undefined){if(this.finished)return {event:'finished'};const w=this.world;
  if(next===undefined){next=this.route[1];if(next===undefined)return {event:'no-route'};}
  const pos=this.position,material=this.belief.material[next]??-1,expected=this.causal.predict(material);
  const outcome=execute(w,pos,next);
  if(outcome.type==='invalid')return {event:'invalid'};
  if(outcome.type==='blocked'){this.resistance++;this.belief.walls[next]=1;this.belief.material[next]=0;}
  if(outcome.type==='moved'){this.position=outcome.position;this.effort+=outcome.effort;this.belief.visits[this.position]++;}
  const learned=outcome.type==='moved'?this.causal.learn(material,outcome.effort):null;
  const diff=outcome.type==='blocked'?1:learned.error;
  const newly=observe(w,this.position,this.belief);
  this.steps++;this.finished=this.position===w.goal;
  const event={step:this.steps,from:pos,to:next,type:this.finished?'goal':outcome.type,
   expected:expected,actual:outcome.effort,worldMismatch:diff,newCells:newly.length,cost:this.effort};
  this.history.push(event);if(this.history.length>180)this.history.shift();this.refresh();return event;
 }
 // Teacher truth is available exclusively in the HTTP view model and supervised training labels.
 // The learner APIs above never consume the teacher route or wall map for action selection.
 payload(){const w=this.world;return {seed:w.seed,n:w.n,family:w.family,start:w.start,goal:w.goal,position:this.position,
  belief:this.belief,prob:this.prob,route:this.route,teacher:this.oracle.path,truth:w.walls,
  material:w.material,initial:{bce:this.initial.bce,iou:this.initial.iou,oracleCost:this.initial.oracleCost},
  metrics:this.metrics,steps:this.steps,effort:this.effort,resistance:this.resistance,
  finished:this.finished,history:this.history.slice(-45),mode:this.mode,causalSamples:this.causal.samples};}
}
