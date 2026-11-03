import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeUniversal,UKINDS,publicView,senseAt,truthRoute,bandsBeyond,UBANDS} from '../engine/graphs.mjs';
import {UOrganism,uMemory,uRemember,uFeatures,U_FEATURES} from '../engine/uorgan.mjs';
import {UEpisode,VARIANTS} from '../engine/uagent.mjs';
import {HorizonDemocracy} from '../engine/democracy/horizon.mjs';
import {successMultiplier} from '../engine/democracy/a11-output-democracy-economy.mjs';
import {evaluate,liveEpisode,imagineOnce,train,SEEDS} from '../engine/utraining.mjs';
const sig=x=>JSON.stringify(x);
test('every kind of world is a seeded, solvable network of states; the public view hides what works and what it costs',()=>{
  for(const k of UKINDS)for(let s=1;s<=4;s++){const w=makeUniversal(s,k,11);assert.equal(sig(w),sig(makeUniversal(s,k,11)));assert.ok(Number.isFinite(truthRoute(w).cost));assert.notEqual(w.start,w.goal);
    const pub=sig(publicView(w));assert.ok(!pub.includes('"open"')&&!pub.includes('"cost"')&&!pub.includes('layout'));}});
test('the puzzle is a real state space: 120 arrangements of 5 tokens, each with 4 swaps',()=>{
  const w=makeUniversal(3,'puzzle');assert.equal(w.n,120);assert.ok(w.adj.every(a=>a.length===4));assert.equal(w.labels[w.goal],'01234');});
test('a state sees its own actions exactly and, for EACH action, 3 bands × 4 readings beyond it — never looking back',()=>{
  for(const k of UKINDS){const w=makeUniversal(5,k,11),o=senseAt(w,w.start);assert.equal(o.window.length,w.adj[w.start].length);assert.equal(o.horizon.length,w.adj[w.start].length);
    for(const d of o.horizon){assert.equal(d.bands.length,UBANDS.length);for(const b of d.bands)assert.ok(b.length===4&&b.every(x=>x>=0&&x<=1));
      assert.ok(!bandsBeyond(w.adj,w.start,d.to).flat().some(id=>w.adj[w.start].some(a=>a.id===id)));}}});
test('features contain only graph facts: same size in every world, all finite',()=>{
  for(const k of UKINDS){const w=makeUniversal(2,k,11),m=uMemory(publicView(w));uRemember(m,senseAt(w,w.start));
    for(let id=0;id<w.links.length;id+=7){const x=uFeatures(m,id,[.5,.3]);assert.equal(x.length,U_FEATURES);assert.ok(x.every(Number.isFinite));}}});
test('the whole route exists before the first step, follows actions, and every variant reaches the goal using only working actions',()=>{
  for(const v of Object.keys(VARIANTS))for(const k of UKINDS){const w=makeUniversal(11,k,11),ep=new UEpisode(w,new UOrganism(1),{variant:v,record:false});
    const r=ep.p.route;assert.equal(r[0],w.start);assert.equal(r.at(-1),w.goal);ep.run();assert.ok(ep.finished,`${v} ${k}`);
    for(let i=1;i<ep.walked.length;i++){const e=w.adj[ep.walked[i-1]].find(x=>x.to===ep.walked[i]);assert.ok(w.links[e.id].open);}}});
test('the organism never receives the truth: hiding a far action that no horizon sees changes nothing it imagines',()=>{
  const a=makeUniversal(7,'network',15),near=new Set(a.adj[a.start].flatMap(({to,id})=>[id,...bandsBeyond(a.adj,a.start,to).flat()]));
  const far=a.links.find(l=>!near.has(l.id));if(!far)return;const b=structuredClone(a);b.links[far.id].open=!b.links[far.id].open;
  if(sig(senseAt(a,a.start))!==sig(senseAt(b,b.start)))return;
  const o=new UOrganism(3),ma=uMemory(publicView(a)),mb=uMemory(publicView(b));uRemember(ma,senseAt(a,a.start));uRemember(mb,senseAt(b,b.start));
  assert.deepEqual(Array.from(o.perceive(ma,a.start,{dreams:0,democracy:'off'}).p),Array.from(o.perceive(mb,b.start,{dreams:0,democracy:'off'}).p));});
test('the democracy modules are the original OctopusV2 A11 files, unchanged',async()=>{
  for(const f of ['a11-output-democracy-economy','a11-democratic-output-policy']){const src=await readFile(new URL(`../engine/democracy/${f}.mjs`,import.meta.url),'utf8');
    assert.ok(src.includes('NOT')&&src.length>2000,f);}
  assert.equal(+successMultiplier(4).toFixed(3),2.08);});
test('A11 democracy: simultaneous commit, bilateral coalitions, own payout with convex team bonus',()=>{
  const d=new HorizonDemocracy({organisms:3,communication:'all-consent-experiment'}),truth=new Map([[10,true],[11,true],[12,false]]);
  const block=d.commit([10,11,12].map((link,i)=>({link,p:[.9,.8,.2][i],ask:j=>[.9,.8,.2][j]})));
  assert.equal(block.emitted.length,3);assert.ok(block.coalitions.every(c=>c.partners.length===2));
  const s=d.reveal(block,id=>truth.get(id));assert.equal(s.correctCount,3);assert.equal(+s.multiplier.toFixed(3),1.63);assert.ok(d.wallets().every(w=>w>=1.63));
  const solo=new HorizonDemocracy({organisms:3,communication:'none'}),b2=solo.commit([10,11,12].map(link=>({link,p:.9,ask:()=>.9})));
  assert.ok(b2.coalitions.every(c=>c.partners.length===0)||b2.coalitions.length===0);assert.equal(solo.reveal(b2,id=>truth.get(id)).correctCount,2);});
test('the world is the only referee: a block is judged when its horizons are seen, and only once',()=>{
  const o=new UOrganism(4),ep=new UEpisode(makeUniversal(21,'relief',11),o,{record:false});ep.run(30);
  assert.ok(o.democracy.trials>0&&o.democracy.graded>0);assert.ok(o.democracy.history.every(h=>h.correct<=h.total));});
test('learning only from what the world reveals, only when online; evaluation never changes the brain',()=>{
  const o=new UOrganism(5);liveEpisode(o,3,'network',11);assert.ok(o.samples>0);const before=sig(o.snapshot());evaluate(o,{count:5,size:11,variants:['v9','classic']});assert.equal(sig(o.snapshot()),before);
  const f=new UOrganism(5),b=sig(f.voters.map(v=>v.pass.snapshot()));new UEpisode(makeUniversal(3,'relief',11),f,{online:false,record:false}).run();assert.equal(sig(f.voters.map(v=>v.pass.snapshot())),b);});
test('brain round-trip keeps imagination and democracy identical',()=>{
  const o=new UOrganism(6);for(let i=0;i<5;i++)liveEpisode(o,40+i,UKINDS[i],11);const r=UOrganism.restore(JSON.parse(JSON.stringify(o.snapshot())));
  const w=makeUniversal(9,'puzzle');assert.deepEqual(imagineOnce(o,w).imagined,imagineOnce(r,w).imagined);assert.deepEqual(r.democracy.wallets(),o.democracy.wallets());
  assert.throws(()=>UOrganism.restore({schema:8}));});
test('validation, training and test seeds are disjoint; short training improves the network organ over no organ',async()=>{
  const s=Object.values(SEEDS);assert.equal(new Set(s).size,s.length);
  const o=new UOrganism(17),r=await train(o,{episodes:40,size:11,validationCount:5});const t=evaluate(UOrganism.restore(r.bestSnapshot),{count:6,size:11,kinds:['network'],variants:['no-dreams','classic']}).kinds.network;
  assert.ok(t['no-dreams'].ratio<=t.classic.ratio+.02,`${t['no-dreams'].ratio} vs ${t.classic.ratio}`);});
