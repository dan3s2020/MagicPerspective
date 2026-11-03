// One organism, one world. The evaluator (true map + true route) is used here only to SCORE frames for humans.
import {sense,truthRoute,costOf} from './world.mjs';
import {Organism,emptyMemory,remember} from './organ.mjs';
// How much of the true route the predicted route covers (cells, F1).
export function shapeMatch(pred,truth){const A=new Set(pred.slice(1)),B=new Set(truth.slice(1));let m=0;for(const c of A)if(B.has(c))m++;return A.size+B.size?2*m/(A.size+B.size):1;}
// Average distance (in cells) between the predicted line and the true line, both directions.
export function deviation(n,pred,truth){if(!pred.length||!truth.length)return n;const d=(a,b)=>Math.max(Math.abs(a%n-b%n),Math.abs(((a/n)|0)-((b/n)|0)));
  const one=(X,Y)=>X.reduce((s,a)=>s+Math.min(...Y.map(b=>d(a,b))),0)/X.length;return (one(pred,truth)+one(truth,pred))/2;}
export const MODES=['organ','organ-untrained','classic'];
export class Episode{
  constructor(world,organism=new Organism(),{mode='organ',online=true,record=true,imagine=10}={}){
    this.world=world;this.n=world.n;this.org=organism;this.mode=mode;this.online=online&&mode!=='classic';this.record=record;this.imagine=record?imagine:0;
    this.mem=emptyMemory(world.n,world.start,world.goal);this.position=world.start;remember(this.mem,sense(world,this.position));
    this.steps=0;this.effort=0;this.surprises=0;this.walked=[this.position];this.frames=[];this.journal=[];this.finished=false;
    this.p=this.perceive();const truth=truthRoute(world);this.optimal=truth.cost;
    this.initial={route:this.p.route.slice(),truth:truth.cells,match:shapeMatch(this.p.route,truth.cells),deviation:deviation(this.n,this.p.route,truth.cells)};
    this.capture(truth.cells,[]);}
  perceive(){return this.org.perceive(this.mem,this.position,{mode:this.mode==='classic'?'classic':'organ',imagine:this.imagine,step:this.steps});}
  capture(truth,surprised){const p=this.p,f={step:this.steps,position:this.position,match:shapeMatch(p.route,truth),deviation:deviation(this.n,p.route,truth),surprises:this.surprises,effort:this.effort,surprised};
    if(this.record)Object.assign(f,{route:p.route.slice(),truth,walked:this.walked.slice(),known:Array.from(this.mem.known,h=>Number.isNaN(h)?-1:+h.toFixed(2)),
      imagined:Array.from(p.mean,h=>+h.toFixed(2)),cloud:Array.from(p.cloud,c=>+c.toFixed(2))});
    this.frames.push(f);return f;}
  step(){if(this.finished)return {type:'finished'};const next=this.p.route[1];if(next===undefined)return {type:'stuck'};
    const prior=this.p,onRoute=new Set(prior.route);this.position=next;this.effort+=costOf(this.world.h[next]);this.walked.push(next);
    const revealed=remember(this.mem,sense(this.world,next));
    // Resistance: cells of the predicted shape that turned out different from what the organism imagined.
    const surprised=revealed.filter(i=>onRoute.has(i)&&(Math.abs(prior.mean[i]-this.mem.known[i])>.25||(this.mem.known[i]>.82&&prior.mean[i]<=.82)));
    this.surprises+=surprised.length;
    const learned=this.online?this.org.learn(prior,this.mem,revealed):null;
    this.steps++;this.finished=next===this.world.goal;this.p=this.perceive();
    const truth=truthRoute(this.world,this.position).cells,f=this.capture(truth,surprised);
    const ev={step:this.steps,goal:this.finished,revealed:revealed.length,surprised:surprised.length,learned:!!learned,match:+f.match.toFixed(2),changed:prior.route.slice(1).join()!==this.p.route.join()};
    this.journal.push(ev);if(this.journal.length>40)this.journal.shift();return ev;}
  run(limit=this.n*this.n*2){for(let t=0;t<limit&&!this.finished;t++)if(this.step().type==='stuck')break;return this;}
  summary(){return {solved:this.finished,steps:this.steps,effort:this.effort,optimal:this.optimal,ratio:this.finished?this.effort/this.optimal:null,
    match0:this.initial.match,dev0:this.initial.deviation,surprises:this.surprises,meanMatch:this.frames.reduce((s,f)=>s+f.match,0)/this.frames.length};}
  frame(i){return this.frames[i]??null;}
  light(){return {mode:this.mode,steps:this.steps,finished:this.finished,effort:this.effort,optimal:this.optimal,summary:this.summary(),
    frames:this.frames.map(f=>({step:f.step,match:+f.match.toFixed(3),deviation:+f.deviation.toFixed(2),surprises:f.surprises})),journal:this.journal.slice(-20)};}
}
