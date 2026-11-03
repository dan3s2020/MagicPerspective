import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,publicInfo,sense,act,oracle,key} from '../engine/world.mjs';
import {AssociationRule,Collective,pairFeatures} from '../engine/dance.mjs';
import {Episode} from '../engine/agent.mjs';
import {train,linkBCE,evaluate} from '../engine/training.mjs';
import {readFile} from 'node:fs/promises';

test('three seeded world families are connected, deterministic and have hidden links',()=>{
 for(const kind of ['local','hierarchical','mixed']){
  const a=makeWorld(98117,33,kind),b=makeWorld(98117,33,kind);
  assert.deepEqual(a,b);assert.equal(a.edges.filter(e=>e.open).length>=32,true);
  const p=publicInfo(a);assert.equal(p.edges,undefined);assert.equal(p.links,undefined);
  const path=oracle(a);assert.equal(path.nodes[0],a.start);assert.equal(path.nodes.at(-1),a.goal);
  assert.ok(path.cost>0);
 }
});

test('a node sees only local associations and cannot move along absent links',()=>{
 const w=makeWorld(44,21,'local'),o=sense(w,w.start);
 assert.ok(o.links.length>0&&o.links.length<21);
 for(const link of o.links)assert.ok(w.edges.some(e=>(e.a===w.start&&e.b===link.to)||(e.b===w.start&&e.a===link.to)));
 const nonneighbor=Array.from({length:w.n},(_,i)=>i).find(i=>i!==w.start&&!o.links.some(e=>e.to===i));
 assert.equal(act(w,w.start,nonneighbor).type,'blocked');
});

test('learning from local observations changes pair association probabilities',()=>{
 const rule=new AssociationRule(19),info=publicInfo(makeWorld(88,33,'mixed'));
 const p=rule.probability(info,3,7);for(let i=0;i<45;i++)rule.observe(info,3,7,1);
 assert.ok(rule.probability(info,3,7)>p);assert.equal(pairFeatures(info,3,7).length,9);
 const copy=AssociationRule.restore(rule.snapshot());assert.deepEqual(copy.snapshot(),rule.snapshot());
});

test('hidden changes beyond the first observation cannot alter initial hypotheses',()=>{
 const original=makeWorld(187,33,'mixed'),changed=structuredClone(original),start=original.start;
 const unseen=changed.edges.find(e=>e.a!==start&&e.b!==start);
 assert.ok(unseen);unseen.open=!unseen.open;unseen.cost=3;
 // Evaluator-only alteration, equal public metadata + equal first local observation.
 assert.deepEqual(publicInfo(original),publicInfo(changed));
 assert.deepEqual(sense(original,start),sense(changed,start));
 const a=new Episode(original,new AssociationRule(19),{online:false}),b=new Episode(changed,new AssociationRule(19),{online:false});
 assert.deepEqual(a.initial,b.initial);assert.deepEqual(a.collective.theta,b.collective.theta);
 assert.deepEqual(a.collective.hypothesis,b.collective.hypothesis);
});

test('undiscovered nodes cannot physically synchronize through unknown edges',()=>{
 const w=makeWorld(222,33,'hierarchical'),info=publicInfo(w),collective=new Collective(info,new AssociationRule(),{dance:true});
 const before=collective.theta.slice();collective.tick(40);
 for(let i=0;i<info.n;i++)if(i!==info.goal)assert.equal(collective.theta[i],before[i]);
 collective.observe(sense(w,w.start));collective.tick(40);
 const visited=new Set([w.start,...sense(w,w.start).links.filter(e=>e.open).map(e=>e.to)]);
 for(let i=0;i<info.n;i++)if(i!==info.goal&&!visited.has(i))assert.equal(collective.theta[i],before[i]);
});

test('physical navigation executes only locally observed open connections',()=>{
 const episode=new Episode(makeWorld(912,33,'mixed'),new AssociationRule());
 for(let i=0;i<40&&!episode.solved;i++){
  const from=episode.position,known=episode.collective.known;
  const result=episode.step();if(result.type!=='moved'&&result.type!=='goal')continue;
  assert.equal(known.get(key(from,episode.position)),1);
 }
 assert.ok(episode.history.every(f=>f.route[0]===f.position));
 assert.ok(episode.initial.nodes.length>1);
});

test('replay frames preserve past phases and evidence after new observations',()=>{
 const ep=new Episode(makeWorld(911,21,'local'),new AssociationRule());
 const initial=structuredClone(ep.history[0]);for(let i=0;i<8&&!ep.solved;i++)ep.step();
 assert.deepEqual(ep.history[0],initial);
 assert.equal(initial.step,0);assert.equal(initial.known.length,ep.history[0].known.length);
 assert.ok(ep.history.length>1);
});

test('frozen rule stays fixed, online rule updates; evaluator truth kept separate',()=>{
 const w=makeWorld(124,21,'local'),brain=new AssociationRule();
 const frozen=new Episode(w,AssociationRule.restore(brain.snapshot()),{online:false}),online=new Episode(w,AssociationRule.restore(brain.snapshot()),{online:true});
 frozen.run(30);online.run(30);
 assert.equal(frozen.collective.rule.updates,0);
 assert.ok(online.collective.rule.updates>0);
 const learner=online.payload({includeTruth:false});assert.equal(learner.evaluator,undefined);
 const human=online.payload({includeTruth:true});assert.ok(human.evaluator.edges.length>0);
});

test('training reduces balanced link BCE on fixed unseen validation seeds',async()=>{
 const rule=new AssociationRule(19),before=linkBCE(rule,{seed:800008,count:9,n:21}).balanced;
 const result=await train(rule,{episodes:20,n:21,seed:100001});
 assert.equal(result.done,20);assert.ok(result.best<before,`BCE ${before} -> ${result.best}`);
 assert.ok(result.history.length>=2);
});

test('paired evaluation compares trained online, frozen, no-dance and untrained worlds',()=>{
 const out=evaluate(new AssociationRule(),{count:3,n:21,seed:991111});
 assert.deepEqual(Object.keys(out.modes),['dance-online','dance-frozen','no-dance','untrained']);
 for(const v of Object.values(out.modes)){
  assert.ok(Number.isFinite(v.penalizedCost)&&v.penalizedCost>=0);
  assert.ok(v.success>=0&&v.success<=1);assert.ok(v.initialF1>=0&&v.initialF1<=1);
 }
 assert.equal(out.modes['dance-frozen'].learnedUpdates,0);
 assert.equal(out.modes['no-dance'].learnedUpdates,0);
});

test('phone UI includes world truth, learned map, replay, training and blind test',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 for(const id of ['truth','brain','timeline','replay','train','test','auto','step'])assert.ok(html.includes(`id="${id}"`));
 for(const endpoint of ['new','step','train','test','reset'])assert.ok(server.includes(`'/api/${endpoint}'`));
 assert.ok(app.includes('function drawWorld(')&&app.includes('function drawTimeline('));
});
