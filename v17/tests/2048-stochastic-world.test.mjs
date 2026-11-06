import test from "node:test";
import assert from "node:assert/strict";
import {slide,successors,randomSeed,start,step,mass,empty,greedy,chanceAware,spawn,legal} from "../research/2048/stochastic-world.mjs";

// 2048 environment has real stochastic CHANCE NODES after deterministic global actions.
// These are world dynamics, not random character sampling or invented 4D rotations.
const zeros=Array(16).fill(0);
test("2+2+2+2 merges into 4,4 only once per global LEFT/RIGHT action",()=>{
 const b=[2,2,2,2, 4,0,4,0, 8,16,16,8, 0,0,0,0];
 const l=slide(b,"left"),r=slide(b,"right");
 assert.deepEqual(l.board.slice(0,4),[4,4,0,0]);
 assert.deepEqual(r.board.slice(0,4),[0,0,4,4]);
 assert.deepEqual(l.board.slice(4,8),[8,0,0,0]);
 assert.deepEqual(l.board.slice(8,12),[8,32,8,0]);
 assert.equal(l.reward,48);assert.equal(l.merges,4);
 for(const d of ["left","right","up","down"])assert.equal(mass(slide(b,d).board),mass(b));
});
test("exactly 2×free-cell distinct futures, each with 90/10 random tile value and uniform placement",()=>{
 const b=[4,4,0,0, 16,8,0,0, 2,4,8,16, 0,0,0,0];
 const result=slide(b,"left"),n=empty(result.board),options=successors(result.board);
 assert.equal(options.length,n*2);
 assert.ok(options.every(x=>x.p===(x.value===2?.9/n:.1/n)));
 assert.ok(options.every(x=>mass(x.board)===mass(result.board)+x.value));
 assert.ok(Math.abs(options.reduce((t,x)=>t+x.p,0)-1)<1e-12);
 const H=-options.reduce((t,x)=>t+x.p*Math.log2(x.p),0);
 const derived=Math.log2(n)-.9*Math.log2(.9)-.1*Math.log2(.1);
 assert.ok(Math.abs(H-derived)<1e-12);
 const blocked=step([4,2,0,0,...zeros.slice(0,12)],"left",randomSeed(12));
 assert.equal(blocked.spawn,null);
 console.log("EXACT_2048_ENVIRONMENT_ENTROPY",JSON.stringify({emptyCells:n,possibleFutureBoards:options.length,entropyBits:H}));
});
test("20k seeded spawn draws verify uniform POSITION and 90/10 VALUE",()=>{
 const b=[2,4,8,16, 32,64,128,256, 512,1024,2,4, 0,0,0,0];
 const random=randomSeed(138),n=20000,pos=[0,0,0,0],types={2:0,4:0};
 for(let i=0;i<n;i++){
  const out=spawn(b,random);
  pos[out.index-12]++;types[out.value]++;
 }
 assert.ok(Math.abs(types[2]/n-.9)<.02);
 assert.ok(pos.every(x=>Math.abs(x/n-.25)<.02));
 console.log("SPAWN_OBSERVATION",JSON.stringify({n,p2:types[2]/n,p4:types[4]/n,positions:pos.map(x=>x/n)}));
});
test("choice of DIRECTION changes the next chance tree's number of branches, no RNG leakage",()=>{
 const b=[2,2,0,0, 4,0,0,0, 8,16,16,8, 0,0,0,0];
 const branches=legal(b).map(d=>{
  const s=slide(b,d),outs=successors(s.board);
  assert.ok(Math.abs(outs.reduce((n,x)=>n+x.p,0)-1)<1e-12);
  return {direction:d,freeCells:empty(s.board),outcomes:outs.length};
 });
 assert.deepEqual(branches.map(x=>x.outcomes),[22,22,18,18]);
 const policy=chanceAware(b,{depth:2});
 assert.equal(policy,chanceAware(b,{depth:2}));
 console.log("MOVEMENT_CHANGES_RANDOM_FUTURES",JSON.stringify({policy,branches}));
});
test("paired 64 independent seeded 140-move games: explicit chance branching vs greedy immediate merging",()=>{
 const N=64,moves=140,results=[];
 for(let seed=1;seed<=N;seed++){
  const scores={seed};
  for(const policy of ["greedy","chance"]){
   const random=randomSeed(seed);let board=start(random),total=0,played=0;
   for(let i=0;i<moves;i++){
    const action=policy==="greedy"?greedy(board):chanceAware(board,{depth:2});
    if(!action)break;
    const outcome=step(board,action,random);
    board=outcome.board;total+=outcome.reward;played++;
   }
   scores[policy]={total,played,highest:Math.max(...board)};
  }
  results.push(scores);
 }
 const mean=name=>results.reduce((s,row)=>s+row[name].total,0)/N;
 const immediate=mean("greedy"),chance=mean("chance");
 const differences=results.map(x=>x.chance.total-x.greedy.total);
 const delta=differences.reduce((s,x)=>s+x,0)/N;
 const error=Math.sqrt(differences.reduce((s,x)=>s+(x-delta)**2,0)/(N-1)/N);
 assert.ok(chance>immediate);
 assert.ok(delta>2*error);
 console.log("GROUNDED_2048_CHANCE_POLICY_TEST",JSON.stringify({
  games:N,movesPerGame:moves,greedyScore:immediate,chanceScore:chance,
  relativeGain:chance/immediate-1,pairedMeanGain:delta,pairedSE:error,
  chanceWins:differences.filter(x=>x>0).length,
  greedyWins:differences.filter(x=>x<0).length,
  meanMaxTileGreedy:results.reduce((s,x)=>s+x.greedy.highest,0)/N,
  meanMaxTileChance:results.reduce((s,x)=>s+x.chance.highest,0)/N,
  got2048Greedy:results.filter(x=>x.greedy.highest>=2048).length,
  got2048Chance:results.filter(x=>x.chance.highest>=2048).length
 }));
});

test("the RANDOM NEW TILE is a necessary source of mass and growth, not merely decision noise",()=>{
 // Sliding and merging are conservative, no matter what directions are selected.
 const b=[2,2,0,0,...Array(12).fill(0)],initialMass=mass(b);
 let current=b;
 for(let i=0;i<80;i++){
  const actions=legal(current);
  if(!actions.length)break;
  current=slide(current,actions[i%actions.length]).board;
  assert.equal(mass(current),initialMass);
  assert.ok(Math.max(...current)<=initialMass);
 }
 // Now the world injects one genuinely random piece after each legal move.
 const rng=randomSeed(1337);
 let world=start(rng),initial=mass(world),injected=0,actions=0;
 for(let i=0;i<120;i++){
  const direction=greedy(world);
  if(!direction)break;
  const outcome=step(world,direction,rng);
  injected+=outcome.spawn.value;world=outcome.board;actions++;
  assert.equal(mass(world),initial+injected);
 }
 assert.ok(actions>=90);
 assert.ok(mass(world)>initialMass);
 console.log("NOISE_AS_NEW_RESOURCES",JSON.stringify({
  noSpawnInitialMass:initialMass,noSpawnFinalMass:mass(current),
  stochasticInitialMass:initial,stochasticAfter:mass(world),
  injectedMass:injected,validActions:actions,
  interpretation:"random world spawning adds resources; it is not a mere rotation or a changed text temperature"
 }));
});
