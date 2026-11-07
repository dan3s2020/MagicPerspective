// Experimental distribution-level 5D axis navigation probe.
// Teacher-forced next-byte evaluation. No correct future symbol used before its own prediction.
export const ALPHAS=Object.freeze([0,0.1,0.25,0.5,0.75,1]);
export const ascii = s => {
  const out=[];
  for(const ch of String(s)){const c=ch.charCodeAt(0);if(c!==13)out.push(c===9||c===10||(c>=32&&c<127)?c:63);}
  return out;
};
export function normalizedAlignDistribution(scores){
  const p=new Float64Array(129);let z=0;
  for(const [symbol,raw] of (scores || new Map())) {
    if(Number.isInteger(symbol)&&symbol>=0&&symbol<129&&Number.isFinite(raw)&&raw>0){
      p[symbol]+=raw;z+=raw;
    }
  }
  if(z>0)for(let i=0;i<129;i++)p[i]/=z;
  return {p,available:z>0};
}
export function mixedPrediction(alignScores,field,alpha=0){
  if(alpha<0||alpha>1)throw Error("alpha outside 0..1");
  const A=normalizedAlignDistribution(alignScores);
  const F=new Float64Array(129);let z=0;
  if(field){
    for(let i=0;i<Math.min(128,field.length);i++){
      const v=Number(field[i]);if(Number.isFinite(v)&&v>0){F[i]=v;z+=v;}
    }
  }
  if(z>0)for(let i=0;i<128;i++)F[i]/=z;
  const fAvailable=z>0;
  // alpha=0 is the EXACT unmodified AligningGraph baseline: if there is no
  // aligned candidate, it returns byte 32, even if FIELD knows another path.
  // Positive alpha may open that previously inaccessible geometric successor.
  const aWeight=!A.available?0:!fAvailable?1:1-alpha;
  const fWeight=alpha===0||!fAvailable?0:!A.available?1:alpha;
  if(aWeight===0&&fWeight===0){const p=new Float64Array(129);p[32]=1;
    return {top:32,probabilities:p,fieldAvailable:fAvailable,alignAvailable:A.available};}
  let top=32,best=-1,probTruth=0;
  const merged=new Float64Array(129);
  for(let i=0;i<129;i++){
    const v=aWeight*A.p[i]+fWeight*F[i];
    merged[i]=v;
    if(v>best){best=v;top=i;}
  }
  return {top,probabilities:merged,fieldAvailable:fAvailable,alignAvailable:A.available};
}
export function scoreAxisPredictions(bytes,answerStart,alignDists,fieldRows,alphas=ALPHAS){
  if(bytes.length!==alignDists.length||bytes.length!==fieldRows.length)
    throw Error("One causal distribution must correspond to every actual byte");
  const totals=Object.fromEntries(alphas.map(a=>[String(a),{
    allCorrect:0,allTotal:0,answerCorrect:0,answerTotal:0,
    allNLL:0,answerNLL:0,fieldCoverage:0,alpha:a,
    alignedTrueByteBlocked:0,geometricTrueByteRecoveryPossible:0,
    geometricExpandedSuccessorSet:0,fieldOnlyAfterEmptyAlign:0,
    answerAlignedTrueByteBlocked:0,answerGeometricTrueByteRecoveryPossible:0
  }]));
  for(let i=4;i<bytes.length;i++){
    const y=bytes[i];
    const original=normalizedAlignDistribution(alignDists[i]);
    const pF=fieldRows[i];
    const trueBlocked=!original.available||original.p[y]===0;
    const fieldHasTruth=Boolean(pF&&Number(pF[y])>0);
    const fieldAddsAny=Boolean(pF&&Array.from(pF).some((v,k)=>
      k<128&&Number(v)>0&&original.p[k]===0));
    const fieldAvailable=Boolean(pF&&Array.from(pF).some(v=>Number(v)>0));
    for(const alpha of alphas){
      const r=mixedPrediction(alignDists[i],fieldRows[i],alpha);
      const t=totals[String(alpha)],correct=+(r.top===y);
      const logLoss=-Math.log2(Math.max(1e-12,r.probabilities[y]));
      t.allCorrect+=correct;t.allTotal++;t.allNLL+=logLoss;
      t.fieldCoverage+=+r.fieldAvailable;
      t.alignedTrueByteBlocked+=+trueBlocked;
      t.geometricTrueByteRecoveryPossible+=+(trueBlocked&&fieldHasTruth);
      t.geometricExpandedSuccessorSet+=+fieldAddsAny;
      t.fieldOnlyAfterEmptyAlign+=+(!original.available&&fieldAvailable);
      if(i>=answerStart){t.answerCorrect+=correct;t.answerTotal++;t.answerNLL+=logLoss;
        t.answerAlignedTrueByteBlocked+=+trueBlocked;
        t.answerGeometricTrueByteRecoveryPossible+=+(trueBlocked&&fieldHasTruth);
      }
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([k,s])=>[k,{
    ...s,allAccuracy:s.allTotal?s.allCorrect/s.allTotal:null,
    answerAccuracy:s.answerTotal?s.answerCorrect/s.answerTotal:null,
    meanAllNLL:s.allTotal?s.allNLL/s.allTotal:null,
    meanAnswerNLL:s.answerTotal?s.answerNLL/s.answerTotal:null,
    fieldCoverageFraction:s.allTotal?s.fieldCoverage/s.allTotal:null,
    alignedTrueByteBlockedFraction:s.allTotal?s.alignedTrueByteBlocked/s.allTotal:null,
    geometryRestoresBlockedTargetFraction:s.allTotal?s.geometricTrueByteRecoveryPossible/s.allTotal:null,
    answerAlignedTrueByteBlockedFraction:s.answerTotal?s.answerAlignedTrueByteBlocked/s.answerTotal:null,
    answerGeometryRestoresBlockedTargetFraction:s.answerTotal?s.answerGeometricTrueByteRecoveryPossible/s.answerTotal:null,
    geometryExpandsSuccessorStepsFraction:s.allTotal?s.geometricExpandedSuccessorSet/s.allTotal:null
  }]));
}
