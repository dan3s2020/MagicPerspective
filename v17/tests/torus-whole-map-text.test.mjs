import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTextHypercube,mapFrom2DMaze,WholeWorldNavigator,NativeWholeTextWorld}
  from '../transcend/torus-aether/worlds/whole-map-text.mjs';
import {makeMaze} from '../transcend/torus-aether/worlds/labyrinth.mjs';

test('the WHOLE 6D text-world is absorbed before any character moves',()=>{
 const w=makeTextHypercube({dimensions:6,seed:291,wallRate:.18});
 const nav=new WholeWorldNavigator();
 const atlas=nav.absorb(w);
 assert.equal(atlas.states,64);
 assert.equal(w.edges.length,64*6);
 assert.equal(nav.cursor,w.start);
 assert.throws(()=>nav.moveOne(),/Find an internal path/);
 const field=nav.propagate();
 assert.equal(field.startReachable,true);
 const result=nav.plan();
 assert.equal(result.plannedBeforeMovement,true);
 assert.equal(nav.cursor,w.start);
 assert.equal(nav.executed.length,0);
 let cursorText='';
 while(true){
  const step=nav.moveOne();if(!step)break;
  cursorText+=step.nextCharacter;
  assert.equal(step.nextCharacter.length,1);
  assert.equal(step.remaining>=0,true);
  assert.equal(step.nextCharacter,step.position[step.axis].toString());
 }
 assert.equal(nav.cursor,w.goal);
 assert.equal(nav.executed.length,result.steps);
 assert.equal(result.steps,result.optimal);
 assert.equal(cursorText.length,result.steps);
});
test('one identical wavefront algorithm solves actual generated V17 2D labyrinths',()=>{
 for(const seed of [12,39,70,271,519]){
  const maze=makeMaze(seed,11,.27);
  const graph=mapFrom2DMaze(maze),nav=new WholeWorldNavigator();
  nav.absorb(graph);nav.propagate();
  const route=nav.plan();
  assert.equal(route.solved,true);
  assert.equal(route.steps,maze.dist[maze.start]);
  for(let i=0;i<route.steps;i++)assert.ok(nav.moveOne());
  assert.equal(nav.cursor,graph.goal);
  assert.equal(nav.moveOne(),null);
 }
});
test('walls are true barriers and no traversals are invented',()=>{
 const world=makeTextHypercube({
  dimensions:3,seed:19,wallRate:0,
  forbidden:['001','010','100'],ensureConnected:false
 });
 const nav=new WholeWorldNavigator();nav.absorb(world);
 const field=nav.propagate();
 assert.equal(field.startReachable,false);
 const route=nav.plan();
 assert.equal(route.solved,false);
 assert.equal(route.reason,'no-legal-path');
 assert.equal(nav.cursor,world.start);
 assert.throws(()=>nav.moveOne(),/Find an internal path/);
});
test('noise can only select among valid, goal-decreasing paths',()=>{
 const world=makeTextHypercube({dimensions:6,seed:6,wallRate:0});
 const nav=new WholeWorldNavigator();nav.absorb(world);nav.propagate();
 const route=nav.plan({noise:1,random:()=>.99});
 assert.equal(route.steps,6);
 for(const item of route.choices)assert.ok(item.available>=1);
 for(let i=0;i<route.steps;i++)assert.ok(nav.moveOne());
 assert.equal(nav.cursor,world.goal);
});
test('same original Brain instance receives actual cursor movements, not teacher-forced text',()=>{
 const symbols=[],shared=[],nodes=new Map(),edges=new Map();
 const brain={seed:31,trace:{
  node(id,type,label){nodes.set(id,{type,label});},
  setEdge(a,b,type,weight){edges.set(a+'>'+b+'>'+type,weight);},
  fire(id){assert.ok(nodes.has(id));}
 },live(char){symbols.push(char);},observeShared(event){shared.push(event);}};
 const world=new NativeWholeTextWorld(brain,{dimensions:6});
 const row=world.play(31);
 assert.equal(row.absorbBeforeFirstStep,true);
 assert.equal(row.plannedBeforeFirstCharacter,true);
 assert.equal(row.solved,true);
 assert.equal(row.steps,row.optimal);
 assert.equal(row.movementTrace.length,row.steps);
 assert.equal(row.movementCharacters.length,row.steps);
 assert.equal(symbols.length,row.steps);
 assert.deepEqual(symbols.map(x=>String.fromCharCode(x)).join(''),row.movementCharacters);
 assert.equal(shared.length,row.steps);
 assert.ok(nodes.has('whole:text:universe'));
 assert.ok(nodes.has('whole:text:goal'));
});
test('world size cap prevents pretending to absorb a partial world',()=>{
 assert.throws(()=>makeTextHypercube({dimensions:11,maxStates:256}),/explicit atlas limit/);
});
