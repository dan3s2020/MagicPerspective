import test from "node:test";
import assert from "node:assert/strict";
import {makeGrammar,makeHeldout,preactionShape,verifyPhysics,seededRng,words}
  from "../research/relational-hypermaze/engine.mjs";

test("V23: 100 unseen 20-39 step routes, independent physical verification, 15% missing observations with three redundant views",()=>{
 const grammar=makeGrammar(),original=JSON.stringify(grammar.snapshot());
 let clean=0,missingOne=0,missingThree=0,bytes=0,wordsCount=0;
 const details=[];
 for(let seed=160000;seed<160100;seed++){
  const w=makeHeldout(seed,{routeLength:20+seed%20,distractors:300+seed%100});
  const p=preactionShape(grammar,w.document,w.initial,w.goal,{seed});
  clean+=Number(verifyPhysics(p,w).solved);
  const lines=w.document.split("\n"),r=seededRng(seed+888888);
  const single=lines.filter(()=>r.next()>=0.15).join("\n");
  const redundant=[...lines,...lines,...lines].filter(()=>r.next()>=0.15).join("\n");
  const a=preactionShape(grammar,single,w.initial,w.goal,{seed});
  const b=preactionShape(grammar,redundant,w.initial,w.goal,{seed});
  missingOne+=Number(verifyPhysics(a,w).solved);
  missingThree+=Number(verifyPhysics(b,w).solved);
  bytes+=w.document.length;wordsCount+=words(w.document).length;
  if(seed<160003)details.push({seed,expectedSteps:w.routeLength,
    clean:p.found,single:a.found,redundant:b.found});
 }
 assert.equal(JSON.stringify(grammar.snapshot()),original,"No test world may be learned during frozen evaluation");
 assert.equal(clean,100,"Complete observed maps must be solved");
 assert.ok(missingThree>=70,"At least 70% route validity across noisy redundant held-out worlds");
 assert.ok(missingThree>missingOne,"Redundant observations must outperform one randomly damaged document");
 console.log("V23_NOISE_LONG_PATH",JSON.stringify({
  cases:100,seeds:[160000,160099],clean,missingOne,missingThree,
  retainedObservationProbability:0.85,redundantCopies:3,
  meanBytes:bytes/100,meanWords:wordsCount/100,
  pathLength:"20-39",details,goalKnown:true,openDomainSemanticAccuracy:false}));
});
