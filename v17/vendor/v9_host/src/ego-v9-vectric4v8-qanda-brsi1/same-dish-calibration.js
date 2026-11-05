const CLASSES=Object.freeze(["self","tool","other","passive","unknown"]);
const TRUTH_MAP=Object.freeze({
  SELF_BODY:"self",
  CONTROLLED_EXTERNAL_OR_TOOL:"tool",
  OTHER_AUTONOMOUS_AGENT:"other",
  PASSIVE_WORLD_OR_OBJECT:"passive"
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;

export function observerTruthClass(label){return TRUTH_MAP[String(label||"")]||null;}

export function sameDishCalibrationReport(rows=[],threshold=.5){
  const data=(rows||[]).filter(r=>r&&r.visible!==false&&observerTruthClass(r.observerTruth)&&r.probability);
  let tp=0,fp=0,fn=0,brier=0;
  const perClass=Object.fromEntries(CLASSES.slice(0,4).map(k=>[k,{count:0,correctProb:[],uncertainty:[],predicted:0}]));
  const bins=Array.from({length:5},()=>({n:0,confidence:0,correct:0}));
  for(const r of data){
    const truth=observerTruthClass(r.observerTruth),p=r.probability||{},pred=CLASSES.map(k=>[k,Number(p[k])||0]).sort((a,b)=>b[1]-a[1])[0],conf=clamp(pred[1],0,1),correct=pred[0]===truth?1:0;
    perClass[truth].count++;perClass[truth].correctProb.push(Number(p[truth])||0);perClass[truth].uncertainty.push(Number(r.uncertainty)||0);if(pred[0]===truth)perClass[truth].predicted++;
    const selfPred=(Number(p.self)||0)>=threshold;if(truth==="self"&&selfPred)tp++;else if(truth==="self")fn++;else if(selfPred)fp++;
    let rowBrier=0;for(const k of CLASSES){const y=k===truth?1:0,d=(Number(p[k])||0)-y;rowBrier+=d*d;}brier+=rowBrier/CLASSES.length;
    const bi=Math.min(4,Math.floor(conf*5));bins[bi].n++;bins[bi].confidence+=conf;bins[bi].correct+=correct;
  }
  let ece=0;for(const b of bins)if(b.n){const cf=b.confidence/b.n,ac=b.correct/b.n;ece+=b.n/Math.max(1,data.length)*Math.abs(cf-ac);}
  const cls={};for(const k of Object.keys(perClass)){const q=perClass[k];cls[k]={count:q.count,meanCorrectProbability:mean(q.correctProb),meanUncertainty:mean(q.uncertainty),top1Accuracy:q.count?q.predicted/q.count:0};}
  return{
    count:data.length,
    selfPrecision:tp/Math.max(1,tp+fp),
    selfRecall:tp/Math.max(1,tp+fn),
    selfFalsePositiveRate:fp/Math.max(1,data.filter(r=>observerTruthClass(r.observerTruth)!=="self").length),
    multiclassBrier:data.length?brier/data.length:1,
    expectedCalibrationError:ece,
    meanUncertainty:mean(data.map(r=>Number(r.uncertainty)||0)),
    classes:cls
  };
}

export function sameDishAmbiguityRecovery(ambiguousRows=[],resolvedRows=[]){
  const keyOf=r=>`${Number(r.rel?.x)||0},${Number(r.rel?.y)||0},${Number(r.rel?.z)||0}`;
  const ambiguity=mean((ambiguousRows||[]).filter(r=>r.visible!==false).map(r=>Number(r.uncertainty)||0));
  const resolved=mean((resolvedRows||[]).filter(r=>r.visible!==false).map(r=>Number(r.uncertainty)||0));
  const aSelf=mean((ambiguousRows||[]).filter(r=>observerTruthClass(r.observerTruth)==="self").map(r=>Number(r.probability?.self)||0));
  const rSelf=mean((resolvedRows||[]).filter(r=>observerTruthClass(r.observerTruth)==="self").map(r=>Number(r.probability?.self)||0));
  return{ambiguousMeanUncertainty:ambiguity,resolvedMeanUncertainty:resolved,selfProbabilityGain:rSelf-aSelf,uncertaintyDrop:ambiguity-resolved,ambiguousKeys:[...new Set((ambiguousRows||[]).map(keyOf))].length,resolvedKeys:[...new Set((resolvedRows||[]).map(keyOf))].length};
}
