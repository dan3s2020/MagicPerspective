// Finite n-dimensional causal atlas. Persistent observations from many worlds.
// Only observed (state, action, next-state) triples enter fit(). No oracle,
// no hidden environment simulator, no heldout reference response.
export const PRNG=(seed=1)=>{let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};
export const tuple=(n,dims,side)=>{const a=Array(dims);for(let i=dims-1;i>=0;i--){a[i]=n%side;n=Math.floor(n/side)}return a};
export const code=(v,side)=>v.reduce((n,x)=>n*side+x,0);
export const advance=(s,d,side,dims)=>code(tuple(s,dims,side).map((x,i)=>(x+d[i]+side)%side),side);
const key=v=>v.join(',');
const distribution=rows=>{let m=new Map();for(const r of rows)m.set(r.label,(m.get(r.label)||0)+1);return m};
const winner=rows=>{const scores=[...distribution(rows)].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return scores.length?{label:scores[0][0],count:scores[0][1],countTotal:rows.length,options:scores}:null};
const gini=rows=>{if(!rows.length)return 0;let q=0;for(const n of distribution(rows).values())q+=(n/rows.length)**2;return 1-q};
const conditions=(dims,side)=>{const a=[];for(let j=0;j<dims;j++){a.push({name:'axis-'+j+'-parity',test:x=>x[j]%2===0});for(let v=0;v<side;v++)a.push({name:'axis-'+j+'-eq-'+v,test:x=>x[j]===v})}return a};
export class CrossWorldAtlas {
 constructor({dims=4,side=4,actions=[],minLeaf=6,minGain=.01}={}){
  if(!Number.isInteger(dims)||dims<2||dims>8||!Number.isInteger(side)||side<2||side>7||side**dims>100000)throw Error('Only bounded finite atlas <=100000 states');
  this.dims=dims;this.side=side;this.actions=[...actions];this.minLeaf=minLeaf;this.minGain=minGain;
  this.events=[];this.models=new Map();this.worlds=new Set();this.revision=0;
 }
 observe({world,from,action,to,provenance=null}){
  if(!this.actions.includes(action))throw Error('Unknown action '+action);
  const n=this.side**this.dims;
  if(!Number.isInteger(from)||from<0||from>=n||!Number.isInteger(to)||to<0||to>=n)throw Error('Invalid state');
  const v=tuple(from,this.dims,this.side),w=tuple(to,this.dims,this.side);
  const delta=w.map((x,i)=>(x-v[i]+this.side)%this.side);
  const e={id:this.events.length,world:String(world),from,action,to,context:v,delta,
   label:key(delta),provenance:provenance||'world:'+world+'/observation:'+this.events.length};
  this.events.push(e);this.worlds.add(e.world);this.revision++;return e;
 }
 ingestTextDocument(document,{world="unknown"}={}){
  if(typeof document!=="string")throw Error("Training document must be text");
  let accepted=0,ignored=0;const evidenceIds=[];
  const pattern=new RegExp("\\(\\s*(\\d+(?:\\s*,\\s*\\d+){"+(this.dims-1)+"})\\s*\\)","g");
  for(const [index,line]of document.split("\n").entries()){
   const found=[...line.matchAll(pattern)].map(x=>x[1].split(",").map(Number));
   const labels=this.actions.filter(a=>new RegExp("\\b"+a.replace(/[^a-z0-9_-]/gi,"")+"\\b","i").test(line));
   if(found.length!==2||labels.length!==1){if(line.trim())ignored++;continue}
   if(found.some(v=>v.length!==this.dims||v.some(x=>x<0||x>=this.side))){ignored++;continue}
   const event=this.observe({world,from:code(found[0],this.side),action:labels[0],to:code(found[1],this.side),
    provenance:"document:"+world+"/line:"+index});
   evidenceIds.push(event.id);accepted++;
  }
  return{accepted,ignored,evidenceIds,world:String(world)};
 }
 fit({allowContext=true}={}){
  this.models=new Map();this.allowContext=allowContext;
  const tests=conditions(this.dims,this.side);
  for(const action of this.actions){
   const rows=this.events.filter(e=>e.action===action);
   if(!rows.length){this.models.set(action,{ready:false,action,examples:0,reason:'NO_OBSERVED_TRANSITION'});continue}
   const base=winner(rows),unconditionalGini=gini(rows);let best=null;
   if(allowContext)for(const candidate of tests){
    const left=rows.filter(e=>candidate.test(e.context)),right=rows.filter(e=>!candidate.test(e.context));
    if(left.length<this.minLeaf||right.length<this.minLeaf)continue;
    const gain=unconditionalGini-(left.length*gini(left)+right.length*gini(right))/rows.length;
    if(!best||gain>best.gain+1e-10||(Math.abs(gain-best.gain)<1e-10&&candidate.name<best.condition.name))
     best={gain,condition:candidate,left:winner(left),right:winner(right)};
   }
   if(best&&best.gain<this.minGain)best=null;
   const model={ready:true,action,examples:rows.length,worlds:[...new Set(rows.map(r=>r.world))].sort(),
     baseline:base,uncertainty:unconditionalGini,condition:best?.condition?.name||null,
     gain:best?.gain||0,left:best?.left||null,right:best?.right||null,proofs:{}};
   const cond=model.condition?tests.find(x=>x.name===model.condition):null;
   for(const bucket of ['baseline','left','right']){
    const target=model[bucket];if(!target)continue;
    const evidence=rows.filter(e=>e.label===target.label&&(bucket==='baseline'||cond.test(e.context)===(bucket==='left')));
    model.proofs[bucket]={evidenceIds:evidence.map(e=>e.id),evidenceWorlds:[...new Set(evidence.map(e=>e.world))].sort(),directStates:[...new Set(evidence.map(e=>e.from))]};
   }
   this.models.set(action,model);
  }
  return this.summary();
 }
 predict(state,action){
  const model=this.models.get(action);if(!model?.ready)return {ready:false,action,from:state,reason:model?.reason||'NOT_FITTED'};
  const x=tuple(state,this.dims,this.side);
  const isLeft=model.condition?conditions(this.dims,this.side).find(c=>c.name===model.condition).test(x):null;
  const bucket=model.condition?(isLeft?'left':'right'):'baseline';
  const subset=model[bucket],proof=model.proofs[bucket],delta=subset.label.split(',').map(Number);
  return {ready:true,action,from:state,to:advance(state,delta,this.side,this.dims),delta,
    confidence:subset.count/subset.countTotal,support:subset.count,
    observedDirectly:proof.directStates.includes(state),
    evidenceIds:proof.evidenceIds,evidenceWorlds:proof.evidenceWorlds,
    condition:model.condition,conditionValue:isLeft,alternativeEffects:subset.options.slice(1,4),modelGain:model.gain};
 }
 summary(){return {dims:this.dims,side:this.side,states:this.side**this.dims,
  observedEvents:this.events.length,sourceWorlds:this.worlds.size,
  models:[...this.models.values()].map(m=>({action:m.action,ready:m.ready,examples:m.examples||0,
    condition:m.condition||null,gain:m.gain||0,sourceWorlds:m.worlds?.length||0,reason:m.reason||null})),
  discoveredConditionalRules:[...this.models.values()].filter(x=>x.ready&&x.condition).length};}
 completeAtlas(cells){
  const N=this.side**this.dims;if(cells.length!==N)throw Error('Complete world terrain required');
  const nodes=[],edges=[],gaps=[],walls=[];
  for(let state=0;state<N;state++){
   nodes.push({id:state,coordinates:tuple(state,this.dims,this.side),passable:!!cells[state]});
   for(const action of this.actions){const p=this.predict(state,action);
    if(!p.ready){gaps.push({from:state,action,reason:p.reason});continue}
    const blocked=!cells[state]||!cells[p.to];
    const edge={from:state,to:p.to,action,blocked,confidence:p.confidence,support:p.support,
      sourceWorlds:p.evidenceWorlds,observedDirectly:p.observedDirectly,
      modelCondition:p.condition,conditionValue:p.conditionValue,evidenceIds:p.evidenceIds};
    edges.push(edge);if(blocked)walls.push({from:state,to:p.to,action});
   }
  }
  return {summary:{...this.summary(),edges:edges.length,gaps:gaps.length,walls:walls.length,
   traversable:edges.length-walls.length},nodes,edges,gaps,walls};
 }
 plan(start,goal,cells,{alternative=1,limit=100000}={}){
  const N=this.side**this.dims;if(start<0||goal<0||start>=N||goal>=N)throw Error('Bad endpoints');
  if(!cells[start]||!cells[goal])return{found:false,reason:'START_OR_TARGET_WALL',start,goal,route:[],frontier:[]};
  const R=PRNG(alternative*101+17),queue=[start],parents=new Map([[start,null]]),missing=new Map(),frontier=[],rejected=[];
  for(let i=0;i<queue.length&&i<limit;i++){
   const s=queue[i];if(s===goal)break;let options=this.actions.map(a=>this.predict(s,a));
   if(alternative>1)options=options.map(x=>[R(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
   let accepted=0,blocked=0,unknown=0;
   for(const p of options){if(!p.ready){missing.set(p.action,(missing.get(p.action)||0)+1);unknown++;continue}
    if(!cells[p.to]){blocked++;if(rejected.length<200)rejected.push({from:s,to:p.to,action:p.action,reason:'OBSERVED_WALL',sourceWorlds:p.evidenceWorlds});continue}
    if(parents.has(p.to))continue;parents.set(p.to,{from:s,edge:p});queue.push(p.to);accepted++;
   }frontier.push({state:s,accepted,blocked,unknown});
  }
  if(!parents.has(goal))return{found:false,reason:missing.size?'MISSING_TRANSFORMATION_OR_DISCONNECTED':'DISCONNECTED_OR_WALLS',start,goal,route:[],explored:queue.length,frontier,missingActions:[...missing],rejected};
  const route=[];for(let s=goal;s!==start;){const p=parents.get(s);if(!p)throw Error('Invalid route');route.push(p.edge);s=p.from}
  route.reverse();return{found:true,reason:null,start,goal,route,explored:queue.length,frontier,
   missingActions:[...missing],rejected,solutionShape:route.map(x=>x.action),
   pathConfidence:route.reduce((a,e)=>a*e.confidence,1)};
 }
 evaluate(plan,physicalStep,cells){
  let s=plan.start,firstMismatch=null;const trace=[];
  if(plan.found)for(let i=0;i<plan.route.length;i++){
   const edge=plan.route[i],actual=physicalStep(s,edge.action),blocked=!cells[actual];
   const row={index:i,action:edge.action,from:s,predictedTo:edge.to,actualTo:actual,
     matched:actual===edge.to,blocked,confidence:edge.confidence,evidenceIds:edge.evidenceIds,
     sourceWorlds:edge.evidenceWorlds,condition:edge.condition,conditionValue:edge.conditionValue};
   trace.push(row);if(!firstMismatch&&(blocked||!row.matched))firstMismatch=row;
   if(blocked)break;s=actual;
  }
  return{success:plan.found&&s===plan.goal&&trace.every(x=>!x.blocked),finalState:s,
   goal:plan.goal,firstMismatch,trace,outputActions:trace.map(x=>x.action).join(' '),
   predictedOutput:plan.solutionShape?.join(' ')||'',matchedActions:trace.filter(x=>x.matched).length,
   generatedCharacters:trace.map(x=>x.action).join(' ').length};
 }
 saveJSON(){return{version:1,dims:this.dims,side:this.side,actions:this.actions,minLeaf:this.minLeaf,
   minGain:this.minGain,events:this.events,allowContext:!!this.allowContext}}
 static restore(s){if(s?.version!==1)throw Error('Bad atlas checkpoint version');
  const a=new CrossWorldAtlas(s);for(const e of s.events)a.observe(e);a.fit({allowContext:s.allowContext});return a}
}
