// Read-only instrumentation of the ACTUAL cognitive state/action graph produced
// by LearnedCognitiveMap.formSolution -> original Discoverer.shape.
// No fabricated paths, synthetic vertices, target-answer injection or new planner.
export function cognitiveRouteSnapshot(result,{maxStates=384,maxEdges=1600}={}){
  if(!result||typeof result!=='object')throw Error('Missing original cognitive result');
  const w=result.world||{},states=Array.isArray(w.states)?w.states:[],
    neighbors=Array.isArray(w.neighbors)?w.neighbors:[],
    targets=new Set(w.targets||[]), path=Array.isArray(result.path)?result.path:[],
    field=Array.isArray(result.field?.values)?result.field.values:[];
  const limit=Math.max(1,Math.min(768,Math.trunc(maxStates)||384));
  const edgeLimit=Math.max(1,Math.min(4096,Math.trunc(maxEdges)||1600));
  const important=[w.start??0,...path.flatMap(e=>[e.from,e.to]),...targets],picked=new Set();
  for(const id of important)if(Number.isInteger(id)&&id>=0&&id<states.length&&picked.size<limit)picked.add(id);
  for(let id=0;id<states.length&&picked.size<limit;id++)picked.add(id);
  const ordered=[...picked];
  const projected=ordered.map(id=>({
    id, text: Array.isArray(states[id])?states[id].join(' '):String(states[id]),
    value:Number.isFinite(field[id])?field[id]:0,
    goal:targets.has(id),start:id===(w.start??0),
    planned:path.some(e=>e.to===id||e.from===id)
  }));
  let totalEdges=0;
  const edges=[];
  for(let from=0;from<neighbors.length;from++){
    const row=neighbors[from]||[];totalEdges+=row.length;
    if(!picked.has(from))continue;
    for(const e of row){
      if(!picked.has(e.to)||edges.length>=edgeLimit)continue;
      edges.push({from,to:e.to,action:e.action,verified:!!e.verified,
        support:Math.max(0,Number(e.support)||0)});
    }
  }
  return {
    found:!!result.found,reason:result.reason||result.field?.reason||null,
    rules:result.learnedRules,observedSentences:w.fromObservedExamples,
    generatedStates:states.length,candidateGoals:targets.size,
    novelGoal:!!result.novelGoal,
    start:Array.isArray(states[0])?states[0].join(' '):null,
    plannedPath:path.map(e=>({from:e.from,to:e.to,action:e.action,
      after:Array.isArray(states[e.to])?states[e.to].join(' '):null,
      verified:!!e.verified})),
    shapeField:field.slice(0,Math.max(128,limit)),
    law:result.planningLaw||null,truncated:!!w.truncated,
    noiseTemperature:result.noise??result.field?.temperature??0,
    originalMethod:result.directOriginalMethod||result.field?.originalMethod||null,
    observedTopology:{
      nodes:projected,edges,completeNodes:states.length,completeEdges:totalEdges,
      displayedNodes:projected.length,displayedEdges:edges.length,
      graphTruncated:states.length>projected.length||totalEdges>edges.length,
      path: [w.start??0,...path.map(h=>h.to)],
      source:w.source||'native observed transitions',
      projection:'2D diagnostic projection of actual N-D state-action topology; not a measured latent 4D coordinate system',
      goalBeforeFirstAction:!!result.plannedBeforeAction
    }
  };
}
