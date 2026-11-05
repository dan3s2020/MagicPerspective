const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=x=>Number.isFinite(Number(x))?Number(x):0;
export const CORTICAL_AUDIO_BANDS=8;
export const CORTICAL_AUDIO_BASE_HZ=110;

export function corticalAudioFrame(net,maxBands=CORTICAL_AUDIO_BANDS){
  const bands=Math.max(1,Math.floor(Number(maxBands)||CORTICAL_AUDIO_BANDS));
  const re=new Float64Array(bands),im=new Float64Array(bands);
  let cells=0;
  for(const cell of net?.cells||[]){
    if(!cell?.real?.length)continue;cells++;
    for(let i=0;i<cell.real.length;i++){
      const b=i%bands;re[b]+=finite(cell.real[i]);im[b]+=finite(cell.imag?.[i]);
    }
  }
  const amp=new Float32Array(bands),phase=new Float32Array(bands);
  const den=Math.max(1,cells);
  for(let b=0;b<bands;b++){
    const r=re[b]/den,q=im[b]/den;
    amp[b]=clamp(Math.tanh(Math.hypot(r,q)),0,1);
    phase[b]=clamp(Math.atan2(q,r)/Math.PI,-1,1);
  }
  return{version:1,bands,amp,phase};
}

export function audibleFrequencyForBand(band){
  // Observer sonification only: stable band identity, not simulated acoustic Hz.
  const i=Math.max(0,Math.floor(Number(band)||0));
  return CORTICAL_AUDIO_BASE_HZ*Math.pow(2,i/6);
}

export class CorticalAudioMixer{
  constructor(groups=["A","B"]){
    this.groups=new Map(groups.map(g=>[g,{muted:false,volume:.16,owner:null,nodes:null,lastFrame:null}]));
    this.ctx=null;
  }
  state(group){return this.groups.get(group)||null;}
  setMuted(group,muted){const s=this.state(group);if(!s)return;s.muted=Boolean(muted);if(s.muted){this._silence(group);this._destroyNodes(s);s.owner=null;} }
  setVolume(group,value){const s=this.state(group);if(!s)return;s.volume=clamp(Number(value)||0,0,1);}
  async ensureStarted(){
    if(typeof window==="undefined")return false;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    if(!this.ctx)this.ctx=new AC();
    if(this.ctx.state==="suspended")await this.ctx.resume();
    return this.ctx.state==="running";
  }
  _makeNodes(group,bands){
    if(!this.ctx)return null;const s=this.state(group);if(!s)return null;
    const master=this.ctx.createGain();master.gain.value=0;
    let tail=master;
    if(typeof this.ctx.createStereoPanner==="function"){
      const pan=this.ctx.createStereoPanner();pan.pan.value=group==="A"?-.35:.35;master.connect(pan);pan.connect(this.ctx.destination);tail=pan;
    }else master.connect(this.ctx.destination);
    const oscillators=[];
    for(let i=0;i<bands;i++){
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
      osc.type="sine";osc.frequency.value=audibleFrequencyForBand(i);gain.gain.value=0;osc.connect(gain);gain.connect(master);osc.start();
      oscillators.push({osc,gain});
    }
    return{master,tail,oscillators,bands};
  }
  _destroyNodes(s){
    if(!s?.nodes)return;
    for(const q of s.nodes.oscillators){try{q.gain.gain.value=0;q.osc.stop();}catch(_){}}
    try{s.nodes.master.disconnect();}catch(_){}
    s.nodes=null;
  }
  _silence(group){
    const s=this.state(group);if(!s?.nodes||!this.ctx)return;
    const t=this.ctx.currentTime;try{s.nodes.master.gain.cancelScheduledValues(t);s.nodes.master.gain.setTargetAtTime(0,t,.015);}catch(_){s.nodes.master.gain.value=0;}
  }
  stopGroup(group){const s=this.state(group);if(!s)return;this._silence(group);this._destroyNodes(s);s.owner=null;s.lastFrame=null;}
  stopAll(){for(const g of this.groups.keys())this.stopGroup(g);}
  update(group,owner,frame){
    const s=this.state(group);if(!s)return false;
    if(!frame||s.muted||!this.ctx||this.ctx.state!=="running"){this._silence(group);s.lastFrame=frame||null;return false;}
    const bands=Math.max(1,Math.min(CORTICAL_AUDIO_BANDS,Math.floor(Number(frame.bands)||frame.amp?.length||0)));
    if(s.owner!==owner){this._destroyNodes(s);s.owner=owner;}
    if(!s.nodes||s.nodes.bands!==bands){this._destroyNodes(s);s.nodes=this._makeNodes(group,bands);}
    if(!s.nodes)return false;
    const t=this.ctx.currentTime;s.nodes.master.gain.cancelScheduledValues(t);s.nodes.master.gain.setTargetAtTime(s.volume,t,.02);
    for(let i=0;i<bands;i++){
      const q=s.nodes.oscillators[i],a=clamp(finite(frame.amp?.[i]),0,1),p=clamp(finite(frame.phase?.[i]),-1,1);
      q.osc.frequency.setTargetAtTime(audibleFrequencyForBand(i),t,.01);
      q.osc.detune.setTargetAtTime(p*12,t,.01);
      q.gain.gain.setTargetAtTime(a/bands,t,.02);
    }
    s.lastFrame=frame;return true;
  }
  snapshot(){
    return Object.fromEntries([...this.groups.entries()].map(([g,s])=>[g,{muted:s.muted,volume:s.volume,owner:s.owner,audible:Boolean(this.ctx&&this.ctx.state==="running"&&!s.muted&&s.nodes)}]));
  }
}
