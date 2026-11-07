// MagicPerspective V31: an atlas of REAL, previously observed context transitions.
// This module learns nothing from a withheld document before planning its route.
// A state is a sequence of consecutive observed tokens (k=2 or 3), rather than
// a word alone. An edge is an observed shift [a,b] -> [b,c]; its provenance
// and all alternatives are retained. No geometric "dimensions" are invented.
// A complete atlas means ALL CURRENTLY OBSERVED reachable edges, not all
// unbounded possible natural-language strings. No hidden answer oracle.
const key = words => JSON.stringify(words);
const clone = data => JSON.parse(JSON.stringify(data));
const valid = (x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
export const tokenList=s=>String(s).normalize("NFC").match(
  /[\p{L}\p{M}\p{N}_]+(?:['’\-][\p{L}\p{M}\p{N}_]+)*|[^\s]/gu)||[];
export const charList=s=>Array.from(String(s).normalize("NFC"));
function sample(x,limit=8){return Array.isArray(x)?x.slice(0,limit):[]}
function normalizeTokens(v,mode){
  if(Array.isArray(v)){
    if(v.some(t=>typeof t!=="string"||t.length>256))throw Error("Bad tokens");
    return v.slice();
  }
  if(typeof v!=="string")throw Error("Text/array required");
  return mode==="char"?charList(v):tokenList(v);
}
const entropy=counts=>{
  const n=counts.reduce((a,b)=>a+b,0);
  return n?counts.reduce((sum,c)=>{const p=c/n;return sum-(p?p*Math.log2(p):0);},0):0;
};
const cmp=(a,b)=>b.count-a.count||a.to-b.to;
const edgeId=(a,b)=>a+"|"+b;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0};
function seedRandom(seed){
  let n=(Number(seed)>>>0)||1;
  return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296};
}
export class CrossWorldAtlas{
  constructor({order=2,mode="token",maxStates=32000,maxEdges=180000,
    maxPaths=24,maxProvenance=8,keepFailures=300}={}){
    if(!valid(order,2,3)||!["token","char"].includes(mode)||
      !valid(maxStates,32,500000)||!valid(maxEdges,32,2000000)||
      !valid(maxPaths,1,100)||!valid(maxProvenance,1,32)||
      !valid(keepFailures,1,10000))throw Error("Bad observed atlas limits");
    this.config={order,mode,maxStates,maxEdges,maxPaths,maxProvenance,keepFailures};
    this.states=[];this.index=new Map();this.edges=new Map();this.out=new Map();
    this.documents=0;this.observedTransitions=0;this.skippedStates=0;
    this.skippedEdges=0;this.scores={covered:0,correct:0,missed:0};
    this.ledger=[];this.failed=[];this.last=null;
  }
  _state(seq,create=false){
    const toks=normalizeTokens(seq,this.config.mode);
    if(toks.length!==this.config.order)throw Error("Wrong context order");
    const k=key(toks);const id=this.index.get(k);
    if(id!==undefined)return id;
    if(!create)return null;
    if(this.states.length>=this.config.maxStates){this.skippedStates++;return null;}
    const n=this.states.length;
    this.index.set(k,n);this.states.push({id:n,tokens:toks,count:0,
      incoming:0,outgoing:0,docs:0});
    return n;
  }
  _window(tokens){return tokens.length<this.config.order?[]:
    Array.from({length:tokens.length-this.config.order+1},(_,i)=>
      tokens.slice(i,i+this.config.order));}
  _edge(a,b,docId){
    if(a===null||b===null)return false;
    const k=edgeId(a,b);let edge=this.edges.get(k);
    if(!edge){
      if(this.edges.size>=this.config.maxEdges){this.skippedEdges++;return false;}
      edge={from:a,to:b,count:0,sources:[]};this.edges.set(k,edge);
      if(!this.out.has(a))this.out.set(a,new Map());
      this.out.get(a).set(b,edge);
    }
    edge.count++;this.observedTransitions++;
    if(!edge.sources.some(s=>s.id===docId)&&edge.sources.length<this.config.maxProvenance)
      edge.sources.push({id:docId,firstSeenAtDocument:this.documents});
    this.states[a].outgoing++;this.states[b].incoming++;
    return true;
  }
  // Only observations from full previously lived documents create edges.
  observe(document,{id=null}={}){
    const tokens=normalizeTokens(document,this.config.mode);
    const source=id===null?"document-"+this.documents:String(id);
    const beforeStates=this.states.length,beforeEdges=this.edges.size;
    const predicted=this.evaluateFrozen(document,{source,record:false});
    const windows=this._window(tokens);
    const ids=windows.map(w=>this._state(w,true));
    for(const i of ids)if(i!==null)this.states[i].count++;
    let stored=0;
    for(let i=1;i<ids.length;i++)if(this._edge(ids[i-1],ids[i],source))stored++;
    this.documents++;
    this.last={source,observedTokens:tokens.length,storedTransitions:stored,
      stateCountAdded:this.states.length-beforeStates,
      edgeCountAdded:this.edges.size-beforeEdges,
      preIngestPrediction:predicted,
      truncated:this.skippedStates>0||this.skippedEdges>0};
    return clone(this.last);
  }
  // Return all next *observed* contexts, including contextual ambiguity and
  // source documents, not just the most frequent token.
  outgoing(context,{limit=128}={}){
    const id=this._state(context,false);
    if(id===null)return [];
    const edges=[...(this.out.get(id)?.values()||[])].sort(cmp);
    return edges.slice(0,limit).map(e=>({
      state:this.states[e.to].tokens.slice(),nextToken:this.states[e.to].tokens.at(-1),
      count:e.count,sources:clone(e.sources),from:id,to:e.to
    }));
  }
  _diagnosticContext(tokens){
    const id=this._state(tokens,false);
    if(id===null)return {kind:"MISSING_CONTEXT",context:tokens.slice(),known:false,
      outgoing:[],entropy:null};
    const outs=this.outgoing(tokens);
    return {kind:outs.length?"OBSERVED_CHOICES":"DEAD_END",
      context:tokens.slice(),known:true,id,
      outgoing:outs,entropy:entropy(outs.map(x=>x.count))};
  }
  // FROZEN evaluation: score actual next characters/tokens only AFTER all
  // predictions have been produced, and do NOT add the current document.
  evaluateFrozen(document,{source=null,record=false,maxRows=300}={}){
    const before=JSON.stringify([this.documents,this.states.length,this.edges.size,
      this.observedTransitions]);
    const tokens=normalizeTokens(document,this.config.mode);
    const rows=[];
    let correct=0,covered=0,possible=0;
    for(let i=this.config.order;i<tokens.length;i++){
      const from=tokens.slice(i-this.config.order,i),alternatives=this.outgoing(from);
      const guess=alternatives[0]?.nextToken??null,actual=tokens[i],known=guess!==null;
      if(known){covered++;correct+=Number(guess===actual);}
      possible++;
      if(rows.length<maxRows&&(guess!==actual||rows.length<12)){
        const diagnostic=this._diagnosticContext(from);
        rows.push({at:i,context:from,expected:actual,predicted:guess,
          correct:known&&guess===actual,coverage:known,
          reason:!known?diagnostic.kind:
            alternatives.some(x=>x.nextToken===actual)?"WRONG_BRANCH_RANK":"UNOBSERVED_EDGE",
          candidates:alternatives.slice(0,12),entropy:diagnostic.entropy});
      }
    }
    const result={frozen:true,source,order:this.config.order,mode:this.config.mode,
      tokens:tokens.length,total:possible,covered,correct,
      coverage:possible?covered/possible:null,
      accuracyCovered:covered?correct/covered:null,
      accuracyAll:possible?correct/possible:null,
      missing:possible-covered,wrong:covered-correct,
      rows,truncatedDiagnostics:possible>maxRows,
      graphCompleteForObservedEdges:!this.skippedStates&&!this.skippedEdges,
      note:"Observed next-token/character benchmark, not semantic Q/A accuracy"};
    if(before!==JSON.stringify([this.documents,this.states.length,this.edges.size,
      this.observedTransitions]))throw Error("Frozen evaluator mutated observed atlas");
    if(record){
      this.scores.covered+=covered;this.scores.correct+=correct;
      this.scores.missed+=possible-covered;
    }
    return result;
  }
  // A complete known-goal search on the previously observed transition graph.
  // Only the k-token start and the k-token goal are provided to the search.
  // No hidden path, heldout middle, or teacher token is supplied.
  plan(start,goal,{maxSteps=512,seed=0,maxPaths=this.config.maxPaths,
    maxVisited=50000}={}){
    if(!valid(maxSteps,1,10000)||!valid(maxPaths,1,100)||
      !valid(maxVisited,8,500000))throw Error("Invalid graph exploration budget");
    const source=normalizeTokens(start,this.config.mode),
      target=normalizeTokens(goal,this.config.mode);
    if(source.length!==this.config.order||target.length!==this.config.order)
      throw Error("Start and goal must contain exactly order tokens");
    const startId=this._state(source,false),goalId=this._state(target,false);
    const diagnosis={unknownStart:startId===null,unknownGoal:goalId===null,
      capacityTruncated:this.skippedEdges>0||this.skippedStates>0,
      observedStates:this.states.length,observedEdges:this.edges.size};
    if(startId===null||goalId===null)return {
      found:false,reason:startId===null?"UNKNOWN_START":"UNKNOWN_GOAL",
      initialPrediction:null,paths:[],explored:0,diagnosis,
      frontier:this._diagnosticContext(source),remainingUnknown:true
    };
    // Reverse breadth-first field on the FULL observed finite atlas, NOT on
    // a sampled 2D display. Every recorded edge is considered.
    const reverse=new Map();
    for(const e of this.edges.values()){
      if(!reverse.has(e.to))reverse.set(e.to,[]);
      reverse.get(e.to).push(e.from);
    }
    const dist=new Map([[goalId,0]]),queue=[goalId];
    for(let h=0;h<queue.length&&h<maxVisited;h++){
      const node=queue[h],d=dist.get(node);
      for(const from of reverse.get(node)||[]){
        if(!dist.has(from)){dist.set(from,d+1);queue.push(from);}
      }
    }
    diagnosis.reverseReachable=dist.size;
    diagnosis.reverseBudgetReached=queue.length>maxVisited;
    const attraction=(id)=>dist.has(id)?Math.pow(.97,dist.get(id)):0;
    const paths=[],rejected=[],rand=seedRandom(seed),steps=Math.min(maxSteps,10000);
    if(dist.has(startId)){
      const traverse=(at,route,links,visited)=>{
        if(paths.length>=maxPaths)return;
        if(at===goalId){
          paths.push({states:route.map(i=>this.states[i].tokens.slice()),
            tokens:[...this.states[route[0]].tokens,
              ...route.slice(1).map(i=>this.states[i].tokens.at(-1))],
            links:clone(links),steps:links.length,
            predictedFirstBeforeAction:true,
            everyEdgeObserved:links.every(x=>x.sources.length>0)});
          return;
        }
        if(links.length>=steps)return;
        const options=[...(this.out.get(at)?.values()||[])].filter(e=>
          dist.has(e.to)&&dist.get(e.to)===dist.get(at)-1&&!visited.has(e.to));
        options.sort(cmp);
        // Optional seeded noise only reorders EQUAL-LENGTH observed routes.
        if(seed&&options.length>1){
          for(let j=options.length-1;j>0;j--){
            const k=Math.floor(rand()*(j+1));
            [options[j],options[k]]=[options[k],options[j]];
          }
        }
        for(const e of options){
          if(paths.length>=maxPaths)break;
          traverse(e.to,[...route,e.to],
            [...links,{from:at,to:e.to,
              transform:{kind:"APPEND_OBSERVED",token:this.states[e.to].tokens.at(-1)},
              count:e.count,sources:clone(e.sources),
              fieldBefore:attraction(at),fieldAfter:attraction(e.to)}],
            new Set([...visited,e.to]));
        }
      };
      traverse(startId,[startId],[],new Set([startId]));
    }
    let frontier=null;
    if(!paths.length){
      // Explain WHY a path couldn't be found; inspect only actually reachable
      // forward states and retain their real outgoing edges.
      const seen=new Set([startId]),todo=[startId];
      let blockedAt=null;
      for(let i=0;i<todo.length&&i<maxVisited;i++){
        const n=todo[i],edges=[...(this.out.get(n)?.values()||[])].sort(cmp);
        if(!edges.length&&!blockedAt)blockedAt=n;
        for(const e of edges)if(!seen.has(e.to)){
          seen.add(e.to);todo.push(e.to);
        }
      }
      diagnosis.forwardReachable=seen.size;
      frontier=this._diagnosticContext(this.states[blockedAt??startId].tokens);
      // These are observed alternatives at the failed frontier, not invented
      // missing edges or target-side transformations.
      for(const e of (this.out.get(startId)?.values()||[])){
        rejected.push({from:this.states[startId].tokens,
          to:this.states[e.to].tokens,reason:"NO_OBSERVED_ROUTE_TO_GOAL",
          sources:clone(e.sources)});
        if(rejected.length>=12)break;
      }
    }
    const result={found:paths.length>0,
      reason:paths.length?"OBSERVED_COMPLETE_GOAL_PATH":
        !dist.has(startId)?"NO_OBSERVED_ROUTE_TO_GOAL":"PATH_LIMIT_OR_BUDGET",
      start:source,goal:target,paths,initialPrediction:paths[0]||null,
      alternatives:paths.length,explored:dist.size,diagnosis,frontier,
      rejected,allObservedShortestPathsEnumerated:
        paths.length<maxPaths&&!diagnosis.reverseBudgetReached,
      remainingUnknown:!paths.length||this.skippedEdges>0||this.skippedStates>0,
      mathematicalField:"V(goal)=1, V(s)=0.97^d_observed(s,goal)",
      note:"Known-goal reachable observed context atlas, not automatic semantic answer inference"};
    return result;
  }
  // Counterfactual audit: remove one EXISTING observed edge on a CLONED atlas,
  // then recompute the route; never edit model or original training checkpoint.
  withoutEdge(from,to,start,goal){
    const a=this._state(from,false),b=this._state(to,false);
    if(a===null||b===null||!this.edges.has(edgeId(a,b)))
      return {removed:false,reason:"EDGE_NOT_OBSERVED"};
    const copy=CrossWorldAtlas.restore(this.export());
    const e=copy.edges.get(edgeId(a,b));copy.edges.delete(edgeId(a,b));
    copy.out.get(a)?.delete(b);
    const result=copy.plan(start,goal);
    return {removed:true,edge:{from,to,count:e.count,sources:clone(e.sources)},
      stillReachable:result.found,remainingPaths:result.paths.length,
      newReason:result.reason,frontier:result.frontier,
      originalStillIntact:this.edges.has(edgeId(a,b))};
  }
  auditTrace(document,{source=null,maxSteps=512}={}){
    const tokens=normalizeTokens(document,this.config.mode);
    const prediction=this.evaluateFrozen(document,{source});
    if(tokens.length<this.config.order)return {
      source,reason:"TOO_SHORT",frozen:true,characters:prediction};
    const start=tokens.slice(0,this.config.order),
      goal=tokens.slice(-this.config.order);
    const plan=this.plan(start,goal,{maxSteps});
    const actualWindow=this._window(tokens);
    const predictedPath=plan.initialPrediction?.states||[];
    let prefix=0;
    while(prefix<Math.min(predictedPath.length,actualWindow.length)&&
      key(predictedPath[prefix])===key(actualWindow[prefix]))prefix++;
    const divergent=prefix<actualWindow.length?{
      context:actualWindow[Math.max(0,prefix-1)],
      expectedNext:actualWindow[prefix],
      predictedNext:predictedPath[prefix]||null,
      atWindow:prefix,
      reason:plan.found?"VALID_ALTERNATIVE_PATH_DIVERGED":"PATH_NOT_FOUND"
    }:null;
    const outcome={source,frozen:true,actualLength:tokens.length,
      initialFound:plan.found,firstPathExactlyMatchesActual:
        plan.found&&predictedPath.length===actualWindow.length&&prefix===actualWindow.length,
      firstPathPrefixStates:prefix,actualSteps:Math.max(0,actualWindow.length-1),
      predictedSteps:plan.initialPrediction?.steps??null,
      knownGoalGiven:true,unknownInteriorWithheld:true,
      candidatePaths:plan.paths.length,
      predicted:plan.initialPrediction,divergent,
      missingEdges:prediction.rows.filter(x=>x.reason==="UNOBSERVED_EDGE"||
        x.reason==="MISSING_CONTEXT"||x.reason==="DEAD_END"),
      ambiguousBranches:prediction.rows.filter(x=>x.reason==="WRONG_BRANCH_RANK"),
      performance:prediction,plan,
      statement:"No goal inference: start/goal come from the heldout document; only prior observed graph edges are used to predict the full path."};
    return outcome;
  }
  export(){
    return {version:1,config:{...this.config},documents:this.documents,
      states:this.states.map(s=>({...s,tokens:s.tokens.slice()})),
      edges:[...this.edges.values()].map(clone),
      observedTransitions:this.observedTransitions,skippedStates:this.skippedStates,
      skippedEdges:this.skippedEdges,scores:{...this.scores},
      last:this.last?clone(this.last):null};
  }
  static restore(data){
    if(data?.version!==1||!Array.isArray(data.states)||!Array.isArray(data.edges))
      throw Error("Invalid cross-world atlas checkpoint");
    const a=new CrossWorldAtlas(data.config);
    if(data.states.length>a.config.maxStates||data.edges.length>a.config.maxEdges)
      throw Error("Atlas exceeds its storage limits");
    a.states=data.states.map((s,i)=>{if(s.id!==i)throw Error("Invalid atlas node IDs");return {...s,tokens:s.tokens.slice()};});
    a.index=new Map(a.states.map(s=>[key(s.tokens),s.id]));
    for(const e of data.edges){
      if(!a.states[e.from]||!a.states[e.to]||!valid(e.count,1,Number.MAX_SAFE_INTEGER))
        throw Error("Invalid observed atlas edge");
      const x=clone(e);a.edges.set(edgeId(e.from,e.to),x);
      if(!a.out.has(e.from))a.out.set(e.from,new Map());
      a.out.get(e.from).set(e.to,x);
    }
    a.documents=data.documents||0;a.observedTransitions=data.observedTransitions||0;
    a.skippedStates=data.skippedStates||0;a.skippedEdges=data.skippedEdges||0;
    a.scores={...a.scores,...data.scores};a.last=data.last||null;
    return a;
  }
  snapshot({maxNodes=140,maxEdges=600}={}){
    const important=this.states.slice().sort((a,b)=>b.outgoing-a.outgoing).slice(0,maxNodes);
    const seen=new Set(important.map(s=>s.id));
    const edges=[...this.edges.values()].filter(e=>seen.has(e.from)&&seen.has(e.to))
      .sort(cmp).slice(0,maxEdges);
    return {version:1,mode:this.config.mode,order:this.config.order,
      documents:this.documents,observedStates:this.states.length,
      observedEdges:this.edges.size,observedTransitions:this.observedTransitions,
      capacityTruncated:!!(this.skippedEdges||this.skippedStates),
      skippedStates:this.skippedStates,skippedEdges:this.skippedEdges,
      visible:{nodes:important.map(s=>({id:s.id,tokens:s.tokens,count:s.count})),
        edges:edges.map(e=>({from:e.from,to:e.to,count:e.count,sources:sample(e.sources,3)}))},
      last:this.last?clone(this.last):null,
      note:"Full internal observed graph can be restored/exported; displayed sample is limited and does not constitute a complete language universe."};
  }
}
