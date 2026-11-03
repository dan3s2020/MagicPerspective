import {publicStructure,emptyBelief,sense,absorb,act,oracle} from './world.mjs';
import {Perspective} from './perspective.mjs';
import {WorldNet,features,skeletonDistances} from './model.mjs';
import {imagine} from './imagination.mjs';
const mean=(a)=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export function routeMetrics(guess,truth){const A=new Set(guess),B=new Set(truth),intersection=[...A].filter(e=>B.has(e)).length;
 return {precision:A.size?intersection/A.size:0,recall:B.size?intersection/B.size:0,
 f1:A.size+B.size?2*intersection/(A.size+B.size):1,matched:intersection,target:B.size,predicted:A.size};}
export class Agent{
  constructor(world,net=new WorldNet(),perspective=new Perspective(),{online=true,mode='neural'}={}){
    this.world=world;this.spec=publicStructure(world);this.net=net;this.perspective=perspective;
    this.belief=emptyBelief(this.spec);this.position=this.spec.start;this.belief.visits[this.position]++;
    this.online=online;this.mode=mode;this.steps=0;this.effort=0;this.blocked=0;this.finished=this.position===this.spec.goal;
    this.history=[];this.onlineDelta=0;this.sensoryErrors=[];this.trueCostErrors=[];this.wrongPredictions=0;
    absorb(this.belief,sense(this.world,this.position));this.refresh();
    const teacher=oracle(this.world,this.spec.start);
    this.initial={route:this.plan.edges.slice(),source:this.plan.source,confidence:this.plan.confidence,
      metrics:routeMetrics(this.plan.edges,teacher.edges),oracleCost:teacher.cost};
  }
  refresh(){this.plan=imagine(this.spec,this.belief,this.position,this.net,this.perspective,{mode:this.mode});return this.plan;}
  step(edgeId=undefined){
    if(this.finished)return {type:'finished'};
    const options=this.spec.links.filter(e=>e.a===this.position||e.b===this.position);
    const suggested=this.plan.edges[0];const selected=edgeId===undefined?suggested:edgeId;
    const edge=this.spec.links[selected];if(!edge||!options.some(e=>e.id===selected))return {type:'invalid'};
    const before=this.position,distances=skeletonDistances(this.spec),weights=this.perspective.weights;
    const predictedCost=this.net.predict(this.spec,this.belief,before,edge,distances,weights,this.steps).cost;
    const frozenCost=features(this.spec,this.belief,before,edge,distances,weights,this.steps);
    const to=edge.a===before?edge.b:edge.a;
    // Freeze the network's own forecasts of the next slice before the environment responds.
    const candidate=this.spec.links.filter(e=>e.a===to||e.b===to).filter(e=>this.belief.status[e.id]===-1).map(e=>({id:e.id,
      features:features(this.spec,this.belief,to,e,distances,weights,this.steps),
      pred:this.net.forward(features(this.spec,this.belief,to,e,distances,weights,this.steps)).pass,
      perspectives:this.perspective.reliability(this.spec,this.belief,e)}));
    const actual=act(this.world,before,selected);
    if(actual.type==='invalid')return actual;
    if(actual.type==='blocked')this.blocked++;
    if(actual.type==='moved'){this.position=actual.position;this.effort+=actual.cost;this.belief.visits[this.position]++;}
    const revealed=absorb(this.belief,sense(this.world,this.position));
    let delta=0,error=0;
    if(this.online){
      const update=this.net.update(frozenCost,'cost',clip(actual.cost/4,0,1),.02,'action');delta+=Math.abs(update.after-update.before);
      const movedCorrectly=actual.type==='moved'&&(distances[to]<distances[before]);
      const feedback=this.net.update(frozenCost,'policy',movedCorrectly?1:0,.006,'action');delta+=Math.abs(feedback.after-feedback.before);
      for(const item of candidate){if(this.belief.status[item.id]===-1)continue;
        const real=this.belief.status[item.id];error+=Math.abs(item.pred-real);
        const u=this.net.update(item.features,'pass',real,.03,'sensor');delta+=Math.abs(u.after-u.before);
        this.perspective.learn(item.perspectives,real);
        this.sensoryErrors.push(Math.abs(item.pred-real));
      }
    }
    this.trueCostErrors.push(Math.abs(predictedCost-actual.cost));
    this.steps++;this.finished=this.position===this.spec.goal;this.onlineDelta=delta;
    this.refresh();
    const event={step:this.steps,from:before,to:this.position,edge:selected,type:this.finished?'goal':actual.type,
      expected:+predictedCost.toFixed(3),realCost:actual.cost,disagreement:+Math.abs(predictedCost-actual.cost).toFixed(4),
      newEvidence:revealed.length,predictionError:+error.toFixed(4),neuralDelta:+delta.toFixed(6),
      perspectiveWeights:this.perspective.weights.map(v=>+v.toFixed(3)),predictedShape:this.plan.source};
    this.history.push(event);if(this.history.length>100)this.history.shift();return event;
  }
  payload(){const best=oracle(this.world,this.position),metrics=routeMetrics(this.plan.edges,best.edges),p=this.perspective.frames(this.spec,this.belief);
    return {spec:this.spec,belief:this.belief,position:this.position,steps:this.steps,effort:this.effort,blocked:this.blocked,finished:this.finished,
      online:this.online,mode:this.mode,plan:this.plan,initial:this.initial,current:metrics,
      perspective:p,model:{updates:this.net.updates,sensorUpdates:this.net.sensorUpdates,teacherUpdates:this.net.teacherUpdates,actionUpdates:this.net.actionUpdates},
      meanSensorError:+mean(this.sensoryErrors).toFixed(4),meanCostError:+mean(this.trueCostErrors).toFixed(4),
      history:this.history.slice(-30),
      // The global evaluator is sent ONLY to the human UI. Learner methods do not accept this payload.
      teacher:{path:best.nodes,edges:best.edges,cost:best.cost,truth:this.world.edges.map(e=>({id:e.id,open:e.open,cost:e.cost}))}};
  }
}
