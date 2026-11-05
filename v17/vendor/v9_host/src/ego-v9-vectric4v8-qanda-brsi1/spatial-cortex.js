import {FACE_DEFS} from "./config.js";
import {key,worldDimension} from "./world.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rec(){return{wallA:1,wallB:1,freeA:1,freeB:1,touchWall:0,touchFree:0,echo:0,corticalWeight:0,corticalSamples:0,last:0};}
function probWall(r){return r.wallA/(r.wallA+r.wallB);}
function confidence(r){return clamp(Math.abs(probWall(r)-.5)*2+.08*(r.touchWall+r.touchFree),0,1);}
function mapGet(s,x,y,z=0){const k=key(x,y,z);let r=s.map.get(k);if(!r){r=rec();s.map.set(k,r);}return r;}
export function spatialPriorAt(s,x,y,z=0){
  const r=s?.map?.get(key(x,y,z));return r?{wall:probWall(r),confidence:confidence(r)}:{wall:.5,confidence:0};
}
export function injectLearnedPrior(s,x,y,z,pWall,weight=.25,step=0){
  if(!s)return;const p=clamp(Number(pWall)||.5,.001,.999),certainty=Math.abs(p-.5)*2;if(certainty<.02)return;
  setEvidence(s,x,y,z,p>=.5,Math.max(0,Number(weight)||0)*certainty,"learned-prior",step,1);
}
function setEvidence(s,x,y,z,isWall,weight,source,step,corticalWeight=1){
  const r=mapGet(s,x,y,z),w=Math.max(0,Number(weight)||0)*Math.max(.05,Number(corticalWeight)||1);
  if(isWall){r.wallA+=w;r.freeB+=w;if(source==="touch")r.touchWall++;}else{r.freeA+=w;r.wallB+=w;if(source==="touch")r.touchFree++;}
  if(source==="echo")r.echo+=w;r.corticalWeight+=Math.max(0,Number(corticalWeight)||0);r.corticalSamples++;r.last=step;
}
export function createSpatialCortex(world,config){
  const n=world.cubes.length,poses=Array.from({length:n},()=>null),originUid=0;
  // Only one arbitrary internal origin is given. The rest of the body graph
  // must be reconstructed from local face contacts over time.
  poses[0]={x:0,y:0,z:0};
  return{map:new Map(),poses,predictionErrorEMA:1,uncertainty:1,frontierFraction:1,echoScale:1,echoBias:0,echoSamples:0,updates:0,bodyConstraintErrorEMA:0,effectiveDim:0,originUid,debugAnchor:{x:world.cubes[0].x,y:world.cubes[0].y,z:world.cubes[0].z||0},radius:Math.max(8,Number(config.spatialBeliefRadius)||48),lastSnapshot:null};
}
export function resizeSpatial(s,count){
  while(s.poses.length<count)s.poses.push(null);
  while(s.poses.length>count)s.poses.pop();
}
export function noteActualMotion(s,cell,dx,dy,dz=0){const p=s.poses[cell];if(p){p.x+=dx;p.y+=dy;p.z+=dz;}}
export function updateSpatialFromLocal(s,world,cell,localSenses,step,cortical=null){
  let p=s.poses[cell];
  // Grow the organism's own body schema only from mutually local face contact.
  if(!p){
    for(let i=0;i<localSenses.length;i++){
      const f=FACE_DEFS[i],sense=localSenses[i],j=sense?.neighborId;if(!f||!Number.isInteger(j)||!s.poses[j])continue;
      const q=s.poses[j];p={x:q.x-f.dx,y:q.y-f.dy,z:q.z-f.dz};s.poses[cell]=p;break;
    }
  }
  if(!p)return;let err=0,n=0,bodyErr=0,bodyN=0;
  const coherence=clamp(Number(cortical?.coherence)||0,0,1),conflict=clamp(Number(cortical?.conflict)||0,0,1);
  // Physical touch remains authoritative. Ambiguous no-contact/free inference is
  // weighted by the current swarm consensus so disagreement cannot hard-write the map.
  const consensusWeight=.55+.7*coherence-.25*conflict;
  setEvidence(s,p.x,p.y,p.z,false,2,"touch",step,1);
  for(let i=0;i<localSenses.length;i++){
    const f=FACE_DEFS[i],sense=localSenses[i];if(!f||!sense)continue;if(worldDimension(world)===2&&f.dz)continue;
    if(sense.contact&&Number.isInteger(sense.neighborId)){
      const expected={x:p.x+f.dx,y:p.y+f.dy,z:p.z+f.dz},known=s.poses[sense.neighborId];
      if(!known)s.poses[sense.neighborId]=expected;
      else{bodyErr+=Math.abs(known.x-expected.x)+Math.abs(known.y-expected.y)+Math.abs(known.z-expected.z);bodyN++;}
    }
    const tx=p.x+f.dx,ty=p.y+f.dy,tz=p.z+f.dz,r=mapGet(s,tx,ty,tz),pred=probWall(r),obs=sense.wall?1:0;err+=(pred-obs)*(pred-obs);n++;
    if(sense.wall)setEvidence(s,tx,ty,tz,true,5,"touch",step,1);
    else if(sense.contact)setEvidence(s,tx,ty,tz,false,4,"touch",step,1);
    else setEvidence(s,tx,ty,tz,false,1.2,"local-inference",step,consensusWeight);
  }
  if(n)s.predictionErrorEMA=.97*s.predictionErrorEMA+.03*(err/n);
  if(bodyN)s.bodyConstraintErrorEMA=.97*s.bodyConstraintErrorEMA+.03*(bodyErr/bodyN);
  s.updates++;refreshStats(s);
}
function inferredEchoDistance(s,receiver,echo){
  const f=FACE_DEFS[echo.dir];if(!f)return null;
  const emitter=Number.isInteger(echo.emitter)?echo.emitter:receiver,ep=s.poses[emitter],rp=s.poses[receiver];if(!ep||!rp)return null;
  const observed=Math.max(1,s.echoScale*Number(echo.delay||0)+s.echoBias),limit=Math.max(2,Math.min(s.radius,Math.ceil(observed+6)));
  let bestD=1,bestErr=Infinity;
  for(let d=1;d<=limit;d++){
    const wx=ep.x+f.dx*d,wy=ep.y+f.dy*d,wz=ep.z+f.dz*d;
    const returnLeg=Math.abs(rp.x-wx)+Math.abs(rp.y-wy)+Math.abs(rp.z-wz),predicted=d+returnLeg,err=Math.abs(predicted-observed);
    if(err<bestErr){bestErr=err;bestD=d;}
  }
  return{distance:bestD,error:bestErr,emitterPose:ep,face:f};
}
export function noteEchoEvidence(s,cell,echo,step,cortical=null){
  if(!echo||echo.energy<=1e-5||echo.dir<0)return;const inf=inferredEchoDistance(s,cell,echo);if(!inf)return;
  const {distance:predDist,emitterPose:p,face:f,error}=inf,coherence=clamp(Number(cortical?.coherence)||0,0,1),trust=.35+.65*coherence,w=Math.max(.03,echo.energy*(.2+echo.novelty)/(1+.15*error));
  for(let d=1;d<predDist;d++)setEvidence(s,p.x+f.dx*d,p.y+f.dy*d,p.z+f.dz*d,false,.12*w,"echo",step,trust);
  setEvidence(s,p.x+f.dx*predDist,p.y+f.dy*predDist,p.z+f.dz*predDist,true,.38*w,"echo",step,trust);refreshStats(s);
}
export function calibrateEchoOnTouch(s,cell,echo,step){
  if(!echo||echo.emitter!==cell||!Number.isFinite(echo.delay)||echo.delay<=0)return;
  // A touched wall one face away implies a two-leg path of ~2 internal units.
  const targetPath=2,lr=.008,error=targetPath-(s.echoScale*echo.delay+s.echoBias);
  s.echoScale=clamp(s.echoScale+lr*error*echo.delay/(1+echo.delay*echo.delay),.05,4);
  s.echoBias=clamp(s.echoBias+lr*error,-8,8);s.echoSamples++;
}
function refreshStats(s){
  let u=0,n=0,frontier=0,free=0;for(const[k,r]of s.map){const p=probWall(r),c=confidence(r);u+=4*p*(1-p)*(1-.35*c);n++;if(p<.35){free++;const[x,y,z]=k.split(",").map(Number);for(const f of FACE_DEFS){if(!s.map.has(key(x+f.dx,y+f.dy,z+f.dz))){frontier++;break;}}}}
  s.uncertainty=n?u/n:1;s.frontierFraction=free?frontier/free:1;
}
export function spatialSummary(s){return{uncertainty:clamp(s.uncertainty,0,1),frontier:clamp(s.frontierFraction,0,1),predictionError:clamp(s.predictionErrorEMA,0,1),bodyConstraintError:Math.max(0,s.bodyConstraintErrorEMA||0),known:s.map.size,knownBodyCells:s.poses.filter(Boolean).length,echoScale:s.echoScale,echoSamples:s.echoSamples};}
export function spatialContext(s,cell,maxRay=12){
  const p=s.poses[cell],rays=FACE_DEFS.map(()=>({distance:0,confidence:0}));
  if(!p)return{rays,frontier:{x:0,y:0,z:0},knownBodyFraction:s.poses.length?s.poses.filter(Boolean).length/s.poses.length:0,knownMapLog:Math.tanh(Math.log2(1+s.map.size)/8)};
  for(let fi=0;fi<FACE_DEFS.length;fi++){
    const f=FACE_DEFS[fi];let depth=0,conf=0,count=0;
    for(let d=1;d<=maxRay;d++){
      const r=s.map.get(key(p.x+f.dx*d,p.y+f.dy*d,p.z+f.dz*d));if(!r)break;
      const pw=probWall(r),c=confidence(r);conf+=c;count++;
      if(pw>.65){depth=d;break;}if(pw<.55)depth=d;else break;
    }
    rays[fi]={distance:clamp(depth/maxRay,0,1),confidence:count?clamp(conf/count,0,1):0};
  }
  let best=null,bestD=Infinity;
  for(const[k,r]of s.map){if(probWall(r)>.35)continue;const[x,y,z]=k.split(",").map(Number);let isFrontier=false;for(const f of FACE_DEFS)if(!s.map.has(key(x+f.dx,y+f.dy,z+f.dz))){isFrontier=true;break;}if(!isFrontier)continue;const dx=x-p.x,dy=y-p.y,dz=z-p.z,d=Math.abs(dx)+Math.abs(dy)+Math.abs(dz);if(d<bestD){bestD=d;best={dx,dy,dz};}}
  const scale=Math.max(1,bestD);return{rays,frontier:best?{x:clamp(best.dx/scale,-1,1),y:clamp(best.dy/scale,-1,1),z:clamp(best.dz/scale,-1,1)}:{x:0,y:0,z:0},knownBodyFraction:s.poses.length?s.poses.filter(Boolean).length/s.poses.length:0,knownMapLog:Math.tanh(Math.log2(1+s.map.size)/8)};
}
export function spatialSnapshot(s,maxCells=4096){
  const cells=[];for(const[k,r]of s.map){if(cells.length>=maxCells)break;const[x,y,z]=k.split(",").map(Number);cells.push({x,y,z,wall:probWall(r),confidence:confidence(r),touchWall:r.touchWall,touchFree:r.touchFree,echo:r.echo,corticalTrust:r.corticalSamples?r.corticalWeight/r.corticalSamples:0,last:r.last});}
  return{cells,poses:s.poses.map(p=>p?({...p}):null),summary:spatialSummary(s),debugAnchor:{...s.debugAnchor}};
}
