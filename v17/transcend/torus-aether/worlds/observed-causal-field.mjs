// V21 causal action graph: learned from REAL events intercepted from the ORIGINAL
// V17 Brain's observeShared hook. A trajectory is a sequence of observed
// (state, action, outcome) triples; no simulator internals / future oracle.
// Adds conditional stochastic branches, local changed-coordinate evidence,
// noncommuting action order, and an immutable goal-field planner.
// Research status: observed-state planner; it does not control the native Brain,
// infer arbitrary semantic goals, or imply a physically 4D manifold.
const VALID=new Set(["maze","transform","text","code"]);
const key=(domain,state)=>domain+"\u0000"+JSON.stringify(state);
const finite=(v,n)=>Number.isInteger(v)&&v>=1&&v<=n;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=x=>Array.isArray(x)?x.slice():String(x);
export class ObservedCausalField {
  constructor({maxStates=1024,maxEdges=4096}={}){
    if(!finite(maxStates,50000)||!finite(maxEdges,500000))throw Error("Invalid observed causal graph budget");
    this.version=1;this.maxStates=maxStates;this.maxEdges=maxEdges;
    this.nodes=[];this.index=new Map();this.edges=new Map();this.out=new Map();
    this.counts={maze:0,transform:0,text:0,code:0};
    this.omittedNodes=0;this.omittedEdges=0;this.last=null;
  }
  _state(domain,value){
    if(!VALID.has(domain))throw Error("Unknown observed domain "+domain);
    if(!(Array.isArray(value)||typeof value==="string"))throw Error("Need actually observed state");
    if(Array.isArray(value)&&value.length>4096)throw Error("Physical observation exceeds bounded state limit");
    const state=copy(value),k=key(domain,state);
    const old=this.index.get(k);if(old!==undefined)return old;
    if(this.nodes.length>=this.maxStates){this.omittedNodes++;return -1;}
    const id=this.nodes.length;
    this.nodes.push({id,domain,state,count:0});this.index.set(k,id);
    return id;
  }
  observe({domain,before,action,after}={}){
    if(!VALID.has(domain))throw Error("Unknown domain");
    if(typeof action!=="string"||!action.trim())throw Error("Real intervention label required");
    if(!(Array.isArray(before)||typeof before==="string")||
       !(Array.isArray(after)||typeof after==="string"))
      throw Error("True before/after observation required");
    const a=this._state(domain,before),b=this._state(domain,after);
    if(a<0||b<0)return {recorded:false,reason:"STATE_BUDGET"};
    const op=action.slice(0,96),k=a+"\u0000"+op+"\u0000"+b;
    let edge=this.edges.get(k);
    if(!edge){
      if(this.edges.size>=this.maxEdges){this.omittedEdges++;return {recorded:false,reason:"EDGE_BUDGET"};}
      edge={from:a,to:b,domain,action:op,count:0};
      this.edges.set(k,edge);
      if(!this.out.has(a))this.out.set(a,new Map());
      this.out.get(a).set(k,edge);
    }
    edge.count++;this.nodes[a].count++;this.nodes[b].count++;this.counts[domain]++;
    this.last={domain,action:op,from:a,to:b,changed:!same(before,after),
      changedIndices:Array.isArray(before)&&Array.isArray(after)&&before.length===after.length?
        before.map((v,i)=>v!==after[i]?i:-1).filter(v=>v>=0).slice(0,40):[],
      observed:this.counts[domain]};
    return {recorded:true,from:a,to:b,changed:this.last.changed};
  }
  // Conditional action branches are empirical (no fixed distribution).
  alternatives(domain,from,action){
    const i=this.index.get(key(domain,from));if(i===undefined)return [];
    const rows=[...(this.out.get(i)?.values()||[])].filter(e=>e.action===action);
    const sum=rows.reduce((t,e)=>t+e.count,0);
    return rows.map(e=>({after:copy(this.nodes[e.to].state),count:e.count,
      p:e.count/sum,to:e.to})).sort((a,b)=>b.p-a.p||a.to-b.to);
  }
  _field(target,domain){
    const n=this.nodes.length,rev=Array.from({length:n},()=>[]);
    for(const e of this.edges.values())if(e.domain===domain)rev[e.to].push(e.from);
    const dist=new Int32Array(n).fill(-1),q=[target];dist[target]=0;
    for(let head=0;head<q.length;head++)for(const v of rev[q[head]])
      if(dist[v]<0){dist[v]=dist[q[head]]+1;q.push(v);}
    const V=Array.from(dist,d=>d<0?0:Math.pow(.97,d));
    let residual=0;
    for(const s of this.nodes)if(s.domain===domain&&s.id!==target){
      let best=0;
      for(const e of this.out.get(s.id)?.values()||[])if(e.domain===domain)
        best=Math.max(best,V[e.to]);
      residual=Math.max(residual,Math.abs(V[s.id]-.97*best));
    }
    return {V,dist,residual,reachable:q.length};
  }
  plan(domain,start,goal,{maxSteps=160}={}){
    if(!VALID.has(domain))throw Error("Unknown domain");
    maxSteps=Math.max(1,Math.min(10000,Math.trunc(Number(maxSteps)||160)));
    const s=this.index.get(key(domain,start)),g=this.index.get(key(domain,goal));
    if(s===undefined||g===undefined)
      return {found:false,frozen:true,reason:"UNKNOWN_OBSERVED_STATE",path:[]};
    const field=this._field(g,domain),{V,dist}=field;
    if(dist[s]<0)return {found:false,frozen:true,reason:"NO_OBSERVED_ACTION_ROUTE",path:[],
      math:{residual:field.residual}};
    let here=s;const path=[{state:copy(this.nodes[s].state),node:s}];
    const seen=new Set([s]);let reached=here===g;
    while(!reached&&path.length-1<maxSteps){
      const candidates=[...(this.out.get(here)?.values()||[])].filter(e=>
        e.domain===domain&&dist[e.to]===dist[here]-1&&!seen.has(e.to));
      candidates.sort((a,b)=>b.count-a.count||a.action.localeCompare(b.action)||a.to-b.to);
      if(!candidates.length)break;
      const e=candidates[0];
      path.push({state:copy(this.nodes[e.to].state),node:e.to,
        from:this.nodes[here].id,action:e.action,predictedEffect:copy(this.nodes[e.to].state),
        count:e.count,vBefore:V[here],vAfter:V[e.to]});
      here=e.to;seen.add(here);reached=here===g;
    }
    return {found:reached,frozen:true,domain,
      reason:reached?"OBSERVED_GOAL_REACHED":"PATH_LIMIT",path,
      math:{residual:field.residual,reachable:field.reachable,
        strictlyUphill:path.slice(1).every(p=>p.vAfter>p.vBefore),
        shortestObserved:reached&&path.length-1===dist[s],
        distance:dist[s],law:"V(goal)=1; V(s)=0.97 max over observed action-conditioned outcomes",
        caveat:"Known observed start/goal and empirical edges; no proof of semantic generalization"}};
  }
  // Empirical AB != BA witnesses require that BOTH two-action paths were
  // actually witnessed (or each individual transition was observed in the
  // matching state). Never infer noncommutativity from missing evidence.
  noncommuting({limit=12}={}){
    const samples=[];
    for(const node of this.nodes){
      const paths=new Map();
      for(const first of this.out.get(node.id)?.values()||[]){
        const nexts=this.out.get(first.to);
        for(const second of nexts?.values()||[]){
          if(first.domain!==second.domain||first.action===second.action)continue;
          const k=first.action+"\u0000"+second.action;
          if(!paths.has(k))paths.set(k,{first,second});
        }
      }
      for(const [k,p] of paths){
        const [a,b]=k.split("\u0000"),flip=paths.get(b+"\u0000"+a);
        if(!flip||a>=b||p.second.to===flip.second.to)continue;
        samples.push({domain:node.domain,start:node.id,actions:[a,b],
          afterAB:p.second.to,afterBA:flip.second.to,
          observed:true,orderMatters:true});
        if(samples.length>=limit)return samples;
      }
    }
    return samples;
  }
  snapshot({maxNodes=60,maxEdges=180}={}){
    const counts={...this.counts},branching=[];
    for(const [from,edges] of this.out){
      const byAction=new Map();
      for(const e of edges.values()){
        if(!byAction.has(e.action))byAction.set(e.action,[]);
        byAction.get(e.action).push(e);
      }
      for(const [action,rows] of byAction)if(rows.length>1){
        const total=rows.reduce((s,e)=>s+e.count,0);
        branching.push({domain:this.nodes[from].domain,from,action,
          distinctObservedOutcomes:rows.length,
          entropyBits:-rows.reduce((s,e)=>{const p=e.count/total;return s+p*Math.log2(p);},0)});
      }
    }
    const changed=new Map();
    for(const e of this.edges.values()){
      const a=this.nodes[e.from].state,b=this.nodes[e.to].state;
      if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)continue;
      const k=e.domain+":"+e.action;
      const rows=changed.get(k)||new Map();
      for(let i=0;i<a.length;i++)if(a[i]!==b[i])rows.set(i,(rows.get(i)||0)+e.count);
      changed.set(k,rows);
    }
    const axes=[...changed].map(([action,rows])=>({
      action,changedCoordinateEvidence:[...rows].sort((a,b)=>b[1]-a[1]).slice(0,8)
    })).slice(0,40);
    const selection=new Set();
    if(this.last){selection.add(this.last.from);selection.add(this.last.to);}
    for(const e of [...this.edges.values()].sort((a,b)=>b.count-a.count)){
      if(selection.size>=maxNodes)break;
      selection.add(e.from);selection.add(e.to);
    }
    const nodes=[...selection].slice(0,maxNodes).map(i=>({id:i,domain:this.nodes[i].domain,
      count:this.nodes[i].count,label:Array.isArray(this.nodes[i].state)?
        "["+this.nodes[i].state.slice(0,6).join(",")+(this.nodes[i].state.length>6?",…":"")+"]":
        this.nodes[i].state.slice(0,48)}));
    const edges=[...this.edges.values()].filter(e=>selection.has(e.from)&&selection.has(e.to))
      .sort((a,b)=>b.count-a.count).slice(0,maxEdges)
      .map(e=>({from:e.from,to:e.to,action:e.action,count:e.count}));
    return {version:1,counts,states:this.nodes.length,edges:this.edges.size,
      omittedStates:this.omittedNodes,omittedEdges:this.omittedEdges,
      actualActionAxes:axes,stochasticBranches:branching.slice(0,18),
      observedNoncommuting: this.noncommuting({limit:12}),
      last:this.last,graph:{nodes,edges},
      actionControlVerified:false,semanticTransferVerified:false,
      meaning:"True original V17 observed action effects; learned local change locations, empirical branching and witnessed action ordering only"};
  }
  export(){
    return {version:1,maxStates:this.maxStates,maxEdges:this.maxEdges,nodes:this.nodes.map(n=>({...n,state:copy(n.state)})),
      edges:[...this.edges.values()].map(e=>({...e})),counts:{...this.counts},
      omittedNodes:this.omittedNodes,omittedEdges:this.omittedEdges,last:this.last};
  }
  static restore(data){
    if(data?.version!==1||!Array.isArray(data.nodes)||!Array.isArray(data.edges))throw Error("Bad observed action checkpoint");
    const m=new ObservedCausalField(data);
    m.nodes=data.nodes.map(n=>({...n,state:copy(n.state)}));
    m.index=new Map(m.nodes.map(n=>[key(n.domain,n.state),n.id]));
    m.edges=new Map();
    for(const e of data.edges){
      const k=e.from+"\u0000"+e.action+"\u0000"+e.to;m.edges.set(k,{...e});
      if(!m.out.has(e.from))m.out.set(e.from,new Map());
      m.out.get(e.from).set(k,m.edges.get(k));
    }
    m.counts={...m.counts,...data.counts};
    m.omittedNodes=data.omittedNodes||0;m.omittedEdges=data.omittedEdges||0;
    m.last=data.last||null;return m;
  }
}
