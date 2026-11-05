const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;

function nearestHistory(history,step){
  if(!Array.isArray(history)||!history.length)return null;
  let best=history[0],bd=Math.abs(finite(best.step)-finite(step));
  for(const h of history){const d=Math.abs(finite(h.step)-finite(step));if(d<bd){best=h;bd=d;}}
  return best;
}
function spectrumFor(cortical,{mode="common",cell=0,coalition=0,step=null}={}){
  if(!cortical)return{amplitude:[],phase:[],label:"none"};
  if(mode==="cell"){
    const c=cortical.cells?.[Math.max(0,Math.min((cortical.cells?.length||1)-1,Math.floor(finite(cell))))];
    const h=Number.isFinite(Number(step))?nearestHistory(c?.history,step):null;
    return{amplitude:h?.amplitude||c?.spectrum?.amplitude||[],phase:h?.phase||c?.spectrum?.phase||[],label:"cell "+(c?.cell??cell)};
  }
  if(mode==="sum")return{amplitude:cortical.sum?.amplitude||[],phase:cortical.sum?.phase||[],label:"sum"};
  if(mode==="phase-intersection")return{amplitude:cortical.phaseIntersection?.amplitude||[],phase:cortical.phaseIntersection?.phase||[],label:"phase intersection"};
  if(mode==="coalition"){
    const q=cortical.coalitions?.[Math.max(0,Math.min((cortical.coalitions?.length||1)-1,Math.floor(finite(coalition))))];
    if(q?.indices?.length){
      const rows=q.indices.map(i=>cortical.cells?.[i]).filter(Boolean),bands=cortical.bands||32,amplitude=new Array(bands).fill(0),phase=new Array(bands).fill(0);
      for(let b=0;b<bands;b++){let r=0,im=0;for(const c of rows){const a=finite(c.spectrum?.amplitude?.[b]),p=finite(c.spectrum?.phase?.[b]);r+=a*Math.cos(p);im+=a*Math.sin(p);}amplitude[b]=Math.hypot(r,im)/Math.max(1,rows.length);phase[b]=Math.atan2(im,r);}
      return{amplitude,phase,label:"coalition "+coalition+" ["+q.indices.join(",")+"]"};
    }
  }
  const h=Number.isFinite(Number(step))?nearestHistory(cortical.history,step):null;
  return{amplitude:h?.amplitude||cortical.common?.amplitude||[],phase:h?.phase||cortical.common?.phase||[],label:"common"};
}
function strongest(amplitude,limit=8){
  return Array.from({length:amplitude?.length||0},(_,i)=>i).sort((a,b)=>finite(amplitude[b])-finite(amplitude[a])).slice(0,limit);
}

export function audioMixGroups(mode="AB"){
  const m=String(mode||"AB").toUpperCase();return m==="A"?["A"]:(m==="B"?["B"]:["A","B"]);
}
function semanticMicroframeAt(preview,frameIndex,currentStep){
  for(let i=frameIndex;i>=0;i--){
    const events=preview.frames[i]?.corticalAudioEvents||[];
    for(let j=events.length-1;j>=0;j--){
      const audio=events[j]?.audio,frames=audio?.microframes,lifetime=Math.max(1,Math.floor(finite(audio?.sequenceLifetime,0)));
      if(!Array.isArray(frames)||!frames.length||!(lifetime>0))continue;
      const start=finite(events[j]?.step??audio?.step,NaN),age=currentStep-start;
      if(age<0)continue;
      if(age>lifetime)continue;
      const idx=Math.min(frames.length-1,Math.max(0,Math.floor((age/lifetime)*frames.length)));
      return{...frames[idx],step:start,emitter:audio.emitter??events[j]?.emitter??null,event:true,sequenceFrame:idx,sequenceFrames:frames.length,sequenceLifetime:lifetime,semantic:audio.semantic||null};
    }
  }
  return null;
}
export function replayAudioFrame(preview,elapsedSeconds=0){
  if(!preview?.frames?.length)return{frameIndex:-1,audio:null,step:null};
  const fps=Math.max(.1,finite(preview.fps,30)),frameIndex=Math.min(preview.frames.length-1,Math.max(0,Math.floor(Math.max(0,finite(elapsedSeconds))*fps))),frame=preview.frames[frameIndex],step=frame?.globalStep??frame?.corticalAudio?.step??null;
  const semantic=Number.isFinite(Number(step))?semanticMicroframeAt(preview,frameIndex,Number(step)):null,audio=semantic||(frame?.corticalAudio||null);
  return{frameIndex,audio,step};
}

export class CorticalAudioObserver{
  constructor({maxVoices=8,pan=0}={}){
    this.maxVoices=Math.max(1,Math.min(16,Math.floor(finite(maxVoices,8))));
    this.pan=clamp(finite(pan),-1,1);this.ctx=null;this.master=null;this.panner=null;this.voices=[];this.enabled=false;this.muted=true;this.volume=.12;this.last={label:"none",bands:[]};
  }
  async enable(){
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return false;
    if(!this.ctx){this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;if(this.ctx.createStereoPanner){this.panner=this.ctx.createStereoPanner();this.panner.pan.value=this.pan;this.master.connect(this.panner);this.panner.connect(this.ctx.destination);}else this.master.connect(this.ctx.destination);}
    if(this.ctx.state==="suspended")await this.ctx.resume();
    this.enabled=true;this._ensureVoices();this._applyMaster();return true;
  }
  _ensureVoices(){
    if(!this.ctx||!this.master)return;
    while(this.voices.length<this.maxVoices){
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type="sine";gain.gain.value=0;osc.connect(gain);gain.connect(this.master);osc.start();this.voices.push({osc,gain});
    }
  }
  _applyMaster(){
    if(!this.master||!this.ctx)return;const g=this.muted?0:clamp(this.volume,0,1);this.master.gain.setTargetAtTime(g,this.ctx.currentTime,.025);
  }
  setMuted(v){this.muted=Boolean(v);this._applyMaster();}
  setVolume(v){this.volume=clamp(finite(v,.12),0,1);this._applyMaster();}
  setPan(v){this.pan=clamp(finite(v),-1,1);if(this.panner&&this.ctx)this.panner.pan.setTargetAtTime(this.pan,this.ctx.currentTime,.01);}
  silence(reason="inactive"){
    if(this.ctx)for(const v of this.voices)v.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.015);
    this.last={label:"none",bands:[],reason};return this.last;
  }
  update(cortical,options={}){
    const spec=spectrumFor(cortical,options),ids=strongest(spec.amplitude,this.maxVoices),rows=ids.map(b=>({band:b,amplitude:finite(spec.amplitude[b]),phase:finite(spec.phase?.[b])}));
    return this.updateFrame({step:options.step??null,bands:rows},{label:spec.label,playbackRate:options.playbackRate});
  }
  updateFrame(frame,options={}){
    const rows=Array.isArray(frame?.bands)?frame.bands.slice(0,this.maxVoices):[],bands=[],rate=Math.max(.01,finite(options.playbackRate,1)),tau=clamp(.018/rate,.002,.06);
    this.last={label:options.label||"replay common",bands,step:frame?.step??options.step??null,source:"replay-frame"};
    if(!this.ctx||!this.enabled)return this.last;this._ensureVoices();const now=this.ctx.currentTime;
    for(let vi=0;vi<this.voices.length;vi++){
      const v=this.voices[vi],row=rows[vi];
      if(!row){v.gain.gain.setTargetAtTime(0,now,tau);continue;}
      const band=Math.max(0,Math.floor(finite(row.band))),amp=clamp(Math.tanh(Math.max(0,finite(row.amplitude))),0,1),phase=finite(row.phase),freq=82.4069*Math.pow(2,band/8),g=.18*amp;
      v.osc.frequency.setTargetAtTime(freq,now,tau);v.osc.detune?.setTargetAtTime?.(phase*24,now,tau);v.gain.gain.setTargetAtTime(g,now,tau);bands.push({band,frequency:freq,amplitude:amp,phase});
    }
    return this.last;
  }
  stop(){
    for(const v of this.voices){try{v.osc.stop();}catch{}try{v.osc.disconnect();v.gain.disconnect();}catch{}}
    this.voices=[];if(this.ctx){try{this.ctx.close();}catch{}}this.ctx=null;this.master=null;this.panner=null;this.enabled=false;
  }
}

export function corticalAudioFrame(cortical,options={}){return spectrumFor(cortical,options);}
