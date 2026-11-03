// One executable abstract graph is the controller, not merely a view.
// Every decision: local sensing -> observed graph -> cellular message passing
// -> action votes -> physical intervention -> measured reward -> BPTT gradients.
// This architecture is independent of preserved older MLP/native checkpoints.
// No oracle paths, hidden world links, or unmeasured transitions enter the graph.
export const CELL_SCHEMA=1, CHANNELS=8, FEATURES=9, ROUNDS=3;
const sigmoid=x=>x>=0?1/(1+Math.exp(-Math.min(30,x))):Math.exp(Math.max(-30,x))/(1+Math.exp(Math.max(-30,x)));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rng=(seed)=>{let a=(seed>>>0)||1;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;a>>>=0;return a/4294967296}};
const names=['in','bias','self','message','stepBias','readCurrent','readTarget','action','outBias','cost','revisit','unknown'];
const dims={in:CHANNELS*FEATURES,bias:CHANNELS,self:CHANNELS,message:CHANNELS,
 stepBias:CHANNELS,readCurrent:CHANNELS,readTarget:CHANNELS,
 action:5,outBias:1,cost:1,revisit:1,unknown:1};
const arrayShape=()=>Object.fromEntries(names.map(k=>[k,Array(dims[k]).fill(0)]));
const mag=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0));
const edgeId=(a,b)=>a+':'+b;
const actionIndex=(o)=>clamp(Number(o.action)||0,0,4);
const valueTo=(o)=>Number.isInteger(o.expectedTo)?o.expectedTo:
 Number.isInteger(o.to)?o.to:null;
const shape=(positions,id)=>positions?.[id]??{x:.5,y:.5};
function observedState(ep){
 const idSet=new Set([ep.current,ep.goal]);
 const edges=[];
 if(ep.domain==='maze'){
  for(const id of ep.observedCells.keys())idSet.add(id);
 }else for(const id of ep.walked)idSet.add(id);
 for(const e of ep.observedLinks.values()){
  if(!Number.isInteger(e.a)||!Number.isInteger(e.b))continue;
  idSet.add(e.a);idSet.add(e.b);
  if(e.open===false)continue;
  edges.push({from:e.a,to:e.b,cost:e.cost??1,action:e.action??null});
 }
 const ids=[...idSet].sort((a,b)=>a-b),index=new Map(ids.map((id,i)=>[id,i]));
 const neighbors=ids.map(()=>[]),messages=[];
 for(const e of edges){
  const a=index.get(e.from),b=index.get(e.to);
  if(a===undefined||b===undefined||a===b)continue;
  if(!neighbors[b].includes(a))neighbors[b].push(a);
  if(!neighbors[a].includes(b))neighbors[a].push(b);
 }
 const goal=shape(ep.positions,ep.goal);
 const inputs=ids.map(id=>{
  const p=shape(ep.positions,id);
  const terrain=ep.domain==='maze'?ep.observedCells.get(id):null;
  const valid=terrain===undefined||terrain===null?0:terrain<=.82?1:-1;
  return [1,p.x,p.y,goal.x-p.x,goal.y-p.y,
   clamp((ep.visited[id]||0)/12,0,1),+(id===ep.current),
   +(id===ep.goal),valid];
 });
 return {ids,index,neighbors,inputs,edges,positions:ep.positions,current:ep.current,goal:ep.goal,domain:ep.domain};
}
export class GraphCellsBrain{
 constructor(seed=17){
  this.schema=CELL_SCHEMA;this.seed=seed;this.parameters=arrayShape();
  const random=rng(seed);
  for(const k of ['in','readCurrent','readTarget'])
   this.parameters[k]=this.parameters[k].map(()=>(random()-.5)*.35);
  this.parameters.self.fill(.73);this.parameters.message.fill(.46);
  this.parameters.cost[0]=-.15;this.parameters.revisit[0]=-.13;
  this.parameters.unknown[0]=-.17;
  this.m=arrayShape();this.v=arrayShape();this.steps=0;this.episodes=0;
  this.samples=0;this.domainCounts={maze:0,network:0,text:0};
  this.lastLearning=null;
 }
 forwardGraph(ep){
  const state=observedState(ep),p=this.parameters,n=state.ids.length;
  const layers=[],inbox=[],messages=[];
  const h0=state.inputs.map(x=>Array.from({length:CHANNELS},(_,k)=>{
   let z=p.bias[k];
   for(let f=0;f<FEATURES;f++)z+=p.in[k*FEATURES+f]*x[f];
   return Math.tanh(z);
  }));
  layers.push(h0);
  for(let round=0;round<ROUNDS;round++){
   const previous=layers.at(-1),aggregate=Array.from({length:n},()=>Array(CHANNELS).fill(0));
   const current=Array.from({length:n},()=>Array(CHANNELS).fill(0));
   for(let i=0;i<n;i++){
    const peers=state.neighbors[i],degree=peers.length;
    for(let k=0;k<CHANNELS;k++){
     if(degree)for(const j of peers)aggregate[i][k]+=previous[j][k]/degree;
     current[i][k]=Math.tanh(p.self[k]*previous[i][k]+
      p.message[k]*aggregate[i][k]+p.stepBias[k]);
    }
    if(degree)for(const j of peers){
     let strength=0;
     for(let k=0;k<CHANNELS;k++)strength+=Math.abs(p.message[k]*previous[j][k]/degree);
     messages.push({from:state.ids[j],to:state.ids[i],round:round+1,
      strength:+(strength/CHANNELS).toFixed(6),channels:CHANNELS});
    }
   }
   layers.push(current);inbox.push(aggregate);
  }
  return {state,layers,inbox,messages,parameterVersion:this.steps};
 }
 candidates(tape,options,ep){
  const p=this.parameters,last=tape.layers.at(-1),
   at=tape.state.index.get(ep.current);
  return options.map(c=>{
   const targetId=valueTo(c),dest=tape.state.index.get(targetId),action=actionIndex(c),
    x=last[at],y=dest===undefined?Array(CHANNELS).fill(0):last[dest],
    cost=clamp(c.cost/12,0,2),revisit=clamp((ep.visited[targetId??ep.current]||0)/12,0,2),
    unknown=+(dest===undefined);
   let logit=p.outBias[0]+p.action[action]+p.cost[0]*cost+
    p.revisit[0]*revisit+p.unknown[0]*unknown;
   const votes=[];
   for(let k=0;k<CHANNELS;k++){
    const from=p.readCurrent[k]*x[k],to=p.readTarget[k]*y[k];
    logit+=from+to;
    votes.push({cell:ep.current,channel:k,role:'current',value:+from.toFixed(6)});
    if(dest!==undefined)votes.push({cell:targetId,channel:k,role:'target',value:+to.toFixed(6)});
   }
   return {...c,q:sigmoid(logit),utility:sigmoid(logit),logit,
    predictedTo:targetId,net:{at,dest,action,cost,revisit,unknown,votes}};
  }).sort((a,b)=>b.utility-a.utility||a.action-b.action);
 }
 rank(ep,options){
  const tape=this.forwardGraph(ep),candidates=this.candidates(tape,options,ep);
  const cells=tape.state.ids.map((id,i)=>({
   id,input:tape.state.inputs[i].map(v=>+v.toFixed(5)),
   neighbors:tape.state.neighbors[i].map(j=>tape.state.ids[j]),
   activations:tape.layers.map(layer=>layer[i].map(v=>+v.toFixed(6))),
   inbox:tape.inbox.map(layer=>layer[i].map(v=>+v.toFixed(6))),
   activity:+mag(tape.layers.at(-1)[i]).toFixed(6),
   // Will be filled by actual gradients after environment feedback.
   gradient:null
  }));
  return {tape,candidates,trace:{
   engine:'GRAPH-CELLS',control:'cellular-message-passing',
   rounds:ROUNDS,channels:CHANNELS,participatingCells:cells.length,
   cells,messages:tape.messages,learning:null
  }};
 }
 // A measured action is supervised only by its own subsequent reward and
 // discounted realized outcomes. Backpropagation traverses every message edge.
 backward(record,target,grad){
  const {tape,net,logit}=record,{state,layers,inbox}=tape,p=this.parameters;
  const n=state.ids.length,last=layers.at(-1),delta=(sigmoid(logit)-target);
  grad.outBias[0]+=delta;grad.action[net.action]+=delta;
  grad.cost[0]+=delta*net.cost;grad.revisit[0]+=delta*net.revisit;
  grad.unknown[0]+=delta*net.unknown;
  const dh=Array.from({length:n},()=>Array(CHANNELS).fill(0));
  for(let k=0;k<CHANNELS;k++){
   grad.readCurrent[k]+=delta*last[net.at][k];
   dh[net.at][k]+=delta*p.readCurrent[k];
   if(net.dest!==undefined){
    grad.readTarget[k]+=delta*last[net.dest][k];
    dh[net.dest][k]+=delta*p.readTarget[k];
   }
  }
  const signals=Array(n).fill(0);
  for(let round=ROUNDS-1;round>=0;round--){
   const next=Array.from({length:n},()=>Array(CHANNELS).fill(0));
   for(let i=0;i<n;i++){
    const peers=state.neighbors[i],degree=peers.length;
    for(let k=0;k<CHANNELS;k++){
     const d=dh[i][k]*(1-layers[round+1][i][k]**2);
     grad.self[k]+=d*layers[round][i][k];
     grad.message[k]+=d*inbox[round][i][k];
     grad.stepBias[k]+=d;
     next[i][k]+=d*p.self[k];
     if(degree)for(const j of peers)next[j][k]+=d*p.message[k]/degree;
     signals[i]+=Math.abs(d);
    }
   }
   for(let i=0;i<n;i++)dh[i]=next[i];
  }
  for(let i=0;i<n;i++)for(let k=0;k<CHANNELS;k++){
   const d=dh[i][k]*(1-layers[0][i][k]**2);
   grad.bias[k]+=d;signals[i]+=Math.abs(d);
   for(let f=0;f<FEATURES;f++)grad.in[k*FEATURES+f]+=d*state.inputs[i][f];
  }
  return {loss:-target*Math.log(Math.max(1e-9,sigmoid(logit)))-
   (1-target)*Math.log(Math.max(1e-9,1-sigmoid(logit))),
   prediction:sigmoid(logit),target,gradientNorm:mag(signals),
   cells:state.ids.map((id,i)=>({id,gradient:+signals[i].toFixed(7)}))};
 }
 learn(trajectory,solved){
  if(!trajectory.length)return {loss:null,updates:0,samples:0,perStep:[]};
  const grad=arrayShape(),perStep=[],before=this.snapshot().parameters;
  let future=solved?1.25:0,loss=0;
  for(let i=trajectory.length-1;i>=0;i--){
   const row=trajectory[i];
   future=clamp(row.reward+.89*future,-2.5,2.5);
   const target=clamp(.5+future/5,.03,.97);
   const info=this.backward(row.cellDecision,target,grad);
   perStep[i]=info;loss+=info.loss;
  }
  this.samples+=trajectory.length;this.steps++;
  let norm=0;for(const k of names)for(const g of grad[k])norm+=(g/trajectory.length)**2;
  norm=Math.sqrt(norm);const scale=norm>4?4/norm:1;
  for(const k of names)for(let i=0;i<grad[k].length;i++){
   const g=grad[k][i]/trajectory.length*scale;
   const m=this.m[k][i]=.9*this.m[k][i]+.1*g;
   const v=this.v[k][i]=.999*this.v[k][i]+.001*g*g;
   this.parameters[k][i]-=.004*(m/(1-.9**this.steps))/
    (Math.sqrt(v/(1-.999**this.steps))+1e-8);
  }
  const deltas=names.map(k=>this.parameters[k].reduce((s,x,i)=>s+(x-before[k][i])**2,0));
  const weightDelta=Math.sqrt(deltas.reduce((a,b)=>a+b,0));
  const info={loss:+(loss/trajectory.length).toFixed(6),updates:1,samples:trajectory.length,
   gradientNorm:+norm.toFixed(6),weightDelta:+weightDelta.toFixed(7),perStep};
  this.lastLearning={...info,perStep:undefined};
  return info;
 }
 curve(domain='maze'){
  const outputs=[];
  for(let n=0;n<=40;n++){
   const x=n/40;
   const positions=[{x:0,y:.5},{x,y:.5},{x:1,y:.5}],
    ep={domain,current:0,goal:2,positions,visited:[1,0,0],
     observedCells:new Map([[0,0],[1,0],[2,0]]),
     observedLinks:new Map([[edgeId(0,1),{a:0,b:1,open:true}],
      [edgeId(1,2),{a:1,b:2,open:true}]]),walked:[0]};
   const tape=this.forwardGraph(ep),scores=this.candidates(tape,[{to:1,action:0,cost:1}],ep);
   outputs.push({x:+x.toFixed(3),y:+scores[0].q.toFixed(6)});
  }
  return outputs;
 }
 snapshot(){return {schema:CELL_SCHEMA,architecture:'graph-cells',seed:this.seed,
  episodes:this.episodes,samples:this.samples,steps:this.steps,domainCounts:{...this.domainCounts},
  parameters:Object.fromEntries(names.map(k=>[k,this.parameters[k].slice()])),
  m:Object.fromEntries(names.map(k=>[k,this.m[k].slice()])),
  v:Object.fromEntries(names.map(k=>[k,this.v[k].slice()])),lastLearning:this.lastLearning};}
 static restore(s){
  if(s?.architecture!=='graph-cells'||s?.schema!==CELL_SCHEMA)throw Error('Invalid graph-cell checkpoint');
  const b=new GraphCellsBrain(s.seed);
  for(const k of names){
   if(!Array.isArray(s.parameters?.[k])||s.parameters[k].length!==dims[k]||
    !s.parameters[k].every(Number.isFinite))throw Error('Invalid graph-cell weights '+k);
   b.parameters[k]=s.parameters[k].slice();
   if(s.m?.[k]?.length===dims[k]&&s.v?.[k]?.length===dims[k]){
    b.m[k]=s.m[k].slice();b.v[k]=s.v[k].slice();
   }
  }
  b.episodes=s.episodes||0;b.samples=s.samples||0;b.steps=s.steps||0;
  b.domainCounts={...b.domainCounts,...s.domainCounts};b.lastLearning=s.lastLearning??null;
  return b;
 }
}
