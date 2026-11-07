// V17 research hypothesis: MOVEMENT AXES can depend on the CURRENT textual state.
// Learn a locally affine numerical transition FIELD by observing paired sentences.
// No "+" or "*" algebraic rule is supplied; only integer differences, shared
// change positions, and local finite-difference slopes are assumed by the model.
// This is NOT integrated in the production V17 Brain/LLM or proof of general math.
import {tokenizeObservation,renderObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
const isNum=t=>/^\d+$/u.test(t);
const template=t=>t.map(x=>isNum(x)?"#":x).join("\x1f");
const EPS=1e-8;
function groupSamples(samples,numericCount) {
 const changed=samples.map(s=>s.delta.map((n,i)=>n?i:-1).filter(i=>i>=0));
 const intersection=changed.reduce((a,x)=>a.filter(v=>x.includes(v)),changed[0]||[]);
 if(intersection.length!==1)return {ready:false,reason:"dependent-coordinate-not-identifiable",candidates:intersection};
 const dependent=intersection[0],groups=new Map();
 for(const s of samples){
   const independent=s.delta.map((n,i)=>n&&i!==dependent?i:-1).filter(i=>i>=0);
   if(independent.length!==1)continue;
   const primary=independent[0],step=s.delta[primary],key=primary+":"+step;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(s);
 }
 const operators=[];
 for(const [key,observed] of groups){
   const [primary,step]=key.split(":").map(Number);
   const candidates=Array.from({length:numericCount},(_,i)=>i).filter(i=>i!==dependent);
   const slopes=Array(numericCount).fill(0),evidence=Array(numericCount).fill(0);
   const median=a=>{const sorted=a.slice().sort((x,y)=>x-y);return sorted.length ? sorted[Math.floor((sorted.length-1)/2)] : 0;};
   for(const j of candidates) {
     const found=[];
     for(let a=0;a<observed.length;a++)for(let b=a+1;b<observed.length;b++){
       const x=observed[a],y=observed[b],diff=y.before[j]-x.before[j];
       if(!diff)continue;
       if(candidates.some(k=>k!==j&&x.before[k]!==y.before[k]))continue;
       found.push((y.delta[dependent]-x.delta[dependent])/diff);
     }
     if(found.length){
       slopes[j]=median(found);
       evidence[j]=found.length;
     }
   }
   const intercept=median(observed.map(s=>s.delta[dependent]-slopes.reduce((a,b,i)=>a+b*s.before[i],0)));
   let residual=0;
   for(const s of observed){
     const predicted=intercept+slopes.reduce((a,b,i)=>a+b*s.before[i],0);
     residual=Math.max(residual,Math.abs(s.delta[dependent]-predicted));
   }
   const residuals=observed.map(s=>Math.abs(s.delta[dependent]-intercept-slopes.reduce((a,b,i)=>a+b*s.before[i],0)));
   const verifiedInliers=residuals.filter(x=>x<1e-7).length;
   operators.push({primary,step,dependent,intercept,slopes,
     evidence,trainingPairs:observed.length,maxTrainingResidual:residual,
     verifiedInliers,verifiedFraction:verifiedInliers/observed.length});
 }
 return {ready:operators.length>0,numericCount,dependent,
   axes:[...new Set(operators.map(x=>x.primary))].sort((a,b)=>a-b),operators};
}
export class StateDependentTextAxes {
 constructor({maxValue=200,maxExpanded=8000}={}) {
   this.maxValue=maxValue;this.maxExpanded=maxExpanded;
   this.data=new Map();this.observations=0;this.rejected=0;
 }
 observePair(before,after){
   const a=tokenizeObservation(before),b=tokenizeObservation(after);
   if(a.length!==b.length||template(a)!==template(b)){this.rejected++;return {learned:false,reason:"different-template"};}
   const indices=a.flatMap((t,i)=>isNum(t)?[i]:[]);
   const from=indices.map(i=>Number(a[i])),to=indices.map(i=>Number(b[i]));
   if(from.some(x=>!Number.isSafeInteger(x))||to.some(x=>!Number.isSafeInteger(x))){
     this.rejected++;return {learned:false,reason:"unsafe-integer"};}
   const delta=from.map((v,i)=>to[i]-v);
   if(delta.filter(x=>x!==0).length!==2){this.rejected++;return {learned:false,reason:"not-two-changes"};}
   const key=template(a),entry=this.data.get(key)||{indices,samples:[]};
   entry.samples.push({before:from,after:to,delta,evidence:{before,after}});
   entry.samples.push({before:to,after:from,delta:delta.map(x=>-x),evidence:{before:after,after:before}});
   this.data.set(key,entry);this.observations++;return {learned:true,delta};
 }
 discover(start){
   const tokens=tokenizeObservation(start),entry=this.data.get(template(tokens));
   if(!entry)return {ready:false,reason:"no-training-pairs"};
   const result=groupSamples(entry.samples,entry.indices.length);
   return {...result,numericTokenIndices:entry.indices.slice(),pairedObservations:this.observations};
 }
 apply(tokens,op,model) {
   const t=tokens.slice(),ids=model.numericTokenIndices;
   const input=Number(t[ids[op.primary]]),next=input+op.step;
   if(next<0||next>this.maxValue)return null;
   const values=ids.map(i=>Number(tokens[i]));
   const dependentChange=op.intercept+op.slopes.reduce((a,b,i)=>a+b*values[i],0);
   if(!Number.isFinite(dependentChange)||Math.abs(dependentChange-Math.round(dependentChange))>1e-6)return null;
   const output=values[op.dependent]+Math.round(dependentChange);
   if(output<0||output>this.maxValue)return null;
   t[ids[op.primary]]=String(next);t[ids[op.dependent]]=String(output);
   return t;
 }
 availableActions(start){
   const model=this.discover(start);
   if(!model.ready)return model;
   const t=tokenizeObservation(start);
   return {ready:true,model,actions:model.operators.map(op=>({
     primary:op.primary,step:op.step,dependent:op.dependent,
     predictedNext:this.apply(t,op,model)?renderObservation(this.apply(t,op,model)):null,
     contextSlopes:op.slopes,trainingPairs:op.trainingPairs,fitError:op.maxTrainingResidual
   }))};
 }
 plan(start,goals,{maxExpanded=this.maxExpanded,maxSteps=150}={}) {
   const initial=tokenizeObservation(start),model=this.discover(start);
   if(!model.ready)return {found:false,reason:model.reason};
   const req=goals.map(x=>({index:x.index,value:Number(x.value)}));
   if(!req.length||req.some(x=>!model.numericTokenIndices.includes(x.index)||x.index===model.numericTokenIndices[model.dependent]))
     throw Error("Goal must constrain observed input dimensions, without supplying dependent answer");
   const h=t=>req.reduce((s,x)=>s+Math.abs(Number(t[x.index])-x.value),0);
   const queue=[{tokens:initial,g:0,f:1.1*h(initial),parent:null,action:null}];
   const best=new Map([[initial.join("|"),0]]);let expanded=0;
   while(queue.length&&expanded<maxExpanded){
     queue.sort((a,b)=>a.f-b.f || h(a.tokens)-h(b.tokens) || a.g-b.g);
     const cur=queue.shift(),key=cur.tokens.join("|");
     if(cur.g!==(best.get(key)??Infinity))continue;
     expanded++;
     if(h(cur.tokens)===0) {
       const states=[],actions=[];for(let p=cur;p;p=p.parent){
         states.push(renderObservation(p.tokens));if(p.action)actions.push(p.action);
       }states.reverse();actions.reverse();
       return {found:true,predicted:states.at(-1),states,actions,
         steps:actions.length,expanded,referenceAnswerProvided:false,
         predictedBeforeExecution:true,model:{axes:model.axes,dependent:model.dependent,
           numericTokenIndices:model.numericTokenIndices}};
     }
     if(cur.g>=maxSteps)continue;
     for(const op of model.operators){
       const n=this.apply(cur.tokens,op,model);if(!n)continue;
       const key=n.join("|"),g=cur.g+1;if(g>=(best.get(key)??Infinity))continue;
       best.set(key,g);queue.push({tokens:n,g,f:g+1.1*h(n),parent:cur,action:{...op}});
     }
   }
   return {found:false,reason:"no-path-in-learned-state-dependent-field",expanded};
 }
}
