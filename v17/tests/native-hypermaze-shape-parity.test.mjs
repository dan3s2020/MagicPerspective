// Acceptance: the ORIGINAL maze Discoverer.shape() and the generalized
// graph operator must return EXACTLY the same pre-action path on unheard
// mazes after the REAL original Discoverer learned from lived episodes.
// This is code/algorithm parity, not a fake success label for language.
import test from "node:test";
import assert from "node:assert/strict";
import {Discoverer,KIND,playExercise}
 from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,nextCell,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";

const retina=w=>{
 const symbols=Array.from(w.wall,k=>k?KIND.wall:KIND.floor);
 symbols[w.goal]=KIND.target;
 symbols[w.start]=KIND.self;
 const edges=symbols.map((_,p)=>
  [0,1,2,3].map(action=>({action,to:nextCell(w,p,action)}))
   .filter(x=>x.to>=0));
 return {symbols,edges};
};
test("V17 original Discoverer.learnStep and endEpisode learn a genuine attraction/conductance field from 2D worlds",{
 timeout:100000
},()=>{
 const D=new Discoverer(11);
 const trained=[];
 for(let i=0;i<140;i++){
  const w=makeMaze(seedOf(SEEDS.train,100+i*17),[7,9,11][i%3]);
  const r=playExercise(w,D);
  trained.push(r.solved);
  if(i>=24&&D.attract(KIND.target)>.2&&D.conduct(KIND.floor)>=.5&&D.self()>=0)
   break;
 }
 assert.ok(D.episodes>20);
 assert.ok(D.attract(KIND.target)>.2,
  "Original maze organism did NOT learn a goal attractor: cannot claim learned shape");
 assert.ok(D.conduct(KIND.floor)>=.5,
  "Original maze organism did NOT learn traversability");
 assert.ok(D.self()>=0,"Original maze organism has not identified its moving body");
 let compared=0,nonempty=0,firstCorrect=0;
 const unseen=[];
 for(let i=0;i<42;i++){
  const w=makeMaze(seedOf(SEEDS.test,701023+i*131),[7,9,11][i%3]);
  const {symbols,edges}=retina(w);
  const direct=D.shape(symbols,w.n,w.start);
  const generalized=D.shapeGraph(symbols,edges,w.start,{details:true});
  const route=generalized?.path.map(x=>x.action)||null;
  assert.deepEqual(route,direct,
   "The generalized hypermaze must reproduce the ORIGINAL 2D shape byte-for-byte in actions; "+
    "counterexample seed "+w.seed);
  if(direct?.length){
   nonempty++;
   assert.equal(generalized?.firstPredictionBeforeAction,true);
   firstCorrect+=Number(direct[0]===route[0]);
   const shuffled=edges.map(x=>x.slice());
   const fallback=D.shapeGraph(symbols,shuffled,w.start,{details:true,geometryWeight:0});
   assert.deepEqual(fallback?.path.map(x=>x.action)||null,direct);
  }
  compared++;
  if(i<6)unseen.push({seed:w.seed,originalShape:direct,
   graphShape:route,matched:JSON.stringify(direct)===JSON.stringify(route)});
 }
 assert.ok(nonempty>=20,
  "Parity was vacuous: original trained motor produced too few pre-action solution shapes");
 console.log("ORIGINAL_DISCOVERER_SHAPE_PARITY",JSON.stringify({
  trainedEpisodes:D.episodes,originalLearnedTargetAttraction:D.attract(KIND.target),
  originalLearnedFloorConductance:D.conduct(KIND.floor),
  unseen:compared,nonempty,exactAlgorithmParityRate:1,
  firstActionParityRate:nonempty?firstCorrect/nonempty:null,
  firstActionOptimality_NOT_TESTED:true,samples:unseen}));
});
test("Hypermaze refuses invalid world states, invalid edges or non-finite geometry",()=>{
 const d=new Discoverer(11);
 assert.throws(()=>d.shapeGraph([0],[[]],2),/validated observed state/);
 assert.throws(()=>d.shapeGraph([4],[[]],0),/validated observed state/);
 assert.throws(()=>d.shapeGraph([0,2],[[{to:3,action:0}],[]],0),
  /Invalid learned graph edge/);
 assert.throws(()=>d.shapeGraph([0,2],[[{to:1,action:0}],[]],0,
  {geometryWeight:Infinity}),/Geometry influence/);
});
