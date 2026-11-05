import {ALL_MAP_SEQUENCE,THREE_D_MAP_SEQUENCE,TWO_D_MAP_SEQUENCE,STAGES} from "./config.js";

export const RSI_SOURCE_MODES=Object.freeze({
  FAST:"fast-direct",
  PRETRAIN:"pretrained-brain",
  FROZEN:"manual-frozen-h0"
});
export const DIMENSION_PHASES=Object.freeze({TWO_D:"2d",THREE_D:"3d-transfer",MIXED:"mixed"});

export const SIMULATION_STEPS=Object.freeze([1,2,4,8,10,16,32,64,128,256,512,1000,2000,4000]);

export const PRETRAIN_READINESS=Object.freeze({
  checksRequired:3,
  casesPerMap:3,
  checkEveryBatches:5,
  v5Threshold:.55,
  threeDThreshold:.45
});

const V1_THRESHOLDS=Object.freeze({
  "v1-wide":STAGES[0].pass,
  "v1-funnel":STAGES[1].pass,
  "v1-slit":STAGES[2].pass,
  "v1-offset":STAGES[3].pass,
  "v1-keyhole":STAGES[4].pass,
  "v1-procedural":STAGES[5].pass
});

export function simulationCountForSlider(index){
  const i=Math.max(0,Math.min(SIMULATION_STEPS.length-1,Math.round(Number(index)||0)));
  return SIMULATION_STEPS[i];
}
export function sliderIndexForSimulationCount(count){
  const n=Math.max(1,Number(count)||1);let best=0,dist=Infinity;
  for(let i=0;i<SIMULATION_STEPS.length;i++){const d=Math.abs(Math.log(SIMULATION_STEPS[i])-Math.log(n));if(d<dist){dist=d;best=i;}}
  return best;
}
export function readinessThreshold(mapKind){
  if(THREE_D_MAP_SEQUENCE.includes(mapKind))return PRETRAIN_READINESS.threeDThreshold;
  return V1_THRESHOLDS[mapKind]??PRETRAIN_READINESS.v5Threshold;
}
export function createWorkflowState(overrides={}){
  return{version:2,sourceMode:RSI_SOURCE_MODES.PRETRAIN,phase:"idle",dimensionPhase:DIMENSION_PHASES.TWO_D,ready:false,readinessStreak:0,readinessChecks:0,lastReadiness:null,lastTransition:null,...overrides};
}
export function ensureWorkflowState(t){
  const old=t.workflow||{};
  if(!t.workflow||t.workflow.version!==2)t.workflow=createWorkflowState({sourceMode:old.sourceMode,phase:old.phase==="rsi"||old.phase==="direct-rsi"?old.phase:"idle"});
  if(!Object.values(RSI_SOURCE_MODES).includes(t.workflow.sourceMode))t.workflow.sourceMode=RSI_SOURCE_MODES.PRETRAIN;
  if(!Object.values(DIMENSION_PHASES).includes(t.workflow.dimensionPhase))t.workflow.dimensionPhase=DIMENSION_PHASES.TWO_D;
  if(!Number.isFinite(Number(t.workflow.readinessStreak)))t.workflow.readinessStreak=0;
  if(!Number.isFinite(Number(t.workflow.readinessChecks)))t.workflow.readinessChecks=0;
  t.workflow.ready=Boolean(t.workflow.ready);return t.workflow;
}
export function pretrainMapKinds(w){
  const p=w?.dimensionPhase||DIMENSION_PHASES.TWO_D;
  return p===DIMENSION_PHASES.TWO_D?TWO_D_MAP_SEQUENCE:(p===DIMENSION_PHASES.THREE_D?THREE_D_MAP_SEQUENCE:ALL_MAP_SEQUENCE);
}
export function pretrainMapMode(w){
  const p=w?.dimensionPhase||DIMENSION_PHASES.TWO_D;
  return p===DIMENSION_PHASES.TWO_D?"all":(p===DIMENSION_PHASES.THREE_D?"3d-all":"all-v9");
}
export function summarizeReadiness(mapResults,sizes=null,mapKinds=ALL_MAP_SEQUENCE){
  const perMap=[];let ready=true,minSuccess=1,sum=0,n=0;
  const sizeList=Array.isArray(sizes)&&sizes.length?sizes:[null];
  for(const mapKind of mapKinds)for(const swarmSize of sizeList){
    const root=mapResults?.[mapKind]||{},rec=swarmSize==null?root:(root?.[swarmSize]||root?.[String(swarmSize)]||{}),A=Math.max(0,Math.min(1,Number(rec.A?.success)||0)),B=Math.max(0,Math.min(1,Number(rec.B?.success)||0)),threshold=readinessThreshold(mapKind),pass=A>=threshold&&B>=threshold;
    if(!pass)ready=false;minSuccess=Math.min(minSuccess,A,B);sum+=A+B;n+=2;perMap.push({mapKind,swarmSize,A,B,threshold,pass});
  }
  return{ready,minSuccess:n?minSuccess:0,meanSuccess:n?sum/n:0,perMap,mapKinds:[...mapKinds]};
}
export function applyReadinessResult(t,report){
  const w=ensureWorkflowState(t),phaseBefore=w.dimensionPhase;w.readinessChecks++;w.lastReadiness=structuredClone(report);w.readinessStreak=report?.ready?w.readinessStreak+1:0;w.lastTransition=null;
  if(w.readinessStreak>=PRETRAIN_READINESS.checksRequired){
    if(w.dimensionPhase===DIMENSION_PHASES.TWO_D){w.dimensionPhase=DIMENSION_PHASES.THREE_D;w.readinessStreak=0;w.lastReadiness=null;w.lastTransition={from:phaseBefore,to:w.dimensionPhase};}
    else if(w.dimensionPhase===DIMENSION_PHASES.THREE_D){w.dimensionPhase=DIMENSION_PHASES.MIXED;w.readinessStreak=0;w.lastReadiness=null;w.lastTransition={from:phaseBefore,to:w.dimensionPhase};}
    else{w.ready=true;w.lastTransition={from:phaseBefore,to:"ready"};}
  }
  return w;
}
