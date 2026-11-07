// Fourth iteration: use original Brain.liveLanguage and original TextPerspectives
// recurrence. Test max-product attraction vs true AND-intersection and oscillator.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
test('original text graph: monotone field versus loop oscillations and AND-goal intersections',
{timeout:120000},()=>{
 const B=new Brain({seed:31,rules:{}});
 for(let i=0;i<20;i++){
   B.liveLanguage('portal north gate');
   B.liveLanguage('portal south bridge');
 }
 const L=B.language;
 const originalSeen=L.seen,originalFinals=new Map(L.finals),keys=[...L.unigram.keys()];
 const iterations=[0,1,2,3,4,8,16,45,90];
 const series=[];
 for(const k of iterations){
   const v=L.buildField({iterations:k,decay:.97});
   series.push({iterations:k,values:Object.fromEntries(keys.map(t=>[t,v.get(t)||0]))});
 }
 let decreases=0,nonZero=0;
 for(let i=1;i<series.length;i++){
   for(const key of keys){
     if(series[i].values[key]+1e-12<series[i-1].values[key])decreases++;
   }
 }
 const all=L.buildField({iterations:45});
 const bothStart=all.get('portal')||0;
 let onlyNorth=0,onlySouth=0,none=0;
 try{
   L.finals=new Map([['gate',originalFinals.get('gate')]]);
   onlyNorth=L.buildField({iterations:45}).get('portal')||0;
   L.finals=new Map([['bridge',originalFinals.get('bridge')]]);
   onlySouth=L.buildField({iterations:45}).get('portal')||0;
   L.finals=new Map();
   none=L.buildField({iterations:45}).get('portal')||0;
 }finally{
   L.finals=originalFinals;
   L.buildField({iterations:45});
 }
 const nav=L.navigate('portal north',{steps:12,useField:true});
 const held=B.testLanguage('portal north gate',{maxTokens:16,seed:77});
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v42-native-language-goal-'));
 let checkpointRoundtrip=false;
 try{
   const file=path.join(tmp,'brain.v8');B.save(file);
   const loaded=Brain.load(file);
   checkpointRoundtrip=loaded.language.seen===originalSeen &&
     JSON.stringify([...loaded.language.finals])===JSON.stringify([...originalFinals]);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
 assert.equal(decreases,0,'Original max-product goal propagation oscillated/decreased');
 assert.ok(bothStart>0&&onlyNorth>0&&onlySouth>0,
   'Each alternate final should independently attract the shared source');
 assert.equal(none,0,'With no learned terminal, the original goal field must disappear');
 assert.ok(checkpointRoundtrip,'Native Brain.save/load did not preserve text field');
 assert.equal(L.seen,originalSeen,'Read-only field probes retrained the corpus');
 const out={
  actualOriginalBrain:true,
  training:{observedTokens:originalSeen,observedStates:L.stateCount,
    terminalTokens:[...originalFinals],edges:L.edges.size},
  recurrence:{iterationValues:series,measuredDecreases:decreases,
    allConvergedBy45:JSON.stringify(series.at(-2).values)===JSON.stringify(series.at(-1).values)},
  multiGoalConstraint:{
   start:'portal',bothTerminalsValue:bothStart,
   gateOnlyValue:onlyNorth,bridgeOnlyValue:onlySouth,noTerminalValue:none,
   independentGoalSufficient:onlyNorth>0 && onlySouth>0,
   simultaneousIntersectionRequired:false,
   mathematicalOperator:'max over available observed neighbors; not conjunction of goals'
  },
  originalNavigation:{prefix:nav.prefix,path:nav.path.map(s=>({token:s.token,perspective:s.perspective,attraction:s.attraction}))},
  actualHeldoutTextProbe:{rawAccuracy:held.tokenPrediction.accuracy,
    fieldAccuracy:held.fieldPrediction.accuracy,
    knownRaw:held.tokenPrediction.known,knownField:held.fieldPrediction.known},
  checkpointRoundtrip,
  interpretation:'These actual token-state recurrence and max-aggregation mechanisms contain goal attraction but do not implement phase synchronization or an AND-over-all-circular-paths intersection.'
 };
 console.log('MAGICPERSPECTIVE_NATIVE_TEXT_ATTRACTION_RESULTS '+JSON.stringify(out));
});
