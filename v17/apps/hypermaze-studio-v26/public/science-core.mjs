// Read-only measurements of the ORIGINAL V42/V17 /graph state.
// No hypothesized physical mechanism is inserted into the learner.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const numbers=x=>Array.isArray(x)?x.flat(Infinity).filter(finite):[];
export function nativeGraph(raw,cap=320){
  if(!raw||!Array.isArray(raw.nodes))return null;
  const rows=raw.nodes,chosen=rows.length<=cap?rows:rows.slice(-cap);
  const nodes=chosen.map((r,i)=>({id:String(r[0]),type:String(r[1]??''),label:String(r[2]??r[0]),activity:finite(Number(r[3]))?Number(r[3]):0,index:i}));
  const ids=new Map(nodes.map((n,i)=>[n.id,i]));
  // Native GraphTrace stores geometry keys as symbol bytes (65) while
  // visible graph node IDs are 's:65'. Preserve this real identity mapping.
  const U=new Map((Array.isArray(raw.U)?raw.U:[]).map(([id,v])=>[String(id),v]));
  const xyz=nodes.map(n=>{const c=numbers(U.get(n.id)??(n.id.startsWith('s:')?U.get(n.id.slice(2)):null));return c.length>=2?c:null});
  const edges=[],seen=new Set();
  for(const row of raw.edges||[]){if(!Array.isArray(row))continue;
    const a=ids.get(String(row[0])),b=ids.get(String(row[1]));if(a===undefined||b===undefined)continue;
    const key=a<=b?a+'|'+b:b+'|'+a;
    if(seen.has(key))continue;seen.add(key);
    edges.push({a,b,kind:String(row[2]??''),weight:finite(Number(row[3]))?Number(row[3]):0});
  }
  const flow=new Set((raw.flow||[]).filter(Array.isArray).map(r=>String(r[0])+'|'+String(r[1])));
  return {nodes,edges,xyz,flow,totalNodes:rows.length,totalEdges:(raw.edges||[]).length,cap,
    coordsCount:xyz.filter(Boolean).length,raw,worker:raw.w??null};
}
export function topology(g,maxCycles=8){
  if(!g)return null;
  const n=g.nodes.length,p=Array.from({length:n},(_,i)=>i),tree=Array.from({length:n},()=>[]);
  const find=x=>{while(p[x]!==x){p[x]=p[p[x]];x=p[x]}return x};
  let comps=n;const extra=[];
  for(const e of g.edges){if(e.a===e.b){extra.push(e);continue}
    const a=find(e.a),b=find(e.b);if(a===b){extra.push(e);continue}
    p[a]=b;comps--;tree[e.a].push(e.b);tree[e.b].push(e.a);
  }
  const cycles=[];
  for(const e of extra){if(cycles.length>=maxCycles)break;
    if(e.a===e.b){cycles.push([e.a]);continue}
    const parent=new Int32Array(n).fill(-1),queue=[e.a];parent[e.a]=e.a;
    for(let k=0;k<queue.length&&parent[e.b]<0;k++)for(const next of tree[queue[k]])
      if(parent[next]<0){parent[next]=queue[k];queue.push(next)}
    if(parent[e.b]<0)continue;
    const path=[e.b];for(let v=e.b;v!==e.a;){v=parent[v];path.push(v)}
    if(path.length<=128)cycles.push(path.reverse());
  }
  return {components:comps,rank:g.edges.length-n+comps,cycles,visited:n,edges:g.edges.length,
    interpretation:'undirected graph cycle space (not Hopf evidence)'};
}
export function jacobiSymmetric(matrix,maxSweeps=12){
  const n=matrix.length,a=matrix.map(r=>r.slice()),v=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
  if(!n)return {values:[],vectors:[]};
  for(let k=0;k<maxSweeps*n*n;k++){
    let p=0,q=0,off=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>off){off=Math.abs(a[i][j]);p=i;q=j}
    if(off<1e-11)break;
    const tau=(a[q][q]-a[p][p])/(2*a[p][q]);
    const t=Math.sign(tau||1)/(Math.abs(tau)+Math.sqrt(1+tau*tau));
    const c=1/Math.sqrt(1+t*t),s=t*c,app=a[p][p],aqq=a[q][q],apq=a[p][q];
    a[p][p]=app-t*apq;a[q][q]=aqq+t*apq;a[p][q]=a[q][p]=0;
    for(let r=0;r<n;r++){
      if(r!==p&&r!==q){const rp=a[r][p],rq=a[r][q];a[r][p]=a[p][r]=c*rp-s*rq;a[r][q]=a[q][r]=s*rp+c*rq}
      const vp=v[r][p],vq=v[r][q];v[r][p]=c*vp-s*vq;v[r][q]=s*vp+c*vq;
    }
  }
  const order=Array.from({length:n},(_,i)=>i).sort((i,j)=>a[i][i]-a[j][j]);
  return {values:order.map(i=>a[i][i]),vectors:order.map(i=>v.map(r=>r[i]))};
}
export function graphSpectrum(g,size=28){
  if(!g||!g.nodes.length)return null;
  // Pick connected BFS sample. This does NOT represent full-graph eigenstates.
  const adj=Array.from({length:g.nodes.length},()=>[]);
  for(const e of g.edges){if(e.a===e.b)continue;adj[e.a].push(e.b);adj[e.b].push(e.a)}
  const source=Array.from({length:g.nodes.length},(_,i)=>i).sort((a,b)=>adj[b].length-adj[a].length)[0];
  const indices=[],seen=new Set([source]),queue=[source];
  for(let k=0;k<queue.length&&indices.length<size;k++){
    const u=queue[k];indices.push(u);
    for(const v of adj[u])if(!seen.has(v)&&seen.size<g.nodes.length){seen.add(v);queue.push(v)}
  }
  if(indices.length<Math.min(size,g.nodes.length))for(let i=0;i<g.nodes.length&&indices.length<size;i++)if(!indices.includes(i))indices.push(i);
  const id=new Map(indices.map((x,i)=>[x,i])),n=indices.length,L=Array.from({length:n},()=>Array(n).fill(0));
  for(const e of g.edges){const a=id.get(e.a),b=id.get(e.b);if(a===undefined||b===undefined||a===b)continue;
    L[a][a]++;L[b][b]++;L[a][b]--;L[b][a]--;
  }
  const eig=jacobiSymmetric(L);
  return {...eig,indices,kind:'undirected unweighted sampled graph Laplacian',sampled:n};
}
export function coordinateDimensions(g){
  if(!g)return null;
  const rows=g.xyz.filter(x=>x&&x.length>=2),d=Math.min(5,...rows.map(x=>x.length));
  if(rows.length<3||d<2)return null;
  const mean=Array.from({length:d},(_,j)=>rows.reduce((s,r)=>s+r[j],0)/rows.length);
  const cov=Array.from({length:d},(_,i)=>Array.from({length:d},(_,j)=>
    rows.reduce((s,r)=>s+(r[i]-mean[i])*(r[j]-mean[j]),0)/(rows.length-1)));
  const eig=jacobiSymmetric(cov),values=eig.values.map(v=>Math.max(0,v)),sum=values.reduce((a,b)=>a+b,0);
  const effective=sum>0?sum*sum/values.reduce((a,b)=>a+b*b,0):0;
  const periodic=rows.every(r=>r.slice(0,d).every(v=>v>=0&&v<1));
  return {d,effective,values,periodic,samples:rows.length,mean};
}
export function causalTrace(raw){
  const trace=raw?.shared?.training?.trace;
  if(!trace)return null;
  const b=numbers(trace.before),p=numbers(trace.predicted),o=numbers(trace.observed);
  const n=Math.min(p.length,o.length);
  if(!n)return null;
  const rmse=Math.sqrt(p.slice(0,n).reduce((s,x,i)=>s+(x-o[i])**2,0)/n);
  return {before:b,predicted:p,observed:o,n,rmse,step:raw?.shared?.training?.step??null};
}
export function mazeShape(record){
  if(!record||!Number.isInteger(record.n)||!Array.isArray(record.path))return null;
  const n=record.n,actions=Array.isArray(record.shapes?.[0])?record.shapes[0]:null;
  const planned=[record.start],delta=[-n,1,n,-1];
  if(actions)for(const a of actions){if(!Number.isInteger(a)||a<0||a>3)break;
    const i=planned.at(-1),j=i+delta[a];
    if(j<0||j>=n*n||Math.abs((j%n)-(i%n))+Math.abs(Math.floor(j/n)-Math.floor(i/n))!==1)break;
    planned.push(j);
  }
  return {n,start:record.start,goal:record.goal,wall:record.wall||null,path:record.path,planned:actions?planned:null,
    solved:record.solved===true,first:finite(record.first)?record.first:null,steps:record.steps??null,optimal:record.optimal??null,
    isFirstPlan:!!actions};
}
export class DynamicsTracker{
  constructor(max=100){this.max=max;this.history=[];this.worker=null;this.ids=null}
  push(g,time=Date.now()){
    if(!g||!g.nodes.length)return false;
    if(this.worker!==g.worker){this.history=[];this.ids=null;this.worker=g.worker}
    if(!this.ids)this.ids=g.nodes.slice(0,32).map(x=>x.id);
    const byId=new Map(g.nodes.map(n=>[n.id,n.activity]));
    const v=this.ids.map(id=>byId.get(id)??0),prev=this.history.at(-1);
    if(prev&&v.every((x,i)=>Math.abs(x-prev.v[i])<1e-10))return false;
    const delta=prev?Math.sqrt(v.reduce((s,x,i)=>s+(x-prev.v[i])**2,0)):null;
    let recurrence=null;
    if(this.history.length>2){
      const earlier=this.history.slice(0,-1);
      recurrence=Math.min(...earlier.map(h=>Math.sqrt(v.reduce((s,x,i)=>s+(x-h.v[i])**2,0))));
    }
    this.history.push({time,v,delta,recurrence,sum:v.reduce((s,x)=>s+x,0)});
    if(this.history.length>this.max)this.history.shift();
    return true;
  }
}

// Native finite xD witness from the SAME original V17 Brain stored in /graph.xdAtlas.
// Finite 128-state / 7-active-axis worlds must never be described as full 2^D cubes.
export function nativeXD(raw){
  const last=raw?.xdAtlas?.last,atlas=last?.atlas,world=atlas?.fullWorld,execution=last?.execution;
  if(!world||!Array.isArray(world.vertices)||!Array.isArray(world.links)||!atlas)return null;
  const byId=new Map(world.vertices.map((v,i)=>[String(v.id),i]));
  const basis=[...new Set(world.vertices.flatMap(v=>v.coordinates||[]))].sort((a,b)=>a-b);
  const vertices=world.vertices.map(v=>({
    id:String(v.id),wall:!!v.wall,coordinates:Array.isArray(v.coordinates)?v.coordinates:[],
    mask:v.mask??null,bits:basis.map(axis=>v.coordinates?.includes(axis)?1:0)
  }));
  const legal=world.links.filter(e=>byId.has(String(e.from))&&byId.has(String(e.to)));
  const predicted=Array.isArray(atlas.initialPredictedSolution)?atlas.initialPredictedSolution.map(String):[];
  const frames=Array.isArray(execution?.frames)?execution.frames:[];
  const observed=frames.length?[String(world.start),...frames.map(e=>String(e.observedAfter))]:[];
  const graphNodes=vertices.filter(v=>!v.wall).map(v=>[v.id,'xd-state',v.id,0]);
  const graphU=vertices.filter(v=>!v.wall).map(v=>[v.id,v.bits]);
  const graph=nativeGraph({nodes:graphNodes,edges:legal.map(e=>[e.from,e.to,'xd-edge',1]),U:graphU},320);
  return {dimensions:world.ambientDimensions,activeRank:world.activeRank,
    finiteStates:world.finiteStateCount,completeFullHypercube:world.completeFullHypercube,
    vertices,links:legal,byId,basis,graph,predicted,observed,frames,
    solved:execution?.solved===true,correct:execution?.correct??null,
    attempted:execution?.attempted??null,steps:atlas.pathLength??null,
    shortest:atlas.evaluatorPhysicalShortestPath??null,
    missingAxes:atlas.missingAxes||[],last,source:'native /graph.xdAtlas.last'};
}


// Browser-side numeric gate: independently recomputes EVERY claimed frozen
// native field sweep, greedy solution, and reverse weighted-distance field.
// A JSON file cannot pass simply by claiming nativePathIdentical:true.
export function verifyFieldEpisode(e){
  try{
    const n=e.n,N=n*n,me=e.start;
    if(![7,9,11,13].includes(n)||!Number.isInteger(me)||me<0||me>=N||
      !Array.isArray(e.ret)||e.ret.length!==N||!Array.isArray(e.wall)||e.wall.length!==N||
      !Array.isArray(e.att)||e.att.length!==4||!Array.isArray(e.cond)||e.cond.length!==4||
      !e.att.every(v=>finite(v)&&v>=0&&v<=1)||
      !e.cond.every(v=>finite(v)&&v>=0&&v<=1)||
      !e.ret.every(v=>Number.isInteger(v)&&v>=0&&v<=3)||
      !Array.isArray(e.frames)||!e.frames.length||e.frames.length>2*N)return false;
    const V=new Float64Array(N),nb=(i,a)=>{
      const x=i%n+[0,1,0,-1][a],y=Math.floor(i/n)+[-1,0,1,0][a];
      return x<0||y<0||x>=n||y>=n?-1:y*n+x;
    };
    let seeds=0;
    for(let i=0;i<N;i++)if(e.att[e.ret[i]]>.2&&i!==me){V[i]=e.att[e.ret[i]];seeds++}
    if(seeds!==e.seedCount)return false;
    for(const f of e.frames){
      let changed=0,total=0,max=0;
      for(let i=0;i<N;i++){
        if(e.att[e.ret[i]]>.2&&i!==me)continue;
        const c=i===me?1:e.cond[e.ret[i]];if(c<.5)continue;
        let b=0;for(let a=0;a<4;a++){const j=nb(i,a);if(j>=0&&V[j]>b)b=V[j]}
        const v=.97*c*b;
        if(v>V[i]+1e-12){const d=v-V[i];V[i]=v;total+=d;max=Math.max(max,d);changed++}
      }
      if(changed!==f.changed||Math.abs(total-f.totalDelta)>1e-8||Math.abs(max-f.maxDelta)>1e-8||
        !Array.isArray(f.values)||f.values.length!==N||
        f.values.some((x,i)=>!finite(x)||Math.abs(x-V[i])>1e-9))return false;
    }
    if(e.frames.at(-1).changed!==0||e.nativePathIdentical!==true)return false;
    const path=[],seen=new Set([me]);let p=me;
    for(let k=0;k<N;k++){
      let best=-1,bv=V[p];for(let a=0;a<4;a++){
        const j=nb(p,a);if(j>=0&&!seen.has(j)&&V[j]>bv){bv=V[j];best=a}
      }
      if(best<0)break;
      path.push(best);p=nb(p,best);seen.add(p);
      if(e.att[e.ret[p]]>.2)break;
    }
    if(JSON.stringify(path.length?path:null)!==JSON.stringify(e.path))return false;
    const dist=Array(N).fill(Infinity),done=Array(N).fill(false);
    for(let i=0;i<N;i++)if(e.att[e.ret[i]]>.2&&i!==me)dist[i]=-Math.log(e.att[e.ret[i]]);
    for(let step=0;step<N;step++){
      let u=-1,b=Infinity;
      for(let i=0;i<N;i++)if(!done[i]&&dist[i]<b){u=i;b=dist[i]}
      if(u<0)break;
      done[u]=true;
      for(let a=0;a<4;a++){
        const i=nb(u,a);if(i<0||done[i]||(e.att[e.ret[i]]>.2&&i!==me))continue;
        const c=i===me?1:e.cond[e.ret[i]];if(c<.5)continue;
        const candidate=dist[u]-Math.log(.97*c);
        if(candidate<dist[i])dist[i]=candidate;
      }
    }
    const maximum=Math.max(...dist.map((d,i)=>Math.abs((Number.isFinite(d)?Math.exp(-d):0)-V[i])));
    return maximum<=1e-9&&e.independentMaxAbsError<=1e-9;
  }catch{return false}
}
