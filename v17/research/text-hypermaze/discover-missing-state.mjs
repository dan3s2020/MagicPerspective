// Research-only: does a learner detect when endpoint coordinates omit the
// future-relevant information encoded in the ordered action history?
//
// Inputs: observations of (initial textual state, actual action sequence,
// final observed textual state) from a separate world/learner.
// No signed-area formula, multiplication rule or curvature coefficient is
// supplied. Instead, a general finite library of second-order ordered
// action interactions is proposed; held-out validation decides whether
// ANY additional perspective coordinate is warranted.
// This is a predictive feature-selection experiment, not the V17 live brain.
import {tokenizeObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sum=a=>a.reduce((s,x)=>s+x,0);
const rmse=(rows,model)=>Math.sqrt(sum(rows.map(x=>{
  const e=predictDisplacement(model,x.features)-x.target;return e*e;
}))/rows.length);
const BASE_FEATURES=[
 "dx","dy","initialX_dx","initialY_dx","initialX_dy","initialY_dy",
 "dx_dy","dx2","dy2","steps","initialX","initialY"
];
const RECENCY_FEATURES=Array.from({length:4},(_,i)=>[
 "last"+i+"_axis0","last"+i+"_axis1"
]).flat();
const ORDERED_FEATURES=["ordered_0_0","ordered_0_1","ordered_1_0","ordered_1_1"];

function fitLeastSquares(rows,requested) {
 if(rows.length<20)throw Error("At least 20 observed trajectories needed");
 const means={},scales={},centeredTarget=sum(rows.map(r=>r.target))/rows.length;
 const Q=[],R=[],retained=[];
 for(const key of requested){
   const values=rows.map(x=>x.features[key]??0);
   const mean=sum(values)/values.length;
   const std=Math.sqrt(sum(values.map(x=>(x-mean)**2))/values.length);
   means[key]=mean;scales[key]=std>1e-10?std:1;
   const v=values.map(x=>(x-mean)/scales[key]);
   const projection=Q.map(()=>0);
   // Modified Gram-Schmidt + reorthogonalization; drop dependent columns.
   for(let pass=0;pass<2;pass++)for(let i=0;i<Q.length;i++){
     const r=dot(Q[i],v);projection[i]+=r;
     for(let j=0;j<v.length;j++)v[j]-=r*Q[i][j];
   }
   const norm=Math.sqrt(dot(v,v));
   if(norm<1e-7)continue;
   for(let i=0;i<R.length;i++)R[i].push(projection[i]);
   R.push(Array(Q.length).fill(0).concat([norm]));
   Q.push(v.map(x=>x/norm));retained.push(key);
 }
 const centered=rows.map(x=>x.target-centeredTarget);
 const qy=Q.map(q=>dot(q,centered)),betas=Array(Q.length).fill(0);
 for(let i=Q.length-1;i>=0;i--){
   let value=qy[i];for(let j=i+1;j<Q.length;j++)value-=R[i][j]*betas[j];
   betas[i]=value/R[i][i];
 }
 return {requested,retained,means,scales,betas,intercept:centeredTarget,
   rank:retained.length,trainedOn:rows.length};
}
export function predictDisplacement(model,features) {
 return model.intercept+model.retained.reduce((s,k,i)=>
   s+model.betas[i]*((features[k]??0)-model.means[k])/model.scales[k],0);
}
export function pathFeatures(initialX,initialY,actions){
 let prefixX=0,prefixY=0,ordered00=0,ordered01=0,ordered10=0,ordered11=0;
 const history=[];
 for(const action of actions){
   const ax=action.primary===0?action.step:0,
         ay=action.primary===1?action.step:0;
   if((ax===0&&ay===0)||(ax!==0&&ay!==0) ||
      !Number.isSafeInteger(action.step)||![-1,1].includes(action.step))
     throw Error("Only observed one-axis ±1 movements are supported in this test");
   ordered00+=prefixX*ax;ordered01+=prefixX*ay;
   ordered10+=prefixY*ax;ordered11+=prefixY*ay;
   prefixX+=ax;prefixY+=ay;
   history.push({ax,ay});
 }
 const dx=prefixX,dy=prefixY;
 const result={dx,dy,initialX_dx:initialX*dx,initialY_dx:initialY*dx,
   initialX_dy:initialX*dy,initialY_dy:initialY*dy,
   dx_dy:dx*dy,dx2:dx*dx,dy2:dy*dy,steps:actions.length,
   initialX,initialY,
   ordered_0_0:ordered00,ordered_0_1:ordered01,
   ordered_1_0:ordered10,ordered_1_1:ordered11};
 for(let i=0;i<4;i++){
   const h=history[history.length-1-i]||{ax:0,ay:0};
   result["last"+i+"_axis0"]=h.ax;
   result["last"+i+"_axis1"]=h.ay;
 }
 return result;
}
export function recordObservedTrajectory(field,start,actions) {
 const source=tokenizeObservation(start),model=field.discover(start);
 if(!model.ready||model.axes.length!==2||model.numericTokenIndices.length!==3)
   throw Error("Need independently observed 2-axis, 3-numeric-state movement model");
 const [axisX,axisY]=model.axes,z=model.dependent;
 const n=model.numericTokenIndices;
 const startNumbers=n.map(i=>Number(source[i]));
 if(n.some(i=>!Number.isSafeInteger(Number(source[i]))))throw Error("Invalid numeric input");
 // Canonicalize action indices from the discovered input axes.
 const canonical=actions.map(a=>({primary:a.primary===axisX?0:a.primary===axisY?1:-1,
   step:a.step}));
 let current=source.slice();
 for(const action of actions) {
   const op=model.operators.find(o=>o.primary===action.primary&&o.step===action.step);
   if(!op)throw Error("Action has never been learned from paired observations");
   const next=field.apply(current,op,model);
   if(!next)throw Error("Action not allowed by currently observed state");
   current=next;
 }
 const finalNumbers=n.map(i=>Number(current[i]));
 return {start,actions:canonical,
   features:pathFeatures(startNumbers[axisX],startNumbers[axisY],canonical),
   target:finalNumbers[z]-startNumbers[z],
   initialOutput:startNumbers[z],finalObservedOutput:finalNumbers[z],
   initialXY:[startNumbers[axisX],startNumbers[axisY]],
   finalXY:[finalNumbers[axisX],finalNumbers[axisY]],
   observedFinalTokens:current.slice(),
   source:"observed executions of V17 experimental StateDependentTextAxes.apply"};
}
export function learnMissingPerspective(train,validation,{
   improvementRatio=0.02,minEvidenceError=1e-8
 }={}) {
 if(train.length<50||validation.length<20)throw Error("Insufficient independent samples");
 const endpoint=fitLeastSquares(train,BASE_FEATURES);
 const recent=fitLeastSquares(train,[...BASE_FEATURES,...RECENCY_FEATURES]);
 const endpointVal=rmse(validation,endpoint),recentVal=rmse(validation,recent);
 const candidates=ORDERED_FEATURES.map(axis=>{
   const model=fitLeastSquares(train,[...BASE_FEATURES,axis]);
   return {axis,model,validationRMSE:rmse(validation,model)};
 }).sort((a,b)=>a.validationRMSE-b.validationRMSE||
    ORDERED_FEATURES.indexOf(a.axis)-ORDERED_FEATURES.indexOf(b.axis));
 const best=candidates[0];
 const select=endpointVal>minEvidenceError &&
    best.validationRMSE<endpointVal*improvementRatio;
 const selected=select?best.model:endpoint;
 return {
  selectedModel:selected,endpointModel:endpoint,recentHistoryModel:recent,
  selectedFeature:select?best.axis:null,addedLatentDimensions:select?1:0,
  trainingExamples:train.length,validationExamples:validation.length,
  endpointValidationRMSE:endpointVal,
  recentValidationRMSE:recentVal,
  selectedValidationRMSE:rmse(validation,selected),
  candidateValidationRMSE:candidates.map(({axis,validationRMSE})=>
     ({axis,validationRMSE})),
  hypothesesConsidered:ORDERED_FEATURES.slice(),
  selectionRule:"choose at most one 2nd-order ordered interaction iff independent validation RMSE < 2% of endpoint RMSE",
  noAreaFormulaPreprogrammed:true
 };
}
export function evaluateOnUnseen(decision,test,{scrambleSeed=179}={}) {
 if(!test.length)throw Error("Need withheld test trajectories");
 const predict=model=>test.map(x=>x.initialOutput+predictDisplacement(model,x.features));
 const observed=test.map(x=>x.finalObservedOutput);
 const errors=values=>({
    rmse:Math.sqrt(sum(values.map((v,i)=>(v-observed[i])**2))/values.length),
    mae:sum(values.map((v,i)=>Math.abs(v-observed[i])))/values.length,
    withinOne:values.filter((v,i)=>Math.abs(v-observed[i])<=1).length,
    exact:values.filter((v,i)=>Math.abs(v-observed[i])<=1e-6).length
 });
 const baseline=predict(decision.endpointModel),
    recent=predict(decision.recentHistoryModel),
    selected=predict(decision.selectedModel);
 // Sham control permutes the chosen history feature without changing the
 // otherwise identical final endpoint coordinates. No training/test leakage.
 let shuffled=null;
 if(decision.selectedFeature) {
   const v=test.map(row=>row.features[decision.selectedFeature]);
   let state=scrambleSeed>>>0,order=Array.from({length:test.length},(_,i)=>i);
   const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
   for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
   shuffled=test.map((row,i)=>row.initialOutput+predictDisplacement(decision.selectedModel,{
     ...row.features,[decision.selectedFeature]:v[order[i]]
   }));
 }
 return {cases:test.length,endpoint:errors(baseline),lastFour:errors(recent),
   selected:errors(selected),scrambledHistory:shuffled?errors(shuffled):null,
   targetWasSeenOnlyAfterPrediction:true,
   conditionalOnSelectedHistory:!!decision.selectedFeature
 };
}


// The empirically selected path coordinate can be maintained ONLINE.
// It does not require retaining/replaying the full action history:
// current dx,dy and ONE auxiliary accumulator suffice for these features.
// The learner chooses the feature; this update rule is the inductive bias.
export function incrementalPathMemory(actions,selectedFeature){
 if(selectedFeature!==null&&!ORDERED_FEATURES.includes(selectedFeature))
   throw Error("Only observed pair-order candidates are supported");
 let dx=0,dy=0,auxiliary=0,steps=0;
 for(const action of actions) {
   const ax=action.primary===0?action.step:0,
         ay=action.primary===1?action.step:0;
   if(![-1,1].includes(action.step)||((ax===0)===(ay===0)))
     throw Error("Invalid signed unit axis");
   if(selectedFeature==="ordered_0_0")auxiliary+=dx*ax;
   if(selectedFeature==="ordered_0_1")auxiliary+=dx*ay;
   if(selectedFeature==="ordered_1_0")auxiliary+=dy*ax;
   if(selectedFeature==="ordered_1_1")auxiliary+=dy*ay;
   dx+=ax;dy+=ay;steps++;
 }
 return {dx,dy,extraCoordinate:selectedFeature?auxiliary:null,
   addedDimensions:selectedFeature?1:0,steps,
   retainedHistoryEntries:0,
   onlineStateCoordinateCount:2+(selectedFeature?1:0)};
}
