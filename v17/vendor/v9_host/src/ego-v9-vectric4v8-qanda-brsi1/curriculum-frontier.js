export const HORIZON_MODES=Object.freeze({
  GEOMETRY_GENEROUS:"geometry-generous",
  MOVING_CARROT:"moving-carrot"
});

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;

export function createCurriculumFrontier(config={},overrides={}){
  const start=Math.max(16,Math.floor(finite(overrides.horizon??config.carrotStartActions,100)));
  return{
    version:1,
    mode:Object.values(HORIZON_MODES).includes(overrides.mode)?overrides.mode:
      (Object.values(HORIZON_MODES).includes(config.horizonCurriculumMode)?config.horizonCurriculumMode:HORIZON_MODES.GEOMETRY_GENEROUS),
    generation:0,horizonAtN16:start,streak:0,retreatStreak:0,
    lastEvaluated:{A:-1,B:-1},latest:{A:null,B:null},history:[],
    lastDecision:{type:"INIT",horizon:start}
  };
}

export function ensureCurriculumFrontier(t){
  if(!t.curriculumFrontier||t.curriculumFrontier.version!==1)t.curriculumFrontier=createCurriculumFrontier(t.config,t.curriculumFrontier||{});
  const m=String(t.config?.horizonCurriculumMode||t.curriculumFrontier.mode);
  if(Object.values(HORIZON_MODES).includes(m))t.curriculumFrontier.mode=m;
  const pristine=t.curriculumFrontier.generation===0&&!(t.curriculumFrontier.history||[]).length&&!t.curriculumFrontier.latest?.A&&!t.curriculumFrontier.latest?.B;
  if(pristine)t.curriculumFrontier.horizonAtN16=Math.max(16,Math.floor(finite(t.config?.carrotStartActions,t.curriculumFrontier.horizonAtN16||100)));
  return t.curriculumFrontier;
}

export function frontierBudgetAtN16(config={},state=null){
  if(state?.mode===HORIZON_MODES.MOVING_CARROT)return Math.max(16,Math.floor(finite(state.horizonAtN16,finite(config.carrotStartActions,100))));
  return Math.max(1,Math.floor(finite(config.maxGlobalActions,1024)));
}

export function frontierProgress(metrics={}){
  const p=clamp(finite(metrics.progressRatio,0),-1,1),w=clamp(finite(metrics.worstProgressRatio,0),-1,1),success=clamp(finite(metrics.success,0),0,1);
  // Reward partial geometric progress, but a real completion is decisive.
  return clamp(Math.max(success,.72*p+.28*w),-1,1);
}

function boundedHistory(state,row,cap=128){
  state.history.push(row);while(state.history.length>cap)state.history.shift();
}

export function noteFrontierBatch(t,group,metrics,batch){
  const state=ensureCurriculumFrontier(t),g=String(group);
  if(state.mode!==HORIZON_MODES.MOVING_CARROT||!(g==="A"||g==="B"))return{changed:false,state,decision:null};
  state.latest[g]={batch:Number(batch)||0,score:frontierProgress(metrics),success:clamp(finite(metrics.success,0),0,1),progress:finite(metrics.progressRatio,0),worstProgress:finite(metrics.worstProgressRatio,0)};
  const a=state.latest.A,b=state.latest.B;
  if(!a||!b||a.batch<=state.lastEvaluated.A||b.batch<=state.lastEvaluated.B)return{changed:false,state,decision:null};
  state.lastEvaluated={A:a.batch,B:b.batch};
  const policy=String(t.config.carrotAdvancePolicy||"best"),scores=[a.score,b.score],competence=policy==="both"?Math.min(...scores):(policy==="mean"?(scores[0]+scores[1])/2:Math.max(...scores));
  const advanceAt=clamp(finite(t.config.carrotAdvanceThreshold,.72),0,1),retreatAt=clamp(finite(t.config.carrotRetreatThreshold,.28),0,1);
  const checks=Math.max(1,Math.floor(finite(t.config.carrotChecksRequired,3))),retreatChecks=Math.max(1,Math.floor(finite(t.config.carrotRetreatChecks,6)));
  state.streak=competence>=advanceAt?state.streak+1:0;
  state.retreatStreak=competence<retreatAt?state.retreatStreak+1:0;
  const before=state.horizonAtN16,step=Math.max(1,Math.floor(finite(t.config.carrotStepActions,50))),max=Math.max(before,Math.floor(finite(t.config.carrotMaxActions,t.config.maxGlobalActions||1024))),min=Math.max(16,Math.floor(finite(t.config.carrotMinActions,t.config.carrotStartActions||100)));
  let type="HOLD";
  if(state.streak>=checks&&before<max){state.horizonAtN16=Math.min(max,before+step);state.generation++;state.streak=0;state.retreatStreak=0;type="ADVANCE";}
  else if(t.config.carrotAllowRetreat===true&&state.retreatStreak>=retreatChecks&&before>min){state.horizonAtN16=Math.max(min,before-step);state.generation++;state.streak=0;state.retreatStreak=0;type="RETREAT";}
  const decision={type,before,after:state.horizonAtN16,competence,policy,A:a,B:b,generation:state.generation};
  state.lastDecision=decision;boundedHistory(state,{...decision,batches:{A:a.batch,B:b.batch}});
  return{changed:type!=="HOLD",state,decision};
}

export function curriculumFrontierSnapshot(t){
  const s=ensureCurriculumFrontier(t);
  return structuredClone({
    version:s.version,mode:s.mode,generation:s.generation,horizonAtN16:s.horizonAtN16,streak:s.streak,retreatStreak:s.retreatStreak,
    latest:s.latest,lastDecision:s.lastDecision,history:s.history
  });
}
