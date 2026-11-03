// Independent falsification test: trained network vs shuffled-label negative control.
import {newBrains,train,evaluate,snapshots} from './engine/training.mjs';
import {PerspectiveNet} from './engine/model.mjs';
import {RNG,makeWorld} from './engine/world.mjs';
const episodes=Number(process.argv[2]||600),seed=20261103;
const main=newBrains(19),negative=new PerspectiveNet(19),rng=new RNG(9922);
const trainResult=await train(main.model,main.causal,{episodes,seed,n:11,interval:Math.max(25,Math.floor(episodes/8))});
const selected=PerspectiveNet.restore(trainResult.bestSnapshot.model);
for(let ep=0;ep<episodes;ep++){
 const world=makeWorld(seed+ep*7709,11,['branched','braided','rooms'][ep%3]);
 for(const snap of snapshots(world,(seed+ep*7709)^0xa5ab33)){
  // Destructive control: path labels deliberately shuffled across ALL cells.
  const shuffled=rng.shuffle(snap.label.slice());negative.train(snap.belief,11,snap.position,world.goal,shuffled,rng,.008);
 }
}
const suites=[7,11,15].map(n=>({n,valid:evaluate(selected,{seed:990031,count:72,n,navigation:true,causal:main.causal}),
 destructive:evaluate(negative,{seed:990031,count:72,n}),untrained:evaluate(new PerspectiveNet(19),{seed:990031,count:72,n})}));
console.log(JSON.stringify({episodes,seed,validationBest:trainResult.best,tests:suites},null,2));
