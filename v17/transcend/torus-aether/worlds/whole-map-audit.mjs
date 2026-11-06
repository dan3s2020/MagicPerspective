// Frozen whole-map diagnostic; independent of Brain.save, Brain.live, or training.
import {makeTextHypercube,WholeWorldNavigator} from './whole-map-text.mjs';

export function evaluateWholeMapBaseline({count=16,seed=1729,dimensions=[5,6,7],wallRate=.18}={}){
  if(!Number.isInteger(count)||count<1||count>32)throw Error('count must be 1..32');
  if(!Number.isInteger(seed)||!Array.isArray(dimensions)||dimensions.length<1||
     dimensions.length>4||dimensions.some(d=>!Number.isInteger(d)||d<2||d>9))
    throw Error('Invalid test seed or dimensions');
  if(!Number.isFinite(wallRate)||wallRate<0||wallRate>.5)throw Error('Invalid wall rate');
  let cases=[],solved=0,valid=0,optimal=0,visited=0,walls=0,totalMillis=0;
  for(let i=0;i<count;i++){
    const d=dimensions[i%dimensions.length];
    // Deterministic held-out generated maps. These are NEW MAPS for a fixed
    // shortest-path algorithm, NOT previously unknown programming concepts.
    const caseSeed=(seed+104729*(i+1)+d*1873)>>>0;
    const start=performance.now();
    const world=makeTextHypercube({dimensions:d,seed:caseSeed,wallRate});
    const nav=new WholeWorldNavigator({maxNodes:1024,maxPasses:1024});
    nav.absorb(world);
    const wave=nav.propagate(),plan=nav.plan();
    let collision=0,moves=0;
    for(let m;(m=nav.moveOne())!==null;){
      moves++;
      const state=world.nodes.find(n=>n.id===m.to);
      if(!state||state.wall)collision++;
    }
    const ms=performance.now()-start;
    const win=plan.solved&&nav.cursor===world.goal&&collision===0;
    const isOptimal=win&&moves===wave.initialDistance;
    solved+=Number(win);valid+=Number(collision===0);optimal+=Number(isOptimal);
    walls+=world.nodes.filter(n=>n.wall).length;
    visited+=world.nodes.length;totalMillis+=ms;
    cases.push({seed:caseSeed,dimensions:d,nodes:world.nodes.length,
      walls:world.nodes.filter(n=>n.wall).length,solved:win,steps:moves,
      optimal:wave.initialDistance,collisions:collision,
      internalPathBeforeFirstMove:!!plan.plannedBeforeMovement,
      milliseconds:+ms.toFixed(3)});
  }
  return {
    mode:'REFERENCE_ALGORITHM_ONLY',
    learnedNavigationAccuracy:null,
    modelLearnedWorldFromText:false,
    observedWorldSource:'synthetic explicit hypercube, all nodes/walls/actions/goal supplied',
    planner:'built-in goal-distance wavefront search; no learned path-selection model',
    evaluation:'fresh generated maps; mathematical planner is unchanged from training',
    count,seed,dimensions,wallRate,solved,solvedRate:solved/count,
    validRate:valid/count,optimalRate:optimal/count,
    totalNodes:visited,totalWallStates:walls,
    totalMillis:+totalMillis.toFixed(3),cases
  };
}
