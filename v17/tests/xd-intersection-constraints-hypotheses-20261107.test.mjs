// Third iteration: actual native Brain.xdAtlas and its untouched finite xD world.
// Tests whether reaching one target requires learning all independent coordinate
// changes, and distinguishes ambient dimension labels from active state rank.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {CompleteXDWorld,LearnedXDActionAtlas} from '../transcend/torus-aether/worlds/full-xd-maze-atlas.mjs';

test('original Brain xD: simultaneous constraint target, transform ablations, geometric dimension controls',
{timeout:180000},()=>{
 const brain=new Brain({seed:111,rules:{}});
 const initial=brain.liveCompleteXDWorld({dimensions:16,seed:3001,physicsSeed:17,heldoutSeed:90131});
 const atlas=brain.xdAtlas;
 const before=JSON.stringify([...atlas.effects]);
 const dimensions=[16,24,32,64,128,512,2048,25,100];
 const byDimension=[],examples=[];
 let compatibleSolved=0,compatibleTotal=0,incompatibleSolved=0,incompatibleTotal=0,
     physicsShiftSolved=0,physicsShiftTotal=0,allCorrect=0,allPredicted=0,
     dimensionIndependentFiniteStates=true,cutAblationFailure=0,cutAblations=0;
 for(const D of dimensions){
   const rows=[];
   for(let k=0;k<8;k++){
     const world=new CompleteXDWorld({dimensions:D,axes:7,seed:7001+k*37,physicsSeed:17});
     const res=atlas.testFrozen(world);
     const p=res.plan,x=res.execution;
     const compatible=D%8===0;
     if(compatible){compatibleTotal++;compatibleSolved+=Number(x.solved);}
     else {incompatibleTotal++;incompatibleSolved+=Number(x.solved);}
     allCorrect+=(x.correct??0);allPredicted+=x.attempted;
     if(world.vertices.length!==128||world.axes!==7)dimensionIndependentFiniteStates=false;
     rows.push({seed:world.seed,solved:x.solved,found:p.found,
       plannedSteps:p.pathLength,optimal:p.evaluatorPhysicalShortestPath,
       missingAxes:p.missingAxes.length,reason:p.reason});
     if(k===0)examples.push({dimension:D,activeDimensions:world.activeDimensions,
       finiteStates:world.vertices.length,plannedSteps:p.pathLength,reason:p.reason});
   }
   byDimension.push({dimensions:D,activeRank:7,
     solved:rows.filter(r=>r.solved).length,total:rows.length,
     planFound:rows.filter(r=>r.found).length,
     example:rows[0]});
 }
 for(let k=0;k<24;k++){
   const world=new CompleteXDWorld({dimensions:64,axes:7,seed:9001+k*11,physicsSeed:1000+k});
   const res=atlas.testFrozen(world);
   physicsShiftTotal++;physicsShiftSolved+=Number(res.execution.solved);
 }
 const target=new CompleteXDWorld({dimensions:64,axes:7,seed:30001,physicsSeed:17});
 const mapped=atlas.plan(target.view());
 const mappedPathAxes=[...new Set(mapped.path.map(e=>e.axis))].sort((a,b)=>a-b);
 const targetAxes=target.activeDimensions.slice().sort((a,b)=>a-b);
 assert.deepEqual(mappedPathAxes,targetAxes,'Goal 1111111 should require all seven independent active axes');
 for(const action of target.actions()){
   const ablated=new LearnedXDActionAtlas();
   ablated.effects=structuredClone(atlas.effects);
   ablated.effects.delete(action);
   const plan=ablated.plan(target.view());
   cutAblations++;
   cutAblationFailure+=Number(!plan.found);
 }
 assert.equal(JSON.stringify([...atlas.effects]),before,
   'Evaluation/ablations must preserve original learned action transformations');
 assert.equal(cutAblationFailure,cutAblations,'Removing any required dimension must disconnect target');
 const result={
  initialNativeBrain:{
   trainedWorldSolved:initial.training.execution.solved,
   firstFrozenHeldoutSolved:initial.heldout.execution.solved,
   observedInterventions:atlas.observations,
   learnedActionBindings:atlas.effects.size
  },
  ambientDimensionSweep:byDimension,examples,
  compatibleDimensions:{solved:compatibleSolved,total:compatibleTotal},
  incompatibleDimensions:{solved:incompatibleSolved,total:incompatibleTotal},
  shiftedPrivatePhysics:{solved:physicsShiftSolved,total:physicsShiftTotal},
  pathExecution:{correctEdges:allCorrect,attemptedEdges:allPredicted},
  intersectionOfNecessaryConstraints:{goal:'all seven bits set',
   requiredAxes:targetAxes,axesUsedBySolution:mappedPathAxes,
   deletingOneLearnedActionBreaksSolution:cutAblationFailure,
   totalActionsDeletedOneAtATime:cutAblations},
  actualFiniteStateCountAlways128:dimensionIndependentFiniteStates,
  explanatoryBoundaries:[
   'An xD ambient coordinate label is not the complete 2^D hypercube: active rank stays 7 and finite states stay 128.',
   'The planner sees a complete exposed physical graph and runs explicit BFS over paths whose actions have observed causal support.',
   'An intersection of Boolean goal constraints exists here; it is not evidence that all internal loops physically intersect or are Hopf circles.',
   'A private shuffled mapping ablation tests transfer limits, not changes to the preserved trained organism.'
  ]
 };
 console.log('MAGICPERSPECTIVE_ORIGINAL_XD_INTERSECTION_RESULTS '+JSON.stringify(result));
});
