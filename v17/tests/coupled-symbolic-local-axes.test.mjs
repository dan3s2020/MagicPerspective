import test from "node:test";
import assert from "node:assert/strict";
import {world,stateView,LocalAxisLearner,calibrate,seeded} from "../research/local-axes/transport.mjs";
import {secretWords,WordDrivenNavigator,physicalWordStep,observeWords,executeTextRoute} from "../research/local-axes/word-navigation.mjs";

test("original V17 learned local axes + unknown symbolic action words form ONE executable preaction path",()=>{
 const rows=[];
 for(const D of [2,3,4,5]){
   let solved=0,globalOnly=0,brokenWords=0,total=0,withheldUsed=0,actions=0;
   const nworlds=8;
   for(let seed=1;seed<=nworlds;seed++){
     const w=world({D,side:3,seed:500+seed}),m=new LocalAxisLearner(stateView(w));
     const r=calibrate(w,m);
     assert.equal(r.covered,w.size);
     const aliases=secretWords(D,882+seed);
     const nav=new WordDrivenNavigator(m,[...aliases.keys()]);
     const observations=observeWords(w,nav,aliases,{repeats:2,noise:0,seed:771+seed});
     const report=nav.learnWords();
     assert.equal(report.knownWords,2*D);
     for(const [word,physical]of aliases)assert.equal(nav.dictionary.get(word),physical);
     const rand=seeded(790+seed*D),held=new Set(w.withheld.map(e=>e.u+":"+e.v));
     const aliasWords=[...nav.dictionary.keys()],rotated=aliasWords.map(x=>nav.dictionary.get(x));
     // scramble the MEANINGS, not the generated textual task.
     rotated.push(rotated.shift());
     for(let iter=0;iter<30;iter++){
       const a=Math.floor(rand()*w.size),b=Math.floor(rand()*w.size);
       if(a===b)continue;
       const prompt="from ("+w.coords[a].join(",")+") to ("+w.coords[b].join(",")+")";
       const p=nav.textPlan(prompt);
       assert.ok(p.ready,JSON.stringify(p));
       assert.equal(p.preaction,true);
       assert.ok(p.actions.every(x=>x!==null));
       const result=executeTextRoute(w,aliases,p);
       solved+=+result.solved;total++;actions+=p.actions.length;
       if(p.nodes.some((node,i)=>i<p.actions.length&&held.has(Math.min(node,p.nodes[i+1])+":"+Math.max(node,p.nodes[i+1]))))withheldUsed++;
       const gb=nav.textPlan(prompt,{ablation:"global-only"});
       globalOnly+=+executeTextRoute(w,aliases,gb).solved;
       const prior=new Map(nav.dictionary);
       nav.dictionary=new Map(aliasWords.map((word,i)=>[word,rotated[i]]));
       const spoiled=nav.textPlan(prompt);
       brokenWords+=+executeTextRoute(w,aliases,spoiled).solved;
       nav.dictionary=prior;
     }
   }
   assert.equal(solved,total,"all symbolic actions must execute the predicted world route");
   assert.ok(globalOnly<total*.7,JSON.stringify({D,globalOnly,total}));
   assert.ok(brokenWords<total*.7,JSON.stringify({D,brokenWords,total}));
   assert.ok(withheldUsed>0);
   rows.push({D,worlds:nworlds,textualTasks:total,fullCausalSuccess:solved,
    globalAxisAblationSuccess:globalOnly,wordMeaningAblationSuccess:brokenWords,
    meanActions:actions/total,tasksUsingUnobservedLinks:withheldUsed});
 }
 console.log("COUPLED_TEXT_WORDS_AND_LOCAL_AXES",JSON.stringify(rows));
});
test("stochastic word-observation noise can be filtered by repeated independent action evidence",()=>{
 const reports=[];
 for(const D of [2,3,4]){
   let exact=0,total=0;
   for(let seed=1;seed<=8;seed++){
     const w=world({D,side:3,seed:711+seed}),m=new LocalAxisLearner(stateView(w));
     calibrate(w,m,{repeat:9,noise:.15,seed:2255+seed});
     const words=secretWords(D,319+seed),nav=new WordDrivenNavigator(m,[...words.keys()]);
     observeWords(w,nav,words,{repeats:17,noise:.30,seed:391+seed});
     const report=nav.learnWords({minConfidence:.6});
     const n=[...words].filter(([word,axis])=>nav.dictionary.get(word)===axis).length;
     exact+=n;total+=words.size;
   }
   reports.push({D,heldoutWordMeanings:total,correct:exact,accuracy:exact/total});
 }
 assert.ok(reports.every(x=>x.accuracy>.90),JSON.stringify(reports));
 console.log("COUPLED_NOISE_FILTERED_WORD_SEMANTICS",JSON.stringify(reports));
});
test("contradictory meanings for one word must suppress its use, not hallucinate a direction",()=>{
 const w=world({D:3,side:3,seed:777}),m=new LocalAxisLearner(stateView(w));
 calibrate(w,m);
 const aliases=secretWords(3,39),nav=new WordDrivenNavigator(m,[...aliases.keys()]);
 observeWords(w,nav,aliases,{repeats:4});
 const key=[...aliases.keys()][0],other=[...aliases.keys()][1],wordValues=[...aliases.values()];
 // Inject conflicting observations into native evidence, equal count for
 // two separate directions. A confidence threshold rejects ambiguous tokens.
 for(let i=0;i<4;i++)nav.observations.observe("word:"+key,"interpret","local:"+wordValues[1]);
 const report=nav.learnWords({minConfidence:.65});
 assert.equal(report.knownWords,aliases.size-1);
 assert.ok(!nav.dictionary.has(key));
 console.log("AMBIGUOUS_LOCAL_WORD_FALSIFICATION",JSON.stringify({ambiguousWord:key,known:report.knownWords,total:report.totalWords}));
});
