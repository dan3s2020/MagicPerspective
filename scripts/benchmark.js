import {ShapeNet,evaluateModel,trainingSnapshots} from '../src/model.js';
import {makeMaze,RNG} from '../src/maze.js';
const episodes=Number(process.argv[2]||240),model=new ShapeNet(17),rng=new RNG(900123);
const before=evaluateModel(model,{seed:910001,count:30});
console.log('Held-out BEFORE:',before);
const time=Date.now();let loss=0;
for(let i=0;i<episodes;i++){
 const w=makeMaze(20261102+i*7709,11);
 const snapshots=rng.shuffle(trainingSnapshots(w,20261102+i*3));
 for(const s of snapshots)loss=model.trainSample(w,s.belief,w.goal,s.position,s.teacher,.009,rng,1);
}
const after=evaluateModel(model,{seed:910001,count:30});
console.log('Held-out AFTER:',after,'lastLoss',loss,'ms',Date.now()-time);
if(!after.improved)console.warn('WARNING: neural shape predictor did not outperform baseline. No success claim.');
