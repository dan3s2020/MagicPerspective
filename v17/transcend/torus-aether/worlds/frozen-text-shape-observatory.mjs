// V22: read-only trace of the exact original V17 Discoverer.shape over the
// actually LEARNED text-state/action topology. No result is invented for UI.
// Do not copy the hidden heldout answer or a target string into the route.
export function frozenTextShapeTopology(plan,{maxNodes=192,maxEdges=700}={}){
 const world=plan?.world,field=plan?.field;
 if(!world?.states||!world?.neighbors)return null;
 const count=Math.min(world.states.length,maxNodes),inPath=new Set(field?.nodes||[]);
 const nodes=world.states.slice(0,count).map((tokens,i)=>({
  id:i,label:tokens.join(" ").slice(0,130),
  goal:world.targets.includes(i),
  field:Number(field?.values?.[i]||0),
  onInitialPath:inPath.has(i)
 }));
 const edges=[];
 for(let i=0;i<count&&edges.length<maxEdges;i++)
  for(const e of world.neighbors[i]||[]){
   if(e.to>=count)continue;
   edges.push({from:i,to:e.to,action:String(e.action).slice(0,128),
     support:e.support||0,verified:!!e.verified,
     onInitialPath:!!plan.path?.some(p=>p.from===i&&p.to===e.to&&p.action===e.action)});
   if(edges.length>=maxEdges)break;
  }
 return {originalMethod:plan.directOriginalMethod||field?.originalMethod||null,
  source:"ONLY OBSERVED SENTENCES / ACTION-CONTRAST HYPOTHESES, FROZEN BEFORE ACTION",
  projected2D:true,physicalDimensionsClaimed:false,
  nodes,edges,start:world.start,goals:world.targets.filter(i=>i<count),
  predictedRoute:(field?.nodes||[]).slice(0,Math.min(maxNodes,256)),
  sampledNodes:count,totalNodes:world.states.length,
  sampledEdges:edges.length,truncated:count<world.states.length||edges.length>=maxEdges,
  heldoutAnswerVisibleToPlanner:false,
  actionExecutionOccurred:false,
  note:"Line animation represents the predicted route, NOT evidence of an executed action or semantic correctness."};
}
