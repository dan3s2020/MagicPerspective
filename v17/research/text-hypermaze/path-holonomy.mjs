// Experimental derived state for the REAL learned StateDependentTextAxes operators.
// Focus: when [X,Y] != 0, the path can end at the same apparent (x,y) while
// its dependent textual state differs. In a locally affine, two-input,
// coupled-movement field, ONE signed traversal-area coordinate suffices to
// recover that difference. The area rule is an explicit mathematical
// inductive bias (NOT learned autonomously); the field coefficients are fitted
// by StateDependentTextAxes from actual observed pairs.
// No changes to production V17 Brain/geometry/text generator/UI.
import {tokenizeObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const integer=t=>/^\d+$/u.test(t);
const approx=(a,b)=>Math.abs(a-b)<=1e-7;
export function learnedHolonomy(field,start) {
  const model=field.discover(start);
  if(!model.ready)return {ready:false,reason:model.reason};
  if(model.axes.length!==2 || model.numericTokenIndices.length!==3)
    return {ready:false,reason:"only-a-two-axis-three-numeric-component-field-is-tested"};
  const [xi,yi]=model.axes,zi=model.dependent;
  const opX=model.operators.find(o=>o.primary===xi&&o.step===1);
  const opY=model.operators.find(o=>o.primary===yi&&o.step===1);
  if(!opX||!opY)return {ready:false,reason:"need-observed-unit-increments-in-both-directions"};
  if(!approx(opX.slopes[xi],0)||!approx(opY.slopes[yi],0) ||
     !approx(opX.slopes[zi],0)||!approx(opY.slopes[zi],0))
    return {ready:false,reason:"cross-coupled-field-outside-this-closed-form"};
  const alpha=opX.slopes[yi],beta=opY.slopes[xi];
  return {ready:true,x:xi,y:yi,z:zi,alpha,beta,
    driftX:opX.intercept,driftY:opY.intercept,
    commutator:beta-alpha,
    pathAreaCoefficient:(beta-alpha)/2,
    integrated:approx(alpha,beta),
    learnedSources:[opX.trainingPairs,opY.trainingPairs],
    measuredTrainingResiduals:[opX.maxTrainingResidual,opY.maxTrainingResidual],
    numericTokenIndices:model.numericTokenIndices};
}
export function predictFromPath(field,start,path) {
  const law=learnedHolonomy(field,start);
  if(!law.ready)return {ready:false,reason:law.reason};
  if(!Array.isArray(path))throw Error("Path must be a list of previously learned actions");
  const tokens=tokenizeObservation(start),
    numbers=law.numericTokenIndices.map(i=>Number(tokens[i]));
  if(numbers.some(x=>!Number.isSafeInteger(x)))
    throw Error("Starting state must contain safe integers");
  const [x0,y0,z0]=[numbers[law.x],numbers[law.y],numbers[law.z]];
  let dxTotal=0,dyTotal=0,signedArea=0;
  const trace=[{index:0,dx:0,dy:0,area:0,predictedOutput:z0}];
  for(const action of path){
    const dx=action.primary===law.x?action.step:0,
      dy=action.primary===law.y?action.step:0;
    if(!((dx===0&&dy!==0)||(dy===0&&dx!==0))||
       !Number.isSafeInteger(action.step)||![-1,1].includes(action.step))
      throw Error("Action outside two observed unit axes");
    signedArea+=dxTotal*dy-dyTotal*dx;
    dxTotal+=dx;dyTotal+=dy;
    const z=z0+law.driftX*dxTotal+law.driftY*dyTotal+
       law.alpha*y0*dxTotal+law.beta*x0*dyTotal+
       (law.alpha+law.beta)*dxTotal*dyTotal/2+
       law.pathAreaCoefficient*signedArea;
    trace.push({index:trace.length,dx:dxTotal,dy:dyTotal,
      signedArea,predictedOutput:z,
      transformedInputX:x0+dxTotal,transformedInputY:y0+dyTotal});
  }
  return {ready:true,law,startingState:start,finalX:x0+dxTotal,
    finalY:y0+dyTotal,finalOutput:trace.at(-1).predictedOutput,
    signedArea,trace,
    endpointOnlyOutput:z0+law.driftX*dxTotal+law.driftY*dyTotal+
       law.alpha*y0*dxTotal+law.beta*x0*dyTotal+
       (law.alpha+law.beta)*dxTotal*dyTotal/2,
    pathOrderContribution:law.pathAreaCoefficient*signedArea,
    compressedExtraStateCoordinates:law.integrated?0:1,
    originalFullHistoryLength:path.length};
}
export function executeLearnedPath(field,start,actions) {
  const law=learnedHolonomy(field,start),model=field.discover(start);
  if(!law.ready)return {ready:false,reason:law.reason};
  let current=tokenizeObservation(start),successful=0;
  for(const action of actions){
    const op=model.operators.find(o=>o.primary===action.primary&&o.step===action.step);
    if(!op)return {ready:false,reason:"unobserved-action",successful};
    const next=field.apply(current,op,model);
    if(!next)return {ready:false,reason:"invalid-world-step",successful};
    current=next;successful++;
  }
  const expected=predictFromPath(field,start,actions);
  const actual=law.numericTokenIndices.map(i=>Number(current[i]));
  return {ready:true,successful,actual,expected,
    matched:actual[law.x]===expected.finalX&&
      actual[law.y]===expected.finalY&&
      approx(actual[law.z],expected.finalOutput),
    law,trace:expected.trace};
}
