// One organism on one abstract network. Same summary/frame interface as the grid Episode.
// The evaluator (true links + true route) is used only to SCORE frames for humans.
import {publicNetwork,netSense,netAct,netTruthRoute} from './net.mjs';
import {NetOrgan,netMemory,netRemember} from './netorgan.mjs';
import {shapeMatch} from './agent.mjs';
export function netDeviation(pos,pred,truth){if(!pred.length||!truth.length)return 10;const d=(a,b)=>Math.hypot(pos[a].x-pos[b].x,pos[a].y-pos[b].y)*10;
  const one=(X,Y)=>X.reduce((s,a)=>s+Math.min(...Y.map(b=>d(a,b))),0)/X.length;return (one(pred,truth)+one(truth,pred))/2;}
export class NetEpisode{
  constructor(world,organ=new NetOrgan(),{mode='organ',online=true,record=true,imagine=10,useDance=true}={}){
    this.world=world;this.spec=publicNetwork(world);this.org=organ;this.mode=mode;this.online=online&&mode!=='classic';this.record=record;this.imagine=record?imagine:0;this.useDance=useDance;
    this.mem=netMemory(this.spec);this.position=world.start;netRemember(this.mem,netSense(world,this.position));
    this.steps=0;this.effort=0;this.surprises=0;this.walked=[this.position];this.frames=[];this.journal=[];this.finished=false;
    this.p=this.perceive();const truth=netTruthRoute(world);this.optimal=truth.cost;
    this.initial={route:this.p.route.slice(),truth:truth.nodes,match:shapeMatch(this.p.route,truth.nodes),deviation:netDeviation(this.spec.pos,this.p.route,truth.nodes)};
    this.capture(truth.nodes,[]);}
  perceive(){return this.org.perceive(this.mem,this.position,{mode:this.mode==='classic'?'classic':'organ',imagine:this.imagine,step:this.steps,useDance:this.useDance});}
  capture(truth,surprised){const p=this.p,f={step:this.steps,position:this.position,match:shapeMatch(p.route,truth),deviation:netDeviation(this.spec.pos,p.route,truth),surprises:this.surprises,effort:this.effort,surprised};
    if(this.record)Object.assign(f,{route:p.route.slice(),truth,walked:this.walked.slice(),status:Array.from(this.mem.status),seen:Array.from(this.mem.seen),
      imagined:Array.from(p.p,x=>+x.toFixed(2)),cloud:Array.from(p.cloud,x=>+x.toFixed(2)),theta:Array.from(this.mem.theta,x=>+x.toFixed(2)),amp:Array.from(this.mem.amp,x=>+x.toFixed(2)),coherence:+p.coherence.toFixed(3)});
    this.frames.push(f);return f;}
  step(){if(this.finished)return {type:'finished'};const next=this.p.route[1];if(next===undefined)return {type:'stuck'};
    const prior=this.p,out=netAct(this.world,this.position,next);if(out.type!=='moved')return {type:'stuck'};
    const onRoute=new Set();for(let i=1;i<prior.route.length;i++){const e=this.mem.adj[prior.route[i-1]].find(x=>x.to===prior.route[i]);if(e)onRoute.add(e.id);}
    this.position=next;this.effort+=out.cost;this.walked.push(next);
    const revealed=netRemember(this.mem,netSense(this.world,next));
    // Resistance: links of the predicted shape that the world shows blocked, or much costlier than imagined.
    const surprised=revealed.filter(id=>onRoute.has(id)&&(this.mem.status[id]===0||Math.abs(prior.c[id]-this.mem.cost[id])>3));this.surprises+=surprised.length;
    const learned=this.online?this.org.learn(prior,this.mem,revealed):null;
    this.steps++;this.finished=next===this.world.goal;this.p=this.perceive();
    const f=this.capture(netTruthRoute(this.world,this.position).nodes,surprised);
    const ev={step:this.steps,goal:this.finished,revealed:revealed.length,surprised:surprised.length,learned:!!learned,match:+f.match.toFixed(2)};
    this.journal.push(ev);if(this.journal.length>40)this.journal.shift();return ev;}
  run(limit=this.spec.n*6){for(let t=0;t<limit&&!this.finished;t++)if(this.step().type==='stuck')break;return this;}
  summary(){return {solved:this.finished,steps:this.steps,effort:this.effort,optimal:this.optimal,ratio:this.finished?this.effort/this.optimal:null,
    match0:this.initial.match,dev0:this.initial.deviation,surprises:this.surprises,meanMatch:this.frames.reduce((s,f)=>s+f.match,0)/this.frames.length};}
  frame(i){return this.frames[i]??null;}
  light(){return {mode:this.mode,steps:this.steps,finished:this.finished,effort:this.effort,optimal:this.optimal,summary:this.summary(),
    frames:this.frames.map(f=>({step:f.step,match:+f.match.toFixed(3),deviation:+f.deviation.toFixed(2),surprises:f.surprises})),journal:this.journal.slice(-20)};}
}
