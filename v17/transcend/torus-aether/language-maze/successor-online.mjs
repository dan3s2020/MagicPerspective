/**
 * Online successor-style goal-occupancy learner for the ACTUAL completed
 * training Q/A observations. No oracle at inference; only observed terminal
 * after a real response. This does NOT replace original V17 shape(), V17
 * language alignment, any GPU model, or checkpoint.
 *
 * Learns on each completed character transition:
 * V(s) <- V(s) + alpha * (gamma * V(s_next) - V(s))
 * Terminal: V(terminal) <- V(terminal) + alpha * (1 - V(terminal))
 *
 * Updates sweep backward through each completely observed training response,
 * with four temporal granularities. Scales are learned from the same real
 * episode, not separately generated training mazes. A bounded shared
 * observation alphabet (last 12 codepoints + log depth bucket) allows
 * states to recur across different answers, unlike exact whole-prefix hashes.
 * Contextual selection still comes from V18 observed candidate Q/A routes.
 *
 * The values are classical discounted returns under OBSERVED response paths,
 * not quantum phases or proof that a previously seen answer is correct.
 */
const SCALES=Object.freeze([1,64,4096,262144]);
const WIDTH=12;
const isNonNegativeInt=x=>Number.isSafeInteger(x)&&x>=0;
const clamp01=x=>Math.max(0,Math.min(1,x));
function stateKey(level,depth,tail){
 const scale=SCALES[level];
 return level+":"+Math.floor(Math.log2(1+Math.floor(depth/scale)))+":"+tail;
}
function suffix(chars){
 return chars.length<=WIDTH?chars.join(""):chars.slice(chars.length-WIDTH).join("");
}
export class OnlineSuccessor {
 constructor({alpha=.22,gamma=.985,maxStates=120000}={}){
  if(!(alpha>0&&alpha<=1)||!(gamma>0&&gamma<1)||
    !Number.isInteger(maxStates)||maxStates<100||maxStates>1000000)
    throw Error("Invalid online successor learner settings");
  this.alpha=alpha;this.gamma=gamma;this.maxStates=maxStates;
  this.states=new Map();
  this.rows=0;this.characters=0;this.updates=0;
  this.evicted=0;this.absTdMean=0;this.lastTd=0;
  this.lastLength=0;this.levelUpdates=new Array(SCALES.length).fill(0);
  this.hierarchicalBridges=0; // observed temporal coarsening influences finer decisions
  this.trainedSinceBoot=0;this.restored=false;
 }
 #get(key){
  return this.states.get(key)||null;
 }
 #update(key,target,level){
  if(!Number.isFinite(target))throw Error("Nonfinite successor TD target");
  const old=this.#get(key),value=old?.value||0;
  const error=target-value,next=clamp01(value+this.alpha*error);
  if(old)this.states.delete(key);
  this.states.set(key,{value:next,visits:(old?.visits||0)+1});
  while(this.states.size>this.maxStates){
   const first=this.states.keys().next().value;
   this.states.delete(first);this.evicted++;
  }
  this.updates++;this.levelUpdates[level]++;
  this.lastTd=Math.abs(error);
  this.absTdMean=this.updates===1?this.lastTd:
    this.absTdMean+.002*(this.lastTd-this.absTdMean);
  return next;
 }
 observe(answer){
  if(typeof answer!=="string"||!answer.length)
   return {learned:false,reason:"Empty or nontext observed response"};
  const stages=SCALES.map(()=>[]);
  const ring=[];
  let pos=0;
  for(let level=0;level<SCALES.length;level++)
   stages[level].push(stateKey(level,0,""));
  for(const ch of answer){
   ring.push(ch);if(ring.length>WIDTH)ring.shift();
   pos++;
   const tail=suffix(ring);
   for(let level=0;level<SCALES.length;level++)
    if(pos%SCALES[level]===0)
     stages[level].push(stateKey(level,pos,tail));
  }
  // An episode's terminal must be represented at EVERY level, not faked
  // at a fixed arbitrary length or taken from a held-out reference.
  const last=suffix(ring);
  // Solve from the most global perspective back to the finest character
  // scale. Coarser already-trained values become bootstrap targets ONLY
  // at genuine observed block boundaries in this SAME training episode.
  for(let level=SCALES.length-1;level>=0;level--){
   const term=stateKey(level,pos,last),keys=stages[level];
   if(keys.at(-1)!==term)keys.push(term);
   // One reverse TD sweep on the real complete training trajectory.
   let future=this.#update(keys.at(-1),1,level);
   for(let i=keys.length-2;i>=0;i--){
    const depth=i*SCALES[level];
    let target=this.gamma*future;
    if(level+1<SCALES.length&&depth>0&&depth%SCALES[level+1]===0){
     const code=keys[i],first=code.indexOf(":"),second=code.indexOf(":",first+1),
       tail=code.slice(second+1),higher=this.#get(stateKey(level+1,depth,tail));
     if(higher&&higher.value>target){target=higher.value;this.hierarchicalBridges++;}
    }
    future=this.#update(keys[i],target,level);
   }
  }
  this.rows++;this.trainedSinceBoot++;this.characters+=pos;this.lastLength=pos;
  return {learned:true,characters:pos,updates:this.updates,states:this.states.size,
   tdAbsMean:this.absTdMean,levels:SCALES.length};
 }
 valueAt(depth,tail){
  if(!isNonNegativeInt(depth)||typeof tail!=="string")
   throw Error("Invalid online successor state");
  let value=null,visits=0,sourceLevel=null;
  for(let level=0;level<SCALES.length;level++){
   if(depth!==0&&depth%SCALES[level]!==0)continue;
   const entry=this.#get(stateKey(level,depth,tail));
   if(!entry)continue;
   // Use the finest actually trained resolution at this exact boundary.
   if(value===null){value=entry.value;visits=entry.visits;sourceLevel=level;}
  }
  return {value,visits,sourceLevel};
 }
 valuesFor(labels,fallback){
  if(!Array.isArray(labels)||!Array.isArray(fallback)||labels.length!==fallback.length)
   throw Error("Invalid observed topology for online successor projection");
  let covered=0,level0=0;
  const values=labels.map((node,i)=>{
   const learned=this.valueAt(node.depth??0,node.tail??"");
   if(learned.value===null)return fallback[i];
   covered++;if(learned.sourceLevel===0)level0++;
   return learned.value;
  });
  return {values,covered,level0,nodes:labels.length,
   source:"ONLINE_REVERSE_TD_OBSERVED_QA_WITH_FALLBACK"};
 }
 stats(){
  return {enabled:true,method:"ONLINE_REVERSE_TD_ON_COMPLETED_TRAINING_CHARACTER_TRANSITIONS",
   updateMode:"ALL_CONFIRMED_QA_ROWS",rows:this.rows,characters:this.characters,
   states:this.states.size,maxStates:this.maxStates,updates:this.updates,
   gamma:this.gamma,alpha:this.alpha,tdAbsMean:this.absTdMean,
   lastTd:this.lastTd,lastEpisodeLength:this.lastLength,
   levels:SCALES.slice(),levelUpdates:this.levelUpdates.slice(),evicted:this.evicted,
   hierarchicalBridges:this.hierarchicalBridges,
   trainedSinceBoot:this.trainedSinceBoot,restored:this.restored,
   numericValueNotAnswerAccuracy:true};
 }
 export(){
  return {version:1,alpha:this.alpha,gamma:this.gamma,maxStates:this.maxStates,
   states:[...this.states.entries()],rows:this.rows,characters:this.characters,
   updates:this.updates,evicted:this.evicted,absTdMean:this.absTdMean,
   lastTd:this.lastTd,lastLength:this.lastLength,
   hierarchicalBridges:this.hierarchicalBridges,
   levelUpdates:this.levelUpdates.slice()};
 }
 static restore(data){
  if(!data||data.version!==1||!Array.isArray(data.states)||
    !isNonNegativeInt(data.rows)||!isNonNegativeInt(data.characters)||
    !isNonNegativeInt(data.updates)||!isNonNegativeInt(data.evicted)||
    !Array.isArray(data.levelUpdates)||data.levelUpdates.length!==SCALES.length||
    data.levelUpdates.some(x=>!isNonNegativeInt(x))||
    !Number.isFinite(data.absTdMean)||!Number.isFinite(data.lastTd)||
    !isNonNegativeInt(data.lastLength))
   throw Error("Invalid online successor checkpoint");
  const model=new OnlineSuccessor({
   alpha:data.alpha,gamma:data.gamma,maxStates:data.maxStates
  });
  if(data.states.length>model.maxStates)throw Error("Unbounded online successor save");
  for(const [key,entry] of data.states){
   if(typeof key!=="string"||key.length>80||!entry||
      !Number.isFinite(entry.value)||entry.value<0||entry.value>1||
      !isNonNegativeInt(entry.visits)||entry.visits<1)
     throw Error("Corrupt online successor state");
   model.states.set(key,{value:entry.value,visits:entry.visits});
  }
  model.rows=data.rows;model.characters=data.characters;
  model.updates=data.updates;model.evicted=data.evicted;
  model.absTdMean=data.absTdMean;model.lastTd=data.lastTd;
  model.lastLength=data.lastLength;
  if(data.hierarchicalBridges!==undefined){
   if(!isNonNegativeInt(data.hierarchicalBridges))throw Error("Invalid hierarchical successor bridges");
   model.hierarchicalBridges=data.hierarchicalBridges;
  }
  model.levelUpdates=data.levelUpdates.slice();model.restored=true;
  return model;
 }
}
