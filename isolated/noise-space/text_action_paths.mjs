// Experimental corpus-derived language navigation head for the ORIGINAL V17 Brain.
// Learns observed Q/A word transitions and prompt->answer affinities from real Parquet rows.
// It cannot see held-out answers during inference, and it does not rewrite V17 Brain weights.
// The learned paths are paths through a text-production state graph, NOT a proven semantic manifold.
const BOS='<bos>', EOS='<eos>', UNK='<unk>', MAX_VOCAB=32000, MAX_NEIGHBORS=24;
const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('en-US');
export const tokenize=s=>(String(s??'').normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*|[^\s]/gu)||[]).map(normalize);
export const words=s=>tokenize(s).filter(t=>/[\p{L}\p{N}]/u.test(t));
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const top=(map,count=14)=>[...(map||new Map())].sort((a,b)=>b[1]-a[1]).slice(0,count);
function boundedAdd(map,id,weight=1,capacity=MAX_NEIGHBORS){
 const old=map.get(id);
 if(old!==undefined){map.set(id,old+weight);return;}
 if(map.size<capacity){map.set(id,weight);return;}
 // A bounded heavy-hitters structure: new candidate competes with the weakest.
 // Admission does not assert an unobserved transition; the new token WAS observed.
 let weak=null,min=Infinity;
 for(const [k,v] of map)if(v<min){min=v;weak=k;}
 if(weak!==null){map.delete(weak);map.set(id,min+weight);}
}
const matchScore=(hyp,ref)=>{
 const a=words(hyp),b=words(ref),counts=new Map();for(const t of b)counts.set(t,(counts.get(t)||0)+1);
 let hit=0;for(const t of a){const c=counts.get(t)||0;if(c){hit++;counts.set(t,c-1);}}
 const precision=hit/Math.max(1,a.length),recall=hit/Math.max(1,b.length);
 return {f1:precision+recall?2*precision*recall/(precision+recall):0,
   precision,recall,exact:normalize(hyp).trim()===normalize(ref).trim(),predictedWords:a.length,referenceWords:b.length};
};
export {matchScore};
export class TextActionPaths{
 constructor({maxVocab=MAX_VOCAB,neighbors=MAX_NEIGHBORS}={}){
  this.maxVocab=clamp(maxVocab,128,80000);this.neighbors=clamp(neighbors,4,64);
  this.vocab=[BOS,EOS,UNK];this.ids=new Map(this.vocab.map((v,i)=>[v,i]));
  this.freq=[0,0,0];this.edges=new Map();this.cues=new Map();this.docCount=new Map();
  this.rows=0;this.wordSteps=0;this.preUpdateHits=0;this.preUpdateSeen=0;
  this.last=null;this.lastEvaluation=null;this.maxContext=14;
 }
 id(token,learn=false){const t=normalize(token);if(this.ids.has(t))return this.ids.get(t);
  if(!learn||this.vocab.length>=this.maxVocab)return 2;
  const i=this.vocab.length;this.ids.set(t,i);this.vocab.push(t);this.freq.push(0);return i;
 }
 add(map,key,value){let row=map.get(key);if(!row){row=new Map();map.set(key,row);}boundedAdd(row,value,1,this.neighbors);}
 learn(prompt,answer){
  if(typeof prompt!=='string'||typeof answer!=='string')throw Error('Expected Q/A strings');
  const q=words(prompt).slice(0,64),a=tokenize(answer).slice(0,256);
  if(!q.length||!a.length)return {trained:false,reason:'empty Q/A'};
  // Predict first, update after observing the actual answer. The answer never reaches plan().
  const first=this.propose(prompt,[],3)[0];
  const trueFirst=normalize(a[0]);this.preUpdateSeen++;this.preUpdateHits+=Number(first?.token===trueFirst);
  const qIds=[...new Set(q.map(t=>this.id(t,true)))].slice(0,this.maxContext);
  const tokens=a.map(t=>this.id(t,true));let prev=0;
  for(const next of [...tokens,1]){
   this.add(this.edges,prev,next);this.freq[next]=(this.freq[next]||0)+1;
   prev=next;this.wordSteps++;
  }
  // Repeated Q/A evidence discovers cue->utterance links, rather than a preprogrammed semantic grammar.
  const salient=[...new Set(tokens.slice(0,48))].filter(id=>id!==2);
  for(const cue of qIds){this.docCount.set(cue,(this.docCount.get(cue)||0)+1);
   for(const token of salient)this.add(this.cues,cue,token);
  }
  this.rows++;return {trained:true,rows:this.rows,actions:tokens.length+1,cues:qIds.length};
 }
 propose(prompt,prefix=[],limit=10){
  if(!this.rows)return [];
  const prior=prefix.length?this.id(prefix.at(-1)):0;
  const q=[...new Set(words(prompt).slice(0,64).map(t=>this.id(t)))].filter(i=>i!==2).slice(0,this.maxContext);
  const candidate=new Set([...(this.edges.get(prior)?.keys()||[])]);
  for(const cue of q)for(const k of this.cues.get(cue)?.keys()||[])candidate.add(k);
  if(!candidate.size)for(const [id] of top(new Map(this.freq.map((v,i)=>[i,v])),24))candidate.add(id);
  const repeated=new Map();for(const word of prefix){const id=this.id(word);repeated.set(id,(repeated.get(id)||0)+1);}
  const edge=this.edges.get(prior),sumEdge=[...(edge?.values()||[])].reduce((a,b)=>a+b,0);
  const totalFreq=this.wordSteps||1;
  const results=[];
  for(const id of candidate){if(id===0||id===2)continue;
   const e=edge?.get(id)||0;let assoc=0,support=0;
   for(const cue of q){const m=this.cues.get(cue),v=m?.get(id)||0;
    if(v){const df=this.docCount.get(cue)||0;const importance=1/Math.sqrt(1+df/20);assoc+=importance*Math.log1p(v);support++;}}
   const global=this.freq[id]||0;
   const transition=Math.log((e+.15)/(sumEdge+.15*Math.max(2,candidate.size)));
   const association=q.length?assoc/Math.sqrt(q.length):0;
   const rarity=Math.log1p(global)/Math.log1p(totalFreq);
   const repeatedCount=repeated.get(id)||0;
   const repeatPenalty=repeatedCount>0?2.2*repeatedCount:0;
   const earlyEnd=id===1&&prefix.length<4?4:0;
   const score=transition+1.4*association+.3*rarity-repeatPenalty-earlyEnd;
   results.push({token:this.vocab[id],id,score:+score.toFixed(6),observedTransitions:e,promptEvidence:support,
    source:'observed answer transitions / Q&A association'});
  }
  results.sort((a,b)=>b.score-a.score||a.id-b.id);return results.slice(0,clamp(limit,1,60));
 }
 // Beam search over learned text-production actions. At inference there is NO reference answer.
 plan(prompt,{maxSteps=48,beamWidth=4,branching=7}={}){
  if(typeof prompt!=='string'||!prompt.trim())throw Error('Expected non-empty prompt');
  const limit=clamp(maxSteps,1,128),width=clamp(beamWidth,1,12),fan=clamp(branching,1,20);
  let beam=[{tokens:[],score:0,actions:[],done:false}],expanded=0;
  for(let step=0;step<limit;step++){
   const pool=[];
   for(const state of beam){if(state.done){pool.push(state);continue;}
    const opts=this.propose(prompt,state.tokens,fan);
    if(!opts.length){pool.push({...state,done:true});continue;}
    for(const o of opts){expanded++;
     const done=o.id===1;const tokens=done?state.tokens:state.tokens.concat(o.token);
     const proposed={step,from:state.tokens.slice(-7).join(' '),action:o.token,
       to:tokens.slice(-7).join(' '),observedTransitions:o.observedTransitions,
       promptEvidence:o.promptEvidence,score:o.score,
       alternatives:opts.slice(0,4).map(v=>({action:v.token,score:v.score}))};
     pool.push({tokens,score:state.score+o.score,actions:[...state.actions,proposed],done});
    }
   }
   pool.sort((a,b)=>((b.score/(Math.pow(b.tokens.length+1,.65)))-(a.score/(Math.pow(a.tokens.length+1,.65))))||a.tokens.length-b.tokens.length);
   beam=pool.slice(0,width);if(beam.every(x=>x.done))break;
  }
  const selected=beam.find(x=>x.done)||beam[0]||{tokens:[],score:0,actions:[],done:false};
  const output=selected.tokens.join(' ').replace(/\s+([,.!?;:])/g,'$1');
  return {prompt,output,actions:selected.actions,expanded,finished:selected.done,
   trainedRows:this.rows,vocabulary:this.vocab.length,score:selected.score,
   note:'Actions are observed words appended to a text state; not proof of semantic correctness or hidden physical dimensions.'};
 }
 evaluate(prompt,answer,options={}){
  const before=this.rows,steps=this.wordSteps;
  const route=this.plan(prompt,options),metrics=matchScore(route.output,answer);
  if(before!==this.rows||steps!==this.wordSteps)throw Error('Evaluation accidentally modified learned state');
  this.lastEvaluation={...metrics,expanded:route.expanded,rows:before,goalHiddenDuringPlanning:true};
  this.last={prompt,reference:answer,route,metrics};
  return {route,metrics};
 }
 summary(){return {version:1,device:'CPU / JavaScript independent of original V17 CUDA learner',
  rows:this.rows,wordSteps:this.wordSteps,vocabulary:this.vocab.length,
  cueNodes:this.cues.size,transitionNodes:this.edges.size,
  preUpdateFirstActionAccuracy:this.preUpdateHits/Math.max(1,this.preUpdateSeen),
  lastEvaluation:this.lastEvaluation,
  warning:'Corpus-based word-action navigation; actions are word append operations. Semantics, correctness, transfer and high-dimensional geometry are NOT established.'};}
 export(){return {version:1,maxVocab:this.maxVocab,neighbors:this.neighbors,vocab:this.vocab,freq:this.freq,
  edges:[...this.edges].map(([k,v])=>[k,[...v]]),cues:[...this.cues].map(([k,v])=>[k,[...v]]),
  docCount:[...this.docCount],rows:this.rows,wordSteps:this.wordSteps,
  preUpdateHits:this.preUpdateHits,preUpdateSeen:this.preUpdateSeen,maxContext:this.maxContext};}
 static restore(data){if(data?.version!==1||!Array.isArray(data.vocab)||data.vocab.length<3||
  data.vocab.length>80000||!Array.isArray(data.edges)||!Array.isArray(data.cues))throw Error('Invalid text path checkpoint');
  const result=new TextActionPaths({maxVocab:data.maxVocab,neighbors:data.neighbors});
  result.vocab=data.vocab.slice();result.ids=new Map(result.vocab.map((v,i)=>[v,i]));
  result.freq=data.freq.slice();result.edges=new Map(data.edges.map(([k,v])=>[k,new Map(v)]));
  result.cues=new Map(data.cues.map(([k,v])=>[k,new Map(v)]));result.docCount=new Map(data.docCount);
  result.rows=data.rows;result.wordSteps=data.wordSteps;result.preUpdateHits=data.preUpdateHits;
  result.preUpdateSeen=data.preUpdateSeen;result.maxContext=data.maxContext;return result;
 }
}