import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {RNG,VIEWS,createProjectionWorld,PerspectiveLearner,trainProjection,evaluateProjection} from '../engine/projection.mjs';
import {ACTIONS,MOD,applyLaw,createRuleWorld,RuleLearner,runRuleExperiment,evaluateRules} from '../engine/rules.mjs';
import {FORMULAS,REACTIONS,atomCounts,reactionBalance,applyReaction,planChemistry} from '../engine/chemistry.mjs';

test('projection sensor reveals only one 2D view and evaluator retains separate hidden coordinates',()=>{
 const a=createProjectionWorld(123),b=createProjectionWorld(123);
 assert.deepEqual(a.teacher(),b.teacher());
 assert.deepEqual(a.observe('front'),b.observe('front'));
 assert.deepEqual(a.observe('top'),b.observe('top'));
 assert.deepEqual(Object.keys(a.observe('front')).sort(),['pair','view']);
 assert.equal(a.observe('front').pair.length,2);
 assert.throws(()=>a.observe('inside'));
});

test('latent correspondence graph is invented from repeated measured scenes, not explicitly supplied indices',()=>{
 const learner=new PerspectiveLearner({minEvidence:12});
 assert.equal(learner.clusters().length,6);
 trainProjection(learner,{scenes:75,seed:103001});
 const groups=learner.clusters();
 assert.equal(groups.length,3);
 assert.deepEqual(groups.map(g=>g.length).sort(),[2,2,2]);
 assert.equal(learner.links().length,3);
 assert.ok(learner.links().every(x=>x.support>=12&&x.agreement===1));
});

test('trained model predicts an unseen 2D projection by composing newly discovered shared factors',()=>{
 const learner=new PerspectiveLearner();
 trainProjection(learner,{scenes:80});
 const world=createProjectionWorld(991001);
 const predicted=learner.predict('top',[world.observe('front'),world.observe('side')]);
 assert.deepEqual(predicted.pair,world.observe('top').pair);
 assert.deepEqual(predicted.sources,['inferred','inferred']);
 const tested=evaluateProjection(learner,{count:70,seed:991011});
 assert.equal(tested.exactRate,1);
 assert.equal(tested.coverage,1);
 assert.ok(tested.independent2DAccuracy<.4);
});

test('the next viewpoint is chosen to reveal an unseen factor, not duplicate an observed one',()=>{
 const learner=new PerspectiveLearner();
 trainProjection(learner,{scenes:30});
 const world=createProjectionWorld(777);
 assert.equal(learner.chooseView([]).view,'front');
 assert.equal(learner.chooseView([world.observe('front')]).view,'side');
 assert.equal(learner.chooseView([world.observe('front'),world.observe('side')]).view,'top');
 assert.equal(learner.chooseView(VIEWS.map(v=>world.observe(v))),null);
});

test('perspective checkpoint restores all evidence and reproduces predictions without hidden teacher',()=>{
 const learner=new PerspectiveLearner();trainProjection(learner,{scenes:22});
 const restored=PerspectiveLearner.restore(learner.snapshot());
 assert.deepEqual(restored.snapshot(),learner.snapshot());
 const scene=createProjectionWorld(9192);
 assert.deepEqual(restored.predict('top',[scene.observe('front'),scene.observe('side')]),
   learner.predict('top',[scene.observe('front'),scene.observe('side')]));
 assert.throws(()=>PerspectiveLearner.restore({...learner.snapshot(),scenes:-1}));
});

test('causal learner can switch representational classes after contradictory interventions',()=>{
 const m=new RuleLearner();
 const square={kind:'square',a:4};
 for(let x=0;x<6;x++)m.observe({action:'amber',input:x,output:applyLaw(square,x)});
 assert.equal(m.best('amber').mismatch,0);
 assert.equal(m.best('amber').law.kind,'square');
 assert.ok(m.creations>=1);
 for(let x=6;x<MOD;x++)assert.equal(m.predict(x,'amber').value,applyLaw(square,x));
});

test('causal induction outperforms a fixed-addition prior on held-out numeric states',()=>{
 const report=evaluateRules({count:60,seed:910037});
 assert.equal(report.heldOutAccuracy,1);
 assert.ok(report.fixedAdditionAccuracy<report.heldOutAccuracy);
 assert.equal(report.total,60*2*5);
 assert.ok(report.alternativePerspectives>0);
});

test('rule learner only learns from visible action-result events',()=>{
 const world=createRuleWorld(456),m=new RuleLearner();
 runRuleExperiment(m,world,{repeats:1});
 for(const action of ACTIONS)assert.equal(m.samples[action].length,6);
 assert.deepEqual(RuleLearner.restore(m.snapshot()).samples,m.samples);
 const next=m.chooseExperiment(5);
 assert.ok(ACTIONS.includes(next.action));
 assert.ok(Number.isInteger(next.diversity));
});

test('counterfactual rule planning emits only legal actions and terminates within its budget',()=>{
 const m=new RuleLearner();
 for(const action of ACTIONS)for(let x=0;x<6;x++)
  m.observe({action,input:x,output:action==='amber'?(x+1)%MOD:x});
 const plan=m.plan(1,5,8);
 assert.equal(plan.found,true);
 assert.ok(plan.actions.length<=8);
 let at=1;for(const action of plan.actions){assert.ok(ACTIONS.includes(action));at=m.predict(at,action).value}
 assert.equal(at,5);
});

test('all listed chemical transformations have exact atom balance',()=>{
 for(const reaction of REACTIONS)assert.equal(reactionBalance(reaction).balanced,true,reaction.id);
 const initial={glucose:1,water:1};
 const product=applyReaction(initial,REACTIONS[0]);
 assert.deepEqual(atomCounts(initial),atomCounts(product));
 assert.ok(product.ethanol>=2);
});
test('water alone cannot become ethanol by rearranging atoms in a closed model',()=>{
 const result=planChemistry({water:50},{goal:'ethanol',amount:1});
 assert.equal(result.possible,false);
 assert.equal(result.deficits.C,2);
 assert.deepEqual(result.steps,[]);
});
test('closed-system planning finds only a permitted balanced reaction sequence',()=>{
 const result=planChemistry({water:1,glucose:1},{goal:'ethanol',amount:1});
 assert.equal(result.possible,true);
 assert.equal(result.steps[0].id,'fermentation');
 assert.deepEqual(atomCounts(result.initial),atomCounts(result.final));
});
test('unbalanced reactions, negative inventories and invalid inputs are rejected',()=>{
 assert.throws(()=>applyReaction({water:5},{in:{water:1},out:{ethanol:1}}));
 assert.throws(()=>planChemistry({water:-1},{goal:'ethanol'}));
 assert.throws(()=>planChemistry({nonexistent:1},{goal:'ethanol'}));
});

test('repeat evaluation is deterministic and leaves learned weights unchanged',()=>{
 const learner=new PerspectiveLearner();trainProjection(learner,{scenes:45});
 const before=JSON.stringify(learner.snapshot());
 const a=evaluateProjection(learner,{count:40}),b=evaluateProjection(learner,{count:40});
 assert.deepEqual(a,b);assert.equal(JSON.stringify(learner.snapshot()),before);
});

test('visual controls have actual handlers and three independent world diagrams',async()=>{
 const root=path.dirname(fileURLToPath(import.meta.url));
 const html=await readFile(path.join(root,'../escape-public/index.html'),'utf8');
 const js=await readFile(path.join(root,'../escape-public/app.js'),'utf8');
 for(const id of ['truth','views','rule-canvas','train','evaluate','front','side','top','suggest',
  'amber','violet','auto-rule','plan','chem-plan','new','reset']){
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
  if(!['truth','views','rule-canvas'].includes(id))assert.ok(js.includes("$('"+id+"').onclick"),'Inert '+id);
 }
 assert.ok(js.includes('drawSolid(')&&js.includes('drawProjections(')&&js.includes('drawNumberLab('));
});
