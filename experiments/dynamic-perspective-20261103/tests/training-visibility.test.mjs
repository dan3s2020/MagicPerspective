import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MessageBrain} from '../engine/brain.mjs';
import {trainEpisode} from '../engine/experiment.mjs';

test('real episodes expose both perspectives without giving teacher links to the learner',()=>{
 const b=new MessageBrain(20261103);
 const training=trainEpisode(b,0,{n:24,seed:130000,trace:true});
 const e=training.live;
 assert.ok(e.teacherOnly&&e.frames.length>=2);
 for(const f of e.frames){
  assert.ok(Array.isArray(f.links));assert.ok(Array.isArray(f.truthLinks));
  assert.ok(Array.isArray(f.oracle)&&f.oracle.length>=2,'Evaluator solution visible at each sampled frame');
  assert.ok(Array.isArray(f.shape)&&Array.isArray(f.walked));
  assert.ok(f.links.every(x=>typeof x.a==='number'&&typeof x.b==='number'));
 }
 // The evaluator's initial optimal route is stored separately for scoring.
 assert.ok(e.initialTruth.optimal[0]===e.info.start);
 assert.ok(e.initialTruth.optimal.at(-1)===e.info.goal);
});
test('first screen is training, not unrelated session metrics, and every world has visible solution shape',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 for(const id of ['start','pause','resume','save','train-canvas','teacher-canvas','live-scrub',
  'step-action','step-discovery','step-correction','base-shape','now-shape','shape-delta',
  'base-mae','now-mae','replay-next','replay-speed','learning-chart','learner','truth']){
  assert.ok(html.includes(`id="${id}"`),id);
 }
 assert.ok(html.indexOf('id="train-canvas"')<html.indexOf('id="episodes"'));
 assert.ok(script.includes("f?.links||[]"),'Training canvas never takes evaluator truth edges');
 assert.ok(script.includes("f?.truthLinks||activeTrace.initialTruth.links"),'Evaluator truth separated');
 assert.ok(script.includes("f?.oracle||activeTrace.initialTruth.optimal"),'Evaluator current optimum on every frame');
 assert.ok(script.includes("train/live?since="),'Incremental actual training feed');
});
