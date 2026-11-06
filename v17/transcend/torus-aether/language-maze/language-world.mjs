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
import {successorGoalField,selectUphillEdge} from "./successor-field.mjs";
import {OnlineSuccessor} from "./successor-online.mjs";
import {travelHierarchicalLanguage} from "./hierarchical-shape.mjs";
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
  this.onlineSuccessor=new OnlineSuccessor();
  this.reorderings=new Map();this.reorderSamples=0;
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
  this.learnPositionalTransform(prompt,answer);
  // Same kind-based empirical resistance / pass-through / goal counters as
  // Discoverer.learnStep()+endEpisode(): learned from physically observed
  // TRAINING character emissions and the fact the completed response ended.
  this.evidence.pass[KIND.floor]+=chars.length;
  this.evidence.enter[KIND.floor]+=chars.length;
  this.evidence.enter[KIND.target]++;
  this.evidence.endIn[KIND.target]++;
  // Actual online learning at ORIGINAL completed training-row commit.
  // One update for every observed character and every recursive time scale.
  // Previous V17 Brain, existing sidecars and shape() are not changed.
  const successorTraining=this.onlineSuccessor.observe(answer);
  return {learned:true,chars:chars.length,storedRecords:this.records.length,
    successorUpdates:successorTraining.updates};
 }
  // Discover the POSITION MAPPING from two genuinely different observed
 // input-output examples. No reverse/copy/latent operation is provided.
 learnPositionalTransform(prompt,answer){
  const target=cp(answer);
  if(target.length<2||target.length>128||new Set(target).size!==target.length)return false;
  const signature=target.slice().sort().join("\u0001");
  const matches=[...prompt.matchAll(/[\p{L}\p{N}]+/gu)].filter(m=>{
   const source=cp(m[0]);return source.length===target.length&&
    new Set(source).size===source.length&&source.slice().sort().join("\u0001")===signature;
  });
  if(!matches.length)return false;
  const m=matches.at(-1),source=cp(m[0]),before=prompt.slice(0,m.index),
   after=prompt.slice(m.index+m[0].length);
  if(!before.trim()&&!after.trim())return false;
  const permutation=target.map(ch=>source.indexOf(ch));
  if(permutation.some(i=>i<0))return false;
  const id=JSON.stringify([before,after,source.length,permutation]),old=this.reorderings.get(id);
  if(old){if(!old.samples.includes(m[0])){old.samples.push(m[0]);old.support++;}}
  else this.reorderings.set(id,{before,after,length:source.length,permutation,samples:[m[0]],support:1});
  this.reorderSamples++;return true;
 }
 composedCandidates(prompt){
  const found=[];
  for(const rule of this.reorderings.values()){
   if(rule.support<2||!prompt.startsWith(rule.before)||!prompt.endsWith(rule.after))continue;
   const variable=prompt.slice(rule.before.length,prompt.length-rule.after.length),source=cp(variable);
   if(source.length!==rule.length||new Set(source).size!==source.length||
     rule.samples.includes(variable))continue;
   const answer=rule.permutation.map(i=>source[i]).join("");
   found.push({record:{prompt:key(prompt),tokens:[...wordSet(prompt)],answer,characters:cp(answer).length,
     support:rule.support,source:"composed_from_observed_position_transformations"},
     score:.995,shared:rule.support,exact:false,composed:true});
  }
  return found;
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
  const results=this.composedCandidates(prompt);
  for(const r of all){
   const exact=phrase===r.prompt,shared=r.tokens.filter(x=>query.has(x));
   if(!exact&&shared.length<2)continue; // no unsupported hallucinated routes from one generic word
   const rDen=r.tokens.reduce((s,w)=>s+weight(w),0)||1;
   const common=shared.reduce((s,w)=>s+weight(w),0);
   const score=exact?1:2*common/(qDen+rDen);
   if(!exact&&score<.58)continue;
   results.push({record:r,score,shared:shared.length,exact});
  }
  results.sort((a,b)=>b.score-a.score||b.record.support-a.record.support||
    a.record.answer.length-b.record.answer.length);
  if(!results.length)return [];
  // Only paths with comparable evidence may form a traversable world.
  // We do not label unrelated/unknown alternatives as physically proven walls.
  const cutoff=results[0].exact?1:Math.max(.58,results[0].score*.8);
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
    labels=[{prefix:"",state:"body",depth:0,tail:""}],prefixes=new Map([["",0]]),subgoals=[];
  let hitLimit=false;
  for(const candidate of selected){
   let prefix="",at=0,depth=0,tail=[];
   for(const character of cp(candidate.record.answer)){
    depth++;tail.push(character);if(tail.length>12)tail.shift();
    const nextPrefix=prefix+character;let to=prefixes.get(nextPrefix);
    if(to===undefined){
     if(kinds.length>=this.maxGraphNodes){hitLimit=true;break;}
     to=kinds.length;prefixes.set(nextPrefix,to);
     kinds.push(KIND.floor);neighbors.push([]);
     labels.push({prefix:nextPrefix,state:"character",character,
       depth,tail:tail.join("")});
    }
    // Keep genuine OBSERVED completed-example counts on each shared edge.
    // No held-out answer, simulated action or correctness oracle is introduced.
    const oldEdge=neighbors[at].find(e=>e.to===to&&e.character===character);
    const observedSupport=Math.max(1,candidate.record.support);
    if(oldEdge)oldEdge.support+=observedSupport;
    else neighbors[at].push({to,action:character,character,support:observedSupport,
        transformation:candidate.composed?"learned_positional_transformation":"observed_character_transition"});
    at=to;prefix=nextPrefix;
   }
   if(hitLimit)break;
   kinds[at]=KIND.target;
   labels[at].state=candidate.composed?"composed_terminal":"learned_terminal";
   subgoals.push({node:at,length:candidate.record.characters,
     source:candidate.record.source||"experienced_training_answer",support:candidate.record.support,score:candidate.score});
  }
  const world={input:prompt,root:0,kinds,neighbors,labels,
    candidates:selected.length,goals:subgoals,hitLimit,
    provenance:"Observed training paths and composition from >=2 independently experienced character-position transformations. No unseen target oracle."};
  return world;
 }
 plan(prompt,{maxReplay=256,mode="hybrid",observeReplans=false}={}){
  if(mode!=="hybrid"&&mode!=="original")throw Error("Unknown language planning mode");
  if(typeof prompt!=="string"||prompt.length>20000)throw Error("Prompt is missing or exceeds safe request size");
  // A long observed answer is a hierarchy of successive submazes, not a
  // 112k-node flat field whose 0.97^112k attraction becomes numerically zero.
  // This branch is used only with ONE evidence-supported known corridor;
  // ambiguous alternatives are never silently discarded to force an answer.
  const evidence=this.candidates(prompt);
  if(evidence.length===1&&evidence[0].record.characters>512){
   const picked=evidence[0].record;
   return {...travelHierarchicalLanguage(cp(picked.answer),{
      conduct:k=>this.conduct(k),attract:k=>this.attract(k),maxReplay,observeReplans,
      source:picked.source||"priorly_observed_training_answer"
    }),input:prompt,successor:{enabled:false,mode,
      training:this.onlineSuccessor.stats(),
      reason:"Only one previously observed answer path; original recursive V17 law remains authoritative"},candidateEvidence:{
     score:evidence[0].score,support:picked.support,
     provenance:picked.source||"priorly_observed_training_answer"}};
  }
  const world=this.worldFor(prompt);
  // An optional secondary successor channel operates on ONLY completed
  // training Q/A paths. No new answer is inferred by this field itself.
  const goalRewards=Array(world.kinds.length).fill(0);
  for(const goal of world.goals){
    const evidence=Math.max(.01,Math.min(1,goal.score*goal.support/(goal.support+1)));
    goalRewards[goal.node]=Math.max(goalRewards[goal.node],evidence);
  }
  const successor=mode==="hybrid"&&world.candidates>1?
    successorGoalField({kinds:world.kinds,neighbors:world.neighbors,start:0,
     conduct:k=>this.conduct(k),attract:k=>this.attract(k),goalRewards,gamma:.9}):null;
  // The successor model is updated during ACTUAL corpus training, not while
  // this read-only plan is evaluated. Missing states use the older empirical
  // field instead of an invented value, preserving old checkpoint behavior.
  const onlineProjection=successor?this.onlineSuccessor.valuesFor(world.labels,successor.values):null;
  const successorValues=onlineProjection?.values??successor?.values??null;
  const field=shapeOnLearnedTopology({kinds:world.kinds,neighbors:world.neighbors,
   start:0,conduct:k=>this.conduct(k),attract:k=>this.attract(k),
   tieBreakValues:successorValues});
  const result=field.path;
  // A real LOCAL body policy. It does not read the globally selected next
  // character from result.path. It only perceives neighbors of its CURRENT
  // node and the goal-attraction values remembered after its global glance.
  let bodyPosition=0,localAgreement=0,blocked=0,localSuccessorTies=0;
  const bodyNodes=[0],seen=new Set([0]),trace=[],emitted=[],replans=[];
  let revisedGlobalShapes=0;
  if(result){
   for(let i=0;i<world.kinds.length;i++){
    const local=world.neighbors[bodyPosition]||[];
    // The original local policy remains untouched. When observing routes,
    // recalculate an ORIGINAL V17 global attraction shape from the ACTUAL
    // current body position BEFORE each next local action, as in the maze UI.
    // The new shape is observational and is never smuggled into the policy.
    if(observeReplans&&replans.length<maxReplay){
      const fresh=shapeOnLearnedTopology({
        kinds:world.kinds,neighbors:world.neighbors,start:bodyPosition,
        conduct:k=>this.conduct(k),attract:k=>this.attract(k),
        tieBreakValues:successorValues
      });
      const initialIndex=field.nodes.indexOf(bodyPosition),
       originalRemaining=initialIndex>=0?field.nodes.slice(initialIndex):null;
      const changed=originalRemaining!==null&&
        (originalRemaining.length!==fresh.nodes.length||
         originalRemaining.some((v,j)=>v!==fresh.nodes[j]));
      if(changed)revisedGlobalShapes++;
      replans.push({
       atStep:i+1,from:bodyPosition,stepBeforeAction:true,
       recomputedWith:"UNCHANGED_V17_ATTRACTION_LAW_FROM_NEW_ACTUAL_POSITION",
       nodes:fresh.nodes.slice(0,256),
       fullNodes:fresh.nodes.length,
       previewTruncated:fresh.nodes.length>256,
       changedFromInitialContinuation:changed,
       firstPredictedCharacter:fresh.path?.[0]?.character??null,
       usedForActualAction:false,
       evidenceChangedSinceLastStep:false
      });
    }
    let best=null,bv=field.values[bodyPosition];
    // The body's local view uses the SAME globally computed attraction field
    // and the SAME exact-tie rule; it never receives reference.path as policy.
    if(successor){
     const choice=selectUphillEdge(local,bodyPosition,field.values,seen,successorValues);
     if(choice.index>=0)best=local[choice.index];
     if(choice.usedSuccessor)localSuccessorTies++;
    }else for(const edge of local){
     const v=field.values[edge.to];
     if(!seen.has(edge.to)&&v>bv){bv=v;best=edge;}
    }
    if(!best){blocked++;break;}
    // The decision below was generated locally, NOT copied from the global
    // reference path; compare against the initial shape only for evaluation.
    const predicted=result[i]?.character??null;
    const before=bodyPosition;
    bodyPosition=best.to;seen.add(bodyPosition);bodyNodes.push(bodyPosition);
    emitted.push(best.character);
    const same=best.character===predicted;
    localAgreement+=Number(same);
    if(trace.length<maxReplay)trace.push({
     step:i+1,source:before,target:bodyPosition,character:best.character,
     prefix:emitted.join(""),potentialBefore:field.values[before],
     potentialAfter:field.values[bodyPosition],observed:world.labels[bodyPosition]?.state??"unknown",
     transformation:best.transformation,localChoices:local.length,
     predictedCharacter:predicted,agreesWithGlobal:same,
     globalShapeLength:result.length,localRemaining:Math.max(0,result.length-i-1),
     policy:"local_neighbor_hillclimb_of_remembered_global_field",
     successorBefore:successorValues?.[before]??null,
     successorAfter:successorValues?.[bodyPosition]??null
    });
    if(this.attract(world.kinds[bodyPosition])>.2)break;
   }
  }
  const output=emitted.join("");
  const paths=bodyNodes;
  const localReachedGoal=world.goals.some(g=>g.node===bodyPosition);
  return {
   protocol:"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS",
   frozen:true,trainingMutated:false,
   input:prompt,output,propagation:field.propagation,solvedKnownGoal:!!result&&localReachedGoal,
   abstained:!result,reason:result&&!localReachedGoal?"LOCAL_PATH_BLOCKED":field.reason,steps:result?.length||0,
   locallyExecutedSteps:emitted.length,localAgreementRate:result?.length?localAgreement/result.length:null,
   localBlockedSteps:blocked,bodyPolicy:"local_neighbor_hillclimb_of_remembered_global_field",
   successor:successor?{enabled:true,mode,gamma:successor.gamma,converged:successor.converged,
      iterations:successor.iterations,rootOccupancy:successorValues[0],
      empiricalRootOccupancy:successor.values[0],
      onlineCoveredNodes:onlineProjection.covered,onlineNodes:onlineProjection.nodes,
      onlineSource:onlineProjection.source,training:this.onlineSuccessor.stats(),
      globalTieBreaks:field.successorTieBreaks,localTieBreaks:localSuccessorTies,
      interpretation:"Observed online reverse TD at four temporal scales; fallback is empirical terminal occupancy. Neither equals answer correctness."}:
      {enabled:false,mode,training:this.onlineSuccessor.stats(),
       reason:mode==="original"?"original V17 only":"No competing observed complete paths"},
   replans,revisionStats:{repropagations:replans.length,
    revisedGlobalShapes,actuallyControlsAction:false,
    newWorldObservationsDuringReplay:false},
   initialShape:result?.map(e=>e.character)||[],
   // These two sequences are FROM DIFFERENT STAGES of the real V17 law:
   // predicted BEFORE action vs actually visited by the local body policy.
   // Never infer the original global shape from the already executed path.
   globalPlanNodes:field.nodes,
   pathNodes:paths,trace,field:field.values,
   viewpointEvidence:{
    globalBeforeFirstAction:true,localActionsFromObservedNeighbors:true,
    topology:"OBSERVED_PREFIX_GRAPH",actualRepropagationAfterEachMove:observeReplans,
    observationalReplanOnly:true,
    learned4DGeometry:false,
    note:observeReplans?
      "After each actual movement, ORIGINAL V17 attraction is recalculated from the current body position for observability; local actions remain governed by the preserved original field. No new world evidence is learned in this frozen evaluation.":
      "V18 uses the original memorized field during local movement; recalculation is disabled in ordinary planning."
   },
   graph:{
    nodes:world.labels.map((v,i)=>({id:i,kind:world.kinds[i],state:v.state,
      lastCharacter:v.character??null,potential:field.values[i],
      successorOccupancy:successorValues?.[i]??null,
      successorEmpirical:successor?.values[i]??null,
      successorOnline:this.onlineSuccessor.valueAt(v.depth??0,v.tail??"").value})),
    edges:world.neighbors.flatMap((row,i)=>row.map(e=>({from:i,to:e.to,character:e.character,
      observedSupport:e.support??1}))),
    goals:world.goals,hitLimit:world.hitLimit
   },
   candidates:world.candidates,validity:"Reached a TRAINING-learned terminal. Correctness on this input is NOT proven.",
   limitations:[
    "Shared exact maze propagation equation; its 2D layout is replaced by experienced directed graph neighbors.",
    "Only observed answer paths and shared prefixes are traversable. Unknown valid routes may exist.",
    "A known terminal is NOT necessarily the correct answer to an unseen question.",
    "This does NOT demonstrate general semantic understanding or arbitrary 4D/5D cognition.",
    "Successor occupancy ranks only exact original-field ties using completed training example evidence; it is not a correctness probability.",
    "Online successor temporal-difference values are trained on Q/A answer trajectories, not the semantics of unknown answers."
   ]
  };
 }
 /** Heldout reference is accessed only AFTER plan() has already returned. */
 frozenCompare(pairs,{mode="hybrid"}={}){
  if(!Array.isArray(pairs)||pairs.length>200)throw Error("Invalid frozen test set");
  const cases=pairs.map(({prompt,answer})=>{
   const result=this.plan(prompt,{maxReplay:12,mode});
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
   protocol:"FROZEN_NO_REFERENCE_TO_WORLD_CONSTRUCTION",mode};
 }
 stats(){
  return {version:this.version,rowsSeen:this.rowsSeen,rowsObserved:this.rowsObserved,
   skippedEmpty:this.skippedEmpty,displaced:this.displaced,stored:this.records.length,
   characterTransitionsObserved:this.events,knownGoalObservationCount:this.evidence.endIn[KIND.target],
   observedPositionalRules:this.reorderings.size,observedPositionalSamples:this.reorderSamples,
   successorTraining:this.onlineSuccessor.stats(),
   conductFloor:this.conduct(KIND.floor),attractGoal:this.attract(KIND.target),
   maxRecords:this.maxRecords,maxCandidates:this.maxCandidates,maxGraphNodes:this.maxGraphNodes,
   noLatentModel:true,originalMazeFormulaReused:true,
   caveat:"Observed prefix graph. Answer retrieval is not general language understanding."};
 }
 export(){
  return {version:1,options:{maxRecords:this.maxRecords,maxCandidates:this.maxCandidates,maxGraphNodes:this.maxGraphNodes},
   records:this.records,evidence:this.evidence,rowsSeen:this.rowsSeen,rowsObserved:this.rowsObserved,
   successorOnline:this.onlineSuccessor.export(),
   positionalRules:[...this.reorderings.entries()],reorderSamples:this.reorderSamples,
   skippedEmpty:this.skippedEmpty,displaced:this.displaced,events:this.events};
 }
 static restore(data){
  if(!data||data.version!==1||!Array.isArray(data.records)||!data.options)
    throw Error("Invalid LanguageMazeMemory sidecar");
  const memory=new LanguageMazeMemory(data.options);
  if(data.successorOnline!==undefined)
   memory.onlineSuccessor=OnlineSuccessor.restore(data.successorOnline);
  if(data.records.length>memory.maxRecords)throw Error("Unbounded language memory sidecar");
  for(const item of data.records){
   if(typeof item.prompt!=="string"||typeof item.answer!=="string"||
      !Array.isArray(item.tokens)||item.tokens.some(x=>typeof x!=="string")||
      !Number.isSafeInteger(item.support)||item.support<1)throw Error("Corrupt language memory record");
   memory.records.push({...item});
  }
  if(data.positionalRules!==undefined){
   if(!Array.isArray(data.positionalRules)||data.positionalRules.length>100000)
    throw Error("Corrupt positional rule list");
   for(const [id,rule]of data.positionalRules){
    if(typeof id!=="string"||!rule||typeof rule.before!=="string"||typeof rule.after!=="string"||
      !Array.isArray(rule.permutation)||!Array.isArray(rule.samples)||!Number.isSafeInteger(rule.support))
      throw Error("Invalid learned position transformation");
    memory.reorderings.set(id,rule);
   }
   memory.reorderSamples=Number.isSafeInteger(data.reorderSamples)&&data.reorderSamples>=0?data.reorderSamples:0;
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
