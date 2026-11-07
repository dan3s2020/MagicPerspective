// MagicPerspective V17: real-stream prequential test for missing predictive
// context coordinates in OBSERVED numeric text transitions.
//
// Read actual paired expressions from LiveObservedMathAxes.consume() BEFORE
// updating its other learned models. For a recurring observed action, compare
// the simple fixed-delta prediction against a context-dependent response.
//
// No multiplication/addition equation evaluator or correct answer is provided.
// It only learns effects visible in observed examples. The dependent numeric
// token MUST change in each observed pair; no synthetic "future" is supplied.
// The source text is not a verified physical intervention: measure predictive
// *correlation* before making any claim of causal law.
//
// Three disjoint partitions by hash of BEFORE-state+action (not correct answer):
//  0..6 train effects, 7..8 validation gate, 9 untouched test.
// A repeated before-state can never cross partitions. The model is always
// scored BEFORE an observed outcome is used. Heldout rows never train it.
// This is a separate sidecar; it does not alter native Brain.write() decisions.
import {tokenizeObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const isInt=s=>/^\d+$/u.test(s);
const template=t=>t.map(s=>isInt(s)?"#":s).join("\u001f");
const numeric=t=>t.flatMap((s,i)=>isInt(s)?[i]:[]);
const mean=(a)=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
export function partitionOf(before,actionKey) {
 let h=2166136261;
 for(const c of String(before)+"\u0000"+actionKey){
  h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 }
 const b=h%10;return b<=6?"train":b<=8?"validation":"test";
}
const fresh=()=>({train:[],val:{n:0,baseSq:0,contextSq:0},test:{
 n:0,baseAbs:0,contextAbs:0,selectedAbs:0,baseSq:0,contextSq:0,
 selectedSq:0,selectedWins:0},last:null});
function models(rows){
 if(rows.length<3)return null;
 const avg=mean(rows.map(r=>r.delta));
 const vx=mean(rows.map(r=>r.context));
 let varX=0,cov=0;
 for(const p of rows){varX+=(p.context-vx)**2;cov+=(p.context-vx)*(p.delta-avg);}
 const contextLevels=new Set(rows.map(r=>r.context)).size;
 const slope=varX>1e-12?cov/varX:0;
 return {constant:avg,slope,intercept:avg-slope*vx,observed:rows.length,
   contextLevels,ready:contextLevels>=2};
}
function forecast(group,context){
 const m=models(group.train);if(!m)return null;
 return {baseline:m.constant,contextual:m.intercept+m.slope*context,
   contextLevels:m.contextLevels,train:m.observed,
   slope:m.slope,intercept:m.intercept,contextReady:m.ready};
}
const select=group=>group.val.n>=3 &&
 group.val.contextSq+1e-10<group.val.baseSq*.75;
export function describePair(before,after){
 const a=tokenizeObservation(String(before)),b=tokenizeObservation(String(after));
 if(a.length!==b.length||template(a)!==template(b))return null;
 const ids=numeric(a);
 if(ids.length!==3)return null;
 const changes=ids.filter(i=>a[i]!==b[i]);
 if(changes.length!==2 || !changes.includes(ids[2]))return null;
 const primary=changes.find(i=>i!==ids[2]),other=ids.find(i=>i!==primary&&i!==ids[2]);
 if(other===undefined||primary===undefined)return null;
 const ax=Number(b[primary])-Number(a[primary]);
 const delta=Number(b[ids[2]])-Number(a[ids[2]]);
 const context=Number(a[other]);
 if(![ax,delta,context].every(Number.isSafeInteger)||ax===0||delta===0)return null;
 if(Math.abs(ax)>10||Math.abs(delta)>100000)return null;
 const k=template(a)+"|p="+primary+"|step="+ax+"|dep="+ids[2];
 return {key:k,primary,dependent:ids[2],contextIndex:other,
   inputState:before,observedState:after,context,delta,actionStep:ax,
   inputDependent:Number(a[ids[2]])};
}
export class LivePredictiveStateGate{
 constructor({minimumTrain=3,maxGroups=256,maxTrainPerGroup=1000}={}){
  this.minimumTrain=minimumTrain;this.maxGroups=maxGroups;
  this.maxTrainPerGroup=maxTrainPerGroup;
  this.groups=new Map();this.pairs=0;this.usable=0;this.rejected=0;
  this.last=null;
 }
 observePair(before,after,source="real-observed-text"){
  this.pairs++;
  const item=describePair(before,after);
  if(!item){this.rejected++;return {usable:false,reason:"not-a-supported-observed-change"};}
  this.usable++;
  let g=this.groups.get(item.key);
  if(!g){if(this.groups.size>=this.maxGroups)return {usable:false,reason:"bounded-groups"};
    g=fresh();this.groups.set(item.key,g);}
  const split=partitionOf(before,item.key);
  const prior=forecast(g,item.context);
  // Preserve live BEFORE/AFTER ordering in the observation record. The current
  // pair is evaluated with the PREVIOUS trained model, never with itself.
  const event={source,split,key:item.key,before,after,context:item.context,
   delta:item.delta,trainBefore:g.train.length,scorable:!!prior,
   predictedBaseline:prior?.baseline??null,
   predictedContextual:prior?.contextReady?prior.contextual:null,
   selectedContextBefore:select(g)};
  if(split==="train"){
    // Bound memory. Do not permit v8 checkpoint to grow without limit.
    g.train.push({context:item.context,delta:item.delta});
    if(g.train.length>this.maxTrainPerGroup)g.train.shift();
  }else if(prior&&prior.train>=this.minimumTrain){
    if(split==="validation"&&prior.contextReady){
      g.val.n++;
      g.val.baseSq+=(prior.baseline-item.delta)**2;
      g.val.contextSq+=(prior.contextual-item.delta)**2;
    }else if(split==="test"&&prior.contextReady){
      const chosen=select(g)?prior.contextual:prior.baseline;
      g.test.n++;
      g.test.baseAbs+=Math.abs(prior.baseline-item.delta);
      g.test.contextAbs+=Math.abs(prior.contextual-item.delta);
      g.test.selectedAbs+=Math.abs(chosen-item.delta);
      g.test.baseSq+=(prior.baseline-item.delta)**2;
      g.test.contextSq+=(prior.contextual-item.delta)**2;
      g.test.selectedSq+=(chosen-item.delta)**2;
      g.test.selectedWins+=Number(Math.abs(chosen-item.delta)<Math.abs(prior.baseline-item.delta));
      event.selectedPrediction=chosen;
      event.selectedAbsoluteError=Math.abs(chosen-item.delta);
    }
  }
  this.last=event;g.last=event;
  return {usable:true,...event};
 }
 report(){
  const groups=[...this.groups].map(([key,g])=>{
   const f=forecast(g,g.last?.context??0);
   return {key,training:g.train.length,contextLevels:f?.contextLevels??0,
     validation:g.val.n,test:g.test.n,selected:select(g)?"context-axis":"constant-axis",
     learnedContextSlope:f?.ready?f.slope:null,
     testBaselineMAE:g.test.n?g.test.baseAbs/g.test.n:null,
     testContextMAE:g.test.n?g.test.contextAbs/g.test.n:null,
     testSelectedMAE:g.test.n?g.test.selectedAbs/g.test.n:null};
  });
  const tests=[...this.groups.values()].map(x=>x.test);
  const total=tests.reduce((n,t)=>n+t.n,0);
  const valid=[...this.groups.values()].reduce((n,g)=>n+g.val.n,0);
  return {
   source:"live actual same-row observed numeric text transitions",
   enabled:true,pairs:this.pairs,usable:this.usable,rejected:this.rejected,
   training:[...this.groups.values()].reduce((n,g)=>n+g.train.length,0),
   validationScored:valid,testScored:total,
   selectedContextAxes:groups.filter(x=>x.selected==="context-axis").length,
   groups:groups.slice(-12),
   prequentialTestBaselineMAE:total?tests.reduce((n,t)=>n+t.baseAbs,0)/total:null,
   prequentialTestContextMAE:total?tests.reduce((n,t)=>n+t.contextAbs,0)/total:null,
   prequentialTestSelectedMAE:total?tests.reduce((n,t)=>n+t.selectedAbs,0)/total:null,
   last:this.last,
   note:"Experimental association on witnessed expression pairs; not a causal proof or a replacement for native V17 generation; train/validation/test separated by BEFORE-expression hash; predictions recorded before outcomes."
  };
 }
 export(){
  return {v:1,minimumTrain:this.minimumTrain,maxGroups:this.maxGroups,
   maxTrainPerGroup:this.maxTrainPerGroup,groups:this.groups,
   pairs:this.pairs,usable:this.usable,rejected:this.rejected,last:this.last};
 }
 static restore(data){
  if(!data||data.v!==1||!(data.groups instanceof Map))
   throw Error("Invalid observed text predictive-state checkpoint");
  const r=new LivePredictiveStateGate({minimumTrain:data.minimumTrain,
    maxGroups:data.maxGroups,maxTrainPerGroup:data.maxTrainPerGroup});
  r.groups=data.groups;r.pairs=data.pairs;r.usable=data.usable;
  r.rejected=data.rejected;r.last=data.last;
  return r;
 }
}
