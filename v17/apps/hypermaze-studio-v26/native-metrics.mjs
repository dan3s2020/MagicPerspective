// Strict parity adapter: original native V17 values, not V26 controlled edits.
// NaN/null/undefined means "not measured" and is NEVER displayed as 0 or 100%.
const value=(a,key)=>a&&typeof a==="object"?a[key]:undefined;
export const measured=x=>typeof x==="number"&&Number.isFinite(x)?x:null;
export const fraction=x=>measured(x)===null?null:100*x;
export const formatPct=x=>fraction(x)===null?"—":fraction(x).toFixed(1)+"%";
export function formatDatasetProgress(progress){
  if(!progress||!Number.isFinite(progress.trained)||
    !Number.isFinite(progress.total)||progress.total<=0)return "—";
  const v=Math.max(0,Math.min(100,100*progress.trained/progress.total));
  if(v>0&&v<.0001)return v.toPrecision(2)+"%";
  if(v>0&&v<.01)return v.toFixed(4)+"%";
  return v.toFixed(2)+"%";
}
export function nativeMeasurements(snapshot){
  const gr=snapshot?.original,full=snapshot?.graph;
  const t=gr?.test,ma=gr?.maze,mt=gr?.transform,p=gr?.progress;
  const train=full?.shared?.training;
  const gpu=gr?.gpu||full?.gpu;
  const speed=gpu?.text?.hostMs;
  return {
    selectedWorker:snapshot?.selectedWorker??null,arm:gr?.arm??null,
    status:gr?.status??null,worlds:gr?.worlds||[],
    chars:measured(gr?.chars),nativeGraphNodes:full?.nodes?.length??null,
    nativeGraphEdges:full?.edges?.length??null,
    heldoutN:measured(t?.n),aligned:measured(t?.aligned),
    live:measured(t?.live),field:measured(t?.field),
    together:measured(t?.together),C:measured(t?.C),
    masked:measured(t?.masked),bits:measured(t?.bits),
    mazeN:measured(ma?.test?.n),mazePlayed:measured(ma?.played),
    mazeSolved:measured(ma?.test?.solved),
    mazeShape:measured(ma?.test?.shape),
    mazeRatio:measured(ma?.test?.ratio),
    transformPlayed:measured(mt?.played),
    transformSolved:measured(mt?.test?.solved),
    transformRatio:measured(mt?.test?.ratio),
    transformFailedRate:measured(mt?.test?.failedRate),
    transformImpossible:measured(mt?.test?.impossible),
    transformSaidLimitation:measured(mt?.test?.saidLimitation),
    progressTrained:measured(p?.trained),
    progressTotal:measured(p?.total),
    progressHeldout:measured(p?.heldOut),
    progressRemaining:measured(p?.remaining),
    progressPercent:formatDatasetProgress(p),
    nativeDevice:gpu?.info?.name||gpu?.settings?.device||
      snapshot?.gpu?.device||"—",
    completedExercisesPerSecond:measured(speed?.sustainedExercisesPerSecond),
    sustainedCharactersPerSecond:measured(speed?.sustainedCharactersPerSecond),
    lastCharactersPerSecond:measured(speed?.charactersPerSecond),
    cudaCardCharactersPerSecond:measured(speed?.cudaCardCharactersPerSecond),
    lastBatchReal:snapshot?.liveLastBatchReal||null,
    gpuTotalGB:measured(gpu?.info?.totalGB),
    gpuSafeBudgetGB:measured(gpu?.info?.vramGB),
    gpuFreeAtStartGB:measured(gpu?.info?.freeBeforeGB),
    gpuDriverHeadroomGB:measured(gpu?.info?.safeHeadroomGB),
    gpuActualPeakAllocatedGB:measured(gpu?.text?.vramUsedGB),
    gpuActualPeakReservedGB:measured(gpu?.text?.vramReservedGB),
    gpuActualNowAllocatedGB:measured(gpu?.text?.vramCurrentAllocatedGB),
    gpuActualFreeGB:measured(gpu?.text?.vramFreeGB),
    gpuActualBudgetGB:measured(gpu?.text?.vramBudgetGB),
    gpuRealPeakFraction:measured(gpu?.text?.realVramPeakFraction),
    gpuMicrochunkUsed:measured(gpu?.text?.cudaChunkUsed),
    gpuConfiguredTextChunk:measured(gpu?.settings?.textChunk??snapshot?.gpu?.textChunk),
    gpuNextMicrochunk:measured(gpu?.text?.nextCudaChunk),
    gpuBatch:gpu?.batch||null,
    gpuPhase:gpu?.batch?.phase||null,
    gpuPhaseDone:measured(gpu?.batch?.done),
    gpuPhaseTotal:measured(gpu?.batch?.total),
    gpuPhaseElapsedSeconds:measured(gpu?.batch?.elapsedSeconds),
    gpuPhaseWaitingSeconds:measured(gpu?.batch?.waitingSeconds),
    sourceTextBytesRead:null,
    originalPyTorchStep:measured(train?.step),
    preUpdatePredictionLoss:measured(train?.preUpdatePredictionLoss),
    identityBaselineLoss:measured(train?.identityBaselineLoss),
    actualTrace:train?.trace||null,
    corpus:snapshot?.corpus||null
  };
}
export function summarizeNativeEvaluation(resp){
  const x=resp?.original||resp;
  if(!x||x.error)throw Error(x?.error||"Native evaluation missing");
  if(Array.isArray(x.exercises)){
    const exercises=x.exercises.map((e,index)=>({
      id:index,length:e.n,answerAccuracy:e.answer,allAccuracy:e.all,
      baseline:e.oldAnswer,shapeAccuracy:e.shapeSame,
      answerStart:e.a0,rows:e.rows,shape:e.shape,
      invalidShapeReason:e.invalidShapeReason||null
    }));
    return {kind:"text",count:exercises.length,
      answer:measured(x.answer),all:measured(x.all),
      oldAnswer:measured(x.oldAnswer),exercises};
  }
  if(Array.isArray(x.mazes)){
    return {kind:"maze",count:x.mazes.length,
      mazes:x.mazes,solved:x.mazes.filter(e=>e.solved).length,
      meanFirstShape:x.mazes.length?
        x.mazes.reduce((n,e)=>n+(Number(e.first)||0),0)/x.mazes.length:null};
  }
  if(Array.isArray(x.tasks)){
    const valid=x.tasks.filter(e=>!e.impossible);
    const predicted=valid.reduce((n,e)=>n+(Number(e.predicted)||0),0);
    const errors=valid.reduce((n,e)=>n+(Number(e.failed)||0),0);
    return {kind:"transform",count:x.tasks.length,tasks:x.tasks,
      solved:valid.filter(e=>e.solved).length,validCount:valid.length,
      failedRate:predicted?errors/predicted:null};
  }
  throw Error("Unrecognized native evaluation format");
}
