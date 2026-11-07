// Fifth iteration: original 5-torus Geometry + LivedField actual neural history,
// compare coordinate perturbation effects against unchanged AligningGraph generation.
// Training code untouched; geometry scramble reversible and only during evaluation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
const finite=x=>Number.isFinite(x);
const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
function compare(a,b){
 const n=Math.min(a.length,b.length);let common=0,changed=0,delta=0;
 for(let i=0;i<n;i++){
   const p=a[i],q=b[i];if(!p&&!q)continue;
   if(!p||!q){changed++;continue;}
   common++;
   let l1=0;for(let j=0;j<Math.min(p.length,q.length);j++)l1+=Math.abs((p[j]||0)-(q[j]||0));
   delta+=l1;changed+=Number(l1>1e-9);
 }
 return {compared:n,bothHaveDistribution:common,changedPredictions:changed,meanL1:common?delta/common:0};
}
test('native 5-torus vs 5D fractal moment field, counterfactual coordinate effects',
{timeout:180000},()=>{
 const B=new Brain({seed:117,rules:{}});
 B.setControls({gnoise:3,glr:.03,repel:.3,ltemp:0,pnoise:0});
 for(let k=0;k<36;k++){
   B.beginExercise();
   const a=['cycle cycle return cycle.','pulse pulse link pulse.','orbit orbit return orbit.'][k%3];
   const s='Q: Continue '+['A','B','C'][k%3]+'?\nA: '+a+'\n\n';
   for(const ch of s) B.live(ch.charCodeAt(0));
 }
 const geo=B.trace.geo;
 const U=geo.U,records=[...U],radius=records.map(([,v])=>Math.hypot(...v));
 const originalChat=B.chat([['you','Continue A?']],{T:0,max:90,seed:991,stopBlank:false,learn:false});
 const probe=Array.from(Buffer.from('Q: Continue B?\nA: cycle cycle return cycle.\n\n','ascii'));
 const original=B.field.read(probe,B.place);
 const positions=new Map(records.map(([code])=>[
  code,Array.from({length:geo.D},(_,j)=>(((Number(code)+13)*(j+17)*1417+j*37)%991)/991)
 ]));
 let changed,changedChat;
 try{
   geo.U=positions;
   changed=B.field.read(probe,B.place);
   changedChat=B.chat([['you','Continue A?']],{T:0,max:90,seed:991,stopBlank:false,learn:false});
 }finally{
   geo.U=U;
   B.field.read(probe,B.place); // restore cache in original learned geometry
 }
 const diff=compare(original,changed);
 const result={
   originalCoordinateManifold:{declaredDimension:geo.D,torusCoordinates:true,
     representedSymbols:U.size,
     allPhasesInUnitInterval:records.every(([,v])=>v.length===geo.D&&v.every(t=>finite(t)&&t>=0&&t<1)),
     euclideanRadii:{min:Math.min(...radius),max:Math.max(...radius),mean:mean(radius)},
     constrainedToConstantRadius:Math.max(...radius)-Math.min(...radius)<1e-6},
   historyField:{dimensions:B.field.M.D,lambda:B.field.lambda,
     recordedMoments:B.field.ring.length,probeBytes:probe.length,
     originalReturnedDistribution:original.filter(Boolean).length,
     perturbedReturnedDistribution:changed.filter(Boolean).length,
     comparison:diff},
   originalSpeech:{exactlyUnaffectedByObserverCoordinateScramble:originalChat.text===changedChat.text,
     outputPrefix:originalChat.text.slice(0,90)},
   biologyEquivalentCaveat:'This 5-torus is explicitly coded symbol coordinates. It is not an inferred Hopf fibration or an experimentally measured S3 manifold.',
   learningSafety:{noPersistentGeometryScramble:geo.U===U}
 };
 assert.equal(result.originalCoordinateManifold.allPhasesInUnitInterval,true);
 assert.equal(result.learningSafety.noPersistentGeometryScramble,true);
 assert.equal(result.originalSpeech.exactlyUnaffectedByObserverCoordinateScramble,true);
 console.log('MAGICPERSPECTIVE_NATIVE_5TORUS_FIELD_RESULTS '+JSON.stringify(result));
});
