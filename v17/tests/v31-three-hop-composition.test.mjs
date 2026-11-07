// Genuine ORIGINAL Discoverer.shape composition: 3 independent learned
// transformations and a 3-hop pre-action path, full text kept intact.
// A deliberate middle-edge ablation MUST destroy the path, not hallucinate it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {answerFromOriginalPath,firstTryCharacterComparison} from '../transcend/torus-aether/worlds/path-answer-writer.mjs';
const triples=[['tea','coffee'],['coffee','water'],['water','juice']];
const feed=(model,a,b)=>{
 const id='source-'+a+'-'+b;
 model.observeWorld('Mira buys '+a+'. Mira buys '+b+'.',{id:id+'-m'});
 model.observeWorld('Ivo likes '+a+'. Ivo likes '+b+'.',{id:id+'-i'});
};
const question=(from,to,src)=>'Replace "'+from+'" with "'+to+'" in:\n'+src;
const words=(n,i,seed)=>{
 const tok=Array.from({length:n},(_,j)=>'token_'+seed+'_'+j);
 tok[i]='tea';
 return tok;
};
test('3-hop discovered path predicts complete unseen long text; frozen evaluation has NO hidden target answer',()=>{
 const m=new LearnedCognitiveMap();
 const stages=[];
 const cases=Array.from({length:30},(_,seed)=>{
   const n=[32,125,256,900,1800][seed%5],pos=(37*seed+19)%n;
   return {id:seed,src:words(n,pos,seed).join(' ')+'.',
     expected:words(n,pos,seed).map(v=>v==='tea'?'juice':v).join(' ')+'.'};
 });
 const stagesDocs=[0,2,4,6];
 let stage=0;
 for(const nDocs of stagesDocs){
   while(stage<nDocs){
     const t=triples[Math.floor(stage/2)];
     if(stage%2===0)m.observeWorld('Mira buys '+t[0]+'. Mira buys '+t[1]+'.',{id:'doc-'+stage});
     else m.observeWorld('Ivo likes '+t[0]+'. Ivo likes '+t[1]+'.',{id:'doc-'+stage});
     stage++;
   }
   const before=JSON.stringify(m.export());
   let found=0,correct=0,chars=0,sample=null;
   for(const c of cases){
     const r=answerFromOriginalPath(m,question('tea','juice',c.src),{
       maxTokens:2048,maxDepth:8,maxNodes:384});
     if(r.found)found++;
     const match=firstTryCharacterComparison(r.answer,c.expected);
     if(match.answerExact){correct++;chars+=match.comparedCharacters;}
     if(!sample||r.found)sample={id:c.id,found:r.found,
       steps:r.path.length,actions:r.path.map(x=>x.action),
       originProvenance:r.path.map(x=>x.provenance?.length||0),
       reason:r.reason};
     if(r.found)assert.equal(r.path.length,3);
   }
   assert.equal(JSON.stringify(m.export()),before,'Frozen evaluation leaked training information');
   stages.push({worlds:nDocs,correct,total:cases.length,successRate:correct/cases.length,
     charactersVerified:chars,sample});
   console.log('V31_MULTIHOP_CURVE',JSON.stringify(stages.at(-1)));
 }
 assert.deepEqual(stages.map(x=>x.correct),[0,0,0,30]);
 assert.ok(stages[3].charactersVerified>100000);
 const frozen=LearnedCognitiveMap.restore(m.export());
 const example=cases[4],query=question('tea','juice',example.src);
 const good=answerFromOriginalPath(frozen,query,{maxTokens:2048});
 assert.equal(good.answer,example.expected);
 assert.equal(good.path.length,3);
 assert.deepEqual(good.path.map(x=>x.transformation?.from),['tea','coffee','water']);
 const removed=[...frozen.rules.entries()].filter(([,r])=>r.from==='coffee'&&r.to==='water');
 assert.ok(removed.length>0);
 for(const [id] of removed)frozen.rules.delete(id);
 const lost=answerFromOriginalPath(frozen,query,{maxTokens:2048});
 assert.equal(lost.found,false);
 assert.equal(lost.answer,null);
 feed(frozen,'coffee','water'); // re-derive rule from NEW complete-source contrast events
 const recovered=answerFromOriginalPath(frozen,query,{maxTokens:2048});
 assert.equal(recovered.found,true);
 assert.equal(recovered.answer,example.expected);
 console.log('V31_MULTIHOP_CAUSAL_PROOF',JSON.stringify({pathLength:3,
   removedNecessaryMiddleEdge:true,answerLostWithoutEdge:true,
   newWorldEvidenceRestoresAnswer:true,terminalDerivedFromOriginalShape:true}));
});
