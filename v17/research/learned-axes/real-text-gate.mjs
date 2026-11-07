// Real corpus scale/axis gating over the *existing* V17 TextPerspectives model.
// There are no fabricated semantic dimensions. Each "axis" is an OBSERVED text
// history length; available continuations and their uncertainty come from real
// training counts. Selection is learned on a disjoint validation split.
import {tokenize} from "../../transcend/torus-aether/language-universe/perspectives.mjs";

const SEP="\u001f";
const key=(h,n)=>h.slice(-n).join(SEP);
const top=m=>{
 let best=null,amount=-1;
 for(const [k,v] of m||[])if(v>amount){best=k;amount=v;}
 return best;
};
const sorted=m=>[...(m||[])].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
const score=(count,ok)=>({n:count,hits:ok,accuracy:count?ok/count:null});
const confidence=(hits,total)=>(hits+1)/(total+2);

export function evaluateFrozenAxes(model,passages,{gating=null,maxTrace=24}={}){
 if(!model?.lanes?.length||!Array.isArray(passages))throw Error("Expected real V17 perspective model and passage array");
 const sizes=model.scales,stats=sizes.map(n=>({scale:n,hits:0,available:0,selected:0}));
 let n=0,unigram=0,bigram=0,native=0,gated=0,coverage=0;
 const trace=[],alternatives=[];
 const unigramChoice=top(model.unigram);
 for(const passage of passages){
  const tokens=tokenize(passage),h=[];
  for(const actual of tokens){
   const candidates=[];
   for(let j=0;j<sizes.length;j++){
    const scale=sizes[j];
    if(h.length<scale)continue;
    const dist=model.lanes[j].get(key(h,scale));
    if(!dist||!dist.size)continue;
    const total=[...dist.values()].reduce((a,b)=>a+b,0);
    if(!total)continue;
    const predicted=top(dist);
    candidates.push({j,scale,dist,total,predicted});
    stats[j].available++;
    stats[j].hits+=+(predicted===actual);
   }
   const one=candidates.find(x=>x.scale===1)?.predicted??unigramChoice;
   const nativeChoice=model.candidates(h);
   let chosen=null;
   if(gating){
    for(const c of candidates){
     const w=gating.weights[c.j]??0;
     const candidateScore=w + (gating.supportWeight||0)*Math.log1p(c.total);
     if(!chosen||candidateScore>chosen.candidateScore)chosen={...c,candidateScore};
    }
   }else{
    const c=candidates.find(x=>x.scale===nativeChoice.scale&&x.predicted===nativeChoice.token);
    if(c)chosen=c;
   }
   const guessed=chosen?.predicted??unigramChoice;
   if(chosen)stats[chosen.j].selected++;
   n++;
   coverage+=+(candidates.length>0);
   unigram+=+(unigramChoice===actual);
   bigram+=+(one===actual);
   native+=+(nativeChoice.token===actual);
   gated+=+(guessed===actual);
   if(trace.length<maxTrace){
    const candidateDistribution=chosen?.dist||model.unigram;
    const sum=[...candidateDistribution.values()].reduce((a,b)=>a+b,0);
    trace.push({position:n-1,history:h.slice(-10),expected:actual,
      nativePrediction:nativeChoice.token,gatedPrediction:guessed,
      selectedScale:chosen?.scale??0,probabilityOfObserved:
        sum?+(100*(candidateDistribution.get(actual)||0)/sum).toFixed(3):0,
      alternatives:sorted(candidateDistribution).slice(0,5).map(([token,c])=>({token,p:+(c/sum).toFixed(5)})),
      match:guessed===actual});
   }
   h.push(actual);if(h.length>Math.max(...sizes))h.shift();
  }
 }
 const named={count:n,unigram:score(n,unigram),bigram:score(n,bigram),
  native:score(n,native),gated:score(n,gated),coverage:n?coverage/n:0,
  axes:stats.map(x=>({...x,accuracy:x.available?x.hits/x.available:null})),
  trace};
 return named;
}
// The gate's values are learned entirely on validation data.
// Never tune weights on final/test evaluation or let the final answers train.
export function selectAxisGate(model,validation,{maxTrace=0}={}){
 const v=evaluateFrozenAxes(model,validation,{maxTrace});
 const weights=v.axes.map(axis=>Math.log(confidence(axis.hits,axis.available))-
  Math.log(1-confidence(axis.hits,axis.available)));
 const supported=v.axes.filter(x=>x.available>=10);
 return {version:1,scales:model.scales.slice(),weights,supportWeight:0,
  validation:{tokens:v.count,native:v.native.accuracy,bigram:v.bigram.accuracy,
    unigram:v.unigram.accuracy,perScale:v.axes},
  usableAxes:supported.map(x=>x.scale),
  explanation:"Axes are textual context lengths selected only from held-out validation outcomes, not physical rotation axes."};
}
