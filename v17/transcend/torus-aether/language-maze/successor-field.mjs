/**
 * Auxiliary future-goal occupancy on an OBSERVED graph. This module does not
 * alter V17 Discoverer.shape(), its attraction law, or any saved V17 weights.
 *
 * F(s) = gamma * sum_{s'} p(s'|s) F(s'), F(goal) = observed terminal evidence.
 * Edge counts come only from previously completed training observations.
 * This is a classical successor-style fixed-policy return, not quantum phase
 * interference, a next-token predictor, or a proof of natural-language truth.
 */
const finite=(x)=>typeof x==="number"&&Number.isFinite(x);
const clamp01=(x)=>Math.max(0,Math.min(1,x));
export function successorGoalField({
  kinds,neighbors,start,conduct,attract,goalRewards=null,gamma=.9,maxIterations=1000
}){
  if(!Array.isArray(kinds)||!Array.isArray(neighbors)||!kinds.length||
     kinds.length!==neighbors.length||!Number.isInteger(start)||
     start<0||start>=kinds.length||typeof conduct!=="function"||
     typeof attract!=="function"||!finite(gamma)||gamma<=0||gamma>=1||
     !Number.isInteger(maxIterations)||maxIterations<1||maxIterations>100000)
    throw Error("Invalid successor-world configuration");
  const N=kinds.length,terminal=new Array(N).fill(false),values=new Float64Array(N);
  if(goalRewards!==null&&(!Array.isArray(goalRewards)||goalRewards.length!==N||
      goalRewards.some(v=>!finite(v)||v<0||v>1)))throw Error("Invalid observed goal rewards");
  for(let i=0;i<N;i++){
    if(!Array.isArray(neighbors[i]))throw Error("Invalid observed neighbors");
    for(const e of neighbors[i]){
      if(!Number.isInteger(e?.to)||e.to<0||e.to>=N||
         (e.support!==undefined&&(!finite(e.support)||e.support<=0)))
        throw Error("Invalid observed successor edge");
    }
    terminal[i]=i!==start&&attract(kinds[i])>.2;
    if(terminal[i])values[i]=goalRewards===null?1:goalRewards[i];
  }
  // A reverse-order sweep is exact for prefix DAGs. Cyclic graphs use bounded
  // fixed-point relaxation; gamma < 1 ensures convergence in the limit.
  const dag=neighbors.every((row,i)=>row.every(e=>e.to>i));
  const update=i=>{
    if(terminal[i])return 0;
    const c=i===start?1:conduct(kinds[i]);
    if(!finite(c)||c<.5){const diff=values[i];values[i]=0;return diff;}
    const edges=neighbors[i];
    if(!edges.length){const diff=values[i];values[i]=0;return diff;}
    let total=0,weighted=0;
    for(const edge of edges){const w=edge.support??1;total+=w;weighted+=w*values[edge.to];}
    const next=gamma*weighted/total,delta=Math.abs(next-values[i]);
    values[i]=clamp01(next);
    return delta;
  };
  let iterations=0,converged=false;
  if(dag){for(let i=N-1;i>=0;i--)update(i);iterations=1;converged=true;}
  else for(let it=0;it<maxIterations;it++){
    let maxDelta=0;
    for(let i=N-1;i>=0;i--)maxDelta=Math.max(maxDelta,update(i));
    iterations++;
    if(maxDelta<1e-12){converged=true;break;}
  }
  return {values:Array.from(values),gamma,iterations,converged,
    topology:dag?"observed_directed_DAG":"observed_graph_cycles",
    interpretation:"discounted training-evidence-weighted future terminal occupancy; not a correctness probability"};
}

/** Original uphill preference first. Use future occupancy ONLY for EXACT
 * attraction ties. Returns -1 if no strictly uphill, unvisited neighbor.
 * The optional channel cannot create a route absent from the original field.
 */
export function selectUphillEdge(edges,from,field,seen,successorValues=null){
  if(!Array.isArray(edges)||!Array.isArray(field)||!seen?.has)
    throw Error("Invalid uphill search input");
  let best=-1,bv=field[from],ties=0,used=false;
  for(let i=0;i<edges.length;i++){
    const to=edges[i].to,v=field[to];
    if(seen.has(to)||!(v>field[from]))continue;
    if(v>bv){best=i;bv=v;ties=1;used=false;}
    else if(best>=0&&v===bv){
      ties++;
      if(successorValues&&successorValues[to]>successorValues[edges[best].to]+1e-12){
        best=i;used=true;
      }
    }
  }
  return {index:best,ties,usedSuccessor:used&&ties>1};
}
