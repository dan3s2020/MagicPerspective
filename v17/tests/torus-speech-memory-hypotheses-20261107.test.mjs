// Second iteration: the actual native Brain and original AligningGraph.write speech loop.
// Purely observational except reversible evaluation-only coordinate scrambles.
// The native trainer, writing algorithm, model and files are not modified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';

const same=(a,b)=>a===b;
function lagProfile(text,maxLag=24){
 const c=Array.from(text),r=[];
 for(let lag=1;lag<=Math.min(maxLag,c.length-1);lag++){
   let matches=0;
   for(let i=lag;i<c.length;i++)matches+=Number(c[i]===c[i-lag]);
   r.push({lag,rate:matches/(c.length-lag)});
 }
 return r.sort((a,b)=>b.rate-a.rate).slice(0,6);
}
test('native speech: observer-only torus shuffle, recurrence, and memory ablation',{timeout:180000},()=>{
 const B=new Brain({seed:113,rules:{}});
 B.setControls({ltemp:0,pnoise:0,gnoise:0,ttemp:0,wtemp:0});
 const lines=[];
 for(let i=0;i<36;i++){
   const q=['A','B','C'][i%3];
   const a=['cycle cycle return cycle.','pulse pulse link pulse.','orbit orbit return orbit.'][i%3];
   lines.push('Q: Continue '+q+'?\nA: '+a+'\n\n');
 }
 let examples=0,bytes=0;
 for(const line of lines){
   B.beginExercise();
   examples++;
   for(const ch of line){B.live(ch.charCodeAt(0));bytes++;}
 }
 const geo=B.trace.geo;
 const initialGeometry=geo.U;
 const lived=B.lived;
 const geoN=geo.n;
 const run=(T,seed=991)=>B.chat([['you','Continue A?']],{T,max:120,seed,stopBlank:false,learn:false,observePath:true});
 const deterministic=run(0),repeat=run(0);
 assert.equal(deterministic.text,repeat.text,'Native zero-temperature text must be deterministic');
 assert.equal(B.lived,lived,'Frozen chat unexpectedly trained the organism');
 const stochastic=run(.75),warm=run(1.25);
 const before=deterministic.pathTrace;
 assert.ok(before && before.steps.length>0,'Original text observer recorded no real generator steps');
 const coords=new Map([...initialGeometry].map(([code])=>[
   code,Array.from({length:5},(_,j)=>(((Number(code)+7)*(j+11)*1871+j*97)%997)/997)
 ]));
 let shuffled;
 try{
  geo.U=coords;
  shuffled=run(0);
 }finally{geo.U=initialGeometry;}
 assert.equal(shuffled.text,deterministic.text,'Observer-only geometry changed actual AligningGraph.write output');
 assert.equal(B.lived,lived,'Evaluation mutated native training state');
 assert.equal(geo.n,geoN,'Evaluation mutated native geometry training');
 const align=B.align;
 let withoutAlign;
 try{
  B.align=null;
  withoutAlign=B.chat([['you','Continue A?']],{T:0,max:120,seed:991,stopBlank:false,learn:false});
 }finally{B.align=align;}
 const summary={training:{examples,bytes,lived,coordinateSymbols:initialGeometry.size},
   temperatureZero:{text:deterministic.text,summary:before.summary,
     dominantSymbolLags:lagProfile(deterministic.text),
     repeatedContextFraction:before.summary.repeatedContextStates/Math.max(1,before.generated),
     repeatedEdgeFraction:before.summary.repeatedEdges/Math.max(1,before.generated)},
   temperature075:{text:stochastic.text,summary:stochastic.pathTrace.summary,
     dominantSymbolLags:lagProfile(stochastic.text)},
   temperature125:{text:warm.text,summary:warm.pathTrace.summary,
     dominantSymbolLags:lagProfile(warm.text)},
   geometryOnlyAblation:{
     generatedBytesUnchanged:same(shuffled.text,deterministic.text),
     originalMeasured5dDistance:before.summary.torusDistance5D,
     scrambledMeasured5dDistance:shuffled.pathTrace.summary.torusDistance5D,
     measured5dDistanceChanged:before.summary.torusDistance5D!==shuffled.pathTrace.summary.torusDistance5D,
     contextRevisitsUnchanged:before.summary.repeatedContextStates===shuffled.pathTrace.summary.repeatedContextStates
   },
   learnedAligningGraphAblation:{
     outputSame:withoutAlign.text===deterministic.text,
     outputLength:withoutAlign.text.length,
     textPrefix:withoutAlign.text.slice(0,80)
   },
   limitation:'5D observer coordinates belong to symbol identities, not demonstrated recurrent 5D whole-brain states. Repetition is not a measured Hopf linking number or synchronous phase lock.'
 };
 console.log('MAGICPERSPECTIVE_NATIVE_SPEECH_LOOP_RESULTS '+JSON.stringify(summary));
});
