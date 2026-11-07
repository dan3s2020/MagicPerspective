import test from "node:test";
import assert from "node:assert/strict";
import {world,stateView,LocalAxisLearner,calibrate,seeded,compose,inverse,same} from "../research/local-axes/transport.mjs";
import {secretWords,WordDrivenNavigator,observeWords,executeTextRoute} from "../research/local-axes/word-navigation.mjs";

// Here 2^D is a NUMBER OF STATES in a D-axis graph; it is not
// 2^D physical directions and not literal 2048-dimensional space.
test("the same learned local-axis transport and action-word semantics scale beyond 5D to a graph of 2048 states",()=>{
 const reports=[];
 for(const D of [6,8,10,11]){
   const nWorlds=D===11?2:3;
   let heldoutTotal=0,heldoutHits=0,problems=0,solved=0,globalOnly=0,seenUnobserved=0;
   let observedEdges=0,calibrationSamples=0;
   let representative=null;
   for(let seed=1;seed<=nWorlds;seed++){
     const w=world({D,side:2,seed:813+seed*D});
     const m=new LocalAxisLearner(stateView(w));
     const report=calibrate(w,m,{repeat:1,noise:0,seed:727});
     assert.equal(report.covered,w.size);
     assert.equal(report.conflicts,0);
     observedEdges+=w.tree.length;calibrationSamples+=m.graph.observations;
     for(const {u,v} of w.withheld){
       const t=compose(inverse(m.inferred[v]),m.inferred[u]);
       const trueT=compose(inverse(w.frames[v]),w.frames[u]);
       heldoutHits+=+same(t,trueT);heldoutTotal++;
     }
     const aliases=secretWords(D,551+seed),navigator=new WordDrivenNavigator(m,[...aliases.keys()]);
     observeWords(w,navigator,aliases,{repeats:2,noise:0,seed:99+seed});
     assert.equal(navigator.learnWords().knownWords,2*D);
     const rand=seeded(6132+seed*D),held=new Set(w.withheld.map(e=>e.u+":"+e.v));
     for(let t=0;t<24;t++){
       const start=Math.floor(rand()*w.size),goal=Math.floor(rand()*w.size);
       if(start===goal)continue;
       const prompt="from ("+w.coords[start].join(",")+") to ("+w.coords[goal].join(",")+")";
       const predicted=navigator.textPlan(prompt);
       const observed=executeTextRoute(w,aliases,predicted,{record:seed===1&&t===0});
       assert.ok(predicted.ready);
       assert.equal(predicted.preaction,true);
       solved+=+observed.solved;problems++;
       globalOnly+=+executeTextRoute(w,aliases,navigator.textPlan(prompt,{ablation:"global-only"})).solved;
       if(predicted.nodes.some((u,i)=>i<predicted.actions.length&&held.has(Math.min(u,predicted.nodes[i+1])+":"+Math.max(u,predicted.nodes[i+1]))))seenUnobserved++;
       if(!representative){representative={
          prompt,words:predicted.words,initialShape:predicted.nodes,
          actual:executeTextRoute(w,aliases,predicted,{record:true}).trace
       };}
     }
   }
   assert.equal(heldoutHits,heldoutTotal);
   assert.equal(solved,problems);
   assert.ok(globalOnly<problems*.25,JSON.stringify({D,globalOnly,problems}));
   assert.ok(seenUnobserved>0);
   reports.push({axes:D,states:2**D,worlds:nWorlds,observedTreeEdges:observedEdges,
      learnedBasisObservations:calibrationSamples,heldoutEdges:heldoutTotal,
      heldoutEdgesCorrect:heldoutHits,textGoalProblems:problems,exactPreactionSolutions:solved,
      noLocalAxesSolutions:globalOnly,goalsUsingUnobservedLinks:seenUnobserved,
      sample:representative&&{prompt:representative.prompt,actions:representative.words,
        plannedStates:representative.initialShape,actualMatches:representative.actual.every(x=>x.correct)}});
 }
 console.log("XD_SYMBOLIC_LOCAL_AXES_2048_STATES",JSON.stringify(reports));
});
