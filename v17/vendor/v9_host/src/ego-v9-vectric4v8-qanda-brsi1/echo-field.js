import {dirsForWorld,isSolid,worldDimension} from "./world.js";

const TAU=Math.PI*2;
function pushRing(a,v,cap){a.push(v);if(a.length>cap)a.splice(0,a.length-cap);}
function rayDirs(world){
  if(worldDimension(world)===3)return dirsForWorld(world).map(([dx,dy,dz],i)=>({dx,dy,dz,dir:i}));
  return [
    {dx:1,dy:0,dz:0,dir:0},{dx:-1,dy:0,dz:0,dir:1},
    {dx:0,dy:1,dz:0,dir:2},{dx:0,dy:-1,dz:0,dir:3}
  ];
}
function emptyLast(){return{energy:0,novelty:0,phase:0,delay:0,timeOfFlight:0,attenuation:0,reflectionCount:0,dir:-1,emitter:-1,spectrum:{amplitude:[],phase:[]},harmonics:[]};}
export function createEchoField(cellCount,config={}){
  const harmonics=Math.max(1,Math.min(8,Math.floor(Number(config.echoHarmonics)||4))),historyCap=Math.max(8,Math.floor(Number(config.echoHistoryLength)||64));
  return{version:2,queues:Array.from({length:cellCount},()=>[]),last:Array.from({length:cellCount},emptyLast),history:Array.from({length:cellCount},()=>[]),harmonics,historyCap,spectrumBands:16,pulses:0,returns:0};
}
export function resizeEchoField(e,count){
  while(e.queues.length<count){e.queues.push([]);e.last.push(emptyLast());e.history.push([]);}
  while(e.queues.length>count){e.queues.pop();e.last.pop();e.history.pop();}
}
export function emitEcho(world,echo,emitter,step,corticalCell=null){
  const p=world.cubes[emitter];if(!p)return;const dirs=rayDirs(world),H=Math.max(1,echo.harmonics||4),B=Math.max(8,echo.spectrumBands||16),CB=Math.max(0,Math.floor(Number(corticalCell?.real?.length)||0));
  // CorticalSound shapes the whole emitted pulse, not only whichever sampled
  // source band happens to map onto a particular ray/harmonic. A sparse but
  // active CorticalSound state must therefore modulate every emitted pulse,
  // while the selected source band still contributes its own amplitude/phase.
  let corticalGlobalAmp=0;
  if(CB){
    let q=0;
    for(let b=0;b<CB;b++){const r=Number(corticalCell.real[b])||0,i=Number(corticalCell.imag[b])||0;q+=r*r+i*i;}
    corticalGlobalAmp=Math.tanh(Math.sqrt(q/CB));
  }
  for(const d of dirs){
    let x=p.x,y=p.y,z=p.z||0,outLeg=0,hit=null;
    for(let k=1;k<96;k++){
      x+=d.dx;y+=d.dy;z+=d.dz;outLeg+=Math.max(1,Math.abs(d.dx)+Math.abs(d.dy)+Math.abs(d.dz));
      if(isSolid(world,x,y,z)){hit={x,y,z};break;}
    }
    if(!hit)continue;
    for(let r=0;r<world.cubes.length;r++){
      const q=world.cubes[r],returnLeg=Math.abs(q.x-hit.x)+Math.abs(q.y-hit.y)+Math.abs((q.z||0)-hit.z),timeOfFlight=Math.max(1,outLeg+returnLeg),baseAttenuation=1/Math.sqrt(1+timeOfFlight);
      for(let h=1;h<=H;h++){
        const band=(d.dir*3+h*5+emitter)%B,cb=CB?band%CB:0,cr=CB?(Number(corticalCell.real[cb])||0):0,ci=CB?(Number(corticalCell.imag[cb])||0):0,corticalBandAmp=CB?Math.tanh(Math.hypot(cr,ci)):1,corticalPhase=CB?Math.atan2(ci,cr):0;
        // The active sonar waveform is not a separate hand-coded language:
        // it is shaped by the cell's current CorticalSound state. Global pulse
        // energy guarantees sparse active spectra still modulate every ray,
        // while the mapped source band preserves frequency-selective structure.
        const sourceGain=CB?(.2+.4*corticalGlobalAmp+.4*Math.max(0,corticalBandAmp)):1,attenuation=baseAttenuation*sourceGain/Math.pow(h,1.15),phase=(corticalPhase+timeOfFlight*.37*h+d.dir*.71+emitter*.11)%TAU;
        echo.queues[r].push({at:step+timeOfFlight,emitter,dir:d.dir,band,harmonic:h,sourceCorticalBand:cb,sourceGain,amp:attenuation,attenuation,phase,delay:timeOfFlight,timeOfFlight,reflectionCount:1});
      }
    }
  }
  echo.pulses++;
}
export function consumeEcho(e,cell,step){
  const q=e.queues[cell]||[],ready=[];let w=0;
  for(const ev of q){if(ev.at<=step)ready.push(ev);else q[w++]=ev;}q.length=w;
  if(!ready.length){
    const last=e.last[cell]||emptyLast();last.energy*=.92;last.novelty*=.9;last.attenuation*=.95;e.last[cell]=last;return last;
  }
  const B=Math.max(8,e.spectrumBands||16),sr=new Float64Array(B),si=new Float64Array(B),harmonicEnergy=new Map();let er=0,ei=0,energy=0,best=ready[0];
  for(const ev of ready){
    const rr=ev.amp*Math.cos(ev.phase),ii=ev.amp*Math.sin(ev.phase);er+=rr;ei+=ii;energy+=ev.amp;sr[ev.band%B]+=rr;si[ev.band%B]+=ii;
    harmonicEnergy.set(ev.harmonic,(harmonicEnergy.get(ev.harmonic)||0)+ev.amp);
    if(ev.amp>best.amp)best=ev;
  }
  const amplitude=new Float64Array(B),phase=new Float64Array(B);for(let b=0;b<B;b++){amplitude[b]=Math.hypot(sr[b],si[b]);phase[b]=Math.atan2(si[b],sr[b]);}
  const observedEnergy=Math.tanh(energy/Math.max(1,ready.length)),prev=e.last[cell]?.energy||0,last={energy:observedEnergy,novelty:Math.tanh(Math.abs(observedEnergy-prev)),phase:Math.atan2(ei,er)/Math.PI,delay:best.delay,timeOfFlight:best.timeOfFlight,attenuation:best.attenuation,reflectionCount:Math.max(...ready.map(x=>x.reflectionCount||1)),dir:best.dir,emitter:best.emitter,spectrum:{amplitude:Array.from(amplitude),phase:Array.from(phase)},harmonics:[...harmonicEnergy.entries()].map(([harmonic,energy])=>({harmonic,energy})).sort((a,b)=>a.harmonic-b.harmonic)};
  e.last[cell]=last;e.returns+=ready.length;pushRing(e.history[cell],{step,...structuredClone(last)},e.historyCap||64);return last;
}
export function echoSnapshot(e){
  return{version:e.version||2,pulses:e.pulses,returns:e.returns,harmonics:e.harmonics,last:e.last.map(x=>structuredClone(x)),history:e.history.map(h=>h.slice(-12).map(x=>structuredClone(x)))};
}
