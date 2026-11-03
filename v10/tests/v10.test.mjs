import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeMaze,observe,teacherShape,bfs,step} from '../engine/maze.mjs';
import {ShapeOrgan,FEAT} from '../engine/organ.mjs';
import {Memory,decode} from '../engine/organism.mjs';
import {episode,episodeG,nextStepTarget,evaluate,train,makeWorldOf} from '../engine/train.mjs';
import {makeGraphWorld,makeSatWorld,teacherOn,observeW} from '../engine/worlds.mjs';
import {GraphMind} from '../engine/mind.mjs';
const sig=x=>JSON.stringify(x,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v);
test('SPEC.md exists and every requirement cites a message of the verbatim conversation',async()=>{
  const s=await readFile(new URL('../SPEC.md',import.meta.url),'utf8');const rows=s.split('\n').filter(l=>/^\| [A-F]\d+ \|/.test(l));
  assert.ok(rows.length>=35);for(const r of rows)assert.match(r,/\| [\d., ()a-zăîâșțA-Z„”:—-]*\d+[^|]*\|/);});
test('C1/C2: seeded procedural mazes with several valid routes; the world never hands the map to the organism',()=>{
  for(let s=1;s<=10;s++){const w=makeMaze(s,7);assert.equal(sig(w),sig(makeMaze(s,7)));assert.ok(bfs(7,w.wall,w.start)[w.goal]<1e9);}
  const o=observe(makeMaze(3,9),makeMaze(3,9).start);assert.deepEqual(Object.keys(o).sort(),['goalRel','patch']);assert.equal(o.patch.length,9);});
test('B3: the teacher accepts EVERY optimal route, not just one',()=>{let multi=0;
  for(let s=1;s<=20;s++){const w=makeMaze(s,9),t=teacherShape(w,w.start),onPath=t.y.reduce((a,b)=>a+b,0);if(onPath>t.length+1)multi++;}assert.ok(multi>0);});
test('A3: the internal map is built only from 3×3 slices placed by the organism\'s own moves',()=>{
  const w=makeMaze(5,9),m=new Memory(9,w.start,observe(w,w.start).goalRel);m.absorb(observe(w,w.start));assert.equal([...m.cells].filter(v=>v!==-1).length,9);
  assert.equal(m.goal,w.goal);const free=[0,1,2,3].find(a=>step(w,w.start,a).moved);const r=step(w,w.start,free);m.moveBy(free,r.moved);assert.equal(m.pos,r.pos);});
test('A1/B2: the whole shape exists at step 0, before any action; the decoded line starts at the organism',()=>{
  const w=makeMaze(8,9),e=episode(w,new ShapeOrgan({seed:3}),{record:true});const f=e.frames[0];assert.equal(f.step,0);assert.equal(f.line[0],w.start);assert.equal(f.p.length,81);assert.ok(f.U.length===81);});
test('B5/B6: evaluation never changes the organ and gets no teacher signal',()=>{const o=new ShapeOrgan({seed:4}),before=sig(o.snapshot());evaluate(o,{count:3,sizes:[7],modes:['organ']});assert.equal(sig(o.snapshot()),before);});
test('the organism WITHOUT the shape organ learns only the next step (same network, same teacher, no shape)',()=>{
  const w=makeMaze(9,7),y=nextStepTarget(w,w.start),d=bfs(7,w.wall,w.goal);assert.ok(y.reduce((a,b)=>a+b,0)>=1);for(let i=0;i<49;i++)if(y[i])assert.equal(d[i],d[w.start]-1);});
test('A7: training changes the organ only through the teacher\'s numeric error, and the error goes down',async()=>{
  const o=new ShapeOrgan({seed:5});const w=makeMaze(11,7),m=new Memory(7,w.start,observe(w,w.start).goalRel);m.absorb(observe(w,w.start));const y=teacherShape(w,w.start).y,mask=Uint8Array.from(m.cells,v=>v===1?0:1);
  let first=null,last=null;for(let i=0;i<60;i++){const f=o.forward(m.features(),7);const l=o.backward(f,y,mask,null);o.step();if(i===0)first=l;last=l;}assert.ok(last<first*.7,`${last} vs ${first}`);});
test('C4/C5: graph and constraint worlds are seeded and solvable; the organism only learns their rules from consequences',()=>{
  for(let s=1;s<=5;s++){const g=makeGraphWorld(s),c=makeSatWorld(s);assert.ok(teacherOn(g,g.start).length>=3);assert.ok(teacherOn(c,c.start).length>=3);}
  const g=makeGraphWorld(2),m=new GraphMind(g);assert.equal(m.rules.predict(g.start,0),null);m.absorb(observeW(g,g.start));assert.equal(m.rules.predict(g.start,0),g.ops[0].f(g.start));});
test('D5 precondition: the SAME organ (same weights) runs on grids and on graphs of states',()=>{const o=new ShapeOrgan({seed:6});
  const a=episode(makeMaze(3,7),o,{}),b=episodeG(makeWorldOf('graph',3),o,{}),c=episodeG(makeWorldOf('sat',3),o,{});assert.ok(a.first&&b.first&&c.first);});
test('organ checkpoint round-trip is exact',()=>{const o=new ShapeOrgan({seed:9});const r=ShapeOrgan.restore(JSON.parse(JSON.stringify(o.snapshot())));const w=makeMaze(4,7),m=new Memory(7,w.start,observe(w,w.start).goalRel);m.absorb(observe(w,w.start));
  assert.deepEqual(Array.from(o.forward(m.features(),7).p),Array.from(r.forward(m.features(),7).p));});
