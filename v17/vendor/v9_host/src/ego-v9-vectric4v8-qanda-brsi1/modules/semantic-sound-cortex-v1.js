export const SEMANTIC_SOUND_CAPABILITY="semantic-sound";
export const SEMANTIC_SOUND_V1_ID="semantic-sound-cortex-v1";
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const tanh=Math.tanh;
function rng32(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function randn(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);}
function dense(outN,inN,r,scale=Math.sqrt(1/Math.max(1,inN))){const W=new Float64Array(outN*inN),b=new Float64Array(outN);for(let i=0;i<W.length;i++)W[i]=randn(r)*scale;return{outN,inN,W,b};}
function zerosDense(p){return{outN:p.outN,inN:p.inN,W:new Float64Array(p.W.length),b:new Float64Array(p.b.length)};}
function addDense(a,b,s=1){for(let i=0;i<a.W.length;i++)a.W[i]+=s*b.W[i];for(let i=0;i<a.b.length;i++)a.b[i]+=s*b.b[i];}
function scaleDense(a,s){for(let i=0;i<a.W.length;i++)a.W[i]*=s;for(let i=0;i<a.b.length;i++)a.b[i]*=s;}
function forward(p,x,activation=true){const y=new Float64Array(p.outN),pre=new Float64Array(p.outN);for(let o=0;o<p.outN;o++){let z=p.b[o],q=o*p.inN;for(let i=0;i<p.inN;i++)z+=p.W[q+i]*(x[i]||0);pre[o]=z;y[o]=activation?tanh(z):z;}return{x,y,pre};}
function normalize(v){let q=0;for(const x of v)q+=x*x;const n=Math.sqrt(q);if(n>1e-12)for(let i=0;i<v.length;i++)v[i]/=n;return v;}
function normalizationBackward(raw,z,dz){
  let q=0;for(const x of raw)q+=x*x;const n=Math.sqrt(q),out=new Float64Array(raw.length);if(n<=1e-12)return out;
  let dot=0;for(let i=0;i<z.length;i++)dot+=(z[i]||0)*(dz[i]||0);
  for(let i=0;i<out.length;i++)out[i]=((dz[i]||0)-(z[i]||0)*dot)/n;return out;
}
function cosine(a,b){let d=0,aa=0,bb=0,n=Math.min(a.length,b.length);for(let i=0;i<n;i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return aa&&bb?d/Math.sqrt(aa*bb):0;}
function features(real,imag,bands){const x=new Float64Array(bands*2);for(let b=0;b<bands;b++){x[b*2]=tanh(Number(real?.[b])||0);x[b*2+1]=tanh(Number(imag?.[b])||0);}return x;}
function semanticVector(model,latent,context=[]){const out=new Float64Array(model.semanticN);for(let i=0;i<out.length;i++){const a=latent[i%latent.length]||0,c=Number(context[i%Math.max(1,context.length)])||0;out[i]=tanh(.75*a+.25*c);}return normalize(out);}
function edgeKey(a,b){return a+"→"+b;}
function pairKey(a,b){return a<b?a+"~"+b:b+"~"+a;}

export function createSemanticSoundCortexV1(seed=1,config={}){
  const bands=Math.max(8,Math.floor(Number(config.corticalBands)||32)),latentN=Math.max(8,Math.floor(Number(config.semanticSoundLatentN)||16)),semanticN=Math.max(latentN,Math.floor(Number(config.semanticSoundSemanticN)||32)),microFrames=Math.max(2,Math.floor(Number(config.semanticSoundMicroFrames)||8)),hiddenN=Math.max(1,Math.floor(Number(config.semanticSoundHiddenN)||48)),higherN=Math.max(0,Math.floor(Number(config.semanticSoundHigherN)||24)),r=rng32(seed);
  const featureN=bands*2,vocalInN=hiddenN+higherN+semanticN+latentN+latentN;
  return{kind:SEMANTIC_SOUND_V1_ID,version:1,stateVersion:1,bands,featureN,latentN,semanticN,microFrames,hiddenN,higherN,
    encoder:dense(latentN,featureN,r,.12),decoder:dense(featureN,latentN,r,.12),vocal:dense(latentN,vocalInN,r,.08),
    nodes:[],temporalEdges:{},cooccurrenceEdges:{},compositions:[],trainStep:0,
    stats:{encoded:0,decoded:0,heard:0,signals:0,nodesCreated:0,compositionsCreated:0,codecLossEMA:0,vocalUpdates:0},
    config:{maxNodes:Math.max(16,Math.floor(Number(config.semanticSoundMaxNodes)||256)),vocalExploration:clamp(Number.isFinite(Number(config.semanticSoundVocalExploration))?Number(config.semanticSoundVocalExploration):.12,0,.75),eventCap:Math.max(16,Math.floor(Number(config.semanticSoundEventCapPerEpisode)||256)),imitationWindow:Math.max(1,Math.floor(Number(config.semanticSoundImitationWindowDecisions)||32)),consequenceWindow:Math.max(0,Math.floor(Number.isFinite(Number(config.semanticSoundConsequenceWindowDecisions))?Number(config.semanticSoundConsequenceWindowDecisions):2)),matchThreshold:clamp(Number(config.semanticSoundMatchThreshold)||.82,-1,1),nodeRate:clamp(Number(config.semanticSoundNodeRate)||.08,.001,.5),edgeRate:clamp(Number(config.semanticSoundEdgeRate)||.12,.001,.8)}
  };
}
export function semanticSoundParameterCount(m){return m.encoder.W.length+m.encoder.b.length+m.decoder.W.length+m.decoder.b.length+m.vocal.W.length+m.vocal.b.length;}
export function zeroSemanticSoundGrad(m){return{encoder:zerosDense(m.encoder),decoder:zerosDense(m.decoder),vocal:zerosDense(m.vocal),codecUnits:0,vocalUnits:0,codecLoss:0};}
export function addSemanticSoundGrad(a,b,s=1){addDense(a.encoder,b.encoder,s);addDense(a.decoder,b.decoder,s);addDense(a.vocal,b.vocal,s);a.codecUnits+=(b.codecUnits||0)*s;a.vocalUnits+=(b.vocalUnits||0)*s;a.codecLoss+=(b.codecLoss||0)*s;return a;}
export function scaleSemanticSoundGrad(g,s){scaleDense(g.encoder,s);scaleDense(g.decoder,s);scaleDense(g.vocal,s);g.codecUnits*=s;g.vocalUnits*=s;g.codecLoss*=s;return g;}

export function encodeSemanticSound(m,real,imag){
  const x=features(real,imag,m.bands),f=forward(m.encoder,x,true),z=normalize(Float64Array.from(f.y));m.stats.encoded++;return{x,z,cache:f};
}
export function decodeSemanticSound(m,z){
  const f=forward(m.decoder,z,true),frames=[];
  for(let t=0;t<m.microFrames;t++){const real=new Float64Array(m.bands),imag=new Float64Array(m.bands),p=TAU*t/m.microFrames;
    for(let b=0;b<m.bands;b++){const r=f.y[b*2]||0,i=f.y[b*2+1]||0,amp=Math.hypot(r,i),base=Math.atan2(i,r),mod=.22*Math.sin(p+(z[(b+t)%z.length]||0)*Math.PI),env=.72+.28*(.5+.5*Math.cos(p+(z[(b*3+t)%z.length]||0)));real[b]=amp*env*Math.cos(base+mod);imag[b]=amp*env*Math.sin(base+mod);}
    frames.push({real,imag});
  }
  m.stats.decoded++;return{frames,baseFeatures:f.y,cache:f};
}
export function semanticCodecGradient(m,real,imag){
  const enc=encodeSemanticSound(m,real,imag),dec=forward(m.decoder,enc.z,true),g=zeroSemanticSoundGrad(m),dy=new Float64Array(m.featureN);let loss=0;
  for(let j=0;j<m.featureN;j++){const e=dec.y[j]-enc.x[j];loss+=e*e/m.featureN;dy[j]=2*e/m.featureN*(1-dec.y[j]*dec.y[j]);}
  const dz=new Float64Array(m.latentN);
  for(let o=0;o<m.featureN;o++){const d=dy[o],row=o*m.latentN;g.decoder.b[o]+=d;for(let i=0;i<m.latentN;i++){g.decoder.W[row+i]+=d*enc.z[i];dz[i]+=m.decoder.W[row+i]*d;}}
  const dRaw=normalizationBackward(enc.cache.y,enc.z,dz);
  for(let o=0;o<m.latentN;o++){const y=enc.cache.y[o],d=dRaw[o]*(1-y*y),row=o*m.featureN;g.encoder.b[o]+=d;for(let i=0;i<m.featureN;i++)g.encoder.W[row+i]+=d*enc.x[i];}
  g.codecUnits=1;g.codecLoss=loss;return{grad:g,loss,latent:enc.z};
}
export function semanticContextForLatent(m,latent,topK=4){
  const ranked=m.nodes.map(n=>({node:n,score:cosine(latent,n.acoustic)})).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,topK)),ctx=new Float64Array(m.semanticN);let den=0;
  for(const q of ranked){const w=Math.max(0,q.score)*(.5+.5*Math.max(-1,Math.min(1,q.node.rewardEMA||0)));if(w<=0)continue;den+=w;for(let i=0;i<ctx.length;i++)ctx[i]+=w*(q.node.semantic[i]||0);}
  if(den)for(let i=0;i<ctx.length;i++)ctx[i]/=den;
  return{context:normalize(ctx),matches:ranked.map(q=>({id:q.node.id,score:q.score,rewardEMA:q.node.rewardEMA}))};
}
export function vocalSemanticLatent(m,hidden=[],higher=[],semantic=[],heard=[],composition=[]){
  const x=new Float64Array(m.vocal.inN),parts=[hidden,higher,semantic,heard,composition];let k=0;for(const p of parts)for(let i=0;i<p.length&&k<x.length;i++,k++)x[k]=Number(p[i])||0;
  const f=forward(m.vocal,x,true),z=normalize(Float64Array.from(f.y));return{x,z,cache:f};
}
export function semanticVocalPolicyGradient(m,{hidden=[],higher=[],semantic=[],heard=[],composition=[],sampledLatent=[],advantage=0}={}){
  const q=vocalSemanticLatent(m,hidden,higher,semantic,heard,composition),g=zeroSemanticSoundGrad(m),a=tanh(Number(advantage)||0),dy=new Float64Array(m.latentN);
  if(Math.abs(a)<1e-9||!sampledLatent?.length)return{grad:g,latent:q.z};
  for(let o=0;o<m.latentN;o++)dy[o]=-a*((Number(sampledLatent[o])||0)-q.z[o]);
  const dRaw=normalizationBackward(q.cache.y,q.z,dy);
  for(let o=0;o<m.latentN;o++){const raw=q.cache.y[o],d=dRaw[o]*(1-raw*raw),row=o*m.vocal.inN;g.vocal.b[o]+=d;for(let i=0;i<m.vocal.inN;i++)g.vocal.W[row+i]+=d*q.x[i];}
  g.vocalUnits=1;return{grad:g,latent:q.z};
}
export function bindSemanticLatents(a,b){
  const n=Math.min(a.length,b.length),out=new Float64Array(n);
  for(let i=0;i<n;i+=2){const ar=a[i]||0,ai=a[i+1]||0,br=b[i]||0,bi=b[i+1]||0;out[i]=ar*br-ai*bi;if(i+1<n)out[i+1]=ar*bi+ai*br;}return normalize(out);
}
function createNode(m,latent,context,step){
  let id=m.nodes.length?Math.max(...m.nodes.map(n=>n.id))+1:0;
  if(m.nodes.length>=m.config.maxNodes){let worst=0,score=Infinity;for(let i=0;i<m.nodes.length;i++){const n=m.nodes[i],s=(n.usage||0)+5*Math.max(0,n.rewardEMA||0)-.0001*(step-(n.lastStep||0));if(s<score){score=s;worst=i;}}id=m.nodes[worst].id;m.nodes.splice(worst,1);}
  const n={id,acoustic:Array.from(normalize(Float64Array.from(latent))),semantic:Array.from(semanticVector(m,latent,context)),usage:1,rewardEMA:0,lastStep:step,createdStep:step};m.nodes.push(n);m.stats.nodesCreated++;return n;
}
function matchNode(m,latent){let best=null,score=-Infinity;for(const n of m.nodes){const s=cosine(latent,n.acoustic);if(s>score){score=s;best=n;}}return{node:best,score};}
function touchNode(m,latent,context,step){
  const q=matchNode(m,latent);if(!q.node||q.score<m.config.matchThreshold)return createNode(m,latent,context,step);
  const n=q.node,lr=m.config.nodeRate;n.usage++;n.lastStep=step;for(let i=0;i<n.acoustic.length;i++)n.acoustic[i]=(1-lr)*n.acoustic[i]+lr*(latent[i]||0);normalize(n.acoustic);const sv=semanticVector(m,latent,context);for(let i=0;i<n.semantic.length;i++)n.semantic[i]=(1-lr)*n.semantic[i]+lr*sv[i];normalize(n.semantic);return n;
}
function edgeBump(table,key,reward,rate){const q=table[key]||{count:0,weight:0,rewardEMA:0};q.count++;q.weight=clamp(q.weight+rate*(1-q.weight),0,1);q.rewardEMA=.96*q.rewardEMA+.04*(Number(reward)||0);table[key]=q;return q;}
export function createSemanticSoundLearningTracker(){return{lastByChannel:new Map(),prevByChannel:new Map()};}
export function learnSemanticSoundEvents(m,events=[],tracker=null){
  const t=tracker||createSemanticSoundLearningTracker(),lastByChannel=t.lastByChannel,prevByChannel=t.prevByChannel;let learned=0;
  for(const ev of events){const step=Number(ev.step)||0,channel=String(ev.envId??0)+":"+String(ev.channel??ev.ego??0);
    if(ev.type==="HEAR"||ev.type==="SELF_HEAR"||ev.type==="SIGNAL"){
      const latent=Array.from(ev.latent||[]);if(!latent.length)continue;const node=touchNode(m,latent,ev.context||[],step),prevRec=lastByChannel.get(channel),prev=prevRec?.id;
      if(prev!=null&&prev!==node.id){edgeBump(m.temporalEdges,edgeKey(prev,node.id),ev.reward,m.config.edgeRate);edgeBump(m.cooccurrenceEdges,pairKey(prev,node.id),ev.reward,m.config.edgeRate*.5);prevByChannel.set(channel,prevRec);}
      lastByChannel.set(channel,{id:node.id,step});ev.nodeId=node.id;learned++;
    }else if(ev.type==="OUTCOME"){
      const rec=lastByChannel.get(channel);if(!rec||step-rec.step>m.config.consequenceWindow)continue;const id=rec.id,n=m.nodes.find(x=>x.id===id);if(!n)continue;const r=Number(ev.reward)||0;n.rewardEMA=.94*n.rewardEMA+.06*tanh(r);const sv=semanticVector(m,n.acoustic,ev.context||[]),lr=m.config.nodeRate;for(let i=0;i<n.semantic.length;i++)n.semantic[i]=(1-lr)*n.semantic[i]+lr*sv[i];normalize(n.semantic);const prevRec=prevByChannel.get(channel),prev=prevRec?.id;
      if(prev!=null&&prev!==id&&r>0){const key=pairKey(prev,id),edge=m.cooccurrenceEdges[key];if((edge?.count||0)>=2&&!m.compositions.some(c=>c.a===prev&&c.b===id||c.a===id&&c.b===prev)){const a=m.nodes.find(x=>x.id===prev);if(a){m.compositions.push({id:m.compositions.length,a:prev,b:id,latent:Array.from(bindSemanticLatents(a.acoustic,n.acoustic)),rewardEMA:tanh(r),createdStep:step});m.stats.compositionsCreated++;}}}
    }
  }
  return{learned,nodes:m.nodes.length,temporalEdges:Object.keys(m.temporalEdges).length,cooccurrenceEdges:Object.keys(m.cooccurrenceEdges).length,compositions:m.compositions.length};
}
export function applySemanticSoundGrad(m,g,{codecLearningRate=.0005,vocalLearningRate=.0003,maxNorm=2}={}){
  const apply=(p,gg,lr)=>{let q=0;for(const x of gg.W)q+=x*x;for(const x of gg.b)q+=x*x;const n=Math.sqrt(q),s=n>maxNorm?maxNorm/Math.max(1e-12,n):1;for(let i=0;i<p.W.length;i++)p.W[i]-=lr*s*gg.W[i];for(let i=0;i<p.b.length;i++)p.b[i]-=lr*s*gg.b[i];return n*s;};
  const e=apply(m.encoder,g.encoder,codecLearningRate),d=apply(m.decoder,g.decoder,codecLearningRate),v=apply(m.vocal,g.vocal,vocalLearningRate);m.trainStep++;
  if(g.codecUnits){m.stats.codecLossEMA=.97*m.stats.codecLossEMA+.03*(g.codecLoss/Math.max(1e-9,g.codecUnits));}
  if(g.vocalUnits)m.stats.vocalUpdates+=g.vocalUnits;return{encoderNorm:e,decoderNorm:d,vocalNorm:v};
}
export function semanticSoundComputeEstimate(m){return{encoderMacs:m.encoder.W.length,decoderMacs:m.decoder.W.length,vocalMacs:m.vocal.W.length,nodeSimilarityMacs:m.nodes.length*m.latentN,signalMicroframeOps:m.microFrames*m.bands*12};}
export function semanticSoundSnapshot(m){
  const top=[...m.nodes].sort((a,b)=>(b.usage+4*Math.max(0,b.rewardEMA))-(a.usage+4*Math.max(0,a.rewardEMA))).slice(0,12).map(n=>({id:n.id,usage:n.usage,rewardEMA:n.rewardEMA,lastStep:n.lastStep}));
  return{kind:m.kind,version:m.version,bands:m.bands,latentN:m.latentN,semanticN:m.semanticN,microFrames:m.microFrames,parameterCount:semanticSoundParameterCount(m),nodes:m.nodes.length,temporalEdges:Object.keys(m.temporalEdges).length,cooccurrenceEdges:Object.keys(m.cooccurrenceEdges).length,compositions:m.compositions.length,trainStep:m.trainStep,stats:{...m.stats},computeEstimate:semanticSoundComputeEstimate(m),top};
}
export const semanticSoundCortexV1Definition=Object.freeze({id:SEMANTIC_SOUND_V1_ID,capability:SEMANTIC_SOUND_CAPABILITY,version:"1.0.0",compatibility:{hostVersions:["v9-vectric4v8-qanda-brsi1"]}});
