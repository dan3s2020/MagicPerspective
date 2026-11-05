import {ALPHA_COARSE,CAUSAL_HORIZONS,mean} from "./causal-types.js";
import {createQandaAdam,encodeQandaInput,forwardQanda,qandaAdamStep,qandaBatchGradient,qandaRecordContribution,trainQanda} from "./qanda-brsi-controller.js";
import {createInitialBranch,runNaturalPair,compareCurve} from "./causal-branch-runner.js";

function zeroLike(g){const o=structuredClone(g);for(const k of["w1","b1","w2","b2"])o[k].fill(0);return o;}
function add(dst,src,s=1){for(const k of["w1","b1","w2","b2"])for(let i=0;i<dst[k].length;i++)dst[k][i]+=s*src[k][i];return dst;}
function residual(aggregate,sum){let r2=0,g2=0,maxAbs=0;for(const k of["w1","b1","w2","b2"])for(let i=0;i<aggregate[k].length;i++){const d=aggregate[k][i]-sum[k][i];r2+=d*d;g2+=aggregate[k][i]*aggregate[k][i];maxAbs=Math.max(maxAbs,Math.abs(d));}return{relativeL2:Math.sqrt(r2)/Math.max(1e-15,Math.sqrt(g2)),maxAbs};}
export function reconstructQandaContributions(model,records){
  const aggregate=qandaBatchGradient(model,records).grad,sum=zeroLike(aggregate),contributions=[];
  for(let i=0;i<records.length;i++){const g=qandaRecordContribution(model,records,i).grad;contributions.push(g);add(sum,g);}
  return{aggregate,contributions,residual:residual(aggregate,sum)};
}
function updateController(model,opt,aggregate,contribution,alpha,lr){
  const g=structuredClone(aggregate);add(g,contribution,Number(alpha)-1);qandaAdamStep(model,g,opt,lr);return g;
}
function controllerFixtureScore(controller,fixtures){
  const scores=[];
  for(const fx of fixtures||[]){
    const f=forwardQanda(controller,encodeQandaInput(fx.inputRecord)),alpha=f.decision===0?0:f.alpha;
    const candidate=createInitialBranch({checkpoint:fx.checkpoint,scope:fx.scope,cell:fx.cell,aggregateGrad:fx.aggregateGrad,contribution:fx.contribution,alpha,coUpdates:fx.coUpdates||null});
    const off=createInitialBranch({checkpoint:fx.checkpoint,scope:fx.scope,cell:fx.cell,aggregateGrad:fx.aggregateGrad,contribution:fx.contribution,alpha:0,coUpdates:fx.coUpdates||null});
    const run=runNaturalPair({onBranch:candidate,offBranch:off,horizons:[fx.horizon||200],futureSpec:fx.futureSpec,evalSpecs:fx.evalSpecs});
    const curve=compareCurve(run);scores.push(curve.at(-1)?.delta||0);
  }
  return{score:mean(scores),perFixture:scores};
}
export function runRecursiveQandaExperiment({
  champion,championOpt,trainRecords,targetIndex,futureRecords=[],fixtures=[],
  learningRate=.001,horizons=[1,10,50],alphas=ALPHA_COARSE,reconstructionTolerance=1e-10
}){
  if(!trainRecords?.length)throw new Error("recursive Q&A experiment needs training records");
  const recon=reconstructQandaContributions(champion,trainRecords);
  if(recon.residual.relativeL2>reconstructionTolerance)throw new Error("Q&A contribution reconstruction failed "+recon.residual.relativeL2);
  const contribution=recon.contributions[targetIndex],curves=[],alphaResults=[];
  for(const alpha of alphas){
    const baseModel=structuredClone(champion),baseOpt=structuredClone(championOpt);updateController(baseModel,baseOpt,recon.aggregate,contribution,alpha,learningRate);
    const immediate=controllerFixtureScore(baseModel,fixtures);alphaResults.push({alpha,score:immediate.score});
  }
  for(const h of horizons){
    const on=structuredClone(champion),off=structuredClone(champion),onOpt=structuredClone(championOpt),offOpt=structuredClone(championOpt);
    updateController(on,onOpt,recon.aggregate,contribution,1,learningRate);updateController(off,offOpt,recon.aggregate,contribution,0,learningRate);
    const future=futureRecords.slice(0,Math.min(h,futureRecords.length));
    if(future.length){trainQanda(on,future,onOpt,{learningRate,epochs:1});trainQanda(off,future,offOpt,{learningRate,epochs:1});}
    const a=controllerFixtureScore(on,fixtures),b=controllerFixtureScore(off,fixtures);curves.push({horizon:h,on:a.score,off:b.score,delta:a.score-b.score});
  }
  const best=alphaResults.slice().sort((a,b)=>b.score-a.score)[0]||{alpha:1,score:0};
  return{targetIndex,reconstruction:recon.residual,alphaResults,bestAlpha:best.alpha,causalCurve:curves,downstreamAdvantage:curves.at(-1)?.delta||0,
    pass:(curves.at(-1)?.delta||0)>=0};
}
export function verifyQandaChallengerDownstream({champion,candidate,fixtures=[]}){
  const a=controllerFixtureScore(champion,fixtures),b=controllerFixtureScore(candidate,fixtures),advantage=b.score-a.score;
  return{champion:a,candidate:b,advantage,pass:fixtures.length===0?true:advantage>=0};
}
