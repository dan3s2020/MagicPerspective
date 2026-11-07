// V21 Aether/Veil: a bounded, observed, contextual transition graph.
// Additive to the ORIGINAL V17 Brain and V20 TextHypermaze. No oracle labels,
// semantic target answers, synthetic future events or substitute text model.
// A state is two consecutive actually observed symbols; actions are observed
// next-symbol events. Maze/transform world events update an independent ledger
// in this SAME checkpointed object, but are NOT invented as text edges.
// The wavefront is the original V17 mathematical law V=.97 max(neighbor V)
// on an observed directed graph; it does not call or replace Discoverer.shape().
import {ObservedCausalField} from "./observed-causal-field.mjs";
const key = pair => JSON.stringify(pair);
const clean = x => String(x).normalize("NFC");
const safeInt = (n,a,b) => Math.max(a,Math.min(b,Math.trunc(Number(n)||0)));
const normPair = v => {
  const a = Array.isArray(v) ? v : String(v ?? "").trim().split(/\s+/u);
  if(a.length !== 2 || a.some(s => typeof s !== "string" || !s.length || s.length > 128))
    throw Error("Provide exactly two observed tokens for each contextual state");
  return a.map(clean);
};
const shown = pair => pair.join(" ");
export class VeilAether {
  constructor({maxStates=12000,maxEdges=120000,frameLimit=64}={}){
    if(!Number.isInteger(maxStates)||maxStates<8||!Number.isInteger(maxEdges)||maxEdges<8)
      throw Error("Invalid contextual graph budget");
    this.version=1;this.maxStates=maxStates;this.maxEdges=maxEdges;
    this.frameLimit=frameLimit;
    this.index=new Map();this.nodes=[];this.edges=new Map();this.out=new Map();
    this.docs=0;this.transitions=0;this.tokens=0;this.skippedStates=0;this.skippedEdges=0;
    this.predictions=0;this.correct=0;this.singleCorrect=0;this.singleOnContextCovered=0;this.covered=0;
    this.single=new Map();this.domainEvents={maze:0,transform:0,text:0,code:0};
    this.experiences=new Map();this.causalField=new ObservedCausalField();this.last=null;
  }
  _ensure(pair){
    const k=key(pair),old=this.index.get(k);
    if(old!==undefined)return old;
    if(this.nodes.length>=this.maxStates){this.skippedStates++;return -1;}
    const id=this.nodes.length;
    this.index.set(k,id);
    this.nodes.push({id,state:pair.slice(),label:shown(pair),count:0,degreeIn:0,degreeOut:0});
    return id;
  }
  _edge(a,b){
    const k=a+":"+b;
    let e=this.edges.get(k);
    if(!e){
      if(this.edges.size>=this.maxEdges){this.skippedEdges++;return false;}
      e={from:a,to:b,count:0};this.edges.set(k,e);
      this.nodes[a].degreeOut++;this.nodes[b].degreeIn++;
      this.out.set(a,this.out.get(a)||new Map());
    }
    e.count++;this.out.get(a).set(b,e.count);this.transitions++;
    return true;
  }
  _choice(pair){
    const id=this.index.get(key(pair));
    if(id===undefined)return {token:null,p:0,choices:[],support:0};
    const outgoing=this.out.get(id);
    if(!outgoing?.size)return {token:null,p:0,choices:[],support:0};
    const total=[...outgoing.values()].reduce((s,n)=>s+n,0);
    const choices=[...outgoing].map(([to,count])=>({
      token:this.nodes[to].state[1],next:this.nodes[to].state.slice(),
      count,p:count/total
    })).sort((a,b)=>b.count-a.count||a.token.localeCompare(b.token));
    return {token:choices[0].token,p:choices[0].p,choices:choices.slice(0,8),support:total};
  }
  _singleChoice(token){
    const a=this.single.get(token);if(!a)return null;
    let best=null,max=-1;
    for(const [word,n] of a)if(n>max){best=word;max=n;}
    return best;
  }
  // Only genuinely observed events from the native V17 SharedObserver enter.
  // World-specific sensors are not secretly replaced by this ledger.
  observeExperience({domain,before,action,after}={}){
    if(!Object.hasOwn(this.domainEvents,domain))throw Error("Unknown observed world");
    if((typeof before!=="string"&&!Array.isArray(before))||
       (typeof after!=="string"&&!Array.isArray(after))||action==null)
      throw Error("Both physical observations and action are required");
    const type=String(action).slice(0,96);
    const same=JSON.stringify(before)===JSON.stringify(after);
    const k=domain+"\u001f"+type,old=this.experiences.get(k)||
      {domain,action:type,observed:0,changed:0,unchanged:0};
    old.observed++;old.changed+=+!same;old.unchanged+=+same;
    this.experiences.set(k,old);this.domainEvents[domain]++;
    this.causalField.observe({domain,before,action: type,after}); // actual observed V17 action/effect, no semantic oracle
    return {domain,action:type,changed:!same,observed:old.observed};
  }
  // The reference goal is a VISIBLE pair, not a secret answer. No future
  // document transitions are learned until all its predictions are scored.
  observeTokens(words,{id=null}={}){
    if(!Array.isArray(words)||words.some(w=>typeof w!=="string"))
      throw Error("Observed symbols must be a real token sequence");
    const t=words.map(clean),states=[];
    for(let i=0;i<t.length-1;i++)states.push([t[i],t[i+1]]);
    const record=this.docs<4||this.docs%20===0;
    const first=states[0],goal=states.at(-1);
    // One FROZEN goal field for every recorded document; each local repair reuses it.
    const goalId=record&&goal?this.index.get(key(goal)):undefined;
    const field=goalId!==undefined?this._field(goalId):null;
    const pre=(record&&states.length>1)?this.plan(first,goal,{maxSteps:160,field}):null;
    const frames=[];let c=0,cov=0,base=0;
    for(let i=0;i<states.length-1;i++){
      const observation=t[i+2],guess=this._choice(states[i]),one=this._singleChoice(t[i+1]);
      this.predictions++;cov+=+(guess.token!==null);
      c+=+(guess.token!==null&&guess.token===observation);
      base+=+(one===observation);
      if(guess.token!==null)this.singleOnContextCovered+=+(one===observation);
      if(record&&i<this.frameLimit){
        const localPlan=this.plan(states[i],goal,{maxSteps:80,field});
        frames.push({step:i+1,state:shown(states[i]),predicted:guess.token,
          observed:observation,probability:guess.choices.find(x=>x.token===observation)?.p||0,
          surprise:guess.token!==observation,alternatives:guess.choices,
          remainingShape:localPlan.found?localPlan.path:[],
          contextAvailable:guess.support>0});
      }
    }
    this.covered+=cov;this.correct+=c;this.singleCorrect+=base;
    // Now and ONLY now absorb observed transitions and word statistics.
    const ids=states.map(pair=>this._ensure(pair));
    for(const id of ids)if(id>=0)this.nodes[id].count++;
    for(let i=0;i+1<ids.length;i++){
      // The auxiliary one-symbol control must respect the SAME graph budget.
      if(ids[i]<0||ids[i+1]<0||!this._edge(ids[i],ids[i+1]))continue;
      const word=t[i+1],next=t[i+2];
      if(!this.single.has(word))this.single.set(word,new Map());
      const counts=this.single.get(word);
      counts.set(next,(counts.get(next)||0)+1);
    }
    this.docs++;this.tokens+=t.length;
    if(record)this.last={id,document:this.docs,start:first||null,goal:goal||null,
      initialShape:pre?.found?pre.path:[],initialFound:!!pre?.found,
      plannedBeforeDocumentIngestion:true,visibleGoalBeforePlanning:true,
      actual:states.slice(0,this.frameLimit+1).map(shown),
      frames,covered:cov,correct:c,oneTokenCorrect:base,
      source:"observed corpus: frozen prediction then ingest; contextual tokens, not semantics"};
    return {documents:this.docs,predictions:Math.max(0,states.length-1),
      coverage:states.length>1?cov/(states.length-1):null,
      contextualAccuracy:cov?c/cov:null,
      oneTokenAccuracy:states.length>1?base/(states.length-1):null,
      firstShape:pre?.found?pre.path:[],plannedBeforeIngestion:true};
  }
  // Exact fixed-point for the original V17 c=1 solution-field recurrence.
  // With observed directed edges, reverse BFS gives V=.97^shortest_distance.
  _field(target){
    const n=this.nodes.length,reverse=Array.from({length:n},()=>[]);
    for(const e of this.edges.values())reverse[e.to].push(e.from);
    const dist=new Int32Array(n).fill(-1),queue=[target];dist[target]=0;
    for(let q=0;q<queue.length;q++)for(const u of reverse[queue[q]])
      if(dist[u]<0){dist[u]=dist[queue[q]]+1;queue.push(u);}
    const value=Array.from(dist,d=>d<0?0:Math.pow(.97,d));
    let maxResidual=0;
    for(let i=0;i<n;i++)if(i!==target){
      let best=0;for(const j of this.out.get(i)?.keys()||[])best=Math.max(best,value[j]);
      maxResidual=Math.max(maxResidual,Math.abs(value[i]-.97*best));
    }
    return {target,dist,value,maxResidual,reachable:queue.length};
  }
  plan(start,goal,{maxSteps=160,field=null}={}){
    const a=normPair(start),g=normPair(goal);
    maxSteps=safeInt(maxSteps,1,10000);
    const from=this.index.get(key(a)),to=this.index.get(key(g));
    if(from===undefined||to===undefined)
      return {found:false,reason:"UNKNOWN_CONTEXT",path:[],frozen:true};
    field=field?.target===to?field:this._field(to);
    const {dist,value}=field;
    if(dist[from]<0)return {found:false,reason:"NO_OBSERVED_ROUTE",path:[],frozen:true,
      math:{maxResidual:field.maxResidual,reachable:field.reachable}};
    const ids=[from],links=[],seen=new Set([from]);let pos=from;
    while(pos!==to&&links.length<maxSteps){
      const candidates=[...(this.out.get(pos)||new Map())].filter(([v])=>
        dist[v]===dist[pos]-1&&!seen.has(v));
      candidates.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
      if(!candidates.length)break;
      const [next,support]=candidates[0];
      links.push({from:this.nodes[pos].label,to:this.nodes[next].label,support,
        vFrom:value[pos],vTo:value[next],action:"observed-next-symbol:"+this.nodes[next].state[1]});
      ids.push(next);seen.add(next);pos=next;
    }
    const found=pos===to;
    return {found,reason:found?"GOAL_REACHED":"PATH_LIMIT",frozen:true,
      start:a,goal:g,path:ids.map(i=>this.nodes[i].label),links,
      routeNodes:ids.map(i=>{const n=this.nodes[i];return {id:n.id,label:n.label,count:n.count,features:this._features(n)};}),
      distance:dist[from],
      math:{maxResidual:field.maxResidual,reachable:field.reachable,
        strictUphill:links.every(e=>e.vTo>e.vFrom),
        shortestObservedRoute:found&&links.length===dist[from],
        pathLength:links.length,
        law:"V(goal)=1; V(s)=0.97 max_{observed successors} V(next)",
        caveat:"Only witnessed contextual token routes; NOT solved language semantics"}};
  }
  _features(n){
    return [Math.min(1,Math.log1p(n.count)/12),
      Math.min(1,Math.log1p(n.degreeIn)/9),
      Math.min(1,Math.log1p(n.degreeOut)/9),
      Math.min(1,Math.log1p((this.out.get(n.id)?.size)||0)/9),
      Math.min(1,Math.log1p(this._choice(n.state).support)/12)];
  }
  snapshot({limit=160}={}){
    let ambiguousMiddle=0,historyUseful=0;
    const mids=new Map();
    for(const n of this.nodes){
      const mid=n.state[1],guess=this._choice(n.state);
      if(!mids.has(mid))mids.set(mid,new Set());
      if(guess.token!==null)mids.get(mid).add(guess.token);
    }
    for(const variants of mids.values())if(variants.size>1){ambiguousMiddle++;historyUseful++;}
    const selected=new Set();
    for(const s of [...(this.last?.initialShape||[]),...(this.last?.actual||[])]) {
      const n=this.nodes.find(x=>x.label===s);if(n)selected.add(n.id);
    }
    for(const n of this.nodes.slice().sort((a,b)=>b.count-a.count)){
      if(selected.size>=limit)break;selected.add(n.id);
    }
    const nodes=[...selected].slice(0,limit).map(id=>this.nodes[id]).filter(Boolean)
      .map(n=>({id:n.id,label:n.label,count:n.count,features:this._features(n)}));
    const edges=[...this.edges.values()].filter(e=>selected.has(e.from)&&selected.has(e.to))
      .sort((a,b)=>b.count-a.count).slice(0,1000).map(e=>[e.from,e.to,e.count]);
    return {version:1,documents:this.docs,states:this.nodes.length,edges:this.edges.size,
      observedTransitions:this.transitions,skippedStates:this.skippedStates,
      skippedEdges:this.skippedEdges,onlinePredictions:this.predictions,
      contextAccuracyCovered:this.covered?this.correct/this.covered:null,
      contextCoverage:this.predictions?this.covered/this.predictions:null,
      oneTokenAccuracyAll:this.predictions?this.singleCorrect/this.predictions:null,
      oneTokenAccuracyOnSameCovered:this.covered?this.singleOnContextCovered/this.covered:null,
      priorContextGroupsWithDifferentFutures:ambiguousMiddle,
      historyAxisEvidence:historyUseful,
      axes:["previous_symbol","current_symbol"],gatingMeaning:
        "History axis is useful where identical current symbols have different observed futures; not 6D physics",
      domainEvents:{...this.domainEvents},externalActions:[...this.experiences.values()].slice(-16),
      causalField:this.causalField.snapshot({maxNodes:64,maxEdges:160}),
      last:this.last,sample:{nodes,edges},
      semanticGoalVerified:false,originalDiscovererDirectlyReused:false,
      fullCUDAVerified:false};
  }
  export(){
    return {version:1,maxStates:this.maxStates,maxEdges:this.maxEdges,
      frameLimit:this.frameLimit,nodes:this.nodes.map(n=>({...n,state:n.state.slice()})),
      edges:[...this.edges.values()].map(e=>({...e})),docs:this.docs,
      transitions:this.transitions,tokens:this.tokens,skippedStates:this.skippedStates,
      skippedEdges:this.skippedEdges,predictions:this.predictions,
      correct:this.correct,singleCorrect:this.singleCorrect,
      singleOnContextCovered:this.singleOnContextCovered,covered:this.covered,
      single:[...this.single].map(([word,m])=>[word,[...m]]),
      domainEvents:{...this.domainEvents},experiences:[...this.experiences.values()].map(x=>({...x})),
      causalField:this.causalField.export(),
      last:this.last};
  }
  static restore(data){
    if(data?.version!==1||!Array.isArray(data.nodes)||!Array.isArray(data.edges))
      throw Error("Bad V21 observed graph checkpoint");
    const a=new VeilAether(data);
    a.nodes=data.nodes.map(n=>({...n,state:n.state.slice()}));
    a.index=new Map(a.nodes.map(n=>[key(n.state),n.id]));
    a.edges=new Map(data.edges.map(e=>[e.from+":"+e.to,{...e}]));
    for(const e of a.edges.values()){
      if(!a.out.has(e.from))a.out.set(e.from,new Map());
      a.out.get(e.from).set(e.to,e.count);
    }
    for(const k of ["docs","transitions","tokens","skippedStates","skippedEdges",
      "predictions","correct","singleCorrect","singleOnContextCovered","covered"])a[k]=data[k]||0;
    a.single=new Map((data.single||[]).map(([word,rows])=>[word,new Map(rows)]));
    a.domainEvents={...a.domainEvents,...data.domainEvents};
    a.experiences=new Map((data.experiences||[]).map(x=>[x.domain+"\u001f"+x.action,{...x}]));
    a.causalField=data.causalField?ObservedCausalField.restore(data.causalField):new ObservedCausalField();
    a.last=data.last||null;return a;
  }
}
