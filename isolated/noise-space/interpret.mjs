// Explain observed outcomes with explicit thresholds, not the appearance of a graph.
const pct=x=>Number.isFinite(x)?+(x*100).toFixed(1):null;
export function labelEvent(kind,report={}){
 if(kind==='text'){
  const a=report.heldoutAccuracy,b=report.heldoutPersistence,n=report.n||0;
  if(!Number.isFinite(a)||!Number.isFinite(b))return {status:'NO_TEST',title:'Held-out text not evaluated',why:'The brain must predict previously unseen bytes before an accuracy claim can be made.'};
  if(n<80)return {status:'LOW_SAMPLE',title:'Not enough held-out bytes',why:'Fewer than 80 held-out predictions; uncertainty is high.'};
  const d=a-b;
  return d>.025?{status:'BETTER',title:'Better than persistence',why:'Frozen accuracy '+pct(a)+'% exceeds repeat-last-byte '+pct(b)+'% by '+pct(d)+' percentage points.'}:
   d<-.025?{status:'WORSE',title:'Worse than persistence',why:'Frozen accuracy '+pct(a)+'% is below repeat-last-byte '+pct(b)+'% by '+pct(-d)+' percentage points.'}:
   {status:'INCONCLUSIVE',title:'Comparable with persistence',why:'The difference is below 2.5 percentage points; advantage not established.'};
 }
 if(kind==='maze'){
  if(report.solved){
   const ratio=report.optimal>0?report.steps/report.optimal:null;
   return ratio!==null&&ratio<=1.3?{status:'BETTER',title:'Goal reached efficiently',why:'Reached target in '+report.steps+' actions versus oracle shortest path '+report.optimal+'.'}:
   {status:'MIXED',title:'Solved with extra actions',why:'Goal reached in '+report.steps+' actions; oracle path length is '+report.optimal+'. Exploration or wrong moves increased cost.'};
  }
  return {status:'WORSE',title:'Goal not reached',why:'Episode ended after '+report.steps+' actions without reaching its target.'};
 }
 if(kind==='transform'){
  const bad=report.failed||0,checks=report.predicted||0;
  if(report.solved)return {status:'BETTER',title:'Desired state reached',why:'Goal reached in '+report.steps+' actions; '+bad+' of '+checks+' pre-action board predictions disagreed with reality.'};
  if(report.said==='limitation')return {status:'LIMITATION',title:'Organism reported a limitation',why:'Current learned rules did not yield a plan. This does not certify that the task is impossible.'};
  return {status:'WORSE',title:'Desired state not reached',why:'Goal not reached after '+report.steps+' actions; '+bad+' of '+checks+' board predictions disagreed.'};
 }
 if(kind==='geometry'){
  const s=report.assessment;
  if(s==='INSUFFICIENT_EVIDENCE')return {status:'LOW_SAMPLE',title:'Not enough withheld transitions',why:'At least 20 held-out transitions are required to judge the new geometry.'};
  if(s==='BETTER')return {status:'BETTER',title:'Lifted predictor beats persistence',why:'Withheld RMSE is at least 5% lower than predicting the next state equals the current state.'};
  if(s==='WORSE')return {status:'WORSE',title:'Lifted predictor loses to persistence',why:'Withheld RMSE is at least 5% higher than the persistence baseline.'};
  return {status:'INCONCLUSIVE',title:'Advantage not established',why:'Difference from the persistence baseline is below the predefined 5% threshold.'};
 }
 return {status:'INCONCLUSIVE',title:'No result available',why:'There is not yet a measured external outcome.'};
}
