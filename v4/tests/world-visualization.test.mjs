import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGallery} from '../engine/gallery.mjs';
import {makeWorld,emptyBelief,sense,absorb} from '../engine/world.mjs';
import {drawWorld} from '../public/world-visuals.js';
import {readFile} from 'node:fs/promises';

test('all three visualized worlds are real, solvable and separate',()=>{
 const g=makeGallery(9);
 assert.deepEqual(g.map(w=>w.kind),['maze','braided','graph']);
 for(const w of g){
  assert.equal(w.spec.size,9);
  assert.equal(w.teacher.truth.length,w.spec.links.length);
  assert.equal(w.teacher.path[0],w.spec.start);
  assert.equal(w.teacher.path.at(-1),w.spec.goal);
  assert.equal(w.spec.layout.length,w.spec.nodes);
  assert.ok(w.teacher.path.length>1);
  assert.ok(!JSON.stringify(w.spec).includes('"open"'));
 }
 assert.equal(g[0].spec.nodes,81);
 assert.equal(g[1].spec.nodes,81);
 assert.ok(g[2].spec.nodes<81);
});
test('evaluator-only gallery does not affect world state or learned inputs',()=>{
 const before=makeWorld(222,'maze',9),json=JSON.stringify(before);
 for(const size of [5,7,9,11])makeGallery(size);
 assert.equal(JSON.stringify(before),json);
});
test('all world renderers draw real and hidden-data-free learner perspectives',()=>{
 const contexts={};
 const oldDoc=globalThis.document,oldWindow=globalThis.window;
 globalThis.window={devicePixelRatio:1};
 globalThis.document={getElementById:id=>({
  width:0,height:0,getContext(){
   const counters={fillRect:0,stroke:0,arc:0};
   const ctx={count:counters,setTransform(){},fillRect(){counters.fillRect++},beginPath(){},moveTo(){},
    lineTo(){},stroke(){counters.stroke++},arc(){counters.arc++},fill(){},strokeRect(){},
    setLineDash(){},fillText(){}};
   contexts[id]=ctx;return ctx;
  }
 })};
 try{
  const g=makeGallery(9);
  for(let k=0;k<g.length;k++){
   const w=g[k];
   drawWorld('full-'+w.kind,w,true,{mini:true});
   const world=makeWorld(280701+k*7391,w.kind,9),belief=emptyBelief(w.spec);
   absorb(belief,sense(world,world.start));
   // Crucial: no teacher property. If the learner renderer reads hidden truth, the test fails.
   const learner={spec:w.spec,belief,position:w.position,plan:{nodes:w.teacher.path,alternatives:[]}};
   drawWorld('learner-'+w.kind,learner,false);
   const expected=w.kind==='graph'?1:82;
   assert.equal(contexts['full-'+w.kind].count.fillRect,expected);
   assert.equal(contexts['learner-'+w.kind].count.fillRect,expected);
   assert.ok(contexts['full-'+w.kind].count.stroke>0);
   assert.ok(contexts['learner-'+w.kind].count.stroke>0);
  }
 }finally{globalThis.document=oldDoc;globalThis.window=oldWindow;}
});
test('UI has three buttons, distinct canvases and a compatible server endpoint',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 for(const k of ['maze','braided','graph']){
  assert.ok(html.includes('id="preview-'+k+'"'));
  assert.ok(html.includes('id="choose-'+k+'"'));
 }
 assert.ok(html.includes('id="truth"')&&html.includes('id="dream"'));
 assert.ok(app.includes("drawWorld('truth',e,true)"));
 assert.ok(app.includes("drawWorld('dream',e,false)"));
 assert.ok(app.includes("selectWorld($('kind').value)"));
 assert.ok(server.includes("name==='/api/gallery'"));
 assert.ok(server.includes("'world-visuals.js'"));
});
