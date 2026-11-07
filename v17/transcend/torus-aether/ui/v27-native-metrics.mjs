// V27 read-only projection of ORIGINAL /graphs payload.
// Numerators, denominators, benchmarks and world physics NOT recomputed.
const finite=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
const fmtRatio=v=>finite(v)===null?"—":(100*v).toFixed(1)+"%";
const fmtNumber=(v,d=0)=>finite(v)===null?"—":
  v.toLocaleString("ro-RO",{minimumFractionDigits:d,maximumFractionDigits:d});
const choose=(graphs,selected)=>{
  const list=Array.isArray(graphs)?graphs:[];
  return list.find(g=>Number(g.w)===Number(selected))||
    list.find(g=>g.status==="antrenează")||list[0]||null;
};
const value=(obj,key)=>obj&&typeof obj==="object"?obj[key]:undefined;
export function originalMetrics(raw,worker=null){
  const gr=choose(raw?.graphs,worker),test=gr?.test,
    maze=gr?.maze,transform=gr?.transform,shared=gr?.shared;
  const p=gr?.progress,train=shared?.training;
  const measured={
    textAligned:value(test,"aligned"),textLegacy:value(test,"live"),
    textTogether:value(test,"together"),textC:value(test,"C"),
    textWithField:value(test,"field"),
    textTestN:value(test,"n"),
    mazePlayed:value(maze,"played"),
    mazeTestN:value(maze?.test,"n"),
    mazeShape:value(maze?.test,"shape"),
    mazeSolved:value(maze?.test,"solved"),
    mazeRatio:value(maze?.test,"ratio"),
    transPlayed:value(transform,"played"),
    transSolved:value(transform?.test,"solved"),
    transRatio:value(transform?.test,"ratio"),
    transFailedRate:value(transform?.test,"failedRate"),
    transSaidLimitation:value(transform?.test,"saidLimitation"),
    transImpossible:value(transform?.test,"impossible"),
    progressTrained:value(p,"trained"),
    progressTotal:value(p,"total"),
    progressHeldOut:value(p,"heldOut"),
    progressRemaining:value(p,"remaining"),
    progressMode:value(p,"mode"),
    progressShards:value(p,"shards"),
    pytorchStep:value(train,"step"),
    preUpdatePredictionLoss:value(train,"preUpdatePredictionLoss"),
    identityBaselineLoss:value(train,"identityBaselineLoss")
  };
  return {raw,worker:gr?.w??null,world:raw?.world??null,
    status:gr?.status??"indisponibil",measured,
    labels:{
      aligned:fmtRatio(measured.textAligned),
      legacy:fmtRatio(measured.textLegacy),
      together:fmtRatio(measured.textTogether),
      mazeShape:fmtRatio(measured.mazeShape),
      mazeSolved:fmtRatio(measured.mazeSolved),
      mazeN:fmtNumber(measured.mazeTestN),
      mazeRatio:measured.mazeRatio==null?"—":fmtNumber(measured.mazeRatio,2),
      transSolved:fmtRatio(measured.transSolved),
      transFailedRate:fmtRatio(measured.transFailedRate),
      progress:measured.progressTrained==null||measured.progressTotal==null||
        measured.progressTotal<=0?"—":
        nativeProgressPercent(measured.progressTrained,measured.progressTotal),
      progressSub:measured.progressTrained==null?"—":
        fmtNumber(measured.progressTrained)+" / "+fmtNumber(measured.progressTotal)+
        " · holdout "+fmtNumber(measured.progressHeldOut),
      loss:measured.preUpdatePredictionLoss==null?"—":
        String(measured.preUpdatePredictionLoss),
      baseline:measured.identityBaselineLoss==null?"—":
        String(measured.identityBaselineLoss)
    }
  };
}
export function nativeProgressPercent(trained,total){
  if(!Number.isFinite(trained)||!Number.isFinite(total)||total<=0)return "--%";
  const v=Math.max(0,Math.min(100,100*trained/total));
  if(v>0&&v<.0001)return v.toPrecision(2)+"%";
  if(v>0&&v<.01)return v.toFixed(4)+"%";
  return v.toFixed(2)+"%";
}
