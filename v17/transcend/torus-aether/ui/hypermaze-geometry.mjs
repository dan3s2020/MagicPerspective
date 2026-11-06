/**
 * Pure diagnostic 4-dimensional embeddings of REAL graph observations.
 * Not a learned 4D geometry and not a claim about physical quantum states.
 * Coordinates are interpretable independent features, not random positions.
 */
const lim=x=>Math.max(-1,Math.min(1,Number.isFinite(x)?x:0));
const unit=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export function observedLayout(graph){
 if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))
  throw Error("Real observed graph nodes/edges required");
 const n=graph.nodes.length;
 if(!n)return {coords:[],depth:[],outgoing:[],maxDepth:0,ends:0,dimensions:["depth","branch","V","S"]};
 const outgoing=Array.from({length:n},()=>[]);
 for(const e of graph.edges){
  if(!Number.isInteger(e.from)||!Number.isInteger(e.to)||e.from<0||e.from>=n||e.to<0||e.to>=n)
   throw Error("Corrupt observed topology");
  outgoing[e.from].push(e.to);
 }
 // Only real graph connections determine depth and branch position.
 // A topological traversal also works for shared-prefix DAGs.
 const depth=Array(n).fill(-1),q=[0];depth[0]=0;
 for(let i=0;i<q.length;i++){
  const from=q[i];
  for(const to of outgoing[from])if(depth[to]<0){
   depth[to]=depth[from]+1;q.push(to);
  }
 }
 const maxDepth=Math.max(1,...depth);
 // Forward prefix DAGs are processed in reverse creation order.
 // This avoids JavaScript call-stack overflow for 12,000+ character paths.
 // For cyclic/unordered inputs use a deterministic per-depth lane fallback;
 // do NOT invent graph edges or imply an unlearned world embedding.
 const y=Array(n).fill(null);
 let nextLeaf=0;
 const forward=outgoing.every((row,i)=>row.every(to=>to>i));
 if(forward){
  for(let i=n-1;i>=0;i--){
   const row=outgoing[i];
   if(!row.length)y[i]=nextLeaf++;
   else y[i]=row.reduce((sum,to)=>sum+y[to],0)/row.length;
  }
 }else{
  const byDepth=new Map();
  for(let i=0;i<n;i++){
   const d=depth[i];
   const group=byDepth.get(d)||[];
   group.push(i);byDepth.set(d,group);
  }
  const bands=[...byDepth.keys()].sort((a,b)=>a-b);
  const maxWidth=Math.max(1,...[...byDepth.values()].map(a=>a.length));
  for(const d of bands){
   const group=byDepth.get(d);
   for(let i=0;i<group.length;i++)y[group[i]]=(i+.5)/maxWidth;
  }
  nextLeaf=2;
 }
 const denom=Math.max(1,nextLeaf-1);
 const coords=graph.nodes.map((node,i)=>[
  lim(2*Math.max(0,depth[i])/maxDepth-1),
  lim(2*y[i]/denom-1),
  lim(Number.isFinite(node.potential)?2*unit(node.potential)-1:0),
  lim(Number.isFinite(node.successorOccupancy)?2*unit(node.successorOccupancy)-1:0)
 ]);
 return {coords,depth,outgoing,maxDepth,ends:nextLeaf,
  dimensions:["X=graph path depth","Y=observed alternative branch lane",
   "Z=original V17 attraction V","W=learned/empirical successor value S"]};
}
export function frozenTextLayout(exercise){
 if(!exercise||!Array.isArray(exercise.rows))
  throw Error("Frozen native text test rows required");
 const a0=Math.max(0,Number(exercise.a0)||0);
 const rows=exercise.rows.slice(a0),initial=[...String(exercise.shape||"")];
 const n=Math.max(1,rows.length,initial.length);
 // These are three observed sequences of predictions/correct symbols, not
 // traversable learned edges: never call them a language-world topology.
 const tracks=[
  {key:"preanswer",label:"Initial answer imagined before reading",chars:initial,lane:-.77},
  {key:"teacherForced",label:"Predicted at each true-prefix read",chars:rows.map(r=>String.fromCharCode(r[1])),lane:0},
  {key:"reference",label:"Hidden held-out reference (scoring only)",chars:rows.map(r=>String.fromCharCode(r[0])),lane:.77}
 ];
 return {tracks:tracks.map(t=>({
  ...t,coords:t.chars.map((ch,i)=>[
   2*i/n-1,t.lane,
   2*Math.max(0,Math.min(1,(ch.codePointAt(0)||32)/127))-1,
   t.key==="reference"?0:
     t.key==="preanswer"?(rows[i]&&ch===String.fromCharCode(rows[i][0])?1:-1):
     (rows[i]&&ch===String.fromCharCode(rows[i][0])?1:-1)
  ])
 })),rows,initial,answerOffset:a0,
  dimensions:["X=answer position","Y=prediction/reference track",
   "Z=observed/predicted character code","W=correct/incorrect relative to held-out reference"],
  provenance:"FROZEN_V17_TEACHER_FORCED_TEXT_EVALUATION_NOT_A_NAVIGABLE_LEARNED_MAZE"};
}
function rotate(a,b,angle,v){
 const c=Math.cos(angle),s=Math.sin(angle),x=v[a],y=v[b];
 v[a]=c*x-s*y;v[b]=s*x+c*y;
}
export function project4D(vector,{yaw=.32,pitch=.16,xw=.6,yw=-.25,zw=.14,zoom=1,panX=0,panY=0}={},width=1000,height=650){
 if(!Array.isArray(vector)||vector.length!==4||vector.some(x=>!Number.isFinite(x)))
  throw Error("Invalid real four-feature vector");
 const v=vector.slice();
 rotate(0,3,xw,v);rotate(1,3,yw,v);rotate(2,3,zw,v);
 rotate(0,2,yaw,v);rotate(1,2,pitch,v);
 const perspective=2.5/(2.5+v[2]*.48+v[3]*.32);
 const scale=Math.min(width*.44,height*.60)*Math.max(.15,Math.min(6,zoom));
 return {x:width/2+panX+v[0]*scale*perspective,
   y:height/2+panY-v[1]*scale*perspective,
   depth:v[2],slice:v[3],projection:v};
}
export function routeDivergence(global,actual){
 const a=Array.isArray(global)?global:[],b=Array.isArray(actual)?actual:[];
 let at=-1;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i]){at=i;break;}
 if(at<0&&a.length!==b.length)at=Math.min(a.length,b.length);
 return {diverged:at>=0,firstDifferentNodeIndex:at,
   predictedNodes:a.length,executedNodes:b.length};
}

/**
 * Use actual online-trained ORIGINAL V17 Geometry.U five-torus embeddings,
 * not a guessed numeric 5D coordinate system.
 *
 * The 5 vector coordinates come straight from /graph -> gs.U. The browser
 * projects four of the five; the fifth is a genuine learned slice variable.
 * Repeated characters occupy the same torus location. An observed prefix
 * world is a DIFFERENT state representation and must not be conflated with
 * a native byte/symbol embedding.
 */
export function native5DSymbolLayout(source,Uentries){
 if(!Array.isArray(Uentries))throw Error("Native learned 5D U geometry is unavailable");
 const U=new Map();
 for(const pair of Uentries){
  if(!Array.isArray(pair)||pair.length!==2)continue;
  const [code,vec]=pair;
  if(!Number.isInteger(Number(code))||Number(code)<0||
     !Array.isArray(vec)||vec.length<5||vec.slice(0,5).some(x=>!Number.isFinite(x)))continue;
  U.set(Number(code),vec.slice(0,5).map(x=>2*(x-Math.floor(x)) -1));
 }
 const locate=ch=>{
  if(typeof ch!=="string"||!ch.length)return null;
  return U.get(ch.codePointAt(0))?.slice()||null;
 };
 const dimensions=["X=Geometry.U[0], learned five-torus",
  "Y=Geometry.U[1], learned five-torus",
  "Z=Geometry.U[2], learned five-torus",
  "W=Geometry.U[3], learned five-torus",
  "Slice=Geometry.U[4], learned five-torus"];
 if(source?.nodes&&Array.isArray(source.nodes)){
  const coords=source.nodes.map(n=>locate(n.lastCharacter));
  const known=coords.filter(Boolean).length;
  return {coords,known,missing:coords.length-known,possible:coords.length,
   dimensions,representation:"ORIGINAL_V17_LEARNED_5_TORUS_SYMBOL_COORDINATES"};
 }
 if(source?.tracks&&Array.isArray(source.tracks)){
  const tracks=source.tracks.map(t=>({...t,coords:t.chars.map(locate)}));
  const known=tracks.reduce((a,t)=>a+t.coords.filter(Boolean).length,0);
  const possible=tracks.reduce((a,t)=>a+t.coords.length,0);
  return {tracks,known,missing:possible-known,possible,dimensions,
   representation:"ORIGINAL_V17_LEARNED_5_TORUS_SYMBOL_COORDINATES"};
 }
 throw Error("Native torus overlay needs observed graph or real frozen text tracks");
}
