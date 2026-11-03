import {features,skeletonDistances} from './model.mjs';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function dijkstra(spec,belief,scored,start,mode='neural'){
 const adj=Array.from({length:spec.nodes},()=>[]);
 for(const e of spec.links)if(belief.status[e.id]!==0){adj[e.a].push({id:e.id,to:e.b});adj[e.b].push({id:e.id,to:e.a});}
 const d=Array(spec.nodes).fill(Infinity),prev=Array(spec.nodes).fill(-1),prevEdge=Array(spec.nodes).fill(-1),seen=new Uint8Array(spec.nodes);d[start]=0;
 for(let z=0;z<spec.nodes;z++){
  let u=-1;for(let i=0;i<spec.nodes;i++)if(!seen[i]&&(u<0||d[i]<d[u]))u=i;if(u<0||!Number.isFinite(d[u])||u===spec.goal)break;seen[u]=1;
  for(const a of adj[u]){
   const pred=scored.get(`${u}:${a.id}`);if(!pred||pred.pass===0)continue;
   const edgeRisk=-Math.log(clip(pred.pass,.05,1)),policyRisk=-Math.log(clip(pred.policy,.03,1));
   const cost=mode==='neutral'?1:Math.max(.2,pred.cost)+.6*edgeRisk+.3*policyRisk;
   if(d[u]+cost<d[a.to]){d[a.to]=d[u]+cost;prev[a.to]=u;prevEdge[a.to]=a.id;}
  }
 }
 if(!Number.isFinite(d[spec.goal]))return null;
 const nodes=[spec.goal],edges=[];let j=spec.goal;while(j!==start){edges.push(prevEdge[j]);j=prev[j];if(j<0)return null;nodes.push(j);}return {nodes:nodes.reverse(),edges:edges.reverse(),imaginedCost:d[spec.goal],source:'model-based fallback'};
}
// Connected *whole trajectories* are generated before executing any action.
// The beam is a learned policy rollout; fallback is explicitly labelled algorithmic.
export function imagine(spec,belief,position,net,perspective,{width=36,horizon=0,mode='neural'}={}){
 if(position===spec.goal)return {nodes:[position],edges:[],alternatives:[],source:'goal',confidence:1,shape:[]};
 const d=skeletonDistances(spec),weights=perspective.weights;
 const scored=new Map(),adj=Array.from({length:spec.nodes},()=>[]);
 for(const e of spec.links){
  if(belief.status[e.id]===0)continue;
  const geomP=perspective.reliability(spec,belief,e);let p=geomP[0]*weights[0]+geomP[1]*weights[1];
  for(const u of [e.a,e.b]){
   const estimate=net.predict(spec,belief,u,e,d,weights,belief.visits[u]);
   const prob=belief.status[e.id]===1?1:clip(estimate.pass*.78+p*.22,.08,.98);
   const result={...estimate,pass:prob};scored.set(`${u}:${e.id}`,result);
  }
  adj[e.a].push({to:e.b,id:e.id});adj[e.b].push({to:e.a,id:e.id});
 }
 const limit=Math.min(horizon||Math.max(14,Math.ceil(spec.nodes*1.35)),180);
 let beam=[{nodes:[position],edges:[],score:0}],finalists=[],expansions=0;
 for(let t=0;t<limit&&beam.length&&finalists.length<8;t++){
  const next=[];
  for(const item of beam){const at=item.nodes.at(-1);
   for(const a of adj[at]){
    if(item.nodes.includes(a.to))continue;
    const pred=scored.get(`${at}:${a.id}`);if(!pred||pred.pass<.00001)continue;
    const progress=Number.isFinite(d[at])&&Number.isFinite(d[a.to])?d[at]-d[a.to]:0;
    const local=mode==='neutral'? -.1 +.8*progress:
      .65*Math.log(clip(pred.pass,.05,1))+.9*Math.log(clip(pred.policy,.05,1))-.08*pred.cost+.6*progress;
    const candidate={nodes:[...item.nodes,a.to],edges:[...item.edges,a.id],score:item.score+local};
    expansions++;if(a.to===spec.goal)finalists.push(candidate);else next.push(candidate);
   }
  }
  next.sort((a,b)=>{
   const q=x=>x.score-.13*d[x.nodes.at(-1)]-.015*x.edges.length;
   return q(b)-q(a);
  });beam=next.slice(0,Math.max(4,width));
 }
 finalists.sort((a,b)=>b.score-a.score);let winning=finalists[0];let source='learned beam rollout';
 if(!winning){const fallback=dijkstra(spec,belief,scored,position,mode);if(fallback){winning=fallback;source=fallback.source;}}
 if(!winning)return {nodes:[position],edges:[],alternatives:[],source:'no-hypothesis',confidence:0,shape:[],expansions};
 const alternatives=finalists.filter(x=>x!==winning).slice(0,3).map(x=>({nodes:x.nodes,edges:x.edges,score:x.score}));
 const shape=Array(spec.links.length).fill(0);const candidates=[winning,...alternatives];
 for(let k=0;k<candidates.length;k++)for(const edge of candidates[k].edges)shape[edge]+=(k===0?.7:.1);
 const probs=winning.edges.map((id,k)=>scored.get(`${winning.nodes[k]}:${id}`)?.pass??.5);
 const confidence=probs.length?Math.exp(probs.reduce((s,p)=>s+Math.log(Math.max(.01,p)),0)/probs.length):0;
 return {nodes:winning.nodes,edges:winning.edges,alternatives,source,confidence:+confidence.toFixed(4),shape:shape.map(x=>+clip(x,0,1).toFixed(3)),expansions,view:{mode,weights}};
}
