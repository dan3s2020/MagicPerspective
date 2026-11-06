import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {Brain} from './brain.mjs';
import {PerspectiveLearner,perspectiveEpisode,evaluatePerspective} from '../worlds/perspective.mjs';
import {makeMaze,seedOf,SEEDS,RNG} from '../worlds/labyrinth.mjs';
import {Discoverer} from '../worlds/exercise.mjs';

test('V17 ORIGINAL Brain really lives perspective experience, and saves the learned transform',()=>{
 const brain=new Brain({seed:11,rules:{}});
 for(let i=0;i<64;i++)brain.playMaze(i%12===0);
 const p=brain.perspective;
 const snapshot=p.summary();
 console.log('LIVE_TRAINING_METRICS '+JSON.stringify({
  originalMazeEpisodes:brain.mazes.played,perspectiveEpisodes:p.episodes,
  originalMazeSolved:brain.mazes.won,perspectiveSolved:p.solved,
  movementTransformSamples:p.samples,mappingAccuracy:p.mappingAccuracy(),
  headingAccuracy:snapshot.headingAccuracy,poseAccuracy:snapshot.poseAccuracy
 }));
 assert.equal(brain.mazes.played,64);
 assert.equal(p.episodes,64,'Perspective was not attached to actual V17 maze training');
 assert.ok(p.samples>0,'No learned transforms from egocentric observations');
 assert.ok(brain.lived>0,'The original unified graph never received perspective episodes');
 assert.ok(p.last?.trace?.length>0,'Missing true V17 perspective trace in saved brain');
 const previous=structuredClone(p.votes), priorBrainRng=structuredClone(brain.disc.r);
 const report=brain.testPerspective(16,73);
 console.log('FROZEN_V17_PERSPECTIVE_EVAL '+JSON.stringify({
  frozenTrials:report.count,trained:report.learned,control:report.control,
  improvementPoints:report.improvementPoints
 }));
 assert.equal(report.learned.count,16);assert.equal(report.control.count,16);
 assert.deepEqual(p.votes,previous,'Heldout evaluation modified learned votes');
 assert.equal(brain.disc.r.s,priorBrainRng.s,'Heldout evaluation advanced original V17 RNG');
 assert.equal(report.replay[0].mapGlances,1);
 assert.equal(report.replay[0].globalObservationsAfterStart,0);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'magic-v17-perspective-'));
 try{
  const save=path.join(tmp,'brain.v8');
  brain.save(save);
  const loaded=Brain.load(save);
  assert.ok(loaded.perspective instanceof PerspectiveLearner);
  assert.equal(loaded.perspective.samples,p.samples);
  assert.deepEqual(loaded.perspective.votes,p.votes);
  assert.equal(loaded.mazes.played,64);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
},{timeout:120000});
test('frozen 0-training evaluation gives identical paired controls',()=>{
 const model=new PerspectiveLearner(),disc=new Discoverer(11);
 const result=evaluatePerspective(disc,model,{count:8,seed:73});
 assert.equal(result.improvementPoints,0,'Untrained and untrained paired runs must coincide');
 assert.deepEqual(result.replay[0].physicalPath,result.controlReplay[0].physicalPath);
 assert.equal(model.samples,0);
},{timeout:30000});
test('world retina is shown once and original initial shape called once',()=>{
 const disc=new Discoverer(12),model=new PerspectiveLearner();
 const maze=makeMaze(seedOf(SEEDS.test,19112),9);
 let calls=0,retinas=0,bodySymbols=0;
 const orig=disc.shape;disc.shape=function(...a){calls++;return orig.apply(this,a);};
 const result=perspectiveEpisode(maze,disc,model,{train:true,record:true,seed:17,
  live:y=>{if(retinas<maze.n*maze.n)retinas++;else bodySymbols++;}});
 assert.equal(calls,1,'The global planner must NOT reobserve the full map after each step');
 assert.equal(retinas,maze.n*maze.n,'Exactly one overhead retina');
 assert.equal(result.globalObservationsAfterStart,0);
 assert.ok(bodySymbols>=result.steps*26-25,'Local patches + actual actions must be fed to real Brain');
 assert.equal(result.mapGlances,1);
 assert.equal(result.trace.length,result.steps);
},{timeout:30000});
test('ORIGINAL V17 live UI and server keep their existing entrypoints and controls',()=>{
 const base=new URL('../ui/',import.meta.url);
 const html=fs.readFileSync(new URL('index.html',base),'utf8');
 const js=fs.readFileSync(new URL('app.js',base),'utf8');
 const server=fs.readFileSync(new URL('./devour.mjs',import.meta.url),'utf8');
 const worker=fs.readFileSync(new URL('./worker.mjs',import.meta.url),'utf8');
 assert.match(html,/id="g"/);assert.match(html,/id="allStart"/);assert.match(html,/id="chatForm"/);
 assert.match(html,/id="perspectiveBox"/);assert.match(html,/id="perspEvaluate"/);
 assert.match(js,/function perspectiveDraw\(/);
 assert.match(js,/\/perspective-eval/);
 assert.match(server,/perspective-eval/);
 assert.match(worker,/brain\.testPerspective/);
 assert.match(worker,/perspectiveStats/);
 assert.match(server,/\/transcend\/torus-aether\/ui\/index\.html\?live=1/);
 assert.ok(html.includes('<script type="module" src="app.js">'));
 assert.ok(!/DEMO_MODE|synthetic_(maze|perspective)/.test(js));
});
