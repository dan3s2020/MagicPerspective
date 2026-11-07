// Read-only analysis of actual native V17 devour log.jsonl (one graph, no trainer interaction).
export const METRICS=Object.freeze(["aligned","live","field","together","C","masked"]);
export function buildGraph0History(records,graphId=0){
  const output=[];
  for(const r of records){
    if(Number(r?.w)!==graphId||!r.test||!Number.isFinite(Number(r.chars)))continue;
    const values={};
    for(const key of METRICS){
      const v=Number(r.test[key]);
      if(r.test[key]!=null&&Number.isFinite(v)&&v>=0&&v<=1)values[key]=v;
    }
    if(!Object.keys(values).length)continue;
    const chars=Number(r.chars);
    if(output.length&&chars<output[output.length-1].chars)output.length=0; // latest reset segment
    const sample={at:r.time||null,chars,exercises:Number(r.exercises)||0,values};
    if(output.length&&chars===output[output.length-1].chars)output[output.length-1]=sample;
    else output.push(sample);
  }
  return output;
}
export function summarizeLearningCurve(history,{windowPoints=12,minPoints=5,minSpanChars=500000,plateauThresholdPPperMillion=0.5}={}){
 const samples=history.slice(-Math.max(2,windowPoints));
 const x=samples.map(s=>s.chars/1e6);
 const spanChars=samples.length?samples.at(-1).chars-samples[0].chars:0;
 const adequate=samples.length>=minPoints&&spanChars>=minSpanChars;
 const series={};
 for(const key of METRICS){
   const points=samples.filter(s=>Number.isFinite(s.values[key]));
   const first=history.find(s=>Number.isFinite(s.values[key]));
   const last=history.findLast(s=>Number.isFinite(s.values[key]));
   if(!last)continue;
   let slope=null;
   if(points.length>=2){
     const xx=points.map(s=>s.chars/1e6),yy=points.map(s=>100*s.values[key]);
     const mx=xx.reduce((a,b)=>a+b,0)/xx.length,my=yy.reduce((a,b)=>a+b,0)/yy.length;
     const den=xx.reduce((a,b)=>a+(b-mx)**2,0);
     if(den>0)slope=xx.reduce((a,v,i)=>a+(v-mx)*(yy[i]-my),0)/den;
   }
   const isPlateau=adequate&&points.length>=minPoints&&
     points.at(-1).chars-points[0].chars>=minSpanChars&&slope!=null?
     Math.abs(slope)<plateauThresholdPPperMillion:null;
   series[key]={
     initialPercent:first.values[key]*100,
     latestPercent:last.values[key]*100,
     gainAcrossAvailableHistoryPP:(last.values[key]-first.values[key])*100,
     lastWindowSlopePPperMillion:slope,
     plateauCandidate:isPlateau,
     windowPoints:points.length,
     windowSpanChars:points.length?points.at(-1).chars-points[0].chars:0
   };
 }
 return {
   graphId:0,count:history.length,
   firstChars:history[0]?.chars??null,lastChars:history.at(-1)?.chars??null,
   lastExercises:history.at(-1)?.exercises??null,
   minPoints,minSpanChars,windowPoints,
   enoughDataForPlateauDecision:adequate,
   note:"Plateau means |slope|<0.5 percentage point per million characters over at least 500k characters and 5 points; not proof of an architectural cause.",
   metrics:series
 };
}
