// One organism living one episode. The organism sees only the 3x3 window it has crossed (belief),
// predicts the whole shape before acting, acts, meets resistance, corrects.
// The evaluator (oracle) is used here ONLY to score frames for humans and metrics — never as input.
import {publicStructure,emptyBelief,sense,absorb,act,oracle} from './world.mjs';
import {Organ} from './organ.mjs';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
export function routeF1(guess,truth){const A=new Set(guess),B=new Set(truth);let m=0;for(const e of A)if(B.has(e))m++;
  return A.size+B.size?2*m/(A.size+B.size):1;}
// Shape error of the whole cloud against the evaluator's route (non-closed relations only, probabilities clipped to [.02,.98] for every control).
export function cloudBCE(q,belief,truthEdges){const T=new Set(truthEdges);let s=0,n=0;
  for(let i=0;i<q.length;i++){if(belief.status[i]===0)continue;const p=clip(q[i],.02,.98),y=T.has(i)?1:0;s+=-(y*Math.log(p)+(1-y)*Math.log(1-p));n++;}return n?s/n:0;}
export function calibrationBins(q,belief,truthEdges,bins=new Array(10).fill(0).map(()=>({n:0,p:0,y:0}))){const T=new Set(truthEdges);
  for(let i=0;i<q.length;i++){if(belief.status[i]===0)continue;const b=bins[Math.min(9,Math.floor(q[i]*10))];b.n++;b.p+=q[i];b.y+=T.has(i)?1:0;}return bins;}
export function ece(bins){const N=bins.reduce((s,b)=>s+b.n,0);return N?bins.reduce((s,b)=>s+(b.n?Math.abs(b.p/b.n-b.y/b.n)*b.n/N:0),0):0;}
export const MODES=['organ-online','organ-frozen','organ-untrained','classic'];
export class Episode{
  constructor(world,organ=new Organ(),{online=true,mode='organ',record=true}={}){
    this.world=world;this.spec=publicStructure(world);this.organ=organ;this.online=online;this.mode=mode;this.record=record;
    this.belief=emptyBelief(this.spec);this.position=this.spec.start;this.belief.visits[this.position]=1;
    absorb(this.belief,sense(world,this.position));
    this.steps=0;this.effort=0;this.blocked=0;this.resistance=0;this.passSurprise=[];this.walked=[this.position];this.frames=[];this.journal=[];
    this.finished=this.position===this.spec.goal;this.perception=organ.perceive(this.spec,this.belief,this.position,{mode});
    const truth=oracle(world,this.spec.start);this.optimalCost=truth.cost;
    const q0=this.perception.q;
    this.initial={route:this.perception.route.nodes.slice(),edges:this.perception.route.edges.slice(),q:Array.from(q0,x=>+x.toFixed(3)),
      truthNodes:truth.nodes,truthEdges:truth.edges,f1:routeF1(this.perception.route.edges,truth.edges),bce:cloudBCE(q0,this.belief,truth.edges),
      valid:this.perception.route.edges.length>0&&this.perception.route.edges.every(id=>world.edges[id].open),
      bins:calibrationBins(q0,this.belief,truth.edges)};
    this.capture(truth);
  }
  capture(truth=oracle(this.world,this.position),contradicted=[]){const p=this.perception;
    const frame={step:this.steps,position:this.position,route:p.route.nodes.slice(),f1:routeF1(p.route.edges,truth.edges),bce:cloudBCE(p.q,this.belief,truth.edges),
      truth:truth.nodes,resistance:this.resistance,effort:this.effort,contradicted};
    if(this.record){frame.q=Array.from(p.q,x=>+x.toFixed(3));frame.known=Array.from(this.belief.status);frame.observed=this.belief.observed.map(v=>v?1:0);frame.walked=this.walked.slice();}
    this.frames.push(frame);return frame;}
  step(){
    if(this.finished)return {type:'finished'};
    const edgeId=this.perception.route.edges[0];if(edgeId===undefined)return {type:'no-route'};
    const before=this.position,predictedRoute=new Set(this.perception.route.edges),prior=this.perception;
    const outcome=act(this.world,before,edgeId);if(outcome.type==='invalid')return outcome;
    if(outcome.type==='blocked')this.blocked++;
    if(outcome.type==='moved'){this.position=outcome.position;this.effort+=outcome.cost;this.belief.visits[this.position]=(this.belief.visits[this.position]||0)+1;this.walked.push(this.position);}
    const revealed=absorb(this.belief,sense(this.world,this.position));
    // Resistance: the world contradicts relations the predicted shape relied on.
    const contradicted=revealed.filter(r=>r.open===0&&predictedRoute.has(r.id)).map(r=>r.id);this.resistance+=contradicted.length;
    // Pass organ: predictions frozen BEFORE the reveal, compared with what the window shows now.
    const samples=[];let surprise=0;
    for(const r of revealed){if(r.old!==-1||!prior.passX[r.id])continue;const p=prior.pass[r.id];surprise+=Math.abs(p-r.open);samples.push({x:prior.passX[r.id],y:r.open});}
    if(samples.length)this.passSurprise.push(surprise/samples.length);
    let passLoss=0;if(this.online&&this.mode==='organ'&&samples.length)passLoss=this.organ.learnPass(samples);
    this.steps++;this.finished=this.position===this.spec.goal;
    this.perception=this.organ.perceive(this.spec,this.belief,this.position,{mode:this.mode});
    const frame=this.capture(oracle(this.world,this.position),contradicted);
    const event={step:this.steps,type:this.finished?'goal':outcome.type,from:before,to:this.position,revealed:revealed.length,contradicted:contradicted.length,
      surprise:samples.length?+(surprise/samples.length).toFixed(3):null,learned:this.online&&samples.length>0,passLoss:+passLoss.toFixed(4),f1:+frame.f1.toFixed(3)};
    this.journal.push(event);if(this.journal.length>60)this.journal.shift();return event;
  }
  run(limit=this.spec.nodes*4){for(let t=0;t<limit&&!this.finished;t++){const e=this.step();if(e.type==='no-route'||e.type==='invalid')break;}return this;}
  summary(){const f=this.frames;return {solved:this.finished,steps:this.steps,effort:this.effort,optimal:this.optimalCost,efficiency:this.finished?this.optimalCost/Math.max(this.effort,1e-6):0,
    f1_0:this.initial.f1,bce_0:this.initial.bce,valid_0:this.initial.valid,meanF1:f.reduce((s,x)=>s+x.f1,0)/f.length,meanBCE:f.reduce((s,x)=>s+x.bce,0)/f.length,
    resistance:this.resistance,surprise:this.passSurprise.length?this.passSurprise.reduce((a,b)=>a+b,0)/this.passSurprise.length:null};}
  frame(i){const f=this.frames[i];if(!f)return null;return {...f,f1:+f.f1.toFixed(4),bce:+f.bce.toFixed(4)};}
  // Human view. The evaluator block is separate and is never passed back into the organism.
  payload(){return {spec:this.spec,mode:this.mode,online:this.online,position:this.position,steps:this.steps,effort:this.effort,finished:this.finished,
    belief:{status:this.belief.status,observed:this.belief.observed},walked:this.walked,route:this.perception.route,q:Array.from(this.perception.q,x=>+x.toFixed(3)),
    views:this.perception.views,initial:{route:this.initial.route,f1:this.initial.f1,bce:this.initial.bce,valid:this.initial.valid,ece:ece(this.initial.bins)},
    frames:this.frames.map(f=>({step:f.step,f1:+f.f1.toFixed(4),bce:+f.bce.toFixed(4),resistance:f.resistance,effort:f.effort,contradicted:f.contradicted.length})),journal:this.journal.slice(-25),summary:this.summary(),
    evaluator:{open:this.world.edges.map(e=>e.open?1:0),cost:this.world.edges.map(e=>e.cost),startRoute:this.initial.truthNodes,optimalCost:this.optimalCost}};}
}
