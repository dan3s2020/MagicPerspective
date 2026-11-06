// Controlled, honest frozen test of learning to reconstruct paths from
// paired COMPLETE vs MASKED training worlds; same hidden maps at evaluation.
import {ConstructedPathLearner} from '../transcend/torus-aether/worlds/constructed-paths.mjs';
import {makeMaze,seedOf,SEEDS} from '../transcend/torus-aether/worlds/labyrinth.mjs';

const opt=(name,def)=>{const i=process.argv.indexOf('--'+name);
  return i<0?def:Math.trunc(Number(process.argv[i+1]));};
const train=opt('train',16),count=opt('test',24),seed=opt('seed',20261106);
if(!Number.isInteger(train)||!Number.isInteger(count)||train<1||train>250||
  count<2||count>120||!Number.isInteger(seed))throw Error('Invalid matched audit sizes');
const learned=new ConstructedPathLearner({seed}),control=new ConstructedPathLearner({seed});
for(let i=0;i<train;i++){
 const world=makeMaze(seedOf(SEEDS.train,300000+i*211),[7,9,11][i%3]);
 learned.trainPair(world,{samples:24});
}
const updates=learned.pathPolicyUpdates,examples=learned.examples;
const pairs=[];
for(let i=0;i<count;i++){
 const world=makeMaze(seedOf(SEEDS.test,400000+i*227+seed%10000),[7,9,11,13][i%4]);
 const a=learned.navigateBlind(world,{train:false}),b=control.navigateBlind(world,{train:false});
 const optimal=world.dist[world.start];
 pairs.push({n:world.n,optimal,trainedSolved:a.solved,controlSolved:b.solved,
   trainedSteps:a.steps,controlSteps:b.steps,
   initialBlindGuessSteps:a.firstShapeLength,initialUnknownCells:a.initialUnknowns,
   trainedFirstShapeAccuracy:a.firstShapeAccuracy,controlFirstShapeAccuracy:b.firstShapeAccuracy,
   trainedRepairs:a.routeRepairs,controlRepairs:b.routeRepairs});
}
if(learned.pathPolicyUpdates!==updates||learned.examples!==examples)throw Error('Held-out leaked into training');
const sum=k=>pairs.reduce((s,x)=>s+(x[k]||0),0),ratio=k=>
  pairs.filter(x=>x[k.replace('Ratio','Solved')]).length?
  pairs.filter(x=>x[k.replace('Ratio','Solved')]).reduce((s,x)=>s+x[k.replace('Ratio','Steps')]/x.optimal,0)/
  pairs.filter(x=>x[k.replace('Ratio','Solved')]).length:null;
const report={protocol:'SAME_HIDDEN_MAZES_PAIRED_COMPLETE_MASKED_SUPERVISION_TRAIN_ONLY',
  trainedPairs:learned.paired,trainingExamples:learned.examples,
  sharedPathWeights:learned.pathPolicy.slice(),sharedPathWeightUpdates:updates,
  controlTrainingExamples:control.examples,
  testCount:pairs.length,mazeSeedsFrom:SEEDS.test,meanUnknownAtFirst:sum('initialUnknownCells')/pairs.length,
  paired:{trainedSolved:sum('trainedSolved'),controlSolved:sum('controlSolved'),
    trainedSteps:sum('trainedSteps'),controlSteps:sum('controlSteps'),
    trainedRepairs:sum('trainedRepairs'),controlRepairs:sum('controlRepairs'),
    trainedFirstShapeAccuracy:sum('trainedFirstShapeAccuracy')/pairs.length,
    controlFirstShapeAccuracy:sum('controlFirstShapeAccuracy')/pairs.length},
  verdict:'These are real unseen maze route outcomes. A positive difference is only suggestive. Language transfer and the learned algorithm have separate acceptance gates.',
  perWorld:pairs};
console.log(JSON.stringify(report,null,2));
