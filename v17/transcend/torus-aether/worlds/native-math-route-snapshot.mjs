// Pure read-only snapshot of the EXACT original Discoverer.shape route built
// on learned numerical action transitions. A UI projection, not a fabricated
// learned 4D embedding. No read of the heldout answer or future action outcomes.
export function nativeMathRouteSnapshot(result,{maxDisplayNodes=110,maxDisplayEdges=420}={}){
  if(!result||typeof result!=="object")throw Error("Native math field result required");
  const w=result.world||{},states=Array.isArray(w.states)?w.states:[],
    neighbors=Array.isArray(w.neighbors)?w.neighbors:[],
    path=Array.isArray(result.path)?result.path:[],
    targets=new Set(w.targets||[]),field=Array.isArray(result.field)?result.field:[];
  const nlimit=Math.max(1,Math.min(250,Math.trunc(maxDisplayNodes)||110)),
    elimit=Math.max(1,Math.min(1000,Math.trunc(maxDisplayEdges)||420));
  const requested=[w.start??0,...path.flatMap(x=>[x.from,x.to]),...targets];
  const chosen=new Set();
  for(const n of requested)if(Number.isInteger(n)&&n>=0&&n<states.length&&chosen.size<nlimit)chosen.add(n);
  for(let i=0;i<states.length&&chosen.size<nlimit;i++)chosen.add(i);
  const source=result.source;
  const snippet=t=>Array.isArray(t)&&source?
    t.slice(source.offset,source.offset+source.width).join(" "):"";
  const nodes=[...chosen].map(id=>({id,label:snippet(states[id]),
    field:Number.isFinite(field[id])?field[id]:0,
    start:id===(w.start??0),goal:targets.has(id),
    planned:path.some(e=>e.to===id||e.from===id)}));
  let totalEdges=0;
  const edges=[];
  for(let i=0;i<neighbors.length;i++)for(const e of neighbors[i]){
    totalEdges++;
    if(chosen.has(i)&&chosen.has(e.to)&&edges.length<elimit)
      edges.push({from:i,to:e.to,action:e.action,
        verified:!!e.verified,transformation:e.transformation||null});
  }
  return {found:!!result.found,reason:result.reason||null,
    frozen:true,plannedBeforeAction:!!result.plannedBeforeAction,
    originalMethod:result.method||null,planningLaw:result.planningLaw||null,
    heldoutReferenceAnswerProvided:!!result.referenceAnswerProvided,
    observedPairs:result.learnedObservedPairs??0,learnedOperators:result.learnedOperators??0,
    inputTokens:result.fullDocumentTokens??null,novelDocument:result.novelDocument??null,
    completeAnswer:result.fullCandidate??null,
    plannedSteps:path.length,
    plannedPath:path.map(e=>({from:e.from,to:e.to,action:e.action,
      after:snippet(states[e.to]),verified:!!e.verified})),
    currentDocument:result.initialDocument??null,
    axes:result.induced?.axes??[],dependent:result.induced?.dependent??null,
    independentNumericGoal:result.goals??[],
    stateFieldAtStart:field[0]??null,
    observedTopology:{nodes,edges,path:[w.start??0,...path.map(e=>e.to)],
      completeNodes:states.length,completeEdges:totalEdges,
      graphTruncated:nodes.length<states.length||edges.length<totalEdges,
      projected:"Observed numerical action-space topology projected to 2D for visual inspection; not literal learned latent dimensions",
      goalBeforeFirstAction:!!result.plannedBeforeAction}
  };
}
