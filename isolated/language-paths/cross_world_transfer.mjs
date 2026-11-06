// MagicPerspective / controlled structural transfer.
// Extends the isolated language-paths experiment. No V17 imports, mutations or checkpoints.
// All tests distinguish a constructive cross-domain positive control from general language understanding.
import {SpeechWorld,DiscoveredEffects,UTTERANCES,TRAIN_WORDS,TEST_WORDS,rng,plan,execute,same} from './engine.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// This world represents a spatial transformation game: distinct tiles laid along a 2D serpentine track.
// It is NOT the original V17 maze. Its physics is private and different seeds rebind its button labels.
const OP_NAMES=['rotate-left','rotate-right','reverse-track','swap-entry','swap-exit','swap-ends'];
const sourceButtons=Object.freeze(UTTERANCES.map((_,i)=>`pad:${i}`));
function shuffled(a,r){const b=a.slice();for(let i=b.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function trueSpatialTransform(state,which){const a=state.slice(),n=a.length;
 switch(which){
  case 0:return a.slice(1).concat(a[0]);
  case 1:return [a[n-1],...a.slice(0,-1)];
  case 2:return a.reverse();
  case 3:[a[0],a[1]]=[a[1],a[0]];return a;
  case 4:[a[n-2],a[n-1]]=[a[n-1],a[n-2]];return a;
  case 5:[a[0],a[n-1]]=[a[n-1],a[0]];return a;
  default:throw Error('bad spatial operation');
 }
}
export class SpatialTrack {
 #buttonPhysics;
 constructor(seed){this.#buttonPhysics=shuffled([0,1,2,3,4,5],rng(seed));this.state=[];}
 reset(tiles){if(!Array.isArray(tiles)||tiles.length<4||new Set(tiles).size!==tiles.length)throw Error('Need 4+ unique tiles');this.state=tiles.slice();return this.observe();}
 observe(){return {tiles:this.state.slice(),positions:this.state.map((tile,i)=>({tile,x:i%2,y:Math.floor(i/2)})),buttons:sourceButtons.slice()};}
 step(button){const index=sourceButtons.indexOf(button);if(index<0)throw Error('Bad spatial button');const before=this.state.slice();this.state=trueSpatialTransform(before,this.#buttonPhysics[index]);return {button,before,after:this.state.slice()};}
}

// The ONLY learned transformation hypotheses are the original language-paths candidate grammar.
// Their assignment to spatial buttons is inferred from interventions, not read from world physics.
export function learnSource(seed,rounds=4){const world=new SpatialTrack(seed),atlas=new DiscoveredEffects(),r=rng(seed*101+17),events=[];
 for(const n of [4,5])for(let round=0;round<rounds;round++){
  const tiles=shuffled(TRAIN_WORDS,r).slice(0,n);
  for(let i=0;i<sourceButtons.length;i++){
   const initial=world.reset(tiles).tiles;
   const observed=world.step(sourceButtons[i]);
   const label=UTTERANCES[i]; // index labels are private learner handles, not linguistic semantics
   const guess=atlas.predict(initial,label);
   atlas.observe({utterance:label,before:observed.before,after:observed.after});
   events.push({n,button:sourceButtons[i],before:initial,predictionBefore:guess,after:observed.after});
  }
 }
 if(!atlas.ready())throw Error('Spatial transition hypotheses failed to converge');
 return {atlas,events,sourceRules:atlas.report(),sourceSeed:seed};
}

// Anchor just the *action correspondence*: one observed intervention per speech utterance.
// No target goal, target solution path, or hidden speech-world physics is supplied to the atlas.
export function calibrateLanguage(atlas,world,{tokens=TRAIN_WORDS.slice(0,5)}={}){
 if(!atlas.ready())throw Error('Source atlas is not ready');
 const mapping={},evidence=[];
 for(const targetAction of UTTERANCES){
  const before=world.reset(tokens,tokens).words;
  const after=world.step(targetAction).after;
  const matches=UTTERANCES.filter(sourceAction=>same(atlas.predict(before,sourceAction),after));
  evidence.push({targetAction,sourceCandidates:matches.length,observedLength:tokens.length});
  if(matches.length!==1)throw Error(`Ambiguous correspondence ${targetAction} (${matches.length} candidates)`);
  mapping[targetAction]=matches[0];
 }
 return {mapping,evidence};
}

// Single learned source model + a domain-specific action-name adapter. The same source atlas
// drives the goal-conditioned reverse value field and all target successor predictions.
export function transferredModel(sourceAtlas,mapping){
 return {
  ready:()=>UTTERANCES.every(u=>mapping[u]&&sourceAtlas.hypothesis(mapping[u]).rule),
  predict:(s,u)=>mapping[u]?sourceAtlas.predict(s,mapping[u]):null,
  predecessor:(s,u)=>mapping[u]?sourceAtlas.predecessor(s,mapping[u]):null,
  hypothesis:(u)=>mapping[u]?sourceAtlas.hypothesis(mapping[u]):{confidence:0,rule:null}
 };
}
export const naiveUnalignedModel=sourceAtlas=>transferredModel(sourceAtlas,Object.fromEntries(UTTERANCES.map(u=>[u,u])));

// STRONG CONTROL: learn from the *same single target intervention per action*, with the
// same hard-coded hypothesis family already available in the original DiscoveredEffects.
// Original DiscoveredEffects requires >=2 records before accepting an effect. Duplicate the
// identical observation to remove that count guard WITHOUT presenting any additional data.
// This is a duplicate-record workaround for a comparative benchmark, NOT independent evidence.
export function oneShotTargetPrior(world,tokens=TRAIN_WORDS.slice(0,5)){
 const m=new DiscoveredEffects();
 for(const u of UTTERANCES){const before=world.reset(tokens,tokens).words,after=world.step(u).after;
  m.observe({utterance:u,before,after});m.observe({utterance:u,before,after});}
 if(!m.ready())throw Error('Single-example target prior not identified');return m;
}


export function evaluateTransfer({sourceSeed=11,targetSeeds=[29,53,97],tasksPerWorld=10,n=7,hops=8}={}){
 if(!Number.isInteger(tasksPerWorld)||tasksPerWorld<1||tasksPerWorld>100||![6,7].includes(n))throw Error('Test requires 1..100 tasks and n=6 or 7');
 const learned=learnSource(sourceSeed),rows=[],trace=[],calibrations=[],probes=[];
 for(const seed of targetSeeds){
  const world=new SpeechWorld(seed),binding=calibrateLanguage(learned.atlas,world),model=transferredModel(learned.atlas,binding.mapping),targetPrior=oneShotTargetPrior(world);
  const noBinding=naiveUnalignedModel(learned.atlas);
  calibrations.push({seed,evidence:binding.evidence,mapping:binding.mapping});
  if(!model.ready())throw Error('Transfer model not ready');
  // Held-out token identities and larger sequences. Source model has never seen the target world.
  const fresh=TEST_WORDS.slice(0,n);
  for(const utterance of UTTERANCES){world.reset(fresh,fresh);const truth=world.step(utterance).after;
   probes.push({seed,utterance,matched:same(model.predict(fresh,utterance),truth),naiveMatched:same(noBinding.predict(fresh,utterance),truth),directPriorMatched:same(targetPrior.predict(fresh,utterance),truth)});
  }
  for(let i=0;i<tasksPerWorld;i++){
   const {start,goal}=world.makeChallenge((seed*100003+i*4331)>>>0,n,hops,TEST_WORDS);
   const p=plan(start,goal,model,{maxSteps:24}),actual=execute(world,start,goal,p);
   const record={seed,index:i,n,solved:actual.solved,modelMatches:actual.modelMatches,
    predictedBeforeAction:p.found&&p.steps.length>0,steps:actual.steps,goalPathLength:p.steps.length,
    seenWordsInSource:start.filter(x=>TRAIN_WORDS.includes(x)).length};
   rows.push(record);
   if(trace.length<3)trace.push({start,goal,steps:p.steps.map(s=>({action:s.utterance,from:s.from,to:s.predicted,distanceBefore:s.distanceBefore,distanceAfter:s.distanceAfter})),
    observations:actual.observations,solved:actual.solved});
  }
 }
 const fraction=(a,p)=>a.length?a.filter(p).length/a.length:null;
 return {kind:'controlled-structural-cross-world-transfer',
  boundary:'Two deliberately isomorphic synthetic transformation families; not V17 maze transfer, natural-language understanding or a learned hyperdimensional manifold',
  design:{source:'2D serpentine spatial tile transformation game',target:'unseen utterance-driven word permutations',sourceObservations:learned.events.length,calibrationPerWorld:UTTERANCES.length,heldoutLengths:[n],sourceLengths:[4,5],sourceHypothesisFamily:'9 predefined index transformations; 6 physically instantiated',solutionDemonstrations:0,directPriorBaseline:'same fixed 9-rule grammar, one target observation per utterance; original >=2 guard satisfied by repeating the same record'},
  summary:{targetWorlds:targetSeeds.length,heldoutTasks:rows.length,solved:rows.filter(x=>x.solved).length,
   exactPredictions:rows.filter(x=>x.modelMatches).length,probes:probes.length,probesMatched:probes.filter(x=>x.matched).length,
   naiveUnalignedProbesMatched:probes.filter(x=>x.naiveMatched).length,
   directOneShotPriorProbesMatched:probes.filter(x=>x.directPriorMatched).length,
   targetSourceTokenOverlap:rows.some(x=>x.seenWordsInSource>0)},
  rules:learned.sourceRules,calibrations,probes,rows,trace};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=evaluateTransfer();console.log(JSON.stringify({kind:r.kind,boundary:r.boundary,design:r.design,summary:r.summary,sample:r.trace[0]},null,2));
}
