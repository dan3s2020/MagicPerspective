// The ORIGINAL V17 Brain owns this learned cross-world action atlas.
// Controlled, FULLY EXPOSED finite hypercube labyrinths, not synthetic path
// animations: 2^7 positions and every legal edge/wall are available BEFORE
// planning. Ambient dimensions may be 16..2048+, but ONLY seven axes are
// active. Never claim this enumerates the complete 2^2048 hypercube.
// The simulator's action-to-axis physics is private; the Brain receives
// (before, action, after) from real interventions and must learn the mapping.
// This is a controlled cross-world transfer test, NOT free-form language.
const HIDDEN = new WeakMap();
const flip = (bits, axis) => bits ^ (1 << axis);
const id = bits => "v"+bits;
const uint = n => Math.trunc(n) >>> 0;
const rng = seed => {let x=uint(seed)||1;return()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);};
const shuffle = (values, r) => {
  const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
};
const key = v => JSON.stringify(v);
const activeAxesOf = (dimensions, count=7) => {
  if(!Number.isInteger(dimensions)||dimensions<16||dimensions>8192)
    throw Error("Ambient dimensions must be integer 16..8192");
  if(!Number.isInteger(count)||count<2||count>12)
    throw Error("Only 2..12 active axes may be enumerated as a COMPLETE finite world");
  // Rational dimension positions. They are not the simulator's hidden action
  // mapping, nor a prediction policy. The state coordinates are sensory data.
  const arr=Array.from({length:count},(_,i)=>Math.floor((i+1)*dimensions/(count+1)));
  if(new Set(arr).size!==count)throw Error("Active coordinates overlap");
  return arr;
};
const bfs = (graph,start) => {
  const dist=new Map([[start,0]]),parent=new Map(),q=[start];
  for(let k=0;k<q.length;k++){
    const u=q[k];
    for(const e of graph.get(u)||[]){
      if(dist.has(e.to))continue;
      dist.set(e.to,dist.get(u)+1);parent.set(e.to,{node:u,edge:e});q.push(e.to);
    }
  }
  return {dist,parent,visited:q};
};
const pathFrom = (parents,start,goal) => {
  const nodes=[goal],edges=[];let p=goal;
  while(p!==start){const prev=parents.get(p);if(!prev)return null;edges.push(prev.edge);p=prev.node;nodes.push(p);}
  nodes.reverse();edges.reverse();return {nodes,edges};
};
const graphOf = view => {
  const map=new Map(view.vertices.filter(v=>!v.wall).map(v=>[v.id,[]]));
  for(const e of view.links){
    if(!map.has(e.from)||!map.has(e.to))throw Error("Malformed full observed graph");
    map.get(e.from).push({to:e.to,axis:e.axis});
    map.get(e.to).push({to:e.from,axis:e.axis});
  }
  return map;
};

export class CompleteXDWorld {
  constructor({dimensions=64,axes=7,seed=11,physicsSeed=17,wallRate=.17}={}){
    this.dimensions=dimensions;this.axes=axes;this.seed=seed;
    this.activeDimensions=activeAxesOf(dimensions,axes);
    this.start=id(0);this.goal=id((1<<axes)-1);
    const r=rng(seed*19937+123),total=1<<axes;
    const walls=new Set();
    for(let m=1;m<total-1;m++){
      if((m&(m-1))===0)continue; // all root interventions must be available
      if(r()<Math.max(0,Math.min(.4,wallRate)))walls.add(m);
    }
    const connected = () => {
      const q=[0],seen=new Set(q);
      for(let i=0;i<q.length;i++){
        for(let a=0;a<axes;a++){
          const n=flip(q[i],a);
          if(walls.has(n)||seen.has(n))continue;
          seen.add(n);q.push(n);
        }
      }
      return seen.has(total-1);
    };
    // World topology is explicitly COMPLETE (including walls). Guarantee
    // reachable goals, but do not give the learner the correct route.
    if(!connected())walls.clear();
    this.vertices=Array.from({length:total},(_,mask)=>({
      id:id(mask),mask,
      coordinates:this.activeDimensions.filter((_,a)=>(mask&(1<<a))!==0),
      wall:walls.has(mask)
    }));
    this.links=[];
    for(let mask=0;mask<total;mask++){
      if(walls.has(mask))continue;
      for(let a=0;a<axes;a++){
        const next=flip(mask,a);
        if(next<=mask||walls.has(next))continue;
        this.links.push({from:id(mask),to:id(next),axis:this.activeDimensions[a]});
      }
    }
    // PRIVATE true physics: button labels are shuffled. None of these labels
    // or the seed is exposed through view(); only interventions reveal it.
    const actionAxes=shuffle(this.activeDimensions,rng(physicsSeed));
    HIDDEN.set(this,{axisOf:new Map(actionAxes.map((axis,i)=>["act:"+i,axis])),
      walls,lookup:new Map(this.activeDimensions.map((v,i)=>[v,i]))});
  }
  actions(){return Array.from({length:this.axes},(_,i)=>"act:"+i);}
  view(){
    return {kind:"complete-finite-xD-binary-labyrinth",
      ambientDimensions:this.dimensions,activeRank:this.axes,
      finiteStateCount:this.vertices.length,
      completeFiniteMap:true,completeFullHypercube:false,
      start:this.start,goal:this.goal,seed:this.seed,
      actions:this.actions(),vertices:this.vertices.map(x=>({...x,coordinates:x.coordinates.slice()})),
      links:this.links.map(x=>({...x})),allWallsExposed:true,
      noOracleSolutionPathSupplied:true};
  }
  step(before,action){
    const H=HIDDEN.get(this),axis=H.axisOf.get(action),node=this.vertices.find(v=>v.id===before);
    if(axis===undefined||!node)throw Error("Unknown action or outside finite world");
    const at=H.lookup.get(axis),mask=flip(node.mask,at),to=this.vertices[mask];
    if(node.wall||to.wall)return {before,action,after:before,moved:false,blocked:true,
      feedback:"wall-observed-through-action"};
    return {before,action,after:to.id,moved:true,blocked:false,
      feedback:"position-changed-observed-through-action"};
  }
  oracleDistance(){return bfs(graphOf(this.view()),this.start).dist.get(this.goal)??null;}
}

export class LearnedXDActionAtlas {
  constructor({maxWorldRecords=12}={}){
    this.maxWorldRecords=Math.max(1,Math.min(32,maxWorldRecords));
    this.effects=new Map(); // action -> learned axis fraction (numerator/denominator)
    this.observations=0;this.trainedWorlds=0;this.testedWorlds=0;
    this.solved=0;this.unsolved=0;this.predictedEdges=0;
    this.correctEdges=0;this.last=null;this.worldRecords=[];
    this.missingByReason={};this.version=1;
  }
  inferAxis(view,before,after){
    const x=view.vertices.find(v=>v.id===before),y=view.vertices.find(v=>v.id===after);
    if(!x||!y)return {valid:false,reason:"position-outside-exposed-full-world"};
    const sx=new Set(x.coordinates),sy=new Set(y.coordinates);
    const diffs=[...sx].filter(a=>!sy.has(a)).concat([...sy].filter(a=>!sx.has(a)));
    if(diffs.length!==1)return {valid:false,reason:diffs.length===0?
      "unchanged-position-or-wall":"multi-axis-or-unidentified-transition"};
    const axis=diffs[0];
    if(!view.links.some(e=>(e.from===before&&e.to===after||e.to===before&&e.from===after)&&e.axis===axis))
      return {valid:false,reason:"transition-not-in-complete-physical-map"};
    return {valid:true,axis,ratio:axis/view.ambientDimensions};
  }
  observe(view,action,event){
    this.observations++;
    const e=this.inferAxis(view,event.before,event.after);
    if(!e.valid){
      this.missingByReason[e.reason]=(this.missingByReason[e.reason]||0)+1;
      return {learned:false,action,reason:e.reason};
    }
    const records=this.effects.get(action)||[];
    const prior=records.find(x=>Math.abs(x.ratio-e.ratio)<1e-12);
    if(prior){prior.count++;if(!prior.seeds.includes(view.seed))prior.seeds.push(view.seed);}
    else records.push({ratio:e.ratio,count:1,seeds:[view.seed],
      firstObserved:{before:event.before,after:event.after,
        dimensions:view.ambientDimensions,axis:e.axis,seed:view.seed}});
    this.effects.set(action,records);
    return {learned:true,action,dimension:e.axis,ratio:e.ratio,
      families:records.length,previousObservationCount:prior?.count??0};
  }
  binding(action,D){
    const records=this.effects.get(action)||[];
    if(!records.length)return {ready:false,reason:"unlearned-action-effect"};
    const sorted=records.slice().sort((a,b)=>b.count-a.count);
    if(sorted.length>1&&sorted[0].count<2*sorted[1].count)
      return {ready:false,reason:"contradictory-action-transformations",variants:records.length};
    const expected=Math.round(sorted[0].ratio*D);
    if(Math.abs(sorted[0].ratio*D-expected)>1e-9)
      return {ready:false,reason:"fractional-axis-outside-target-lattice"};
    return {ready:true,action,axis:expected,support:sorted[0].count,
      observedWorlds:sorted[0].seeds.slice(),inferredFraction:sorted[0].ratio,
      origin:sorted[0].firstObserved};
  }
  prepare(view){
    // Every finite vertex (and every legal edge/wall) is given to the model,
    // but no secret action mapping and no optimal path are supplied.
    if(!view.completeFiniteMap||view.completeFullHypercube)
      throw Error("Only explicit full finite map accepted");
    const actionByAxis=new Map(),undiscovered=[];
    for(const act of view.actions){
      const b=this.binding(act,view.ambientDimensions);
      if(b.ready) {
        const previous=actionByAxis.get(b.axis);
        if(previous) {
          undiscovered.push({action:act,reason:"ambiguous-two-actions-same-axis",axis:b.axis});
          actionByAxis.delete(b.axis);
        } else actionByAxis.set(b.axis,b);
      }else undiscovered.push({action:act,reason:b.reason});
    }
    return {actionByAxis,undiscovered};
  }
  plan(view,{maxExpanded=100000}={}){
    const {actionByAxis,undiscovered}=this.prepare(view),physical=graphOf(view);
    const q=[view.start],seen=new Set(q),parent=new Map();
    const explored=[],missing=[],rejected=[];
    let found=view.start===view.goal,expanded=0;
    for(let head=0;head<q.length&&!found&&head<maxExpanded;head++){
      const node=q[head];expanded++;
      for(const edge of physical.get(node)||[]){
        const learned=actionByAxis.get(edge.axis);
        if(!learned){
          const x={from:node,to:edge.to,axis:edge.axis,
            reason:"no-learned-action-for-exposed-dimension"};
          missing.push(x);
          continue;
        }
        const evidence={action:learned.action,axis:learned.axis,
          support:learned.support,worlds:learned.observedWorlds,
          learnedFraction:learned.inferredFraction};
        const row={from:node,to:edge.to,axis:edge.axis,
          action:learned.action,reason:"learned-observed-action-effect",
          evidence,visited:seen.has(edge.to)};
        explored.push(row);
        if(seen.has(edge.to))continue;
        seen.add(edge.to);parent.set(edge.to,{node,edge:row});q.push(edge.to);
        if(edge.to===view.goal){found=true;break;}
      }
    }
    // Counterfactual: the full map has a path irrespective of whether the
    // action bindings permit the learner to execute it. This is an EVALUATOR
    // diagnostic, not an input to the learned planning process above.
    const phys=bfs(physical,view.start),physicalDistance=phys.dist.get(view.goal)??null;
    const p=found?pathFrom(parent,view.start,view.goal):null;
    const missingAxes=[...new Set(missing.map(e=>e.axis))];
    const reason=found?"path-found":physicalDistance===null?"physically-disconnected":
      missingAxes.length?"missing-learned-transformations":
      "learned-mapping-inconsistent-or-search-budget";
    const atlas={
      source:"FULL given finite world topology + action effects TRANSFERRED from past worlds",
      fullWorld:view,
      initialPredictedSolution:found?p.nodes:[],
      path:p?.edges||[],
      allExploredEdges:explored,
      allMissingActionEdges:missing,
      allKnownPhysicalEdges:view.links,
      blockedWalls:view.vertices.filter(x=>x.wall).map(x=>x.id),
      rejected,
      unexploredPhysicalEdges:Math.max(0,view.links.length-Math.floor(explored.length/2)),
      visitedStates:[...seen],missingAxes,unidentifiedActions:undiscovered,
      totalFiniteStates:view.finiteStateCount,physicalEdges:view.links.length,
      candidateActionEdges:explored.length,expanded,found,reason,
      pathLength:p?.edges.length??null,
      evaluatorPhysicalShortestPath:physicalDistance,
      predictionBeforeExecution:true,answerRouteWasNotProvided:true,
      hypothesesNotEstablished:!found&&missing.length>0,
      note:"Complete sparse finite maze with 7 active axes in an ambient xD coordinate space; NOT all 2^D hypercube states."
    };
    return atlas;
  }
  execute(world,atlas,{learn=false}={}){
    if(!atlas?.found)return {solved:false,reason:atlas?.reason||"missing-atlas",frames:[],attempted:0};
    let current=world.start;const frames=[];let correct=0;
    for(let i=0;i<atlas.path.length;i++){
      const step=atlas.path[i],actual=world.step(current,step.action);
      const good=actual.after===step.to&&actual.moved;
      this.predictedEdges++;this.correctEdges+=Number(good);correct+=Number(good);
      frames.push({step:i,from:current,action:step.action,
        predictedAfter:step.to,observedAfter:actual.after,
        correct:good,evidence:step.evidence,
        reason:good?"physical-effect-matched-learned-world-model":
          actual.blocked?"unexpected-physical-wall":"wrong-transferred-action-effect"});
      if(learn)this.observe(world.view(),step.action,actual);
      current=actual.after;
      if(!good)break;
    }
    const solved=current===world.goal;
    return {solved,correct,attempted:frames.length,frames,
      final:current,goal:world.goal,
      reason:solved?"executed-planned-solution":
        frames.at(-1)?.reason||"goal-unreachable"};
  }
  record(world,plan,execution,{split="train",interventions=[]}={}){
    const result={split,dimensions:world.dimensions,activeRank:world.axes,
      seed:world.seed,interventions:interventions.slice(),plan,
      execution,at:Date.now()};
    if(split==="train")this.trainedWorlds++;else this.testedWorlds++;
    this.solved+=Number(execution.solved);this.unsolved+=Number(!execution.solved);
    this.worldRecords.push(result);
    if(this.worldRecords.length>this.maxWorldRecords)this.worldRecords.shift();
    this.last=result;
    return result;
  }
  trainWorld(world,{actions=world.actions()}={}){
    const view=world.view(),interventions=[];
    // One genuine simulator action from the root per assigned action. No
    // path, hidden world mapping or goal label is passed to the learner.
    for(const action of actions){
      const observed=world.step(view.start,action);
      const learned=this.observe(view,action,observed);
      interventions.push({before:observed.before,action,
        after:observed.after,moved:observed.moved,learned});
    }
    const plan=this.plan(view),execution=this.execute(world,plan);
    return this.record(world,plan,execution,{split:"train",interventions});
  }
  testFrozen(world){
    const before=JSON.stringify([...this.effects]);
    const plan=this.plan(world.view()),execution=this.execute(world,plan);
    if(JSON.stringify([...this.effects])!==before)
      throw Error("Frozen held-out world modified transferred action memories");
    return this.record(world,plan,execution,{split:"test"});
  }
  summary({includeWorld=false}={}){
    const details=[...this.effects].map(([action,records])=>({
      action,candidates:records.map(v=>({...v,seeds:v.seeds.slice()}))}));
    const last=this.last?{
      split:this.last.split,dimensions:this.last.dimensions,
      activeRank:this.last.activeRank,seed:this.last.seed,
      solved:this.last.execution.solved,reason:this.last.execution.reason,
      knownActions:details.length,planningReason:this.last.plan.reason,
      physicalShortestPath:this.last.plan.evaluatorPhysicalShortestPath,
      plannedSteps:this.last.plan.pathLength,
      missedDirections:this.last.plan.missingAxes,
      correctActions:this.last.execution.correct,
      attemptedActions:this.last.execution.attempted,
      atlas:this.last.plan,
      execution:this.last.execution
    }:null;
    if(last&&!includeWorld)delete last.atlas.fullWorld;
    return {version:this.version,
      learnedFromRealWorldInterventions:true,actions:details,
      observations:this.observations,trainedWorlds:this.trainedWorlds,
      testedWorlds:this.testedWorlds,solved:this.solved,unsolved:this.unsolved,
      predictedEdges:this.predictedEdges,correctEdges:this.correctEdges,
      missingReasons:{...this.missingByReason},last};
  }
}
