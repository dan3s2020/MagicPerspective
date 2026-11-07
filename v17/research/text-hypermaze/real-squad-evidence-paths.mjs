// MagicPerspective V35: learned evidence-path selection from REAL human questions
// and actual source passages; original Brain, original Discoverer.shapeGraph().
// Research only. No pretrained embeddings / oracle target / fabricated facts.
// The learned action "extract witnessed text span from sentence" is an
// evidence-retrieval operation, NOT a physically verified semantic causal law.
// Training receives gold spans; frozen plan(question,context) receives NO answer.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";

const WORD=/^[\p{L}\p{N}][\p{L}\p{N}'’\-]*$/u;
const TOK=/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\s]/gu;
const STOP=new Set(("the a an of for from to in on at and or was were is are be been being "+
  "by as with that which who whom what where when how why do did does have has had can could "+
  "would should will this these those it its their his her into over under about than then "+
  "there here not one two three some many more most first last through during").split(" "));
const TINY=1e-10;
const low=x=>x.toLocaleLowerCase("en").replace(/[’]/g,"'");
const capped=(v,min,max)=>Math.max(min,Math.min(max,v));
const wd=x=>WORD.test(x);
const roundBin=(x,max=5)=>String(capped(Math.floor(x),0,max));
const canonical=s=>String(s).normalize("NFC");

export function sourceTokens(text){
 const s=canonical(text),result=[];
 for(const match of s.matchAll(TOK)){
  result.push({text:match[0],v:low(match[0]),start:match.index,
   end:match.index+match[0].length,word:wd(match[0])});
 }
 return result;
}
const questionState=q=>{
 const tok=sourceTokens(q),words=tok.filter(t=>t.word).map(t=>t.v);
 const wh=words.find(x=>["who","what","when","where","which","how","why"].includes(x))||"unknown";
 const modifiers=words.slice(0,5).join("_");
 const content=new Set(words.filter(x=>x.length>2&&!STOP.has(x)));
 return {raw:String(q),tok,words,content,wh,modifiers};
};
function sentenceIds(tok){
 const ids=new Int32Array(tok.length);let sid=0;
 for(let i=0;i<tok.length;i++){
  ids[i]=sid;
  if([".","?","!",";"].includes(tok[i].text))sid++;
 }
 return ids;
}
function shapeLabel(span) {
 if(/^\d{4}$/u.test(span.replace(/[,.\s]/g,"")))return "year";
 if(/^\d[\d,.]*$/u.test(span.trim()))return "number";
 if(/\d/u.test(span))return "mixed-number";
 if(/^[\p{Lu}]/u.test(span)&&span.split(/\s+/u).filter(x=>/^[\p{Lu}]/u.test(x)).length>1)return "multi-capital";
 if(/^[\p{Lu}]/u.test(span))return "capitalized";
 return "lower";
}
function relationBefore(tokens,start,qwords){
 let last=-1;
 for(let i=Math.max(0,start-18);i<start;i++)
  if(qwords.has(tokens[i].v))last=i;
 if(last<0)return {distance:20,bridge:"NO_ANCHOR",anchor:"NO_ANCHOR"};
 const bridge=tokens.slice(last+1,start).filter(t=>t.word).map(t=>t.v).slice(-4);
 return {distance:start-last,bridge:bridge.join("_")||"ADJACENT",anchor:tokens[last].v};
}
const has=(a,b)=>a.some(x=>b.has(x));
const fAdd=(arr,name)=>arr.push(name);
function features(question,tokens,sentence,entry) {
 const {i,j,sid,text}=entry,q=question,arr=[],word=tokens[i];
 const span=tokens.slice(i,j+1),spanVal=span.filter(t=>t.word).map(t=>t.v);
 const before=tokens.slice(Math.max(0,i-5),i),after=tokens.slice(j+1,Math.min(tokens.length,j+6));
 const bow=q.content,bridge=relationBefore(tokens,i,bow);
 const win=tokens.slice(Math.max(0,i-12),Math.min(tokens.length,j+13)).filter(t=>t.word);
 const near=win.filter(t=>bow.has(t.v)).length;
 const sentenceStat=q.sentenceStats.get(sid)||{match:0,length:0,first:i};
 const sentMatches=sentenceStat.match,sentLength=sentenceStat.length;
 const st=shapeLabel(text),len=j-i+1,cap=/^\p{Lu}/u.test(word.text);
 const inside=spanVal.filter(v=>bow.has(v)).length;
 const left=before.at(-1)?.v??"BEGIN",left2=before.at(-2)?.v??"BEGIN";
 const right=after[0]?.v??"END";
 const relName=bridge.bridge;
 fAdd(arr,"BIAS");
 fAdd(arr,"WH="+q.wh);
 fAdd(arr,"WH2="+q.modifiers);
 fAdd(arr,"LEN="+roundBin(len,7));
 fAdd(arr,"WH_LEN="+q.wh+"|"+roundBin(len,7));
 fAdd(arr,"FORM="+st);
 fAdd(arr,"WH_FORM="+q.wh+"|"+st);
 fAdd(arr,"STARTCAP="+cap);
 fAdd(arr,"WH_CAP="+q.wh+"|"+cap);
 fAdd(arr,"INSIDE="+roundBin(inside,3));
 fAdd(arr,"WH_INSIDE="+q.wh+"|"+roundBin(inside,3));
 fAdd(arr,"ANCHOR_DIST="+roundBin(bridge.distance/3,6));
 fAdd(arr,"WH_ANCHOR_DIST="+q.wh+"|"+roundBin(bridge.distance/3,6));
 fAdd(arr,"NEAR="+roundBin(near,5));
 fAdd(arr,"SENT_MATCH="+roundBin(sentMatches,5));
 fAdd(arr,"WH_SENT_MATCH="+q.wh+"|"+roundBin(sentMatches,5));
 fAdd(arr,"SENT_LEN="+roundBin(sentLength/10,8));
 fAdd(arr,"LEFT="+left);
 fAdd(arr,"WH_LEFT="+q.wh+"|"+left);
 fAdd(arr,"LEFT2="+left2+"_"+left);
 fAdd(arr,"RIGHT="+right);
 fAdd(arr,"WH_RIGHT="+q.wh+"|"+right);
 fAdd(arr,"BRIDGE="+relName);
 fAdd(arr,"WH_BRIDGE="+q.wh+"|"+relName);
 fAdd(arr,"WH_ANCHOR="+q.wh+"|"+bridge.anchor);
 fAdd(arr,"WH_ANCHOR_BRIDGE="+q.wh+"|"+bridge.anchor+"|"+relName);
 fAdd(arr,"WH_MATCH_NEXT="+q.wh+"|"+(bow.has(right)?"yes":"no"));
 fAdd(arr,"WH_MATCH_LEFT="+q.wh+"|"+(bow.has(left)?"yes":"no"));
 fAdd(arr,"SENT_FIRST="+(sentenceStat.first===i));
 fAdd(arr,"FIRST_TOK="+roundBin(i/30,9));
 if(has(spanVal,bow))fAdd(arr,"CONTAINS_QUESTION_WORD");
 if(/^[\p{Lu}]/u.test(word.text)&&span.length===1)fAdd(arr,"PROPER_ONE");
 if(/^\d/u.test(text))fAdd(arr,"NUMERIC_START");
 if(spanVal.length&&STOP.has(spanVal[0]))fAdd(arr,"START_STOPWORD");
 if(spanVal.length&&STOP.has(spanVal.at(-1)))fAdd(arr,"END_STOPWORD");
 return arr;
}
function allCandidates(context,maxTokens=640,maxSpan=7){
 const tokens=sourceTokens(context).slice(0,maxTokens),sentence=sentenceIds(tokens),
  candidates=[];
 for(let i=0;i<tokens.length;i++){
  if(!tokens[i].word)continue;
  for(let j=i;j<Math.min(i+maxSpan,tokens.length);j++){
   if(!tokens[j].word||sentence[j]!==sentence[i])break;
   const text=context.slice(tokens[i].start,tokens[j].end);
   if(text.length>100)break;
   candidates.push({i,j,sid:sentence[i],text,
    start:tokens[i].start,end:tokens[j].end});
  }
 }
 return {tokens,sentence,candidates};
}
function targetIndex(candidates,answer,answerStart) {
 const goldStart=answerStart,goldEnd=answerStart+answer.length;
 return candidates.findIndex(c=>c.start===goldStart&&c.end===goldEnd);
}
function sparseScore(F,W) {
 let s=0;for(const f of F)s+=W.get(f)||0;return s;
}
function applyUpdate(F,W,factor) {
 for(const f of F){const next=(W.get(f)||0)+factor;
  if(next===0)W.delete(f);else W.set(f,next);}
}
function buildExamples(sample) {
 const {question,context}=sample;
 if(typeof question!=="string"||typeof context!=="string"||!question.trim()||!context.trim())
  throw Error("Original full source question and context required");
 const q=questionState(question),c=allCandidates(context);
 q.sentenceStats=new Map();
 for(let i=0;i<c.tokens.length;i++){
  const token=c.tokens[i],sid=c.sentence[i];
  let stat=q.sentenceStats.get(sid);
  if(!stat){stat={match:0,length:0,first:i};q.sentenceStats.set(sid,stat);}
  if(token.word){stat.length++;stat.match+=+(q.content.has(token.v));}
 }
 return {q,...c};
}
export class NativeRealTextEvidencePaths {
 constructor(brain,{maxTokens=640,maxSpan=7}={}){
  if(!(brain instanceof Brain))throw Error("Must use same original persistent Brain");
  if(maxTokens!==640||maxSpan!==7)throw Error("V35 frozen model requires stable token/span contract");
  this.brain=brain;
  this.memory=brain.realEvidencePathMemory ||= {version:1,weights:new Map(),
   updates:0,acceptedPairs:0,unrepresentable:0,sourceTokenPairs:0};
  if(this.memory.version!==1||!(this.memory.weights instanceof Map))
   throw Error("Corrupted original Brain real question/path memory");
 }
 trainOne({question,context,answer,answerStart}){
  if(typeof answer!=="string"||!Number.isInteger(answerStart)||answerStart<0)
   throw Error("Only supervised witnessed training examples with real span offsets");
  const {q,tokens,sentence,candidates}=buildExamples({question,context});
  const gold=targetIndex(candidates,answer,answerStart);
  this.memory.sourceTokenPairs+=tokens.length;
  if(gold<0){this.memory.unrepresentable++;return {trained:false,reason:"gold-outside-finite-extractive-candidate-space"};}
  let top=-Infinity,argmax=-1,goldFeatures=null,winnerFeatures=null;
  const W=this.memory.weights;
  for(let i=0;i<candidates.length;i++){
   // Exactly the same feature extraction and scoring as V35; retain ONLY
   // the gold and current winning feature vectors for the eventual update.
   const F=features(q,tokens,sentence,candidates[i]);
   if(i===gold)goldFeatures=F;
   const score=sparseScore(F,W);
   if(score>top){top=score;argmax=i;winnerFeatures=F;}
  }
  if(argmax!==gold){
   applyUpdate(goldFeatures,W,1);
   if(argmax>=0)applyUpdate(winnerFeatures,W,-1);
   this.memory.updates++;
  }
  this.memory.acceptedPairs++;
  return {trained:true,correctBeforeUpdate:argmax===gold,
   featureCount:goldFeatures.length,observedSourceStart:answerStart};
 }
 train(samples,{epochs=2}={}){
  if(!Array.isArray(samples)||epochs<1||epochs>6)throw Error("Fixed supervised source training required");
  const totals={examples:samples.length,epochs,accepted:0,updates:0,
   unrepresentable:0,epochStats:[]};
  for(let epoch=0;epoch<epochs;epoch++){
   let trained=0,alreadyCorrect=0;
   for(const s of samples){
    const r=this.trainOne(s);if(r.trained){trained++;alreadyCorrect+=+(r.correctBeforeUpdate);}
   }
   totals.epochStats.push({epoch,trained,alreadyCorrect,
    accuracyBeforeUpdates:trained?alreadyCorrect/trained:0});
   totals.accepted+=trained;totals.unrepresentable+=samples.length-trained;
  }
  totals.updates=this.memory.updates;totals.features=this.memory.weights.size;
  return totals;
 }
 // Optional V38 research experiment: average ORIGINAL learned weight trajectory
 // over many genuine source/Q&A observations rather than trusting the last
 // unstable online update. Same question features, labels and transition
 // ranking motor; no gold answers or test examples enter these snapshots.
 trainAveraged(samples,{epochs=2,snapshotEvery=200,burnIn=400}={}){
  if(!Array.isArray(samples)||epochs<1||epochs>6||
     !Number.isInteger(snapshotEvery)||snapshotEvery<20||
     !Number.isInteger(burnIn)||burnIn<0)
   throw Error("Invalid real supervised averaging contract");
  let seen=0,snapshots=0,accepted=0,unrepresentable=0,alreadyCorrect=0;
  const summed=new Map();
  const snapshot=()=>{
   snapshots++;
   for(const [feature,weight] of this.memory.weights)
    summed.set(feature,(summed.get(feature)||0)+weight);
  };
  for(let epoch=0;epoch<epochs;epoch++)for(const example of samples){
   const result=this.trainOne(example);
   accepted+=+result.trained;unrepresentable+=+!result.trained;
   alreadyCorrect+=+!!result.correctBeforeUpdate;seen++;
   if(seen>=burnIn&&seen%snapshotEvery===0)snapshot();
  }
  if(!snapshots||seen%snapshotEvery!==0)snapshot();
  const average=new Map();
  for(const [feature,value] of summed){
   const w=value/snapshots;
   if(w)average.set(feature,w);
  }
  this.memory.averagedWeights=average;
  this.memory.averagedSnapshots=snapshots;
  return {realQuestionExposures:seen,accepted,unrepresentable,
   onlineCorrectBeforeUpdate:alreadyCorrect,
   originalLastWeightFeatures:this.memory.weights.size,
   timeAveragedWeightFeatures:average.size,snapshots,
   burnIn,snapshotEvery,sameOriginalBrain:true,
   referenceDevAnswersNeverUsed:true};
 }
 _weightPolicy(weightMode="last"){
  if(weightMode==="last")return this.memory.weights;
  if(weightMode==="average"&&this.memory.averagedWeights instanceof Map)
   return this.memory.averagedWeights;
  throw Error("No validated native evidence-weight policy: "+weightMode);
 }
 // A strict control: choose the SAME trained candidate score directly,
 // WITHOUT running original Discoverer.shapeGraph. If both outputs agree,
 // the native route is faithfully executable but not yet causally necessary
 // for semantic selection on this 2-hop extractive task.
 rankDirectly({question,context,weightMode="last"}={}){
  const {q,tokens,sentence,candidates}=buildExamples({question,context});
  let best=-Infinity,chosen=-1;
  const W=this._weightPolicy(weightMode);
  for(let i=0;i<candidates.length;i++){
   const z=sparseScore(features(q,tokens,sentence,candidates[i]),W);
   if(z>best){best=z;chosen=i;}
  }
  return chosen<0?{found:false,reason:"no-observed-source-span"}:
   {found:true,predicted:candidates[chosen].text,
    selectedSourceSpan:{start:candidates[chosen].start,end:candidates[chosen].end},
    sourceGoalCandidateCount:candidates.length,score:best,
    originalDiscovererNotInvoked:true};
 }
 // Original native action field: a complete observed passage is converted into
 // sentence nodes and evidenced candidate text-span terminals. Every goal is
 // a possible text span; no oracle answer ID is passed to the attraction field.
 // Learned real QA comparisons choose WHICH goal through edgePreference.
 // shapeGraph performs exact original goal attraction and route extraction.
 plan({question,context,useLearnedPreference=true,includeAtlas=false,weightMode="last"}={}){
  const startClock=Date.now(),{q,tokens,sentence,candidates}=buildExamples({question,context});
  if(!candidates.length)return {found:false,reason:"no-observed-text-spans"};
  const W=useLearnedPreference?this._weightPolicy(weightMode):new Map();
  const allScores=candidates.map(c=>sparseScore(features(q,tokens,sentence,c),W));
  const high=Math.max(...allScores),lowScore=Math.min(...allScores);
  const spanPreference=allScores.map(s=>(s-lowScore)/(high-lowScore+TINY)*.75);
  const sentIds=[...new Set(candidates.map(x=>x.sid))],nodeOfSentence=new Map();
  const kinds=[KIND.self],neighbors=[[]],nodeData=[{type:"question",text:question}];
  for(const sid of sentIds){
   const id=kinds.length;nodeOfSentence.set(sid,id);
   kinds.push(KIND.floor);neighbors.push([]);
   nodeData.push({type:"evidence-sentence",sid});
   neighbors[0].push({to:id,action:{kind:"navigate-source-sentence",sid}});
  }
  const nodeOfCandidate=[];
  for(let i=0;i<candidates.length;i++){
   const c=candidates[i],id=kinds.length;nodeOfCandidate.push(id);
   kinds.push(KIND.target);neighbors.push([]);
   nodeData.push({type:"observed-source-span",text:c.text,start:c.start,end:c.end,
    sourceSentence:c.sid,weight:allScores[i]});
   neighbors[nodeOfSentence.get(c.sid)].push({to:id,
    action:{kind:"extract-witnessed-passage-span",start:c.start,end:c.end,spanId:i}});
  }
  const bestPerSentence=new Map();
  for(let i=0;i<candidates.length;i++)
   bestPerSentence.set(candidates[i].sid,Math.max(bestPerSentence.get(candidates[i].sid)||0,spanPreference[i]));
  const preference=(i,j,edge)=>{
   if(i===0)return bestPerSentence.get(edge.action.sid)||0;
   return spanPreference[edge.action.spanId]||0;
  };
  const shape=this.brain.disc.shapeGraph(kinds,neighbors,0,{
   details:true,geometryWeight:0,edgePreference:preference});
  if(!shape?.targetReached)return {found:false,reason:"original-shape-no-goal-in-observed-context"};
  const terminal=shape.path.at(-1)?.to,span=nodeData[terminal];
  if(!span||span.type!=="observed-source-span")
   throw Error("Original shape did not end on actual observed evidence span");
  const actual=context.slice(span.start,span.end);
  if(actual!==span.text)throw Error("Observed source span mutated during path planning");
  const result={found:true,predicted:actual,originalMotor:"Discoverer.shapeGraph",
   originalNativeBrain:true,referenceAnswerProvided:false,
   completeObservedTextContext:true,goalInferredBy:"learned-qa-question-evidence-span-preference",
   initialShape:shape.path.map(e=>({
    from:nodeData[e.from].type,to:nodeData[e.to].type,
    action:e.action,attraction:e.value})),
   extraction:{start:span.start,end:span.end,sentenceId:span.sourceSentence,
    sourceMatchedExactly:true},
   graph:{observedSourceTokens:tokens.length,sourceSentenceNodes:sentIds.length,
    observedCandidateGoalSpans:candidates.length,states:kinds.length,
    directedEdges:neighbors.reduce((s,es)=>s+es.length,0)},
   learnedTrainingPairs:this.memory.acceptedPairs,
   learnedParameterCount:this.memory.weights.size,
   freezeInvariant:this.memory.updates,
   runtimeMs:Date.now()-startClock,
   candidateSourceOnly:true,
   semanticCorrectnessExternallyUnverified:true};
  if(includeAtlas)result.atlas={
   nodes:nodeData.map((n,i)=>({...n,id:i,potential:shape.values[i]})),
   edges:neighbors.flatMap((e,i)=>e.map(x=>({from:i,to:x.to,action:x.action}))),
   firstPathIds:[0,...shape.path.map(e=>e.to)],
   completeRetainedSourceCandidates:true
  };
  return result;
 }
}
