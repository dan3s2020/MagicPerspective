// Actual V17 TWorld *experimental test harness* for hidden-state discovery.
// The learner only sees 3x3 symbol patches from its OWN path, action outcomes,
// and whether a later two-step probe physically moved. NEVER expose the real
// TWorld.lever flag, full board, true door state or future probe observations
// in any predictive input. Uses original V17 TWorld, no replacement physics.
// This world is deliberately constructed and repeats a known lever route;
// recognizing a parity of sensory observations is an explicit inductive bias.
import {TWorld} from "../../transcend/torus-aether/worlds/transform.mjs";

const nextRng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const center=patch=>patch[4];
export function buildPartialObservationWorld({lever=true,leverCoord=[1,1]}={}) {
 const n=7,idx=(x,y)=>y*n+x,terr=Array(n*n).fill(0);
 if(!Array.isArray(leverCoord)||leverCoord.length!==2||
    leverCoord.some(v=>!Number.isInteger(v)||v<1||v>5)||
    (leverCoord[0]===3&&leverCoord[1]===1)||
    (Math.abs(leverCoord[0]-3)<=1&&Math.abs(leverCoord[1]-3)<=1))
   throw Error("Lever must be an interior point outside final 3x3 sensory patch, away from door");
 for(let i=0;i<n;i++){
  terr[idx(i,0)]=terr[idx(i,n-1)]=1;
  terr[idx(0,i)]=terr[idx(n-1,i)]=1;
 }
 if(lever)terr[idx(leverCoord[0],leverCoord[1])]=3; // Original V17 lever terrain, evaluator only.
 terr[idx(3,1)]=5; // V17 lever-controlled door; outside final 3x3 vision.
 const level={n,terr,self:idx(3,3),boxes:[],goal:Array(n*n).fill(17)};
 return new TWorld(level,[0,1,2,3]);
}
function patch3x3(world) {
 const n=world.n,p=world.self,x=p%n,y=Math.floor(p/n),board=world.board(),patch=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy;
   patch.push(xx<0||yy<0||xx>=n||yy>=n?-1:board[yy*n+xx]);
 }
 return patch;
}
export function causalEpisode(seed,loops,{lever=true,leverCoord=[1,1]}={}) {
 if(!Number.isInteger(loops)||loops<0)throw Error("Need nonnegative loop count");
 const rng=nextRng(seed),world=buildPartialObservationWorld({lever,leverCoord});
 const observedCenters=[],actions=[];
 const action=output=>{
   const before=world.self;
   world.step(output);
   const patch=patch3x3(world);
   observedCenters.push(center(patch));
   actions.push({output,moved:world.self!==before});
   return world.self!==before;
 };
 const interruptions=()=>{const count=Math.floor(rng()*7);
   for(let k=0;k<count;k++)action(4+Math.floor(rng()*4));};
 interruptions();
 // A fully known, controlled loop used to generate observations. The learner
 // is NOT told that entry into a specific symbol toggles a hidden switch.
 // Test HARNESS computes a route to the deliberately placed lever.
 // The predictive learner is never told the lever's location or this route.
 const [lx,ly]=leverCoord,go=[];
 for(let k=0;k<Math.abs(lx-3);k++)go.push(lx<3?3:1);
 for(let k=0;k<Math.abs(ly-3);k++)go.push(ly<3?0:2);
 const reverse=go.slice().reverse().map(a=>(a+2)%4),loop=go.concat(reverse);
 for(let i=0;i<loops;i++){
   loop.forEach(action);interruptions();
 }
 interruptions();
 // Freeze all observed inputs BEFORE asking the world the next-action question.
 const history=observedCenters.slice(),pastActions=actions.map(x=>({...x}));
 const currentPatch=patch3x3(world);
 // The target is observed solely through movement feedback, never door label.
 const firstMoved=action(0),secondMoved=action(0);
 if(!firstMoved)throw Error("Probe failed unexpectedly on first floor move");
 return {history,actions:pastActions,currentPatch,question:"will the second UP move physically move?",
   observedNextActionOutcome:secondMoved,unseenLoops:loops,
   queryIssuedAfterHistoryWasFrozen:true,
   hiddenPhysicalWorldStateNeverPassedToLearner:true};
}
function fitBinary(rows,feature) {
 const counts=[[0,0],[0,0]];
 for(const row of rows){
   const bit=feature(row),label=Number(row.observedNextActionOutcome);
   counts[bit][label]++;
 }
 // If one parity is unobserved, fall back to global majority.
 const negatives=rows.filter(x=>!x.observedNextActionOutcome).length;
 const positives=rows.length-negatives,majority=positives>negatives?1:0;
 const predictions=counts.map(b=>b[0]+b[1]?Number(b[1]>b[0]):majority);
 return {counts,predictions,majority};
}
const parityOf=(row,symbol)=>row.history.reduce((n,x)=>n+(x===symbol?1:0),0)%2;
const frequencyPattern=row=>row.history.slice(-4).join("|");
function majorityByPattern(training) {
 const count=new Map(),global=fitBinary(training,()=>0).majority;
 for(const row of training){
   const key=frequencyPattern(row),bucket=count.get(key)||[0,0];
   bucket[Number(row.observedNextActionOutcome)]++;count.set(key,bucket);
 }
 return row=>{
   const c=count.get(frequencyPattern(row));
   return c?(c[1]>c[0]?1:0):global;
 };
}
export function learnMissingCausalBit(train,validation,{minimumGain=0.15}={}) {
 if(train.length<20||validation.length<10)throw Error("Independent training and validation are required");
 const sourceSymbols=[...new Set(train.flatMap(x=>x.history))].sort((a,b)=>a-b);
 const baseline=fitBinary(train,()=>0);
 const constant=()=>baseline.majority;
 const score=(fn,rows)=>rows.filter(row=>Number(row.observedNextActionOutcome)===fn(row)).length/rows.length;
 const baselineVal=score(constant,validation);
 const short=majorityByPattern(train),shortVal=score(short,validation);
 const candidates=sourceSymbols.map(symbol=>{
   const model=fitBinary(train,row=>parityOf(row,symbol));
   const fn=row=>model.predictions[parityOf(row,symbol)];
   return {symbol,model,validationAccuracy:score(fn,validation)};
 }).sort((a,b)=>b.validationAccuracy-a.validationAccuracy || a.symbol-b.symbol);
 const choice=candidates[0];
 const useful=choice && choice.validationAccuracy>=baselineVal+minimumGain;
 return {selectedSymbol:useful?choice.symbol:null,additionalMemoryBits:useful?1:0,
   constantPrediction:baseline.majority,selectedModel:useful?choice.model:null,
   trainingExamples:train.length,validationExamples:validation.length,
   validationBaseline:baselineVal,validationLastFour:shortVal,
   validationSelected:useful?choice.validationAccuracy:baselineVal,
   candidateResults:candidates.map(x=>({symbol:x.symbol,
     accuracy:x.validationAccuracy,counts:x.model.counts})),
   lastFourPredictor:short,
   explicitBias:"one learned symbol-count parity over all previously observed 3x3 patch centers; no hidden world-state label"};
}
export function evaluateHiddenCausalBit(selection,holdout,{seed=41}={}){
 const constant=selection.constantPrediction;
 const predictor=row=>selection.selectedSymbol===null?constant:
   selection.selectedModel.predictions[parityOf(row,selection.selectedSymbol)];
 const short=selection.lastFourPredictor;
 const actual=holdout.map(row=>Number(row.observedNextActionOutcome));
 const predictions=holdout.map(predictor);
 const score=pred=>pred.filter((x,i)=>x===actual[i]).length;
 const random=nextRng(seed),order=Array.from({length:holdout.length},(_,i)=>i);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const scramble=holdout.map((row,i)=>predictor({...row,history:holdout[order[i]].history}));
 return {cases:holdout.length,selectedSymbol:selection.selectedSymbol,
   addedMemoryBits:selection.additionalMemoryBits,
   finalPatchUnique:new Set(holdout.map(x=>JSON.stringify(x.currentPatch))).size,
   baselineCorrect:actual.filter(x=>x===constant).length,
   lastFourCorrect:holdout.filter((r,i)=>short(r)===actual[i]).length,
   selectedCorrect:score(predictions),scrambledHistoryCorrect:score(scramble),
   noFutureOutcomeIncludedInFeatures:holdout.every(x=>x.queryIssuedAfterHistoryWasFrozen &&
      x.hiddenPhysicalWorldStateNeverPassedToLearner),
   observedUnseenLoopCounts:[...new Set(holdout.map(x=>x.unseenLoops))].sort((a,b)=>a-b)
 };
}
export function onlineCausalMemory(row,selectedSymbol){
 if(selectedSymbol===null)return {additionalBits:0,historyEntriesRetained:0};
 let bit=0;
 for(const sensor of row.history)if(sensor===selectedSymbol)bit^=1;
 return {bit,additionalBits:1,historyEntriesRetained:0,
   numberOfPhysicalObservationsProcessed:row.history.length};
}
