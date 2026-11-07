// NATIVE MOTOR RESTORATION RESEARCH: genuine original Discoverer.shape()
// propagation on a learned NON-GRID text topology. This is an adapter of the
// SAME V17 Brain: its observed effects, Discoverer, shared path policy,
// NoiseAgency, GraphTrace and original 5D Geometry. NO new text model weights,
// no independent worker, no next-character substitution.
// It cannot infer an unspecified semantic target; goal constraints MUST be
// available from the user task BEFORE any withheld answer is examined.
// Internal actions simulate learned operators, NOT validated external semantics.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {NoiseAgency} from "../../transcend/torus-aether/worlds/noise-agency.mjs";
import {PersistentHypermazeAtlas} from "./persistent-atlas.mjs";
import {tokenizeObservation,renderObservation}
 from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const key=t=>"text-state:"+renderObservation(t);
const finite=x=>Number.isFinite(x);
const uniq=a=>[...new Set(a)];
const line=x=>String(x||"").trim();
const target=(tokens,required)=>required.every(x=>tokens.includes(x));

function validatedRequired(required){
 if(!Array.isArray(required)||!required.length||required.length>32)
  throw Error("Explicit text goal constraints required BEFORE reference answer");
 const normalized=uniq(required.map(x=>String(x).trim()));
 if(normalized.some(x=>!x||tokenizeObservation(x).length!==1))
  throw Error("Every goal must be one observed textual token");
 return normalized;
}

export class NativeGoalTextMaze {
 constructor(brain,{maxStates=2500,maxDepth=6,geometryWeight=.025,
  sharedPolicyWeight=.01,atlasFile=null}={}){
  if(!(brain instanceof Brain))throw Error("The ACTUAL original V17 Brain is required");
  if(!Number.isSafeInteger(maxStates)||maxStates<4||maxStates>50000)
   throw Error("Invalid native observed-world state limit");
  if(!Number.isSafeInteger(maxDepth)||maxDepth<1||maxDepth>20)
   throw Error("Invalid native text depth");
  this.brain=brain;
  this.maxStates=maxStates;this.maxDepth=maxDepth;
  this.geometryWeight=geometryWeight;
  this.sharedPolicyWeight=sharedPolicyWeight;
  this.atlas=new PersistentHypermazeAtlas({file:atlasFile});
  this.lastWorldSequence=this.atlas.summary().lastTextWorldSequence||0;
  this.livedTexts=this.atlas.summary().worldsByDomain.text||0;
  this.livedGraphTransitions=this.atlas.summary().learnedOperatorEvents;
  // Existing .v8 checkpoints may predate the atlas. Snapshot their actual
  // learned transformations as an explicitly labeled legacy baseline once,
  // so the atlas never pretends we witnessed historic training events.
  if(!this.atlas.summary().journalEvents&&brain.observedTransformations.seen>0){
   const entries=[...brain.observedTransformations.operators.values()];
   for(let j=0;j<entries.length;j+=100){
    this.atlas.append("baseline",{
     source:"preexisting-original-Brain.v8",
     historicTrainingNotReplayed:true,previousObservedUnits:brain.observedTransformations.seen,
     historicRawTextUnavailable:true,
     operators:entries.slice(j,j+100).map(op=>({
      key:op.key,kind:op.kind,from:op.from,to:op.to,
      left:op.left,right:op.right,
      observedSupport:op.sourceObservations,evidence:op.evidence||[]
     }))
    });
   }
  }
 }
 // Original GraphTrace/5D action-axis update for EACH genuinely new
 // edit discovered from current training OR verified historical rehearsal.
 // Same original Brain, same geometry, same transform evidence.
 _indexNewOperators(old){
  let newPairs=0;
  const geo=this.brain.trace.geo;
  const axes=this.brain.hypermazeLearnedAxes ||= new Map();
   for(const [id,op] of this.brain.observedTransformations.operators){
    if(old.has(id))continue;
    for(const evidence of op.evidence||[]){
     // Original, actually lived before/after states, never a fabricated
     // pair or a withheld answer. Geometry learns these very same edges.
     const from="text-state:"+evidence.from,to="text-state:"+evidence.to;
     geo.learn(from,to);
     // Learn a reusable 5D action displacement from two REAL observed states.
     // This is the same original Geometry.U, not a second fake embedding.
     // It is signed on the torus, so a new unseen state can get an ephemeral
     // predicted position from a known starting state plus this action.
     const u=geo.U.get(from),v=geo.U.get(to);
     if(u&&v&&u.length===5&&v.length===5){
      const axis=axes.get(id)||{sum:[0,0,0,0,0],count:0};
      for(let d=0;d<5;d++){
       const delta=v[d]-u[d];
       axis.sum[d]+=delta-Math.round(delta);
      }
      axis.count++;axes.set(id,axis);
     }
     this.brain.trace.node(from,"A",evidence.from.slice(0,100));
     this.brain.trace.node(to,"A",evidence.to.slice(0,100));
     this.brain.trace.setEdge(from,to,"observed-text-transform",
      Math.min(8,1+Math.log1p(op.sourceObservations)),op.kind);
     newPairs++;
    }
   }
  const novel=[...this.brain.observedTransformations.operators.values()]
   .filter(op=>!old.has(op.key));
  return {newPairs,novel,geo};
 }
 // Experience ONLY actual observed text; no generated answer is inserted.
 // Text edit operators and their evidence come from the EXISTING Brain.
 observe(text){
  if(typeof text!=="string"||!text.trim())return {learned:false,reason:"empty-text"};
  const old=new Set(this.brain.observedTransformations.operators.keys());
  const observed=this.brain.learnObservedTransformations(text);
  const {newPairs,novel,geo}=this._indexNewOperators(old);
  // Capture exact original text, including UTF-8 diacritics. The atlas is
  // an append-only evidence log, NOT another trained model or separate brain.
  const atlasWorldSequence=this.atlas.append("world",{world:"text",
   observedEpisode:this.livedTexts+1,
   rawText:text,utf8Bytes:Buffer.byteLength(text,"utf8"),
   observedUnits:observed.observedUnits,
   learnedSentences:observed.newSentences,
   learnedOperatorCount:novel.length,
   rejectedLongTotal:this.brain.observedTransformations.rejectedLong,
   source:"actual original corpus (never heldout evaluation)"});
  for(const op of novel)this.atlas.append("operator",{
   key:op.key,kind:op.kind,from:op.from,to:op.to,
   left:op.left,right:op.right,
   support:op.sourceObservations,evidence:op.evidence||[],
   originEpisode:this.livedTexts+1,
   beforeAndAfterActuallyObserved:true});
  this.lastWorldSequence=atlasWorldSequence;
  this.livedTexts++;
  this.livedGraphTransitions+=newPairs;
  this._topologyCache=null; // actual new observations invalidate frozen topology

  return {learned:true,observed,...observed,
   atlasWorldSequence,newRealGeometryPairs:newPairs,
   sharedBrain:true,geoDimensions:geo.D,source:"real observed corpus only"};
 }
 // REAL cross-world memory: a current, actually observed training sentence
 // is rehearsed against HISTORIC OBSERVED sentences from the append-only
 // atlas, even when all those source records were evicted from the small
 // current exercise window. No answer or unseen test is accepted as evidence.
 // A call is explicitly chunked and reports its cursor/frontier instead of
 // silently pretending that millions of archived stories were scanned.
 replayArchivedWorlds({focusSequence=this.lastWorldSequence,
   after=0,limit=120}={}){
  if(!Number.isSafeInteger(focusSequence)||focusSequence<1)
   throw Error("Historical replay needs an ACTUAL observed text-world event ID");
  if(!Number.isSafeInteger(after)||after<0||
     !Number.isSafeInteger(limit)||limit<1||limit>250)
   throw Error("Historical replay needs a nonnegative cursor and 1..250 world events");
  const focus=this.atlas.read(focusSequence);
  if(focus?.type!=="world"||focus.world!=="text"||
     typeof focus.rawText!=="string"||!focus.rawText.trim())
   throw Error("Replay focus must be actual previously observed TRAINING text; never an inferred or heldout goal");
  const units=text=>text.split(/(?<=[.!?])\s+|\r?\n+/u)
    .map(x=>x.trim()).filter(Boolean);
  const targets=units(focus.rawText);
  const model=this.brain.observedTransformations;
  const before=model.seen;
  const old=new Set(model.operators.keys());
  const pages=this.atlas.page({after,limit,kinds:["world"]});
  let historicEvents=0,rehearsed=0,discardedLong=0;
  // The genuinely observed current-state evidence is refreshed between
  // historical candidates, allowing comparisons even with a tiny rolling
  // active-state window (3 or 4 records).
  for(const event of pages.events){
   if(event.seq>=focusSequence||event.world!=="text"||
      typeof event.rawText!=="string")continue;
   historicEvents++;
   for(const historic of units(event.rawText)){
    if(tokenizeObservation(historic).length>model.maxTokens){
     discardedLong++;continue;
    }
    model.revisitArchivedSentence(historic);rehearsed++;
    for(const wanted of targets){
     if(tokenizeObservation(wanted).length>model.maxTokens){
      discardedLong++;continue;
     }
     model.revisitArchivedSentence(wanted);rehearsed++;
    }
   }
  }
  if(model.seen!==before)
   throw Error("Historical rehearsal incorrectly increased actual corpus observations");
  const {newPairs,novel}=this._indexNewOperators(old);
  const seq=this.atlas.append("replay",{
   focusSequence,after,nextCursor:pages.nextCursor,
   historicalWorldsScanned:historicEvents,
   genuineOldSentencesRehearsed:rehearsed,
   tooLongToRehearse:discardedLong,
   originalBrainCorpusObservationsUnchanged:true,
   newlyLearnedOperators:novel.map(op=>op.key),
   fullHistoricalPrefixScanned:pages.nextCursor>=focusSequence-1,
   source:"original observed source evidence; zero withheld answers"
  });
  for(const op of novel)this.atlas.append("operator",{
   key:op.key,kind:op.kind,from:op.from,to:op.to,
   left:op.left,right:op.right,source:"historical-replay-of-real-training",
   support:op.sourceObservations,evidence:op.evidence||[],
   originalAtlasSequence:seq,beforeAndAfterActuallyObserved:true});
  this.livedGraphTransitions+=newPairs;
  if(novel.length)this._topologyCache=null;
  return {atlasSequence:seq,focusSequence,after,
   nextCursor:pages.nextCursor,hasMoreHistory:pages.nextCursor<focusSequence-1,
   historicalWorldsScanned:historicEvents,
   genuineOldSentencesRehearsed:rehearsed,
   newlyLearnedOperators:novel.length,keys:novel.map(op=>op.key),
   originalBrainCorpusObservationsBefore:before,
   originalBrainCorpusObservationsAfter:model.seen,
   originalBrainNotReplaced:true,referenceAnswerNeverProvided:true};
 }
 // Build a bounded hyperdimensional state graph from learned EDIT OPERATORS.
 // Every edge is generated by a learned before/action/after model.
 // The GOAL is a constraint visible in the request; the exact final reference
 // string does not enter planning. The graph need not be an n x n grid.
 world(start,required,{maxStates=this.maxStates,maxDepth=this.maxDepth}={}){
  const model=this.brain.observedTransformations;
  const seed=tokenizeObservation(start),normalized=renderObservation(seed);
  if(!seed.length)throw Error("Observed start text is required");
  // Graph topology does NOT depend on the requested target. Construct the
  // identical observed operator graph once, then label the learned goal
  // constraints at query time. This avoids regenerating thousands of long
  // text states before EVERY frozen answer, and never caches teacher answers.
  // Invalidate on any new corpus observation, original geometry update,
  // topology budget change or new start. Cache is an ephemeral bounded view,
  // not a second trained Brain and not serialized into a .v8 checkpoint.
  const geo=this.brain.trace.geo;
  const cacheKey=JSON.stringify([normalized,model.seen,model.operators.size,
    geo.n,maxStates,maxDepth]);
  let cached=this._topologyCache;
  const topologyCacheHit=cached?.cacheKey===cacheKey;
  if(!topologyCacheHit){
   const originCoords=geo.U.get("text-state:"+normalized)||null;
   const originSupport=model.structuralSupport(seed);
   const nodes=[{id:normalized,tokens:seed,depth:0,kind:3,
     support:originSupport,coordinates5D:originCoords,
     geometryEvidence:originCoords?"observed":"unavailable",
     isPreviouslyObserved:model.containsSentence(normalized)}];
   const ids=new Map([[normalized,0]]),edges=[[]];
   let pending=0,operatorEdges=0,blocked=0,deadEnds=0,depthPruned=0,budgetPruned=0;
   while(pending<nodes.length&&nodes.length<maxStates){
    const at=pending++,cur=nodes[at];
    if(cur.depth>=maxDepth){depthPruned++;continue;}
    if(cur.kind===1)continue;
    const choices=model.neighbors(cur.tokens);
    if(!choices.length)deadEnds++;
    // Strict bounded expansion; EVERY action was learned from observations.
    for(const choice of choices){
     const dest=renderObservation(choice.tokens);
     const support=model.structuralSupport(choice.tokens);
     const allowed=!support.verified||support.consistent;
     if(!allowed)blocked++;
     let next=ids.get(dest);
     if(next===undefined){
      if(nodes.length>=maxStates){budgetPruned++;break;}
      next=nodes.length;ids.set(dest,next);
      const stored=geo.U.get("text-state:"+dest);
      const axis=this.brain.hypermazeLearnedAxes?.get(choice.action.key);
      const inferred=!stored&&axis?.count&&Array.isArray(cur.coordinates5D)&&
       cur.coordinates5D.length===5?
       cur.coordinates5D.map((v,d)=>{
        const updated=v+axis.sum[d]/axis.count;
        return updated-Math.floor(updated);
       }):null;
      nodes.push({id:dest,tokens:choice.tokens,depth:cur.depth+1,
       kind:allowed?0:1,support,
       coordinates5D:stored||inferred,
       geometryEvidence:stored?"observed":inferred?"learned-action-axis":"unavailable",
       isPreviouslyObserved:model.containsSentence(dest)});
      edges.push([]);
     }
     edges[at].push({to:next,action:choice.action,
      observedSupport:choice.action.observedSupport});
     operatorEdges++;
    }
   }
   cached={cacheKey,raw:{nodes,edges,operatorEdges,blocked,deadEnds,
     depthPruned,budgetPruned,expanded:pending}};
   this._topologyCache=cached;
  }
  const raw=cached.raw;
  const nodes=raw.nodes.map((node,index)=>{
   const reached=index!==0&&node.kind!==1&&
     node.support?.consistent&&target(node.tokens,required);
   return {...node,kind:reached?2:node.kind,goal:!!reached};
  });
  const frontier=nodes.filter(n=>n.kind!==1&&n.depth>=maxDepth);
  // A graph with a reached limit is NOT the full known maze. Previous
  // complete=true from nodes.length<=maxStates was a tautology.
  const capacityReached=raw.budgetPruned>0||raw.expanded<nodes.length;
  const complete=!capacityReached&&raw.depthPruned===0;
  return {nodes,edges:raw.edges,operatorEdges:raw.operatorEdges,
   blocked:raw.blocked,deadEnds:raw.deadEnds,
   depthPruned:raw.depthPruned,budgetPruned:raw.budgetPruned,
   expanded:raw.expanded,frontier,
   goalNodes:nodes.filter(x=>x.goal).length,
   topologyCacheHit:!!topologyCacheHit,complete,capacityReached,
   stateLimit:maxStates,depthLimit:maxDepth,
   visited:persistentWorldBound(nodes.length,maxStates),
   source:normalized};
 }
 // This is the SAME native Discoverer value-propagation method, lifted to an
 // arbitrary learned adjacency rather than inventing a second beam predictor.
 plan({start,required,maxStates=this.maxStates,maxDepth=this.maxDepth,
  geometryWeight=this.geometryWeight,sharedPolicyWeight=this.sharedPolicyWeight,
  includeTopology=false,recordAtlas=false}={}){
  const goal=validatedRequired(required),origin=line(start);
  if(!origin)throw Error("Start text must be observed before planning");
  if(!Number.isSafeInteger(maxStates)||maxStates<4||maxStates>50000||
    !Number.isSafeInteger(maxDepth)||maxDepth<1||maxDepth>20)
   throw Error("Native hypermaze limits must be finite: 4..50000 states, depth 1..20");
  const w=this.world(origin,goal,{maxStates,maxDepth}),b=this.brain;
  const kinds=w.nodes.map(n=>n.kind);
  const coordinates=w.nodes.map(n=>n.coordinates5D||null);
  const scorer=sharedPolicyWeight?((i,j,edge)=>{
   const dst=w.nodes[j].tokens,prev=w.nodes[i].tokens;
   const gained=goal.filter(t=>dst.includes(t)).length-
     goal.filter(t=>prev.includes(t)).length;
   const c=b.constructedPaths;
   const f=c.transferableFeatures({
    progress:Math.max(-1,Math.min(1,gained)),
    support:Math.min(1,Math.log1p(edge.observedSupport||0)/8),
    uncertainty:0,novelty:w.nodes[j].isPreviouslyObserved?0:1,
    terminal:Number(w.nodes[j].goal)});
   return Math.tanh(c.transferableScore(f))*sharedPolicyWeight;
  }):null;
  const shape=b.disc.shapeGraph(kinds,w.edges,0,{
   geometry:coordinates,geometryWeight,edgePreference:scorer,details:true});
  const route=shape?.path||[];
  const result={
   kind:"original-Discoverer-shapeGraph-over-actual-learned-text-transforms",
   found:!!shape?.targetReached,
   start:w.source,required:goal,
   plannedBeforeFirstAction:true,
   referenceAnswerProvided:false,referenceUsedForGoal:false,
   goalVisibleAsExplicitConstraints:true,
   geometryDimensions:b.trace.geo.D,
   geometricPreferenceUsed:!!shape?.geometricPreferenceUsed,
   sharedOriginalMazePolicyUsed:!!sharedPolicyWeight,
   originalAttraction:b.disc.attract(2),
   originalFloorConductance:b.disc.conduct(0),
   graph:{observedOperatorEdges:w.operatorEdges,states:w.nodes.length,
    completeKnownOperatorClosure:w.complete,
    corpusComplete:false,capacityReached:w.capacityReached,
    stateLimit:maxStates,depthLimit:maxDepth,expandedStates:w.expanded,
    deadEnds:w.deadEnds,depthPruned:w.depthPruned,
    budgetPruned:w.budgetPruned,
    unexpandedFrontier:w.frontier.length+
      (w.capacityReached?Math.max(0,w.nodes.length-w.expanded):0),
    topologyCacheHit:w.topologyCacheHit,
    blocked:w.blocked,goalNodes:w.goalNodes,
    geometry5DObservedNodes:w.nodes.filter(n=>n.geometryEvidence==="observed").length,
    geometry5DInferredNodes:w.nodes.filter(n=>n.geometryEvidence==="learned-action-axis").length,
    shared5DActionAxes:b.hypermazeLearnedAxes?.size||0},
   initialShape:[w.source,...route.map(r=>w.nodes[r.to].id)],
   actions:route.map(e=>({...e.action,from:w.nodes[e.from].id,
    predictedNext:w.nodes[e.to].id,observedSupport:e.observedSupport})),
   predicted:route.length?w.nodes[route.at(-1).to].id:null,
   values:shape?.values||null,
   resultIsInternalTextWorld:true,
   independentSemanticValidation:false,
   noNextByteSubstitution:true,
   modelObservationCount:b.observedTransformations.seen
  };
  // Globally learned transformations exist independently of the current
  // excerpt. The atlas distinguishes a missing pathway from a TRUNCATED
  // search, and never labels an unknown answer as semantically impossible.
  const model=b.observedTransformations;
  const known=new Set(tokenizeObservation(w.source));
  for(const op of model.operators.values())
   for(const x of [op.from,op.to,op.left,op.right])
    if(x!==null&&x!==undefined)known.add(x);
  const unknown=goal.filter(x=>!known.has(x));
  if(unknown.length)for(const record of model.records.values()){
   for(const x of unknown)if(record.tokens.includes(x))known.add(x);
   if(unknown.every(x=>known.has(x)))break;
  }
  const missingTargetTokens=goal.filter(x=>!known.has(x));
  const kindsFound=new Set([...model.operators.values()].map(op=>op.kind));
  const causes=[];
  if(missingTargetTokens.length)causes.push("missing-observed-goal-concepts");
  if(!model.operators.size)causes.push("no-learned-action-operators");
  if(w.capacityReached)causes.push("state-budget-exhausted");
  if(w.depthPruned)causes.push("depth-limit-reached");
  if(w.blocked)causes.push("structural-support-restrictions");
  if(!result.found&&!causes.length)causes.push("known-transformations-do-not-connect-goal");
  const exploredKeys=new Set(w.edges.flatMap(list=>
    list.map(edge=>edge.action?.key).filter(Boolean)));
  const relevant=[...model.operators.values()]
    .filter(op=>goal.includes(op.to)||goal.includes(op.from));
  const unusedRelevant=relevant.filter(op=>!exploredKeys.has(op.key));
  result.diagnostic={
   // These are actual architectural restrictions, NOT missing words guessed
   // by a decorative visualizer.
   designRestrictions:{
    modelMaxTokens:model.maxTokens,longTextObservationsRejected:model.rejectedLong,
    recentCorpusWindow:model.maxObserved,olderRawSentencesEvicted:model.evicted,
    learnedOperatorCapacity:model.maxOperators,operatorsRejectedAtCapacity:model.droppedOperators,
    candidateComparisonLimit:model.maxCandidatePairs,
    observedSamplesPerOperatorStored:4,
    searchStateBudget:maxStates,searchDepthBudget:maxDepth,
    priorCorpusOutsideAtlasNotReplayed:this.atlas.summary().historicCorpusUnavailableBeforeAtlas
   },
   relevantLearnedOperators:relevant.length,
   relevantOperatorsUnavailableFromExploredStates:unusedRelevant.length,
   sampleUnavailableOperators:unusedRelevant.slice(0,120).map(op=>({
    key:op.key,kind:op.kind,from:op.from,to:op.to,
    left:op.left,right:op.right,support:op.sourceObservations
   })),
   allLearnedOperatorsPageableInAtlas:true,
   outcome:result.found?"path-found":w.complete?"no-path-in-finite-known-closure":"not-found-search-incomplete",
   reason:result.found?"path-found":causes[0]||"known-transformations-do-not-connect-goal",
   causes:result.found?[]:causes,missingTargetTokens,
   knownOperatorCount:model.operators.size,
   missingActionKinds:["insert","delete","replace"].filter(x=>!kindsFound.has(x)),
   availableActionKinds:[...kindsFound],
   attemptedGlobalActions:route.length,
   unexpandedFrontier:result.graph.unexpandedFrontier,
   unresolvedEdges:w.blocked,deadEnds:w.deadEnds,
   stateBudgetExceeded:w.capacityReached,depthBudgetExceeded:w.depthPruned>0,
   completeKnownOperatorClosure:w.complete,
   notProofOfSemanticImpossibility:true
  };
  if(includeTopology||recordAtlas){
   // ALL true explored text states, learned action edges, native 5D phase
   // positions and propagated potentials. This is the DATA behind the
   // visualizer, never a decorative static polytope or synthetic demo.
   // Public only on explicitly opted-in original native research endpoint.
   result.topology={
    complete:w.complete,originalNativeV17Graph:true,
    nodes:w.nodes.map((n,i)=>({id:i,kind:n.kind,
     text:n.id,observed:n.isPreviouslyObserved===true,
     position5D:n.coordinates5D||null,
     geometryEvidence:n.geometryEvidence||null,
     depth:n.depth,goal:n.goal===true,
     potential:shape?.values?.[i]??null})),
    edges:w.edges.flatMap((list,i)=>list.map(e=>({
     from:i,to:e.to,kind:e.action?.kind||"unknown",
     fromToken:e.action?.from??null,toToken:e.action?.to??null,
     observedSupport:e.observedSupport,operatorKey:e.action?.key??null,
     actionIndex:e.action?.index??null}))),
    initialShapeIds:[0,...route.map(r=>r.to)],
    unresolvedFrontier:w.nodes.map((n,i)=>({i,n}))
      .filter(({i,n})=>(n.depth>=maxDepth&&n.kind!==1)||
        (w.capacityReached&&i>=w.expanded))
      .map(({i,n})=>({id:i,text:n.id,depth:n.depth,
        reason:i>=w.expanded?"capacity-limit":"depth-limit"})),
    sourceId:0,source:"exact observed/edit-expanded native hypermaze",
    notIndependentSemanticWorld:true,
    coordinatesAreOriginalLearned5DTorus:true
   };
  }
  if(recordAtlas){
   result.atlasSequence=this.atlas.append("search",{
    world:"text",start:result.start,required:goal,found:result.found,
    initialShape:result.initialShape,actions:result.actions,
    diagnostic:result.diagnostic,graph:result.graph,
    fullExploredTopology:result.topology||null,
    firstPredictionBeforeAction:true,
    semanticAnswerIndependentlyVerified:false,
    searchWasTruncated:!w.complete
   });
   if(!includeTopology)delete result.topology;
  }
  return result;
 }
 // BODY execution starts only AFTER the global shape has been frozen.
 // Local noise decisions use the SAME original V17 NoiseAgency; in frozen
 // heldout mode it is an independent exact state copy and cannot train.
 execute(plan,{maxSteps=40,trainNoise=false,enableNoise=true}={}){
  if(!plan?.found||!plan.plannedBeforeFirstAction)
   return {attempted:false,reason:"No pre-action native shape"};
  const b=this.brain,model=b.observedTransformations;
  const agency=enableNoise?trainNoise?b.enableEndogenousNoise():
   b.noiseAgent?Object.assign(Object.create(NoiseAgency.prototype),
    structuredClone(b.noiseAgent)):new NoiseAgency(b.seed):null;
  const goal=validatedRequired(plan.required);
  let text=plan.start,route=plan,repairs=0,departures=0;
  const frames=[{stage:"before-first-action",actual:text,
    globalShape:plan.initialShape.slice(),
    targetConstraints:goal.slice(),worldActionsExecuted:0}];
  for(let k=0;k<Math.min(maxSteps,120);k++){
   const tokens=tokenizeObservation(text);
   if(target(tokens,goal)&&model.structuralSupport(tokens).consistent)break;
   if(!route.found||route.start!==text){
    route=this.plan({start:text,required:goal});
    repairs++;
   }
   if(!route.found||!route.actions.length)break;
   const expected=route.actions[0],candidates=model.neighbors(tokens);
   if(!candidates.length)break;
   const index=candidates.findIndex(x=>renderObservation(x.tokens)===expected.predictedNext);
   let chosen=index>=0?index:0;
   const portal=agency?.decide({domain:"text",known:true,planned:index>=0})||null;
   if(portal?.site==="perception"&&candidates.length>1){
    // No hidden reference is used: only an internal copy of the local
    // candidate ordering is disturbed.
    const perceived=agency.perceive(candidates.map((_,i)=>i),portal);
    chosen=perceived[0];
   }
   if(portal&&["action","imagination"].includes(portal.site))
    chosen=agency.output(chosen,candidates.length,portal);
   const act=candidates[chosen],after=renderObservation(act.tokens);
   const matched=after===expected.predictedNext;
   const reached=target(act.tokens,goal)&&model.structuralSupport(act.tokens).consistent;
   if(!matched){departures++;repairs++;}
   if(portal&&trainNoise){
    agency.learn(portal,{before:Array.from(Buffer.from(text)),
     after:Array.from(Buffer.from(after)),solved:reached});
   }
   if(trainNoise){
    const policy=b.constructedPaths;
    const f=policy.transferableFeatures({progress:goal.filter(t=>act.tokens.includes(t)).length-
      goal.filter(t=>tokens.includes(t)).length,
      support:Math.min(1,Math.log1p(act.action.observedSupport||0)/8),
      uncertainty:0,novelty:model.containsSentence(after)?0:1,
      terminal:Number(reached)});
    policy.learnTransferable(f,reached||matched,.007);
    b.observeShared({domain:"text",before:text,after,action:act.action,
     context:"observed-token-state-world"});
   }
   frames.push({stage:"after-action",index:k+1,before:text,actual:after,
    expected:expected.predictedNext,action:act.action,noise:portal,
    matchedInitialPlan:matched,remainingGoal:goal.filter(x=>!act.tokens.includes(x)),
    goalReached:reached,causalEffectFrom:"original learned operator",
    externalSemanticOracleUsed:false});
   text=after;
   if(reached)break;
   if(!matched){
    // Only a REAL departure from the frozen global solution shape warrants
    // a new search. Preserve the original plan when actual effects agree.
    // Previous code rebuilt the ENTIRE long-text hypermaze after EVERY
    // successful body action, which stalled large corpus evaluations.
    route=this.plan({start:text,required:goal});
   }else{
    route={...route,start:text,actions:route.actions.slice(1),
      initialShape:route.initialShape?.slice(1)||[text]};
   }
  }
  const endTokens=tokenizeObservation(text);
  const finalResult={attempted:true,firstShape:plan.initialShape.slice(),
   solvedInternalGoal:target(endTokens,goal)&&model.structuralSupport(endTokens).consistent,
   predictedBeforeMovement:plan.predicted,executedFinal:text,
   matchedInitialShape:text===plan.predicted,
   actions:frames.length-1,divergences:departures,replans:repairs,
   frames,frozen:!trainNoise,noiseLearned:!!trainNoise,
   actualExternalSemanticGoalValidated:false,externalSemanticGoalValidated:false,
   originalBrainUnmodifiedInFrozenTest:!trainNoise,
   note:"The SAME original maze-shape propagation plans learned text edits, "+
    "but the executor's observations are currently INTERNAL learned text-world "+
    "effects, not independent semantic-world feedback."};
  if(plan.atlasSequence){
   finalResult.atlasExecutionSequence=this.atlas.append("execution",{
    world:"text",searchSequence:plan.atlasSequence,
    originallyPredicted:plan.predicted,finalText:text,
    steps:finalResult.actions,solvedInternalGoal:finalResult.solvedInternalGoal,
    divergences:departures,replans:repairs,frames,
    semanticAnswerIndependentlyVerified:false
   });
  }
  return finalResult;
 }
 atlasPage(options){return this.atlas.page(options);}
 atlasSummary(){return this.atlas.summary();}
 atlasOperators(options){return this.atlas.operatorCatalog(
  this.brain.observedTransformations.operators,options);}
 atlasFlush(){return this.atlas.flush();}
}
function persistentWorldBound(n,max){return {bounded:n<=max,limit:max};}
