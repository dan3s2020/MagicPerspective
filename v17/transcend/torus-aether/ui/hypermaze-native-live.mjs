/**
 * Transform a real V17 GraphTrace.snapshot() for faithful live visualization.
 * Nodes [id,type,label,activation,born,error], edges
 * [from,to,kind,weight,label], U [[symbol,[five torus coordinates]]].
 * A/C node positions use incident-neighbor barycenters, explicitly marked
 * VISUAL PROJECTION, not pretending their coordinates were learned in U.
 */
export function livingV17Trace(snapshot){
 if(!snapshot||!Array.isArray(snapshot.nodes)||!Array.isArray(snapshot.edges)||
    !Array.isArray(snapshot.U))throw Error("Original V17 trace snapshot missing");
 const U=new Map(snapshot.U.map(([k,v])=>[Number(k),v]));
 const torus=u=>u.map(x=>2*(x-Math.floor(x))-1);
 const positions=new Map(),nativeSymbols=new Set();
 const nodes=snapshot.nodes.map(n=>({
   id:n[0],type:n[1],label:n[2],activation:n[3],born:n[4],error:n[5]
 }));
 for(const n of nodes){
  if(n.type!=="sym"||!n.id?.startsWith("s:"))continue;
  const source=U.get(Number(n.id.slice(2)));
  if(Array.isArray(source)&&source.length>=5&&source.slice(0,5).every(Number.isFinite)){
   positions.set(n.id,torus(source.slice(0,5)));nativeSymbols.add(n.id);
  }
 }
 const edges=snapshot.edges.map(e=>({
   from:e[0],to:e[1],kind:e[2],weight:e[3],label:e[4]
 }));
 // Unembedded organism node locations are inferred only from ACTUAL links,
 // not invented solution states. Initialize from linked native symbols and
 // make two relaxation passes for A/C chains.
 for(let p=0;p<2;p++)for(const n of nodes){
  if(positions.has(n.id))continue;
  const touched=edges.filter(e=>e.from===n.id||e.to===n.id)
    .map(e=>positions.get(e.from===n.id?e.to:e.from)).filter(Boolean);
  if(!touched.length)continue;
  positions.set(n.id,Array.from({length:5},(_,d)=>
    touched.reduce((a,v)=>a+v[d],0)/touched.length));
 }
 const positioned=nodes.map(n=>({
   ...n,coord:positions.get(n.id)||null,native:nativeSymbols.has(n.id)
 }));
 const byID=new Map(positioned.map((n,i)=>[n.id,i]));
 const links=edges.map(e=>({...e,fromIndex:byID.get(e.from),toIndex:byID.get(e.to)}))
  .filter(e=>e.fromIndex!==undefined&&e.toIndex!==undefined);
 const stream=(snapshot.strip||[]).map(item=>({
   char:String.fromCharCode(item[0]),correct:!!item[1],
   helpful:!!item[2],misleading:!!item[3]
 }));
 return {nodes:positioned,links,stream,
  chars:snapshot.chars,accC:snapshot.accC,accF:snapshot.accF,
  countNative:nativeSymbols.size,countProjected:positions.size-nativeSymbols.size,
  flow:snapshot.flow||[],
  provenance:"REAL_V17_GRAPHTRACE_LIVE; A/C node barycenters are visual projections, not learned native coordinates"};
}
