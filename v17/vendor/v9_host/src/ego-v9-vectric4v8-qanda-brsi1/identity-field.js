import {IDENTITY_TRACK_COUNT} from "./config.js";
import {key,worldDimension} from "./world.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sq=x=>x*x;
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function shuffled(a,seed){
  const out=a.slice();let s=mix32(seed>>>0);
  for(let i=out.length-1;i>0;i--){s=mix32(s+i);const j=s%(i+1),t=out[i];out[i]=out[j];out[j]=t;}
  return out;
}
function clonePositions(cubes){return(cubes||[]).map(c=>({x:Number(c.x)||0,y:Number(c.y)||0,z:Number(c.z)||0}));}
function frameAt(preview,step){
  const frames=preview?.frames||[];if(!frames.length)return null;
  let best=frames[0];
  for(const f of frames){if((Number(f.globalStep)||0)>step)break;best=f;}
  return best;
}
function positionsFromFrame(frame){
  if(!frame?.positions)return[];
  const dim=Number(frame.physicalDimensions)===3?3:2,n=Math.max(0,Math.floor(Number(frame.cellCount)||0)),out=[];
  for(let i=0;i<n;i++){const q=i*dim;out.push({x:Number(frame.positions[q])||0,y:Number(frame.positions[q+1])||0,z:dim===3?(Number(frame.positions[q+2])||0):0});}
  return out;
}
function trackPositions(field,world,slot,step,selfOverride=null){
  const d=field.slots[slot];if(!d)return[];
  if(d.source==="self")return selfOverride?clonePositions(selfOverride):clonePositions(world.cubes);
  return positionsFromFrame(frameAt(d.preview,step));
}
function centroid(pts){
  if(!pts.length)return{x:0,y:0,z:0};
  let x=0,y=0,z=0;for(const p of pts){x+=p.x;y+=p.y;z+=p.z||0;}
  return{x:x/pts.length,y:y/pts.length,z:z/pts.length};
}
function shapeStats(pts,dim){
  if(!pts.length)return{compactness:0,degree:0};
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  const occ=new Set(pts.map(p=>key(p.x,p.y,p.z||0)));
  for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);minZ=Math.min(minZ,p.z||0);maxZ=Math.max(maxZ,p.z||0);}
  const volume=Math.max(1,(maxX-minX+1)*(maxY-minY+1)*(dim===3?(maxZ-minZ+1):1));
  const dirs=dim===3?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
  let deg=0;for(const p of pts)for(const d of dirs)if(occ.has(key(p.x+d[0],p.y+d[1],(p.z||0)+d[2])))deg++;
  return{compactness:clamp(pts.length/volume,0,1),degree:clamp(deg/Math.max(1,pts.length*dirs.length),0,1)};
}
function entropy01(ps){
  let h=0;for(const p0 of ps){const p=clamp(p0,1e-12,1);h-=p*Math.log(p);}return ps.length>1?h/Math.log(ps.length):0;
}
function mapRec(field,x,y,z){
  const k=key(x,y,z);let r=field.map.get(k);
  if(!r){r={slots:new Float64Array(field.trackCount),last:0};field.map.set(k,r);}
  return r;
}
function posterior(field){
  const raw=field.predictedAgency.map((v,i)=>field.slots[i]?Math.exp(clamp(v,0,1)*3):0),sum=raw.reduce((a,b)=>a+b,0);
  if(sum<=0)return raw.map(()=>0);
  return raw.map(x=>x/sum);
}

export function createIdentityField(world,config,group,counterparts=[],seed=1){
  const enabled=config?.identityEnabled!==false&&Array.isArray(counterparts)&&counterparts.length>0,trackCount=IDENTITY_TRACK_COUNT;
  const tracks=[
    {source:"self",observerTruth:"SELF",speciesKey:String(group||"?"),preview:null},
    ...counterparts.slice(0,Math.max(0,trackCount-1)).map(x=>({source:"preview",observerTruth:String(x.observerTruth||"ANONYMOUS_OTHER"),speciesKey:String(x.speciesKey||"?"),preview:x.preview||x}))
  ];
  while(tracks.length<trackCount)tracks.push(null);
  const slots=enabled?shuffled(tracks,mix32((seed>>>0)^0x1d3a71f5)):Array(trackCount).fill(null);
  return{
    version:1,enabled,trackCount,visualRadius:Math.max(2,Number(config?.identityVisualRadius)||16),slots,
    predictedAgency:Array(trackCount).fill(.5),observedCausalMatch:Array(trackCount).fill(.5),
    lastPerception:Array(trackCount).fill(null),map:new Map(),updates:0,lastPredictionStep:-1,lastOutcomeStep:-1
  };
}

export function prepareIdentityPerception(field,world,egoId,step,spatial){
  const empty={active:false,slots:Array.from({length:IDENTITY_TRACK_COUNT},()=>({features:new Float64Array(12)})),predictedAgency:Array(IDENTITY_TRACK_COUNT).fill(0),ambiguity:1};
  if(!field?.enabled||!world?.cubes?.[egoId])return empty;
  const me=world.cubes[egoId],dim=worldDimension(world),radius=Math.max(2,field.visualRadius),selfOcc=new Set(world.cubes.map(c=>key(c.x,c.y,c.z||0))),base=spatial?.poses?.[egoId]||null,slotRows=[];
  const localPoints=pts=>pts.filter(p=>Math.abs(p.x-me.x)+Math.abs(p.y-me.y)+Math.abs((p.z||0)-(me.z||0))<=radius);
  for(let si=0;si<field.trackCount;si++){
    const all=trackPositions(field,world,si,step),allPrev=trackPositions(field,world,si,Math.max(0,step-1)),pts=localPoints(all),prev=localPoints(allPrev),c=centroid(pts),pc=centroid(prev),stats=shapeStats(pts,dim);
    let nearest=radius,overlap=0;
    for(const p of pts){const d=Math.abs(p.x-me.x)+Math.abs(p.y-me.y)+Math.abs((p.z||0)-(me.z||0));nearest=Math.min(nearest,d);if(selfOcc.has(key(p.x,p.y,p.z||0)))overlap++;}
    const f=Float64Array.of(
      pts.length?1:0,
      pts.length?clamp((c.x-me.x)/radius,-1,1):0,pts.length?clamp((c.y-me.y)/radius,-1,1):0,pts.length?clamp((c.z-(me.z||0))/radius,-1,1):0,
      pts.length?clamp(nearest/radius,0,1):1,Math.tanh(Math.log2(1+pts.length)/5),pts.length?clamp(overlap/pts.length,0,1):0,
      pts.length&&prev.length?clamp(c.x-pc.x,-1,1):0,pts.length&&prev.length?clamp(c.y-pc.y,-1,1):0,pts.length&&prev.length?clamp(c.z-pc.z,-1,1):0,
      stats.compactness,stats.degree
    );
    slotRows.push({features:f,count:pts.length});
    if(base&&pts.length){
      for(const p of pts){
        const dx=p.x-me.x,dy=p.y-me.y,dz=(p.z||0)-(me.z||0);
        const r=mapRec(field,base.x+dx,base.y+dy,(base.z||0)+dz);r.slots[si]+=1;r.last=step;
      }
    }
  }
  field.lastPerception=slotRows;field.updates++;
  const post=posterior(field),ambiguity=entropy01(post.filter((_,i)=>Boolean(field.slots[i])));
  return{active:true,slots:slotRows,predictedAgency:field.predictedAgency.slice(),posterior:post,ambiguity};
}

export function noteIdentityPrediction(field,predictions,step){
  if(!field?.enabled)return;
  for(let i=0;i<field.trackCount;i++){
    if(!field.slots[i])continue;
    const v=clamp(Number(predictions?.[i])||0,0,1);field.predictedAgency[i]=.9*field.predictedAgency[i]+.1*v;
  }
  field.lastPredictionStep=step;
}

function delta(a,b){return{x:(b?.x||0)-(a?.x||0),y:(b?.y||0)-(a?.y||0),z:(b?.z||0)-(a?.z||0)};}
function motionPatternScore(ownBefore,ownAfter,trackBefore,trackAfter){
  const n=Math.min(ownBefore.length,ownAfter.length),tn=Math.min(trackBefore.length,trackAfter.length);let moved=0,sum=0;
  for(let i=0;i<n;i++){
    const od=delta(ownBefore[i],ownAfter[i]),om=Math.hypot(od.x,od.y,od.z);if(om<1e-9)continue;
    moved++;if(i>=tn)continue;const td=delta(trackBefore[i],trackAfter[i]),err=Math.hypot(td.x-od.x,td.y-od.y,td.z-od.z);sum+=Math.exp(-1.5*err);
  }
  return moved?clamp(sum/moved,0,1):.5;
}

export function identityAgencyTargets(field,world,beforeCubes,afterCubes,stepBefore,stepAfter){
  if(!field?.enabled)return{active:false,targets:[]};
  const ownBefore=clonePositions(beforeCubes),ownAfter=clonePositions(afterCubes),targets=[];
  let informative=false;for(let i=0;i<Math.min(ownBefore.length,ownAfter.length);i++){const d=delta(ownBefore[i],ownAfter[i]);if(Math.hypot(d.x,d.y,d.z)>1e-9){informative=true;break;}}
  for(let si=0;si<field.trackCount;si++){
    const tb=field.slots[si]?.source==="self"?ownBefore:trackPositions(field,world,si,stepBefore);
    const ta=field.slots[si]?.source==="self"?ownAfter:trackPositions(field,world,si,stepAfter);
    const score=motionPatternScore(ownBefore,ownAfter,tb,ta);targets.push(score);
    if(informative&&field.slots[si])field.observedCausalMatch[si]=.92*field.observedCausalMatch[si]+.08*score;
  }
  field.lastOutcomeStep=stepAfter;
  return{active:true,informative,targets};
}

export function identityFeatureVector(perception){
  const out=[];for(let i=0;i<IDENTITY_TRACK_COUNT;i++){const f=perception?.slots?.[i]?.features||new Float64Array(12);for(const v of f)out.push(v);}
  for(let i=0;i<IDENTITY_TRACK_COUNT;i++)out.push(clamp(Number(perception?.predictedAgency?.[i])||0,0,1));
  out.push(clamp(Number(perception?.ambiguity??1),0,1));return Float64Array.from(out);
}

export function identitySnapshot(field,maxCells=4096){
  if(!field)return{version:1,active:false,slots:[],cells:[],summary:{ambiguity:1}};
  const post=posterior(field),cells=[];
  for(const[k,r]of field.map){if(cells.length>=maxCells)break;const[x,y,z]=k.split(",").map(Number),tot=Math.max(1,...Array.from(r.slots));
    let selfEvidence=0,otherEvidence=0;
    for(let i=0;i<field.trackCount;i++){const occ=clamp(r.slots[i]/tot,0,1),p=clamp(field.predictedAgency[i],0,1);selfEvidence=Math.max(selfEvidence,occ*p);otherEvidence=Math.max(otherEvidence,occ*(1-p));}
    cells.push({x,y,z,slotEvidence:Array.from(r.slots),selfEvidence,otherEvidence,ambiguity:1-Math.abs(selfEvidence-otherEvidence),last:r.last});
  }
  const slots=field.slots.map((s,i)=>s?{
    slot:i,observerTruth:s.observerTruth,speciesKey:s.speciesKey,predictedAgency:clamp(field.predictedAgency[i],0,1),
    observedCausalMatch:clamp(field.observedCausalMatch[i],0,1),posterior:post[i]||0,
    features:Array.from(field.lastPerception?.[i]?.features||[])
  }:null);
  const active=slots.filter(Boolean),ambiguity=entropy01(post.filter((_,i)=>Boolean(field.slots[i])));
  const selfSlot=slots.find(x=>x?.observerTruth==="SELF"),same=slots.find(x=>x?.observerTruth==="SAME_SPECIES_OTHER"),cross=slots.find(x=>x?.observerTruth==="CROSS_SPECIES_OTHER");
  return{version:1,active:field.enabled,slots,cells,summary:{
    ambiguity,
    selfPosterior:selfSlot?.posterior??0,
    sameSpeciesOtherPosterior:same?.posterior??0,
    crossSpeciesOtherPosterior:cross?.posterior??0,
    selfVsSameSeparation:(selfSlot?.posterior??0)-(same?.posterior??0),
    selfVsCrossSeparation:(selfSlot?.posterior??0)-(cross?.posterior??0),
    updates:field.updates
  }};
}
