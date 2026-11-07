// V27 isolated bridge: ORIGINAL Discoverer.shape applied to a world whose
// lexical passability, source trust and physical action deltas were trained
// in the ORIGINAL Brain's existing TextWorldNavigator.
//
// No BFS or shortest-path implementation in this file. No hidden goal ID,
// hidden wall array, simulator transition function or test answer is read.
// The coordinate-tuple syntax and four-coordinate ontology remain explicit
// limits of the prior V17-GROUNDED-4D research model.
import {Discoverer,KIND} from './exercise.mjs';
import {N,ACTIONS,enc,move} from './goal-text-navigator.mjs';

const QUAD=/\b[0-3]\s*,\s*[0-3]\s*,\s*[0-3]\s*,\s*[0-3]\b/;
const wordSet=s=>new Set(String(s).toLowerCase().match(/[\p{L}_][\p{L}\p{N}_-]*/gu)||[]);
const shared=(question,note)=>{
 const a=wordSet(question),b=wordSet(note);
 return Math.min(4,[...a].filter(t=>b.has(t)).length);
};
const validCell=x=>Number.isInteger(x)&&x>=0&&x<N;

export class LearnedTargetReference {
 constructor(){
  this.exampleCount=0;
  this.positive=[0,0,0,0,0];this.negative=[0,0,0,0,0];
 }
 // Prior physically verified task outcomes supply supervision. This is NOT
 // zero-shot semantic goal discovery. Heldout tests never call this method.
 observe({question,statement,isGoal}={}){
  if(typeof question!=='string'||typeof statement!=='string'||typeof isGoal!=='boolean')
   throw Error('Observed question/note pair and a real outcome label required');
  if(!QUAD.test(statement))throw Error('Goal-reference observation requires a witnessed coordinate claim');
  const n=shared(question,statement);
  (isGoal?this.positive:this.negative)[n]++;
  this.exampleCount++;
  return {learned:true,overlap:n,observations:this.exampleCount};
 }
 posterior(n){
  const yes=this.positive[n]||0,no=this.negative[n]||0;
  return (yes+1)/(yes+no+2);
 }
 // Query + DOCUMENT only. A hidden numeric target is never passed.
 // Every coordinate claim is considered; source and axis fact syntax are
 // NOT hardcoded as special target sentences.
 resolve(document,question){
  if(typeof document!=='string'||typeof question!=='string'||!question.trim())
   return {found:false,reason:'NO_QUERY'};
  if(this.exampleCount<8||!this.positive.some(Boolean)||!this.negative.some(Boolean))
   return {found:false,reason:'INSUFFICIENT_PRIOR_GOAL_FEEDBACK'};
  let matched=0;const candidates=[];
  for(const line of document.split('\n')){
   const hit=QUAD.exec(line);if(!hit)continue;
   matched++;
   const score=this.posterior(shared(question,line));
   if(score<=.55)continue;
   const position=hit[0].split(',').map(x=>Number(x.trim()));
   const goal=enc(position);
   if(validCell(goal))candidates.push({goal,score,line:line.slice(0,180)});
  }
  if(!candidates.length)return {found:false,reason:'NO_LEARNED_GOAL_REFERENCE',
   inspectedCoordinateStatements:matched};
  const bestScore=Math.max(...candidates.map(x=>x.score));
  const best=candidates.filter(x=>Math.abs(x.score-bestScore)<1e-12);
  if(best.length!==1)return {found:false,reason:'AMBIGUOUS_GOAL_REFERENCE',
   candidates:best.length,inspectedCoordinateStatements:matched};
  return {found:true,goal:best[0].goal,score:bestScore,
   inspectedCoordinateStatements:matched,goalProvidedDirectly:false,
   interpretation:'goal index inferred from learned question/note cooccurrence feedback, not from hidden test answer'};
 }
 export(){return {version:1,exampleCount:this.exampleCount,
  positive:this.positive.slice(),negative:this.negative.slice()}}
 static restore(data){
  if(data?.version!==1||!Number.isInteger(data.exampleCount)||
   !Array.isArray(data.positive)||!Array.isArray(data.negative)||
   data.positive.length!==5||data.negative.length!==5)
   throw Error('Invalid or unsupported goal reference evidence');
  const p=new LearnedTargetReference();
  p.exampleCount=data.exampleCount;
  p.positive=data.positive.slice();p.negative=data.negative.slice();
  return p;
 }
}

export function planOriginal4DFromText({
 navigator,disc,reference,document,question,start,axes=[0,1,2,3],seed=74129
}={}){
 const fail=(reason,details={})=>({found:false,reason,preAction:true,
  originalMethod:'Discoverer.shape',goalSuppliedToPlanner:false,path:[],...details});
 if(!navigator||!reference||!validCell(start))
  return fail('MISSING_TRAINED_NATIVE_BRAIN_OR_START');
 if(!Array.isArray(axes)||!axes.length||new Set(axes).size!==axes.length||
    axes.some(x=>!Number.isInteger(x)||x<0||x>=4))
  return fail('INVALID_AXIS_PERSPECTIVE');
 const goalRef=reference.resolve(document,question);
 if(!goalRef.found)return fail(goalRef.reason,{goalEvidence:goalRef});
 const goal=goalRef.goal;
 let decoded;
 try{decoded=navigator.reconstruct(document);}
 catch(error){return fail('INCOMPLETE_LEARNED_TEXT_WORLD',{error:String(error?.message||error)})}
 const map=decoded.map;
 if(!map||map.length!==N)return fail('INVALID_WORLD_TOPOLOGY');
 if(!map[start]||!map[goal])return fail('START_OR_TARGET_IS_A_LEARNED_WALL',{goal});
 if(goal===start)return {found:true,goal,preAction:true,
  originalMethod:'Discoverer.shape',goalSuppliedToPlanner:false,path:[],
  field:Array.from({length:N},(_,i)=>Number(i===goal)),axes,
  source:'PR62 native learned world + witnessed question/reference associations'};

 const deltas=[];
 for(const action of ACTIONS){
  const history=navigator.effects.get(action);
  if(!history)continue;
  const count=[...history.values()].reduce((a,b)=>a+b,0);
  if(count<4)continue;
  const best=[...history.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(!best||best[1]/count<.60)continue;
  const effect=best[0].split(',').map(Number);
  if(effect.length!==4||effect.every(v=>v===0)||
     effect.some((v,i)=>!axes.includes(i)&&v%4!==0))continue;
  deltas.push({action,effect,confidence:best[1]/count,observations:count});
 }
 if(!deltas.length)return fail('NO_CONFIRMED_AXES',{goal});

 // The graph is composed from learned action effects and classified text
 // claims. No physical oracles, BFS distance, shortcut or supplied answer.
 const neighbors=Array.from({length:N},()=>[]);
 for(let state=0;state<N;state++){
  if(!map[state])continue;
  for(const {action,effect,confidence,observations} of deltas){
   const to=move(state,effect);
   if(!map[to]||to===state)continue;
   neighbors[state].push({to,action,verified:false,
    transformation:{effect,confidence,observations}});
  }
 }
 const retina=Array.from(map,k=>k?KIND.floor:KIND.wall);
 retina[start]=KIND.self;retina[goal]=KIND.target;
 let field=[];
 const actor=disc||new Discoverer(seed);
 const path=actor.shape(retina,0,start,{
  neighbors,conduct:k=>k===KIND.wall?0:1,attract:k=>k===KIND.target?1:0,
  onField:v=>{field=v}
 })||[];
 const reached=path.length>0&&path.at(-1).to===goal;
 return {found:reached,reason:reached?null:'NO_ORIGINAL_ATTRACTION_PATH',
  preAction:true,goal,goalSuppliedToPlanner:false,
  originalMethod:'Discoverer.shape',path,field,axes:axes.slice(),
  learnedAxes:deltas.map(x=>({action:x.action,effect:x.effect,
   confidence:x.confidence,observations:x.observations})),
  learnedWallCount:Array.from(map).filter(x=>!x).length,
  learnedPassableCount:Array.from(map).filter(Boolean).length,
  sourceConflicts:decoded.uncertain,
  observedWorldFacts:decoded.observations,goalEvidence:goalRef,
  note:'Frozen pre-action path on learned predicted topology; actual action success must be independently executed'};
}
