import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MessageBrain} from '../engine/brain.mjs';
import {trainEpisode,costMAE} from '../engine/experiment.mjs';

test('real training episode provides inspectable frames, prediction, observer truth and measurable weight corrections',()=>{
 const brain=new MessageBrain(20261103);
 const previous=brain.snapshot();
 const episode=trainEpisode(brain,0,{n:24,seed:130000,trace:true});
 const x=episode.live;
 assert.ok(x&&x.episode===1);
 assert.ok(x.frames.length>=2);
 assert.ok(x.frames.some(f=>f.type==='action'));
 assert.ok(Array.isArray(x.initialShape)&&Array.isArray(x.initialTruth.optimal));
 assert.equal(x.teacherOnly,true);
 assert.ok(x.initialF1>=0&&x.initialF1<=1);
 assert.ok(x.afterTrainingF1>=0&&x.afterTrainingF1<=1);
 assert.ok(x.costUpdatesInEpisode>=0&&x.ruleUpdatesInEpisode>=0);
 assert.equal(x.costUpdatesInEpisode,brain.costUpdates-previous.costUpdates);
 assert.equal(x.ruleUpdatesInEpisode,brain.ruleUpdates-previous.ruleUpdates);
 assert.ok(x.weightShift>=0);
 // The original checkpoint contract is unchanged.
 assert.equal(brain.snapshot().schema,previous.schema);
});

test('visual UI has sticky controls, live train replay and honest held-out diagnostics',async()=>{
 const dir=new URL('../public/',import.meta.url);
 const html=await readFile(new URL('index.html',dir),'utf8');
 const css=await readFile(new URL('style.css',dir),'utf8');
 const js=await readFile(new URL('app.js',dir),'utf8');
 for(const id of ['start','pause','resume','save','train-canvas','episode-title',
  'train-f1','train-after-f1','train-delta','gain','base-mae','now-mae',
  'validation','learning-chart','truth','learner','test'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(css,/\.toolbar\{position:sticky/);
 assert.match(js,/train\/live/);
 assert.match(js,/EPISOD REAL/);
 assert.match(js,/baselineCostMAE/);
 assert.match(js,/initialTruth\.optimal/);
 assert.match(js,/function chooseLive/);
});

test('held-out MAE uses same fixed test problem before and after learning',()=>{
 const a=new MessageBrain(20261103),before=costMAE(a,{seed:880000,n:33,count:12});
 for(let i=0;i<20;i++)trainEpisode(a,i,{n:24,seed:130000});
 const after=costMAE(a,{seed:880000,n:33,count:12});
 assert.ok(Number.isFinite(before)&&Number.isFinite(after));
 assert.ok(before>0&&after>=0);
});
