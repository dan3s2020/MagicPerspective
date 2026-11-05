import {NET} from "./config.js";
import {forwardHigher} from "./higher-self.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function ownershipWeightedHigherPool(states,ownership=[]){
  const n=NET.selfHidden,mean=new Float64Array(n),max=new Float64Array(n);let wsum=0;
  const rows=[];
  for(let i=0;i<(states||[]).length;i++){
    const s=states[i];if(!s)continue;
    const w=clamp(Number(ownership[i])||0,0,1);rows.push({s,w});wsum+=w;
    for(let j=0;j<n;j++)mean[j]+=w*(Number(s[j])||0);
  }
  if(wsum>1e-9)for(let j=0;j<n;j++)mean[j]/=wsum;
  // Preserve HigherSelf's mean+max input shape without admitting a hidden-membership max shortcut.
  // A candidate with ownership 0 collapses to the learned weighted mean and cannot inject an extreme.
  max.set(mean);
  for(const {s,w} of rows){
    if(w<=0)continue;
    for(let j=0;j<n;j++){
      const candidate=mean[j]+w*((Number(s[j])||0)-mean[j]);
      if(candidate>max[j])max[j]=candidate;
    }
  }
  const pool=new Float64Array(n*2);pool.set(mean,0);pool.set(max,n);
  return{pool,mean,max,totalOwnership:wsum,candidateCount:rows.length};
}

export function forwardOwnershipWeightedHigherShadow(higherModel,hPrev,states,ownership=[]){
  const pooled=ownershipWeightedHigherPool(states,ownership),forward=forwardHigher(higherModel,pooled.pool,hPrev);
  return{...pooled,hidden:forward.hidden,context:forward.context,prediction:forward.prediction,cache:forward.cache,mode:"shadow"};
}
