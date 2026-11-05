const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const phaseOf=(r,i)=>Math.atan2(i,r);
const ampOf=(r,i)=>Math.hypot(r,i);
function pushRing(a,v,cap){a.push(v);if(a.length>cap)a.splice(0,a.length-cap);}
function circularDiff(a,b){let d=Math.abs(a-b)%TAU;return d>Math.PI?TAU-d:d;}
function mkCell(bands,historyCap){
  return{real:new Float64Array(bands),imag:new Float64Array(bands),amp:new Float64Array(bands),plastic:new Float64Array(bands),phase:0,boost:0,primeStep:null,need:0,have:0,lastEmitStep:null,emissions:0,sequence:null,sequenceStartStep:null,sequenceLifetime:null,sequenceFrame:-1,history:[],historyCap};
}
function spectrum(real,imag){
  const amplitude=new Float64Array(real.length),phase=new Float64Array(real.length);
  for(let i=0;i<real.length;i++){amplitude[i]=ampOf(real[i],imag[i]);phase[i]=phaseOf(real[i],imag[i]);}
  return{amplitude,phase};
}
function selectedCells(net,indices=null){
  if(!indices)return net.cells.map((c,i)=>({c,i}));
  const out=[];for(const i of indices){const k=Math.floor(Number(i));if(k>=0&&k<net.cells.length)out.push({c:net.cells[k],i:k});}return out;
}
function aggregate(net,indices,mode="sum"){
  const rows=selectedCells(net,indices),r=new Float64Array(net.bands),im=new Float64Array(net.bands),abs=new Float64Array(net.bands);
  for(const {c} of rows)for(let b=0;b<net.bands;b++){r[b]+=c.real[b];im[b]+=c.imag[b];abs[b]+=Math.abs(c.amp[b]);}
  if(mode==="mean"&&rows.length)for(let b=0;b<net.bands;b++){r[b]/=rows.length;im[b]/=rows.length;abs[b]/=rows.length;}
  const sp=spectrum(r,im),coherence=new Float64Array(net.bands);
  for(let b=0;b<net.bands;b++)coherence[b]=clamp(sp.amplitude[b]/Math.max(1e-9,abs[b]),0,1);
  return{indices:rows.map(x=>x.i),real:r,imag:im,abs,coherence,...sp};
}
function dominant(real,imag,limit=8){
  return[...Array(real.length).keys()].sort((a,b)=>ampOf(real[b],imag[b])-ampOf(real[a],imag[a])).slice(0,limit).map(b=>({band:b,amplitude:ampOf(real[b],imag[b]),phase:phaseOf(real[b],imag[b])}));
}
function harmonicView(real,imag,baseBand,maxH=6){
  const out=[],base=baseBand+1;
  for(let h=1;h<=maxH;h++){const idx=base*h-1;if(idx>=real.length)break;out.push({harmonic:h,band:idx,amplitude:ampOf(real[idx],imag[idx]),phase:phaseOf(real[idx],imag[idx])});}
  return out;
}

function historyStateAt(cell,step){
  let out=null;for(const h of cell?.history||[]){if(Number(h.step)>Number(step))break;out=h;}return out;
}
function coalitionHistory(net,indices){
  const ids=(indices||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<net.cells.length),steps=[...new Set(ids.flatMap(i=>(net.cells[i]?.history||[]).map(h=>Number(h.step)||0)))].sort((a,b)=>a-b).slice(-(net.historyCap||96)),rows=[];
  for(const step of steps){
    const real=new Float64Array(net.bands),imag=new Float64Array(net.bands),states=[];
    for(const i of ids){const h=historyStateAt(net.cells[i],step);if(!h)continue;states.push({i,h});for(let b=0;b<net.bands;b++){real[b]+=Number(h.real?.[b])||0;imag[b]+=Number(h.imag?.[b])||0;}}
    if(states.length)for(let b=0;b<net.bands;b++){real[b]/=states.length;imag[b]/=states.length;}
    const sp=spectrum(real,imag),keys=states.map(({h})=>{let band=0,best=-1;for(let b=0;b<net.bands;b++){const a=Number(h.amplitude?.[b])||0;if(a>best){best=a;band=b;}}const ph=Number(h.phase?.[band])||0,bins=8,pb=((Math.floor(((ph+Math.PI)/TAU)*bins)%bins)+bins)%bins;return band+":"+pb;});
    const coherentMembership=keys.length===ids.length&&new Set(keys).size===1;
    rows.push({step,amplitude:Array.from(sp.amplitude),phase:Array.from(sp.phase),members:ids.slice(),coherentMembership,groupKey:coherentMembership?keys[0]:null});
  }
  return rows;
}

export function createCorticalSound(cellCount,config={}){
  const bands=Math.max(8,Math.min(64,Math.floor(Number(config.corticalBands)||32))),historyCap=Math.max(8,Math.floor(Number(config.corticalHistoryLength)||96)),cellHistoryCap=Math.max(4,Math.floor(Number(config.corticalCellHistoryLength)||24));
  return{version:2,bands,cells:Array.from({length:cellCount},()=>mkCell(bands,cellHistoryCap)),fieldR:new Float64Array(bands),fieldI:new Float64Array(bands),fieldAbs:new Float64Array(bands),updates:0,plasticity:Number(config.corticalPlasticity)||.015,lastCoherence:0,lastConflict:0,history:[],historyCap,cellHistoryCap,phaseTolerance:Math.max(.01,Number(config.corticalPhaseTolerance)||.35),events:[]};
}
export function resizeCorticalSound(net,count){
  while(net.cells.length<count)net.cells.push(mkCell(net.bands,net.cellHistoryCap||24));
  while(net.cells.length>count)net.cells.pop();
  rebuildField(net);
}
export function rebuildField(net){
  net.fieldR.fill(0);net.fieldI.fill(0);net.fieldAbs.fill(0);
  for(const c of net.cells)for(let b=0;b<net.bands;b++){net.fieldR[b]+=c.real[b];net.fieldI[b]+=c.imag[b];net.fieldAbs[b]+=Math.abs(c.amp[b]);}
  updateGlobalStats(net,false);
}
function setCellSpectrum(net,c,real,imag){
  const oldR=Float64Array.from(c.real),oldI=Float64Array.from(c.imag),oldA=Float64Array.from(c.amp);
  for(let b=0;b<net.bands;b++){
    const r=Number(real?.[b])||0,i=Number(imag?.[b])||0,a=Math.hypot(r,i);c.real[b]=r;c.imag[b]=i;c.amp[b]=a;
    net.fieldR[b]+=r-oldR[b];net.fieldI[b]+=i-oldI[b];net.fieldAbs[b]=Math.max(0,net.fieldAbs[b]+Math.abs(a)-Math.abs(oldA[b]));
  }
}
function hiddenSignal(hidden,b){
  if(!hidden?.length)return 0;
  const i=(b*7+3)%hidden.length,j=(b*13+5)%hidden.length,k=(b*17+11)%hidden.length;
  return Math.tanh(.55*hidden[i]-.30*hidden[j]+.20*hidden[k]);
}
export function emitCortical(net,cellIndex,hidden,{uncertainty=0,progress=0,conflict=0,boost=0,bandBias=null,step=null}={}){
  const c=net.cells[cellIndex];if(!c)return;
  const emittedAt=Number.isFinite(Number(step))?Number(step):net.updates;c.lastEmitStep=emittedAt;c.emissions=(c.emissions||0)+1;c.sequence=null;c.sequenceStartStep=null;c.sequenceLifetime=null;c.sequenceFrame=-1;
  const oldR=Float64Array.from(c.real),oldI=Float64Array.from(c.imag),oldA=Float64Array.from(c.amp);
  c.phase=(c.phase+.031+.19*Math.tanh(progress-conflict))%TAU;c.need=clamp(uncertainty+conflict,0,1);c.have=clamp(Math.abs(progress)+(1-uncertainty)*.4,0,1);c.boost=Math.max(c.boost*.8,boost);
  for(let b=0;b<net.bands;b++){
    const latent=hiddenSignal(hidden,b)+(bandBias&&b<bandBias.length?(Number(bandBias[b])||0):0),needBias=c.need*(b>=net.bands/2?1:.35),haveBias=c.have*(b<net.bands/2?1:.35);
    const amp=Math.tanh(Math.abs(latent)+.45*needBias+.35*haveBias)*(1+.6*c.boost)*clamp(1+c.plastic[b],.15,2.5);
    const phase=c.phase+Math.PI*(c.need-c.have)*(1+(b%5)*.07)+(latent<0?Math.PI:0);
    c.real[b]=amp*Math.cos(phase);c.imag[b]=amp*Math.sin(phase);c.amp[b]=amp;
    net.fieldR[b]+=c.real[b]-oldR[b];net.fieldI[b]+=c.imag[b]-oldI[b];net.fieldAbs[b]=Math.max(0,net.fieldAbs[b]+Math.abs(amp)-Math.abs(oldA[b]));
  }
  const cellSpec=spectrum(c.real,c.imag);
  pushRing(c.history,{step:step??net.updates,real:Float32Array.from(c.real),imag:Float32Array.from(c.imag),amplitude:Float32Array.from(cellSpec.amplitude),phase:Float32Array.from(cellSpec.phase),need:c.need,have:c.have},c.historyCap||net.cellHistoryCap||24);
  net.updates++;updateGlobalStats(net,true,step);
}
export function emitCorticalSequence(net,cellIndex,frames,{step=null,lifetimeDecisions=1}={}){
  const c=net.cells[cellIndex];if(!c||!Array.isArray(frames)||!frames.length)return false;
  const seq=frames.map(f=>({real:Float64Array.from(f?.real||[]),imag:Float64Array.from(f?.imag||[])}));
  const emittedAt=Number.isFinite(Number(step))?Number(step):net.updates,lifetime=Math.max(1,Math.floor(Number(lifetimeDecisions)||1));
  c.lastEmitStep=emittedAt;c.emissions=(c.emissions||0)+1;c.sequence=seq;c.sequenceStartStep=emittedAt;c.sequenceLifetime=lifetime;c.sequenceFrame=0;
  setCellSpectrum(net,c,seq[0].real,seq[0].imag);
  const sp=spectrum(c.real,c.imag);pushRing(c.history,{step:emittedAt,real:Float32Array.from(c.real),imag:Float32Array.from(c.imag),amplitude:Float32Array.from(sp.amplitude),phase:Float32Array.from(sp.phase),need:c.need,have:c.have,sequenceFrame:0},c.historyCap||net.cellHistoryCap||24);
  net.updates++;updateGlobalStats(net,true,emittedAt);return true;
}
export function advanceCorticalSound(net,currentStep,lifetimeDecisions=1){
  if(!net)return{changed:false,activeEmitters:0};
  const step=Number(currentStep)||0,ttl=Math.max(1,Math.floor(Number(lifetimeDecisions)||1));let changed=false,activeEmitters=0;
  for(const c of net.cells){
    const last=c.lastEmitStep==null?NaN:Number(c.lastEmitStep),prime=c.primeStep==null?NaN:Number(c.primeStep);
    if(Number.isFinite(prime)&&step-prime>ttl){c.boost=0;c.primeStep=null;}
    const localTtl=Math.max(1,Math.floor(Number(c.sequenceLifetime)||ttl));
    if(Number.isFinite(last)&&step-last<=localTtl){
      activeEmitters++;
      if(c.sequence?.length){
        const age=Math.max(0,step-Number(c.sequenceStartStep??last)),den=Math.max(1,localTtl),idx=Math.min(c.sequence.length-1,Math.floor((age/den)*c.sequence.length));
        if(idx!==c.sequenceFrame){c.sequenceFrame=idx;setCellSpectrum(net,c,c.sequence[idx].real,c.sequence[idx].imag);changed=true;}
      }
      continue;
    }
    let nonzero=false;
    for(let b=0;b<net.bands;b++)if(Math.abs(c.real[b])>1e-12||Math.abs(c.imag[b])>1e-12||Math.abs(c.amp[b])>1e-12){nonzero=true;break;}
    if(nonzero){c.real.fill(0);c.imag.fill(0);c.amp.fill(0);c.lastEmitStep=null;c.sequence=null;c.sequenceStartStep=null;c.sequenceLifetime=null;c.sequenceFrame=-1;changed=true;}
  }
  if(changed){rebuildField(net);updateGlobalStats(net,true,step);}
  return{changed,activeEmitters};
}
export function hearCorticalRaw(net,cellIndex){
  const c=net?.cells?.[cellIndex],real=new Float64Array(net?.bands||0),imag=new Float64Array(net?.bands||0),ownReal=new Float64Array(net?.bands||0),ownImag=new Float64Array(net?.bands||0);let energy=0,ownEnergy=0;
  if(!net||!c)return{real,imag,ownReal,ownImag,energy:0,ownEnergy:0};
  for(let b=0;b<net.bands;b++){real[b]=net.fieldR[b]-c.real[b];imag[b]=net.fieldI[b]-c.imag[b];ownReal[b]=c.real[b];ownImag[b]=c.imag[b];energy+=Math.hypot(real[b],imag[b]);ownEnergy+=Math.hypot(ownReal[b],ownImag[b]);}
  return{real,imag,ownReal,ownImag,energy:energy/Math.max(1,net.bands),ownEnergy:ownEnergy/Math.max(1,net.bands)};
}
export function hearCortical(net,cellIndex){
  const c=net.cells[cellIndex];if(!c)return{coherence:0,conflict:0,energy:0,phase:0,need:0,have:0,dominantBand:-1,spectrumAmplitude:Array(8).fill(0),spectrumPhase:Array(8).fill(0)};
  let sumMag=0,sumAbs=0,pr=0,pi=0,bestBand=-1,bestAmp=-1;const br=new Float64Array(8),bi=new Float64Array(8),ba=new Float64Array(8);
  for(let b=0;b<net.bands;b++){
    const r=net.fieldR[b]-c.real[b],i=net.fieldI[b]-c.imag[b],m=Math.hypot(r,i),bin=Math.min(7,Math.floor(b*8/Math.max(1,net.bands)));sumMag+=m;sumAbs+=Math.max(1e-9,net.fieldAbs[b]-Math.abs(c.amp[b]));pr+=r;pi+=i;br[bin]+=r;bi[bin]+=i;ba[bin]+=m;if(m>bestAmp){bestAmp=m;bestBand=b;}
  }
  const energy=sumMag/net.bands,silent=sumMag<=1e-10,coherence=silent?0:clamp(sumMag/Math.max(1e-9,sumAbs),0,1),conflict=silent?0:1-coherence,spectrumAmplitude=new Array(8),spectrumPhase=new Array(8);
  for(let k=0;k<8;k++){spectrumAmplitude[k]=Math.tanh(ba[k]/Math.max(1,net.bands/8));spectrumPhase[k]=silent?0:Math.atan2(bi[k],br[k])/Math.PI;}
  return{coherence,conflict,energy:Math.tanh(energy),phase:silent?0:Math.atan2(pi,pr)/Math.PI,need:c.need,have:c.have,dominantBand:silent?-1:bestBand,spectrumAmplitude,spectrumPhase};
}
export function reinforceCortical(net,cellIndex,reward){
  const c=net.cells[cellIndex];if(!c)return;const lr=net.plasticity*Math.tanh(reward);
  for(let b=0;b<net.bands;b++){
    const or=net.fieldR[b]-c.real[b],oi=net.fieldI[b]-c.imag[b],om=Math.hypot(or,oi),cm=Math.hypot(c.real[b],c.imag[b]);
    if(om<1e-9||cm<1e-9)continue;
    const coh=(or*c.real[b]+oi*c.imag[b])/(om*cm);
    c.plastic[b]=clamp(c.plastic[b]+lr*coh,-.45,.45);
  }
}
export function updateGlobalStats(net,record=true,step=null){
  let num=0,den=0,rawAbs=0;for(let b=0;b<net.bands;b++){const a=Math.max(0,Number(net.fieldAbs[b])||0);num+=Math.hypot(net.fieldR[b],net.fieldI[b]);den+=Math.max(1e-9,a);rawAbs+=a;}
  const silent=rawAbs<=1e-10;net.lastCoherence=silent?0:clamp(num/Math.max(1e-9,den),0,1);net.lastConflict=silent?0:1-net.lastCoherence;
  if(record){
    const sp=spectrum(net.fieldR,net.fieldI);
    pushRing(net.history,{step:step??net.updates,real:Float32Array.from(net.fieldR),imag:Float32Array.from(net.fieldI),amplitude:Float32Array.from(sp.amplitude),phase:Float32Array.from(sp.phase),coherence:net.lastCoherence,conflict:net.lastConflict},net.historyCap||96);
  }
}
export function boostSignal(net,cellIndex,amount=1,step=null){const c=net.cells[cellIndex];if(c){c.boost=clamp(c.boost+amount,0,2);c.primeStep=Number.isFinite(Number(step))?Number(step):net.updates;}}

export function corticalOperation(net,operation,options={}){
  const op=String(operation||"COMMON").toUpperCase().replaceAll(" ","_").replaceAll("-","_");
  if(op==="SPLIT"){
    const rows=selectedCells(net,options.indices),bins=Math.max(2,Math.floor(Number(options.phaseBins)||8)),groups=new Map();
    for(const {c,i} of rows){
      let band=0,best=-1;for(let b=0;b<net.bands;b++){const a=ampOf(c.real[b],c.imag[b]);if(a>best){best=a;band=b;}}
      const ph=phaseOf(c.real[band],c.imag[band]),pb=((Math.floor(((ph+Math.PI)/TAU)*bins)%bins)+bins)%bins,key=band+":"+pb;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
    }
    return{operation:"SPLIT",groups:[...groups.entries()].map(([key,indices])=>({key,indices}))};
  }
  if(op==="A_B_DIFFERENCE"||op==="DIFFERENCE"){
    const a=aggregate(net,options.a||[], "mean"),b=aggregate(net,options.b||[],"mean"),r=new Float64Array(net.bands),im=new Float64Array(net.bands);
    for(let k=0;k<net.bands;k++){r[k]=a.real[k]-b.real[k];im[k]=a.imag[k]-b.imag[k];}
    const sp=spectrum(r,im);return{operation:"A-B DIFFERENCE",real:r,imag:im,...sp,dominant:dominant(r,im)};
  }
  if(op==="PHASE_COHERENT_INTERSECTION"||op==="PHASE_COHERENT"){
    const rows=selectedCells(net,options.indices),r=new Float64Array(net.bands),im=new Float64Array(net.bands),coherence=new Float64Array(net.bands),tol=Math.max(.01,Number(options.phaseTolerance)||net.phaseTolerance||.35);
    for(let band=0;band<net.bands;band++){
      if(!rows.length)continue;let sr=0,si=0,minAmp=Infinity,totalAmp=0;
      for(const {c} of rows){const a=ampOf(c.real[band],c.imag[band]),ph=phaseOf(c.real[band],c.imag[band]);sr+=Math.cos(ph)*a;si+=Math.sin(ph)*a;minAmp=Math.min(minAmp,a);totalAmp+=a;}
      const meanPh=Math.atan2(si,sr),coh=clamp(Math.hypot(sr,si)/Math.max(1e-9,totalAmp),0,1);coherence[band]=coh;
      let maxDiff=0;for(const {c} of rows)maxDiff=Math.max(maxDiff,circularDiff(phaseOf(c.real[band],c.imag[band]),meanPh));
      const a=maxDiff<=tol?minAmp*coh:0;r[band]=a*Math.cos(meanPh);im[band]=a*Math.sin(meanPh);
    }
    const sp=spectrum(r,im);return{operation:"PHASE-COHERENT INTERSECTION",real:r,imag:im,coherence,...sp,dominant:dominant(r,im)};
  }
  const mode=op==="SUM"?"sum":"mean",agg=aggregate(net,options.indices,mode);
  if(op==="COMMON"){
    for(let b=0;b<net.bands;b++){agg.real[b]*=agg.coherence[b];agg.imag[b]*=agg.coherence[b];}
    Object.assign(agg,spectrum(agg.real,agg.imag));
  }
  return{operation:op==="SUM"?"SUM":op==="MEAN"?"MEAN":"COMMON",...agg,dominant:dominant(agg.real,agg.imag)};
}


function complexAudioRows(real,imag,limit=8){
  const sp=spectrum(real||[],imag||[]),count=Math.max(1,Math.min(16,Math.floor(Number(limit)||8))),ids=Array.from({length:sp.amplitude.length},(_,i)=>i)
    .filter(i=>(Number(sp.amplitude[i])||0)>1e-8)
    .sort((a,b)=>(Number(sp.amplitude[b])||0)-(Number(sp.amplitude[a])||0))
    .slice(0,count);
  return ids.map(b=>({band:b,amplitude:Number(sp.amplitude[b])||0,phase:Number(sp.phase[b])||0}));
}
export function corticalSequenceAudioSnapshots(net,cellIndex,limit=8){
  const idx=Math.max(0,Math.min((net?.cells?.length||1)-1,Math.floor(Number(cellIndex)||0))),c=net?.cells?.[idx];
  if(!c?.sequence?.length)return[];
  return c.sequence.map((frame,sequenceFrame)=>({version:1,step:c.lastEmitStep,emitter:idx,event:true,sequenceFrame,bands:complexAudioRows(frame.real,frame.imag,limit)}));
}
export function corticalEmitterAudioSnapshot(net,cellIndex,limit=8){
  const c=net?.cells?.[Math.max(0,Math.min((net?.cells?.length||1)-1,Math.floor(Number(cellIndex)||0)))];
  if(!c)return{version:1,step:null,emitter:null,bands:[],event:false};
  const sp=spectrum(c.real,c.imag),count=Math.max(1,Math.min(16,Math.floor(Number(limit)||8))),ids=Array.from({length:sp.amplitude.length},(_,i)=>i)
    .filter(i=>(Number(sp.amplitude[i])||0)>1e-8)
    .sort((a,b)=>(Number(sp.amplitude[b])||0)-(Number(sp.amplitude[a])||0))
    .slice(0,count);
  return{version:1,step:c.lastEmitStep,emitter:Math.floor(Number(cellIndex)||0),event:ids.length>0,bands:ids.map(b=>({band:b,amplitude:Number(sp.amplitude[b])||0,phase:Number(sp.phase[b])||0}))};
}

export function corticalAudioSnapshot(net,limit=8){
  if(!net)return{version:1,step:null,coherence:0,conflict:0,bands:[]};
  const common=corticalOperation(net,"COMMON"),count=Math.max(1,Math.min(16,Math.floor(Number(limit)||8)));
  const ids=Array.from({length:net.bands||0},(_,i)=>i)
    .filter(i=>(Number(common.amplitude?.[i])||0)>1e-8)
    .sort((a,b)=>(Number(common.amplitude?.[b])||0)-(Number(common.amplitude?.[a])||0))
    .slice(0,count);
  return{version:1,step:net.history?.at?.(-1)?.step??null,coherence:Number(net.lastCoherence)||0,conflict:Number(net.lastConflict)||0,
    bands:ids.map(b=>({band:b,amplitude:Number(common.amplitude?.[b])||0,phase:Number(common.phase?.[b])||0}))};
}

export function corticalSnapshot(net,limit=8){
  const sum=aggregate(net,null,"sum"),common=corticalOperation(net,"COMMON"),phaseIntersection=corticalOperation(net,"PHASE_COHERENT_INTERSECTION"),split=corticalOperation(net,"SPLIT");
  const dom=dominant(net.fieldR,net.fieldI,limit),base=dom[0]?.band??0;
  const cells=net.cells.map((c,i)=>{
    const sp=spectrum(c.real,c.imag),d=dominant(c.real,c.imag,3);
    return{cell:i,need:c.need,have:c.have,lastEmitStep:c.lastEmitStep,emissions:c.emissions||0,dominant:d,spectrum:{amplitude:Array.from(sp.amplitude),phase:Array.from(sp.phase)},history:c.history.slice(-(c.historyCap||24)).map(h=>({step:h.step,real:Array.from(h.real),imag:Array.from(h.imag),amplitude:Array.from(h.amplitude),phase:Array.from(h.phase),need:h.need,have:h.have}))};
  });
  const coalitions=split.groups.filter(x=>x.indices.length>=2).slice(0,24).map((x,i)=>({...x,index:i,history:coalitionHistory(net,x.indices)}));
  return{version:3,bands:net.bands,coherence:net.lastCoherence,conflict:net.lastConflict,dominant:dom,harmonics:harmonicView(net.fieldR,net.fieldI,base),sum:{amplitude:Array.from(sum.amplitude),phase:Array.from(sum.phase)},common:{amplitude:Array.from(common.amplitude),phase:Array.from(common.phase),coherence:Array.from(common.coherence)},phaseIntersection:{amplitude:Array.from(phaseIntersection.amplitude),phase:Array.from(phaseIntersection.phase),coherence:Array.from(phaseIntersection.coherence)},coalitions,cells,history:net.history.slice(-(net.historyCap||96)).map(h=>({step:h.step,amplitude:Array.from(h.amplitude),phase:Array.from(h.phase),coherence:h.coherence,conflict:h.conflict}))};
}
