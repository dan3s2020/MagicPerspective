/**
 * V18 LANGUAGE-WORLD = a navigable graph of OBSERVED prompt→answer trajectories.
 * For each output character the organism traverses a learned submaze portal.
 *
 * It does NOT receive a correct unseen answer, does NOT use embeddings, latent 32D,
 * token predictors or substitute the original V17 attraction-propagation method.
 * Every graph edge comes from a completed real TRAINING answer; the "goal" is a
 * previously observed successful endpoint, not an unseen-answer oracle.
 *
 * LIMITATION: this is observed-path retrieval / prefix recombination, not
 * demonstrated open-domain understanding. Missing routes => abstain honestly.
 */
import {shapeOnLearnedTopology} from "./shape-topology.mjs";
import {KIND} from "../worlds/exercise.mjs";

const wordSet=string=>new Set((String(string||"").toLocaleLowerCase("und")
  .match(/[\p{L}\p{N}]+/gu)||[]).filter(s=>s.length>1));
const key=string=>String(string||"").normalize("NFKC").trim().toLocaleLowerCase("und").replace(/\s+/g," ");
const cp=string=>[...String(string||"")];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function summaryPath(path){return (path||[]).map(e=>e.character).filter(v=>v!==null).join("");}
export class LanguageMazeMemory {
 constructor({maxRecords=1600,maxCandidates=8,maxGraphNodes=12000}={}){
  if(!Number.isSafeInteger(maxRecords)||maxRecords<4||maxRecords>100000||
    !Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>64||
    !Number.isSafeInteger(maxGraphNodes)||maxGraphNodes<8||maxGraphNodes>200000)
    throw Error("Invalid learned world memory limits");
  this.version=1;this.maxRecords=maxRecords;this.maxCandidates=maxCandidates;
  this.maxGraphNodes=maxGraphNodes;
  this.records=[];this.rowsSeen=0;this.rowsObserved=0;this.skippedEmpty=0;this.displaced=0;
  this.evidence={pass:[1,1,1,1],block:[1,1,1,1],enter:[1,1,1,1],endIn:[0,0,0,0]};
  this.events=0;this.evaluations=0;this.evalSolved=0;this.evalCharacters=0;this.evalCorrect=0;
 }
 /**
  * Observe a completed training Q/A. No "correct next character" comes from
  * heldout tests; source/answer and character transitions were experienced here.
  */
 learn(prompt,answer){
  this.rowsSeen++;
  if(typeof prompt!=="string"||typeof answer!=="string"||!prompt.trim()||!answer.length){
   this.skippedEmpty++;return {learned:false,reason:"empty training observation"};
  }
  const tokens=[...wordSet(prompt)],chars=cp(answer);
  const rec={prompt:key(prompt),tokens,answer,characters:chars.length,support:1};
  const old=this.records.find(r=>r.prompt===rec.prompt&&r.answer===answer);
  if(old){old.support++;}else {
   this.records.push(rec);
   if(this.records.length>this.maxRecords){this.records.shift();this.displaced++;}
  }
  this.rowsObserved++;this.events+=chars.length;
  // Same kind-based empirical resistance / pass-through / goal counters as
  // Discoverer.learnStep()+endEpisode(): learned from physically observed
  // TRAINING character emissions and the fact the completed response ended.
  this.evidence.pass[KIND.floor]+=chars.length;
  this.evidence.enter[KIND.floor]+=chars.length;
  this.evidence.enter[KIND.target]++;
  this.evidence.endIn[KIND.target]++;
  return {learned:true,chars:chars.length,storedRecords:this.records.length};
 }
 conduct(kind){return this.evidence.pass[kind]/(this.evidence.pass[kind]+this.evidence.block[kind]);}
 attract(kind){return this.evidence.endIn[kind]/this.evidence.enter[kind];}
 candidates(prompt){
  const phrase=key(prompt),query=wordSet(prompt),all=this.records;
  if(!phrase||!query.size||!all.length)return [];
  const df=new Map();
  for(const record of all)for(const w of record.tokens)df.set(w,(df.get(w)||0)+1);
  const weight=w=>Math.log(1+(all.length+1)/(1+(df.get(w)||0)));
  const qDen=[...query].reduce((s,w)=>s+weight(w),0)||1;
  const results=[];
  for(const r of all){
   const exact=phrase===r.prompt,shared=r.tokens.filter(x=>query.has(x));
   if(!exact&&shared.length<2)continue; // no unsupported hallucinated routes from one generic word
   const rDen=r.tokens.reduce((s,w)=>s+weight(w),0)||1;
   const common=shared.reduce((s,w)=>s+weight(w),0);
   const score=exact?1:2*common/(qDen+rDen);
   if(!exact&&score<.34)continue;
   results.push({record:r,score,shared:shared.length,exact});
  }
  results.sort((a,b)=>b.score-a.score||b.record.support-a.record.support||
    a.record.answer.length-b.record.answer.length);
  if(!results.length)return [];
  // Only paths with comparable evidence may form a traversable world.
  // We do not label unrelated/unknown alternatives as physically proven walls.
  const cutoff=results[0].exact?1:Math.max(.34,results[0].score*.8);
  return results.filter(x=>x.score>=cutoff).slice(0,this.maxCandidates);
 }
 /**
  * Each observed answer is a corridor of REAL emitted-character transformations.
  * Overlapping output prefixes become shared portals (not isolated token guesses).
  * The entire possible answer can be seen as a single global graph before
  * moving; each local action enters the next character submaze.
  */
 worldFor(prompt){
  const selected=this.candidates(prompt),kinds=[KIND.self],neighbors=[[]],
    labels=[{prefix:"",state:"body"}],prefixes=new Map([["",0]]),subgoals=[];
  let hitLimit=false;
  for(const candidate of selected){
   let prefix="",at=0;
   for(const character of cp(candidate.record.answer)){
    const nextPrefix=prefix+character;let to=prefixes.get(nextPrefix);
    if(to===undefined){
     if(kinds.length>=this.maxGraphNodes){hitLimit=true;break;}
     to=kinds.length;prefixes.set(nextPrefix,to);
     kinds.push(KIND.floor);neighbors.push([]);
     labels.push({prefix:nextPrefix,state:"character",character});
    }
    if(!neighbors[at].some(e=>e.to===to&&e.character===character))
      neighbors[at].push({to,action:character,character,
        transformation:"observed_character_transition"});
    at=to;prefix=nextPrefix;
   }
   if(hitLimit)break;
   kinds[at]=KIND.target;
   labels[at].state="learned_terminal";
   subgoals.push({node:at,length:candidate.record.characters,
     support:candidate.record.support,score:candidate.score});
  }
  const world={input:prompt,root:0,kinds,neighbors,labels,
    candidates:selected.length,goals:subgoals,hitLimit,
    provenance:"Edges from training-only observed answers. No heldout target or oracle in graph."};
  return world;
 }
 plan(prompt,{maxReplay=256}={}){
  if(typeof prompt!=="string"||prompt.length>20000)throw Error("Prompt is missing or exceeds safe request size");
  const world=this.worldFor(prompt);
  const field=shapeOnLearnedTopology({kinds:world.kinds,neighbors:world.neighbors,
   start:0,conduct:k=>this.conduct(k),attract:k=>this.attract(k)});
  const result=field.path;
  const output=summaryPath(result);
  const trace=[],paths=field.nodes;
  for(let i=0;result&&i<result.length&&i<maxReplay;i++){
   const e=result[i];trace.push({
    step:i+1,source:e.from,target:e.to,character:e.character,
    prefix:output.slice(0,[...output].slice(0,i+1).join("").length), // genuine observed path prefix
    potentialBefore:field.values[e.from],potentialAfter:field.values[e.to],
    observed:world.labels[e.to]?.state??"unknown",
    transformation:e.transformation,
    // Same solution shape seen globally then locally after changing viewpoint.
    globalShapeLength:result.length,localRemaining:result.length-i-1
   });
  }
  return {
   protocol:"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS",
   frozen:true,trainingMutated:false,
   input:prompt,output,solvedKnownGoal:!!result&&world.goals.some(g=>g.node===paths.at(-1)),
   abstained:!result,reason:field.reason,steps:result?.length||0,
   initialShape:result?.map(e=>e.character)||[],
   pathNodes:paths,trace,field:field.values,
   graph:{
    nodes:world.labels.map((v,i)=>({id:i,kind:world.kinds[i],state:v.state,
      lastCharacter:v.character??null,potential:field.values[i]})),
    edges:world.neighbors.flatMap((row,i)=>row.map(e=>({from:i,to:e.to,character:e.character}))),
    goals:world.goals,hitLimit:world.hitLimit
   },
   candidates:world.candidates,validity:"Reached a TRAINING-learned terminal. Correctness on this input is NOT proven.",
   limitations:[
    "Shared exact maze propagation equation; its 2D layout is replaced by experienced directed graph neighbors.",
    "Only observed answer paths and shared prefixes are traversable. Unknown valid routes may exist.",
    "A known terminal is NOT necessarily the correct answer to an unseen question.",
    "This does NOT demonstrate general semantic understanding or arbitrary 4D/5D cognition."
   ]
  };
 }
 /** Heldout reference is accessed only AFTER plan() has already returned. */
 frozenCompare(pairs){
  if(!Array.isArray(pairs)||pairs.length>200)throw Error("Invalid frozen test set");
  const cases=pairs.map(({prompt,answer})=>{
   const result=this.plan(prompt,{maxReplay:12});
   const expected=String(answer),actual=result.output,actualCP=cp(actual),refCP=cp(expected);
   const equal=actual===expected;
   let correct=0;for(let i=0;i<Math.min(actualCP.length,refCP.length);i++)correct+=+(actualCP[i]===refCP[i]);
   return {prompt,actual,expected,correct,equal,
    attempted:actualCP.length,total:refCP.length,hasKnownPath:result.solvedKnownGoal};
  });
  const totalChars=cases.reduce((s,x)=>s+x.total,0),correctChars=cases.reduce((s,x)=>s+x.correct,0);
  return {cases,accuracy:totalChars?correctChars/totalChars:null,
   exactRate:cases.length?cases.filter(x=>x.equal).length/cases.length:null,
   abstained:cases.filter(x=>!x.hasKnownPath).length,
   protocol:"FROZEN_NO_REFERENCE_TO_WORLD_CONSTRUCTION"};
 }
 stats(){
  return {version:this.version,rowsSeen:this.rowsSeen,rowsObserved:this.rowsObserved,
   skippedEmpty:this.skippedEmpty,displaced:this.displaced,stored:this.records.length,
   characterTransitionsObserved:this.events,knownGoalObservationCount:this.evidence.endIn[KIND.target],
   conductFloor:this.conduct(KIND.floor),attractGoal:this.attract(KIND.target),
   maxRecords:this.maxRecords,maxCandidates:this.maxCandidates,maxGraphNodes:this.maxGraphNodes,
   noLatentModel:true,originalMazeFormulaReused:true,
   caveat:"Observed prefix graph. Answer retrieval is not general language understanding."};
 }
 export(){
  return {version:1,options:{maxRecords:this.maxRecords,maxCandidates:this.maxCandidates,maxGraphNodes:this.maxGraphNodes},
   records:this.records,evidence:this.evidence,rowsSeen:this.rowsSeen,rowsObserved:this.rowsObserved,
   skippedEmpty:this.skippedEmpty,displaced:this.displaced,events:this.events};
 }
 static restore(data){
  if(!data||data.version!==1||!Array.isArray(data.records)||!data.options)
    throw Error("Invalid LanguageMazeMemory sidecar");
  const memory=new LanguageMazeMemory(data.options);
  if(data.records.length>memory.maxRecords)throw Error("Unbounded language memory sidecar");
  for(const item of data.records){
   if(typeof item.prompt!=="string"||typeof item.answer!=="string"||
      !Array.isArray(item.tokens)||item.tokens.some(x=>typeof x!=="string")||
      !Number.isSafeInteger(item.support)||item.support<1)throw Error("Corrupt language memory record");
   memory.records.push({...item});
  }
  for(const k of ["pass","block","enter","endIn"]){
   const row=data.evidence?.[k];
   if(!Array.isArray(row)||row.length!==4||row.some(x=>!Number.isSafeInteger(x)||x<0))
    throw Error("Invalid language-world conduct/attract evidence");
   memory.evidence[k]=row.slice();
  }
  for(const k of ["rowsSeen","rowsObserved","skippedEmpty","displaced","events"]){
   const v=data[k];
   if(!Number.isSafeInteger(v)||v<0)throw Error("Corrupt language-world statistics");
   memory[k]=v;
  }
  return memory;
 }
}
