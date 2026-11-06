// Native V17 observed-language graph traversal with ACTUAL per-action replay.
// All nodes/edges are from the PREVIOUSLY observed OpenThoughts train atlas.
// The world transition is a real traversal of one stored directed graph edge:
// it is NOT next-token emission, emergent self-identity or learned semantics.
// Each step recomputes ORIGINAL Discoverer.shape() from the actor's actual node.
// The original V17 engine source is never replaced.
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {nativeAttractionField, exactShortestPaths, discountedGoalOccupancy} from './multipath.mjs';

const TOL = (a,b)=>Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b));
const cleanValue=x=>Number.isFinite(x)?Number(x.toFixed(7)):null;
const roundPath=(graph,from,actions)=>{
  if(!Array.isArray(actions))return [];
  let at=from;const nodes=[from],seen=new Set(nodes);
  for(const action of actions){
    const to=graph.adj[at]?.[action];
    if(!Number.isInteger(to)||seen.has(to))break;
    nodes.push(to);seen.add(to);at=to;
  }
  return nodes;
};
function nativePlan(graph,brain,from){
  const acts=brain.shape(graph.nodes.map(x=>x.kind),0,from,graph.adj);
  return roundPath(graph,from,acts);
}
function optionsFor(graph,at,field,sr,exact,visited){
  const here=field.values[at]||0;
  return graph.adj[at].map((to,action)=>{
    const value=field.values[to]||0;
    const reachable=exact.dist[to]!==Infinity;
    return {action,to,kind:graph.nodes[to].kind,
      field:cleanValue(value),successor:cleanValue(sr.values[to]),
      shortestDistance:reachable?exact.dist[to]:null,
      shortestPaths:exact.counts[to].toString(),
      rising:value>here+1e-12,alreadyVisited:visited.has(to)};
  });
}
function chosenByPolicy(localPlan,choices,policy){
  if(policy==='native'){
    const to=localPlan[1];
    return choices.find(x=>x.to===to&&x.rising&&!x.alreadyVisited)||null;
  }
  const usable=choices.filter(x=>x.rising&&!x.alreadyVisited);
  if(!usable.length)return null;
  const peak=Math.max(...usable.map(x=>x.field));
  const ties=usable.filter(x=>TOL(x.field,peak));
  return ties.sort((a,b)=>b.successor-a.successor||a.action-b.action)[0];
}
export function captureSolutionShape(graph,brain,{gamma=.9,actorPolicy='native',maxSteps=96}={}){
  if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.adj)||
    graph.nodes.length!==graph.adj.length||graph.nodes.length<1)
    throw Error('An actual observed graph is required');
  if(!['native','successor'].includes(actorPolicy))throw Error('Unknown graph action policy');
  const n=graph.nodes.length,ret=graph.nodes.map(x=>x.kind);
  const limit=Math.min(n,Math.max(1,Math.floor(maxSteps)));
  const original=nativePlan(graph,brain,0);
  const shortest=exactShortestPaths(graph,0);
  const sr=discountedGoalOccupancy(graph,{gamma});
  const initial=nativeAttractionField(graph,brain,0);
  const nodes=graph.nodes.map((v,id)=>({
    id,label:String(v.label||'').slice(0,180),kind:v.kind,source:v.source??null,
    outgoing:graph.adj[id].length,
    dimension:{
      attraction:cleanValue(initial.values[id]),successor:cleanValue(sr.values[id]),
      distance:Number.isFinite(shortest.dist[id])?shortest.dist[id]:null,
      branching:graph.adj[id].length
    }
  }));
  const edges=graph.adj.flatMap((xs,from)=>xs.map((to,action)=>({from,to,action})));
  // Alternatives are ACTUAL observed outgoing edges and continuation computed
  // by the original planner; no unobserved edges or goals are inserted.
  const alternatives=graph.adj[0].map((to,action)=>{
    const continuation=nativePlan(graph,brain,to),path=[0,...continuation];
    return {action,firstNode:to,path,goalReached:graph.nodes[path.at(-1)]?.kind===KIND.target,
      shortestPaths:shortest.counts[to].toString(),
      predictedLength:path.length-1,attraction:cleanValue(initial.values[to]),
      successor:cleanValue(sr.values[to]),onShortestPath:shortest.dist[to]===shortest.dist[0]-1};
  });
  let at=0,previousField=null,initialPrediction=original,divergence=0,
    reroutes=0,actualMoves=0,fieldUpdates=0;
  const executed=[at],visited=new Set(executed),frames=[];
  function frame({action=null,from=null,actual=null,predictedNext=null}={}){
    const field=nativeAttractionField(graph,brain,at);
    const local=nativePlan(graph,brain,at);
    fieldUpdates++;
    const choices=optionsFor(graph,at,field,sr,exact,visited);
    const originalExpected=initialPrediction[executed.length]??null;
    const delta=previousField===null?null:
      field.values.reduce((sum,v,i)=>sum+Math.abs(v-previousField[i]),0);
    const forecastChanged=executed.length>1&&
      JSON.stringify(local)!==JSON.stringify(initialPrediction.slice(executed.length-1));
    if(forecastChanged)reroutes++;
    // A frame represents a REAL original planner invocation at this cursor.
    // Not a generated fictional movement, and not a token-level motor action.
    frames.push({index:frames.length,event:'world-graph-observed-action',at,
      atLabel:nodes[at].label,from,action,actual,predictedNext,
      forecastError:from===null?null:Number(actual!==predictedNext),
      initialExpectedAtCursor:originalExpected,
      targetReached:graph.nodes[at].kind===KIND.target,
      shape:local,globalShape:original,
      field:Array.from(field.values,cleanValue),
      fieldL1Delta:delta===null?null:cleanValue(delta),
      shortestDistance:Number.isFinite(shortest.dist[at])?shortest.dist[at]:null,
      shortestPaths:shortest.counts[at].toString(),
      successor:cleanValue(sr.values[at]),
      perspective:{global:'whole observed graph',local:'current node and outgoing observed edges'},
      visibleNeighbors:choices,
      shapeChanged:!!forecastChanged});
    previousField=field.values;
    return {local,choices};
  }
  let state=frame(),stopReason=null;
  while(frames.length<=limit&&graph.nodes[at].kind!==KIND.target){
    const decision=chosenByPolicy(state.local,state.choices,actorPolicy);
    if(!decision){stopReason='no-available-rising-edge';break;}
    const expected=state.local[1]??null,from=at;
    // This is the actual graph-world action executed on an observed edge.
    const to=graph.adj[from][decision.action];
    if(to!==decision.to)throw Error('Observed graph action/result disagreement');
    actualMoves++;
    if(expected!==to)divergence++;
    at=to;
    visited.add(to);executed.push(to);
    state=frame({action:decision.action,from,actual:to,predictedNext:expected});
  }
  if(!stopReason)stopReason=graph.nodes[at].kind===KIND.target?'stored-training-goal-reached':'step-limit';
  return {
    version:1,source:'actual-observed-OpenThoughts-QA-graph',
    world:'training-evidence-retrieval-graph',actorPolicy,
    factualLimits:{
      nodesFromPreviousTraining:true,
      targetIsStoredTrainingAnswer:true,
      inventedEdges:false,latentSemanticEmbedding:false,
      nextCharacterGeneratorActions:false,learnedLanguageTransformations:false
    },
    initial:{cursor:0,shape:original,goalReached:graph.nodes[original.at(-1)]?.kind===KIND.target,
      field:Array.from(initial.values,cleanValue),shortestDistance:shortest.distance,
      shortestPathCount:shortest.count,
      goalCount:shortest.goalIndices.length},
    nodes,edges,alternatives,frames,
    executed,summary:{
      steps:actualMoves,divergencesFromRecomputedLocalPrediction:divergence,
      recomputations:fieldUpdates,shapeChanges:reroutes,stopReason,
      reachedStoredTrainingTarget:graph.nodes[at].kind===KIND.target,
      initialShapeLength:original.length?original.length-1:null,
      executedLength:actualMoves,
      optimalLength:shortest.distance,
      alternativeBranches:alternatives.length,
      exactShortestPaths:shortest.count
    }
  };
}
