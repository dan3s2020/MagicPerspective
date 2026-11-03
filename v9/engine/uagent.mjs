// One V9 organism living one network of states. The evaluator (true network, true route) only SCORES frames for humans.
import {publicView,senseAt,truthRoute} from './graphs.mjs';
import {UOrganism,uMemory,uRemember} from './uorgan.mjs';
export function shapeMatch(pred,truth){const A=new Set(pred.slice(1)),B=new Set(truth.slice(1));let m=0;for(const c of A)if(B.has(c))m++;return A.size+B.size?2*m/(A.size+B.size):1;}
export const VARIANTS={
  'v9':{label:'V9 · vise + democrația A11 + dans',opts:{}},
  'no-dreams':{label:'fără vise',opts:{dreams:0}},
  'no-talk':{label:'democrație fără comunicare (control A11)',opts:{democracy:'none'}},
  'no-democracy':{label:'fără democrație (media parlamentului)',opts:{democracy:'off'}},
  'one-voter':{label:'un singur organ',opts:{parliament:false}},
  'no-dance':{label:'fără dans',opts:{useDance:false}},
  'untrained':{label:'neantrenat',opts:{},fresh:true},
  'classic':{label:'fără organ',opts:{mode:'classic'}}};
export class UEpisode{
  constructor(world,org=new UOrganism(),{variant='v9',online=true,record=true,temperature=.35}={}){
    const V=VARIANTS[variant];this.variant=variant;this.opts={...V.opts};this.world=world;this.spec=publicView(world);this.org=org;
    this.online=online&&this.opts.mode!=='classic';this.record=record;this.T=this.opts.dreams===0?0:temperature;this.temps=[];
    this.mem=uMemory(this.spec);this.position=world.start;uRemember(this.mem,senseAt(world,this.position));
    this.steps=0;this.effort=0;this.surprises=0;this.walked=[this.position];this.frames=[];this.journal=[];this.finished=false;
    this.p=this.perceive();const truth=truthRoute(world);this.optimal=truth.cost;
    this.initial={route:this.p.route.slice(),truth:truth.nodes,match:shapeMatch(this.p.route,truth.nodes)};this.capture(truth.nodes,[]);}
  perceive(){return this.org.perceive(this.mem,this.position,{...this.opts,temperature:this.T,step:this.steps,record:this.record});}
  capture(truth,surprised){const p=this.p,f={step:this.steps,position:this.position,match:shapeMatch(p.route,truth),surprises:this.surprises,effort:this.effort,temperature:+this.T.toFixed(2),surprised};
    if(this.record)Object.assign(f,{route:p.route.slice(),truth,walked:this.walked.slice(),status:Array.from(this.mem.status),seen:Array.from(this.mem.seen),
      imagined:Array.from(p.p,x=>+x.toFixed(2)),spread:p.spread?Array.from(p.spread,x=>+x.toFixed(2)):null,cloud:Array.from(p.cloud,x=>+x.toFixed(2)),
      theta:Array.from(this.mem.theta,x=>+x.toFixed(2)),amp:Array.from(this.mem.amp,x=>+x.toFixed(2)),coherence:+(p.coherence||0).toFixed(3),
      dreams:(p.dreamRoutes||[]).map(r=>r.nodes),votes:p.votes??null});
    this.frames.push(f);return f;}
  step(){if(this.finished)return {type:'finished'};const next=this.p.route[1];if(next===undefined)return {type:'stuck'};
    const e=this.mem.adj[this.position].find(x=>x.to===next),l=this.world.links[e.id];if(!l.open)return {type:'stuck'};
    const prior=this.p,onRoute=new Set();for(let i=1;i<prior.route.length;i++){const x=this.mem.adj[prior.route[i-1]].find(y=>y.to===prior.route[i]);if(x)onRoute.add(x.id);}
    this.position=next;this.effort+=l.cost;this.walked.push(next);
    const revealed=uRemember(this.mem,senseAt(this.world,next));
    const surprised=revealed.filter(id=>onRoute.has(id)&&(this.mem.status[id]===0||(prior.c&&Math.abs(prior.c[id]-this.mem.cost[id])>3)));this.surprises+=surprised.length;
    // Chaos follows resistance: surprised → dream wilder; confirmed → calm down.
    if(this.opts.dreams!==0&&this.opts.mode!=='classic'){this.T=Math.max(.15,Math.min(1.6,surprised.length?this.T*1.5+.1:this.T*.92));this.temps.push(this.T);}
    // The world is the referee of the democratic block committed before this move.
    const truthOf=id=>this.mem.status[id]===-1?null:this.mem.status[id]===1;this.democracy=null;
    if(prior.block&&this.org.democracy.ready(truthOf,prior.block.emitted.length+1))this.democracy=this.org.democracy.reveal(prior.block,truthOf);
    if(this.online)this.org.learn(prior,this.mem,revealed);
    this.steps++;this.finished=next===this.world.goal;this.p=this.perceive();
    const f=this.capture(truthRoute(this.world,this.position).nodes,surprised);
    const d=this.democracy,coal=d&&prior.block?prior.block.coalitions.filter(c=>c.partners.length).length:0,adopted=d&&prior.block?prior.block.emitted.filter(e=>e.partner).length:0;
    const ev={step:this.steps,goal:this.finished,revealed:revealed.length,surprised:surprised.length,temperature:+this.T.toFixed(2),votes:this.p.votes??null,match:+f.match.toFixed(2),
      democracy:d?{correct:d.correctCount,total:d.totalSlots,multiplier:+d.multiplier.toFixed(2),issued:+d.totalIssued.toFixed(2)}:null,coalitions:coal,adopted};
    this.journal.push(ev);if(this.journal.length>40)this.journal.shift();return ev;}
  run(limit=this.spec.n*4){for(let t=0;t<limit&&!this.finished;t++)if(this.step().type==='stuck')break;return this;}
  summary(){return {solved:this.finished,steps:this.steps,effort:this.effort,optimal:this.optimal,ratio:this.finished?this.effort/this.optimal:null,
    match0:this.initial.match,surprises:this.surprises,meanMatch:this.frames.reduce((s,f)=>s+f.match,0)/this.frames.length};}
  frame(i){return this.frames[i]??null;}
  light(){return {variant:this.variant,steps:this.steps,finished:this.finished,effort:this.effort,optimal:this.optimal,summary:this.summary(),
    frames:this.frames.map(f=>({step:f.step,match:+f.match.toFixed(3),surprises:f.surprises,temperature:f.temperature})),journal:this.journal.slice(-20)};}
}
