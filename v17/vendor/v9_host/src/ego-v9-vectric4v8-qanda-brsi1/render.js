import {GRID_H,GRID_W,WALL_L,WALL_R} from "./config.js";
import {makeWorld} from "./world.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function clear(canvas){
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#070a0e";ctx.fillRect(0,0,w,h);return{ctx,w,h};
}
function iso(x,y,z,scale,ox,oy){return{x:ox+(x-y)*scale,y:oy+(x+y)*scale*.46-z*scale};}

function drawWorld3D(canvas,world,showGrid=true){
  const{ctx,w,h}=clear(canvas),gw=world.gridW||24,gh=world.gridH||16,gd=world.gridD||10,scale=Math.min(w/(gw+gh+4),h/(gd+(gw+gh)*.5+4))*1.65,ox=w*.48,oy=h*.78;
  const free=world.free3d;if(free){
    let shown=0;const stride=Math.max(1,Math.ceil((gw*gh*gd)/2500));
    ctx.fillStyle="rgba(138,183,255,.34)";
    for(let z=1;z<gd-1;z++)for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){const idx=(z*gh+y)*gw+x;if(free[idx]!==1||((idx%stride)!==0))continue;const p=iso(x,y,z,scale,ox,oy);ctx.fillRect(p.x,p.y,Math.max(2,scale*.34),Math.max(2,scale*.34));if(++shown>2500)break;}
  }
  if(showGrid){
    ctx.strokeStyle="rgba(255,255,255,.06)";ctx.lineWidth=1;
    const corners=[[0,0,0],[gw,0,0],[0,gh,0],[gw,gh,0],[0,0,gd],[gw,0,gd],[0,gh,gd],[gw,gh,gd]].map(q=>iso(q[0],q[1],q[2],scale,ox,oy));
    const edges=[[0,1],[0,2],[1,3],[2,3],[4,5],[4,6],[5,7],[6,7],[0,4],[1,5],[2,6],[3,7]];ctx.beginPath();for(const[a,b]of edges){ctx.moveTo(corners[a].x,corners[a].y);ctx.lineTo(corners[b].x,corners[b].y);}ctx.stroke();
  }
  const order=world.cubes.map((c,i)=>({c,i,depth:(c.x+c.y-(c.z||0)*.25)})).sort((a,b)=>a.depth-b.depth),moved=new Set(world.lastMoves||[]);
  for(const row of order){const c=row.c,p=iso(c.x+.5,c.y+.5,(c.z||0)+.5,scale,ox,oy),r=Math.max(2,scale*.42);ctx.fillStyle=row.i===world.activeEgo?"#ffc56b":(moved.has(row.i)?"#8ab7ff":"#72e2c3");ctx.fillRect(p.x-r,p.y-r,r*2,r*2);ctx.strokeStyle=c.organId>=0?`hsl(${(c.organId*67)%360} 70% 65%)`:"rgba(0,0,0,.55)";ctx.lineWidth=c.organId>=0?2:1;ctx.strokeRect(p.x-r,p.y-r,r*2,r*2);}
  const cp=world.checkpoint;if(cp){const p=iso(cp.plane,cp.y||0,cp.z||0,scale,ox,oy);ctx.fillStyle="#ffcf6e";ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,scale*.55),0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#aebdce";ctx.font="12px system-ui";ctx.fillText(`3D · global action ${world.globalStep??0}${world.success?" · ✓ SUCCESS":""}`,8,17);ctx.fillText(String(world.mapKind||"3d"),8,34);
}
function drawWorld2D(canvas,world,showGrid=true){
  const{ctx,w,h}=clear(canvas),proc=world.v5Procedural===true,gw=proc?world.gridW:GRID_W,gh=proc?world.gridH:GRID_H,cw=w/gw,ch=h/gh;
  if(proc){
    const free=world.free||world.terrain;
    for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
      const open=free?.[y*gw+x]===1;
      ctx.fillStyle=open?"#0d181b":"#596674";
      ctx.fillRect(x*cw+.5,y*ch+.5,Math.max(1,cw-1),Math.max(1,ch-1));
    }
    const cp=world.checkpoint;if(cp){ctx.strokeStyle="#ffcf6e";ctx.lineWidth=Math.max(3,Math.min(cw,ch)*.35);ctx.beginPath();const bh=Math.max(0,cp.bandHalf||0);if(cp.edge==="RIGHT"){ctx.moveTo(cp.plane*cw,(cp.y-bh)*ch);ctx.lineTo(cp.plane*cw,(cp.y+bh+1)*ch);}else{ctx.moveTo((cp.x-bh)*cw,cp.plane*ch);ctx.lineTo((cp.x+bh+1)*cw,cp.plane*ch);}ctx.stroke();}
  }else{
    ctx.fillStyle="#0d181b";ctx.fillRect(0,0,w,h);
    for(let x=WALL_L;x<=WALL_R;x++){
      const b=world.opening?.[x-WALL_L];
      if(!b)continue;
      for(let y=0;y<GRID_H;y++){
        ctx.fillStyle=(y>=b.lo&&y<=b.hi)?"#173b35":"#596674";
        ctx.fillRect(x*cw+.5,y*ch+.5,Math.max(1,cw-1),Math.max(1,ch-1));
      }
    }
    ctx.strokeStyle="#596674";ctx.lineWidth=Math.max(2,Math.min(cw,ch)*.18);ctx.strokeRect(1,1,w-2,h-2);
    ctx.strokeStyle="#ffcf6e";ctx.lineWidth=Math.max(3,Math.min(cw,ch)*.28);ctx.beginPath();ctx.moveTo((WALL_R+1)*cw,0);ctx.lineTo((WALL_R+1)*cw,h);ctx.stroke();
  }
  if(showGrid){ctx.strokeStyle="rgba(255,255,255,.045)";ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=gw;x++){ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,h);}for(let y=0;y<=gh;y++){ctx.moveTo(0,y*ch);ctx.lineTo(w,y*ch);}ctx.stroke();}
  const moved=new Set(world.lastMoves||[]);for(let i=0;i<world.cubes.length;i++){const c=world.cubes[i];ctx.fillStyle=i===world.activeEgo?"#ffc56b":(moved.has(i)?"#8ab7ff":"#72e2c3");ctx.fillRect(c.x*cw+1.2,c.y*ch+1.2,Math.max(1,cw-2.4),Math.max(1,ch-2.4));ctx.strokeStyle=c.organId>=0?`hsl(${(c.organId*67)%360} 70% 65%)`:"rgba(0,0,0,.5)";ctx.lineWidth=c.organId>=0?2:1;ctx.strokeRect(c.x*cw+1.2,c.y*ch+1.2,Math.max(1,cw-2.4),Math.max(1,ch-2.4));if(showGrid&&cw>17){ctx.fillStyle="#07120e";ctx.font=`${Math.max(8,Math.floor(ch*.45))}px system-ui`;ctx.fillText(String(i),c.x*cw+3,c.y*ch+Math.max(10,ch*.55));}}
  if(showGrid){ctx.fillStyle="#e6eef8";ctx.font="12px system-ui";ctx.fillText(`global action ${world.globalStep??0}${world.success?" · ✓ SUCCESS":""}`,8,17);ctx.fillText(`MAP · ${String(world.mapKind||"unknown")}`,8,34);}
}
export function drawWorld(canvas,world,showGrid=true){if(!canvas||!world)return;if(Number(world.physicalDimensions)===3)drawWorld3D(canvas,world,showGrid);else drawWorld2D(canvas,world,showGrid);}

export function drawHistory(canvas,history){
  const{ctx,w,h}=clear(canvas),a=history.slice(-120);if(a.length<2){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("History appears after training starts.",16,28);return;}
  const pad=26,x=i=>pad+i*(w-2*pad)/(a.length-1),y=s=>h-pad-clamp(s,0,1)*(h-2*pad);ctx.strokeStyle="rgba(255,255,255,.08)";ctx.beginPath();ctx.moveTo(pad,h-pad);ctx.lineTo(w-pad,h-pad);ctx.stroke();
  ctx.strokeStyle="#72e2c3";ctx.lineWidth=2;ctx.beginPath();a.forEach((r,i)=>i?ctx.lineTo(x(i),y(r.A.success)):ctx.moveTo(x(i),y(r.A.success)));ctx.stroke();ctx.strokeStyle="#8ab7ff";ctx.beginPath();a.forEach((r,i)=>i?ctx.lineTo(x(i),y(r.B.success)):ctx.moveTo(x(i),y(r.B.success)));ctx.stroke();ctx.fillStyle="#72e2c3";ctx.font="12px system-ui";ctx.fillText("A success",10,15);ctx.fillStyle="#8ab7ff";ctx.fillText("B success",78,15);
}
export function summarizeTrace(trace,ego){if(!Array.isArray(trace))return null;for(let i=trace.length-1;i>=0;i--)if(trace[i].ego===ego)return trace[i];return null;}

function previewCell(src,k,dim,x,y,z=0){
  const c=dim===3?{x,y,z}:{x,y};
  if(src?.organIds)c.organId=src.organIds[k]??-1;
  if(src?.specialistIds)c.specialistId=src.specialistIds[k]??0;
  return c;
}
function previewFrameShape(preview,src){
  const dim=Number(src?.physicalDimensions??preview?.physicalDimensions)===3?3:2;
  const positions=src?.positions;
  const inferred=positions?.length?Math.floor(positions.length/dim):0;
  const count=Math.max(0,Math.floor(Number(src?.cellCount??preview?.cellCount??inferred)||0));
  return{dim,count};
}
export function previewFrameState(preview,frameFloat=0){
  if(!preview?.frames?.length)return null;const frames=preview.frames,top=frames.length-1,x=clamp(Number(frameFloat)||0,0,top),exact=preview.exactMoves===true;
  if(exact){
    const i=Math.min(top,Math.floor(x+1e-9)),src=frames[i],shape=previewFrameShape(preview,src),dim=shape.dim,cubes=[];
    for(let k=0;k<shape.count;k++){const q=k*dim;cubes.push(previewCell(src,k,dim,src.positions[q],src.positions[q+1],dim===3?src.positions[q+2]:0));}
    return{cubes,src,globalStep:src.globalStep,simTime:src.simTime};
  }
  const i=Math.min(top,Math.floor(x)),j=Math.min(top,i+1),a=frames[i],b=frames[j],t=j===i?0:clamp(x-i,0,1),sa=previewFrameShape(preview,a),sb=previewFrameShape(preview,b);
  if(sa.count!==sb.count||sa.dim!==sb.dim){
    const src=t<.5?a:b,shape=t<.5?sa:sb,dim=shape.dim,cubes=[];
    for(let k=0;k<shape.count;k++){const q=k*dim;cubes.push(previewCell(src,k,dim,src.positions[q],src.positions[q+1],dim===3?src.positions[q+2]:0));}
    return{cubes,src,globalStep:src.globalStep,simTime:src.simTime};
  }
  const dim=sa.dim,src=t<.5?a:b,cubes=[];
  for(let k=0;k<sa.count;k++){const q=k*dim,xv=a.positions[q]+(b.positions[q]-a.positions[q])*t,yv=a.positions[q+1]+(b.positions[q+1]-a.positions[q+1])*t;cubes.push(previewCell(src,k,dim,xv,yv,dim===3?a.positions[q+2]+(b.positions[q+2]-a.positions[q+2])*t:0));}
  return{cubes,src,globalStep:Math.round(a.globalStep+(b.globalStep-a.globalStep)*t),simTime:a.simTime+(b.simTime-a.simTime)*t};
}
const previewGeometryCache=new WeakMap();
function geometryForPreview(preview){
  if(previewGeometryCache.has(preview))return previewGeometryCache.get(preview);
  const dim=Number(preview?.physicalDimensions)===3?3:2,kind=String(preview?.mapKind||"stage"),stage=Math.max(0,Math.floor(Number(preview?.stage)||0)),seed=(Number(preview?.envSeed??preview?.seed)||1)>>>0,n=Math.max(2,Math.floor(Number(preview?.cellCount)||2)),budget=Math.max(16,Math.floor(Number(preview?.maxGlobalActions)||1024));
  let base=null;
  try{base=makeWorld(stage,seed,budget,kind,n,dim);}catch(_){base=null;}
  previewGeometryCache.set(preview,base);return base;
}
export function drawPreviewFrame(canvas,preview,frameFloat=0,showGrid=true){
  const state=previewFrameState(preview,frameFloat);if(!state)return false;
  const regenerated=geometryForPreview(preview),base=regenerated||{};
  drawWorld(canvas,{
    ...base,
    stage:preview.stage??base.stage,seed:preview.envSeed??base.seed,mapKind:preview.mapKind??base.mapKind,routeKind:preview.routeKind??base.routeKind,
    v5Procedural:preview.v5Procedural===true||base.v5Procedural===true,physicalDimensions:state.src.physicalDimensions||preview.physicalDimensions||base.physicalDimensions||2,
    gridW:preview.gridW??base.gridW,gridH:preview.gridH??base.gridH,gridD:preview.gridD??base.gridD,
    free:preview.free?.byteLength?preview.free:base.free,free3d:preview.free3d?.byteLength?preview.free3d:base.free3d,terrain:preview.terrain?.byteLength?preview.terrain:base.terrain,
    checkpoint:preview.checkpoint||base.checkpoint,opening:(preview.opening?.length?preview.opening:base.opening)||[],
    cubes:state.cubes,globalStep:state.globalStep,simTime:state.simTime,success:state.src.success,lastMoves:Array.from(state.src.lastMoves||[]),activeEgo:state.src.activeEgo
  },showGrid);return true;
}

function bounds2(points,ax="x",ay="y"){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of points){minX=Math.min(minX,p[ax]);maxX=Math.max(maxX,p[ax]);minY=Math.min(minY,p[ay]);maxY=Math.max(maxY,p[ay]);}if(!points.length)return{minX:0,maxX:1,minY:0,maxY:1};return{minX,maxX,minY,maxY};}
export function drawSpatialBelief(canvas,spatial,{sliceZ=null,showBody=true}={}){
  const{ctx,w,h}=clear(canvas);if(!spatial?.cells?.length){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("No internal spatial belief yet.",16,28);return;}
  let cells=spatial.cells;const poses=(spatial.poses||[]).filter(Boolean),zs=[...cells,...poses].map(p=>Number(p.z)||0),is3D=!Number.isFinite(sliceZ)&&(Math.max(...zs)-Math.min(...zs)>.25);
  if(Number.isFinite(sliceZ))cells=cells.filter(c=>Math.round(c.z||0)===Math.round(sliceZ));
  if(is3D){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const p of [...cells,...poses]){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);minZ=Math.min(minZ,p.z||0);maxZ=Math.max(maxZ,p.z||0);}
    const rx=Math.max(1,maxX-minX+1),ry=Math.max(1,maxY-minY+1),rz=Math.max(1,maxZ-minZ+1),scale=Math.max(2,Math.min(w/(rx+ry+5),h/(rz+(rx+ry)*.48+5))*1.5),ox=w*.5,oy=h*.76;
    const proj=p=>iso(p.x-minX,p.y-minY,(p.z||0)-minZ,scale,ox,oy);
    for(const c of [...cells].sort((a,b)=>(a.x+a.y-(a.z||0))-(b.x+b.y-(b.z||0)))){const q=proj(c),pw=clamp(c.wall,0,1),conf=clamp(c.confidence,0,1),r=Math.max(2,scale*.30);ctx.globalAlpha=.2+.8*conf;ctx.fillStyle=pw>.65?"#c0c9d4":(pw<.35?"#17302c":"#7d6f4e");ctx.fillRect(q.x-r,q.y-r,r*2,r*2);if(c.touchWall){ctx.strokeStyle="#ffcf6e";ctx.strokeRect(q.x-r,q.y-r,r*2,r*2);}}
    ctx.globalAlpha=1;if(showBody)for(const p of poses){const q=proj(p);ctx.fillStyle="#72e2c3";ctx.beginPath();ctx.arc(q.x,q.y,Math.max(2,scale*.24),0,Math.PI*2);ctx.fill();}
  }else{
    const all=[...cells,...(showBody?poses:[])],b=bounds2(all),pad=24,sx=(w-2*pad)/Math.max(1,b.maxX-b.minX+1),sy=(h-2*pad)/Math.max(1,b.maxY-b.minY+1),scale=Math.min(sx,sy),px=x=>pad+(x-b.minX)*scale,py=y=>pad+(y-b.minY)*scale;
    for(const c of cells){const p=clamp(c.wall,0,1),conf=clamp(c.confidence,0,1);ctx.globalAlpha=.25+.75*conf;ctx.fillStyle=p>.65?"#c0c9d4":(p<.35?"#17302c":"#7d6f4e");ctx.fillRect(px(c.x),py(c.y),Math.max(2,scale*.92),Math.max(2,scale*.92));if(c.touchWall){ctx.strokeStyle="#ffcf6e";ctx.strokeRect(px(c.x)+1,py(c.y)+1,Math.max(1,scale*.92-2),Math.max(1,scale*.92-2));}}
    ctx.globalAlpha=1;if(showBody)for(const p of poses){ctx.fillStyle="#72e2c3";ctx.beginPath();ctx.arc(px(p.x)+scale*.45,py(p.y)+scale*.45,Math.max(2,scale*.28),0,Math.PI*2);ctx.fill();}
  }
  ctx.fillStyle="#aebdce";ctx.font="12px system-ui";const q=spatial.summary||{};ctx.fillText(`BELIEF${is3D?" · internal 3D projection":""} · known ${q.known??cells.length} · uncertainty ${Number(q.uncertainty||0).toFixed(3)} · echo scale ${Number(q.echoScale||0).toFixed(2)}`,8,16);
}

function bodyBeliefColor(p={}){
  const rows=[["self",Number(p.self)||0,"#72e2c3"],["tool",Number(p.tool)||0,"#ffc56b"],["other",Number(p.other)||0,"#8ab7ff"],["passive",Number(p.passive)||0,"#aebdce"],["unknown",Number(p.unknown)||0,"#ff7f91"]].sort((a,b)=>b[1]-a[1]);
  return{label:rows[0][0].toUpperCase(),value:rows[0][1],color:rows[0][2]};
}
export function drawSameDishBodyBelief(canvas,snapshot){
  const{ctx,w,h}=clear(canvas),rows=(snapshot?.tracks||[]).filter(x=>x.visible);
  if(!rows.length){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("No same-dish body-boundary belief yet.",16,28);return;}
  const points=[{x:0,y:0},...rows.map(r=>({x:Number(r.rel?.x)||0,y:Number(r.rel?.y)||0}))],b=bounds2(points),pad=38,scale=Math.min((w-2*pad)/Math.max(1,b.maxX-b.minX+1),(h-2*pad)/Math.max(1,b.maxY-b.minY+1)),px=x=>pad+(x-b.minX)*scale,py=y=>pad+(y-b.minY)*scale;
  ctx.strokeStyle="rgba(255,255,255,.05)";ctx.lineWidth=1;ctx.beginPath();for(let x=Math.floor(b.minX);x<=Math.ceil(b.maxX)+1;x++){ctx.moveTo(px(x),pad);ctx.lineTo(px(x),h-pad);}for(let y=Math.floor(b.minY);y<=Math.ceil(b.maxY)+1;y++){ctx.moveTo(pad,py(y));ctx.lineTo(w-pad,py(y));}ctx.stroke();
  for(const r of rows){
    const x=Number(r.rel?.x)||0,y=Number(r.rel?.y)||0,q=bodyBeliefColor(r.probability),u=clamp(Number(r.uncertainty)||0,0,1),rad=Math.max(4,scale*.30);
    ctx.globalAlpha=.28+.72*(1-u);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(px(x)+scale*.45,py(y)+scale*.45,rad,0,Math.PI*2);ctx.fill();
    if(scale>26){ctx.globalAlpha=1;ctx.fillStyle="#e6eef8";ctx.font="9px ui-monospace,monospace";ctx.fillText(q.label[0]+Math.round(q.value*100),px(x)+2,py(y)+11);}
  }
  ctx.globalAlpha=1;ctx.fillStyle="#71e891";ctx.beginPath();ctx.arc(px(0)+scale*.45,py(0)+scale*.45,Math.max(5,scale*.34),0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e6eef8";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#aebdce";ctx.font="12px system-ui";ctx.fillText(`CAUSAL BODY BELIEF · local anchor + anonymous material · tracks ${rows.length} · separation evidence ${snapshot?.separationEvidence||0}`,8,16);
  ctx.fillText("cyan SELF · amber TOOL · blue OTHER · gray PASSIVE · pink UNKNOWN",8,h-10);
}
function truthBodyColor(label){
  if(label==="SELF_BODY")return"#72e2c3";if(label==="CONTROLLED_EXTERNAL_OR_TOOL")return"#ffc56b";if(label==="OTHER_AUTONOMOUS_AGENT")return"#8ab7ff";return"#aebdce";
}
export function drawSameDishObserverTruth(canvas,rows=[]){
  const{ctx,w,h}=clear(canvas),vis=(rows||[]).filter(x=>x.visible!==false);
  if(!vis.length){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("No same-dish observer truth diagnostic yet.",16,28);return;}
  const points=[{x:0,y:0},...vis.map(r=>({x:Number(r.rel?.x)||0,y:Number(r.rel?.y)||0}))],b=bounds2(points),pad=38,scale=Math.min((w-2*pad)/Math.max(1,b.maxX-b.minX+1),(h-2*pad)/Math.max(1,b.maxY-b.minY+1)),px=x=>pad+(x-b.minX)*scale,py=y=>pad+(y-b.minY)*scale;
  for(const r of vis){
    const x=Number(r.rel?.x)||0,y=Number(r.rel?.y)||0,rad=Math.max(4,scale*.30);ctx.fillStyle=truthBodyColor(r.observerTruth);ctx.beginPath();ctx.arc(px(x)+scale*.45,py(y)+scale*.45,rad,0,Math.PI*2);ctx.fill();
    if(scale>26){ctx.fillStyle="#07120e";ctx.font="9px ui-monospace,monospace";const t=r.observerTruth==="SELF_BODY"?"S":(r.observerTruth==="OTHER_AUTONOMOUS_AGENT"?"O":(r.observerTruth==="CONTROLLED_EXTERNAL_OR_TOOL"?"T":"P"));ctx.fillText(t,px(x)+scale*.34,py(y)+scale*.55);}
  }
  ctx.fillStyle="#71e891";ctx.beginPath();ctx.arc(px(0)+scale*.45,py(0)+scale*.45,Math.max(5,scale*.34),0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e6eef8";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#aebdce";ctx.font="12px system-ui";ctx.fillText("HIDDEN MEMBERSHIP TRUTH · OBSERVER ONLY · never policy input",8,16);ctx.fillText("cyan SELF · amber TOOL · blue OTHER · gray PASSIVE",8,h-10);
}

function truthSolidSnapshot(world,x,y,z=0){
  if(Number(world?.physicalDimensions)===3){
    const gw=world.gridW||0,gh=world.gridH||0,gd=world.gridD||0;if(x<0||x>=gw||y<0||y>=gh||z<0||z>=gd)return true;
    return world.free3d?.[(z*gh+y)*gw+x]!==1;
  }
  const gw=world.v5Procedural===true?(world.gridW||0):GRID_W,gh=world.v5Procedural===true?(world.gridH||0):GRID_H;
  if(x<0||x>=gw||y<0||y>=gh)return true;
  if(world.v5Procedural===true)return world.free?.[y*gw+x]!==1;
  if(x<WALL_L||x>WALL_R)return false;const b=world.opening?.[x-WALL_L];return !b||y<b.lo||y>b.hi;
}
export function drawBeliefDifference(canvas,world,spatial){
  const{ctx,w,h}=clear(canvas);if(!spatial?.cells?.length){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("No belief/truth comparison yet.",16,28);return{count:0,brier:1,falseWalls:0,missedWalls:0};}
  const a=spatial.debugAnchor||{x:0,y:0,z:0},pts=spatial.cells,zs=pts.map(p=>Number(p.z)||0),is3D=Number(world?.physicalDimensions)===3||Math.max(...zs)-Math.min(...zs)>.25;
  let q=0,falseWalls=0,missedWalls=0,count=0,drawPoint;
  if(is3D){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);minZ=Math.min(minZ,p.z||0);maxZ=Math.max(maxZ,p.z||0);}
    const rx=Math.max(1,maxX-minX+1),ry=Math.max(1,maxY-minY+1),rz=Math.max(1,maxZ-minZ+1),scale=Math.max(2,Math.min(w/(rx+ry+5),h/(rz+(rx+ry)*.48+5))*1.5),ox=w*.5,oy=h*.76;
    drawPoint=(c,good)=>{const p=iso(c.x-minX,c.y-minY,(c.z||0)-minZ,scale,ox,oy),r=Math.max(2,scale*.30);ctx.fillStyle=good>.75?"#71e891":(good>.45?"#ffc56b":"#ff7f91");ctx.fillRect(p.x-r,p.y-r,r*2,r*2);};
  }else{
    const b=bounds2(pts),pad=24,sx=(w-2*pad)/Math.max(1,b.maxX-b.minX+1),sy=(h-2*pad)/Math.max(1,b.maxY-b.minY+1),scale=Math.min(sx,sy),px=x=>pad+(x-b.minX)*scale,py=y=>pad+(y-b.minY)*scale;
    drawPoint=(c,good)=>{ctx.fillStyle=good>.75?"#71e891":(good>.45?"#ffc56b":"#ff7f91");ctx.fillRect(px(c.x),py(c.y),Math.max(2,scale*.92),Math.max(2,scale*.92));};
  }
  for(const c of pts){
    const tx=Math.round(a.x+c.x),ty=Math.round(a.y+c.y),tz=Math.round((a.z||0)+(c.z||0)),truth=truthSolidSnapshot(world,tx,ty,tz)?1:0,p=clamp(Number(c.wall)||0,0,1),err=(p-truth)*(p-truth);q+=err;count++;if(p>.65&&!truth)falseWalls++;if(p<.35&&truth)missedWalls++;
    const good=1-clamp(err,0,1);ctx.globalAlpha=.3+.7*clamp(c.confidence||0,0,1);drawPoint(c,good);
  }
  ctx.globalAlpha=1;const brier=count?q/count:1;ctx.fillStyle="#aebdce";ctx.font="12px system-ui";ctx.fillText(`BELIEF vs HIDDEN TRUTH${is3D?" · 3D projection":""} · Brier ${brier.toFixed(3)} · false wall ${falseWalls} · missed wall ${missedWalls}`,8,16);
  return{count,brier,falseWalls,missedWalls};
}
export function drawCorticalMonitor(canvas,cortical){
  const{ctx,w,h}=clear(canvas);if(!cortical){ctx.fillStyle="#91a0b3";ctx.fillText("No CorticalSound state.",12,22);return;}const rows=cortical.dominant||[],max=Math.max(.001,...rows.map(x=>x.amplitude||0)),pad=28,bw=(w-2*pad)/Math.max(1,rows.length);
  for(let i=0;i<rows.length;i++){const r=rows[i],bh=(h-58)*(r.amplitude/max);ctx.fillStyle="#8ab7ff";ctx.fillRect(pad+i*bw,h-28-bh,Math.max(2,bw*.7),bh);ctx.fillStyle="#aebdce";ctx.font="10px system-ui";ctx.fillText(String(r.band),pad+i*bw,h-12);}
  ctx.fillStyle="#aebdce";ctx.font="12px system-ui";ctx.fillText(`COMMON · coherence ${Number(cortical.coherence||0).toFixed(3)} · conflict ${Number(cortical.conflict||0).toFixed(3)} · coalitions ${cortical.coalitions?.length||0}`,8,16);
}
function latentCoord(p,i){return Number(p?.latent?.[i])||0;}
function projectionAxes(viewD,axes){
  const d=Math.max(1,Math.floor(viewD)),want=Math.min(3,d),out=[];
  for(const x of axes||[]){const i=Math.max(0,Math.min(d-1,Math.floor(Number(x)||0)));if(!out.includes(i))out.push(i);if(out.length===want)break;}
  for(let i=0;out.length<want&&i<d;i++)if(!out.includes(i))out.push(i);
  return out;
}
function projectionColor(p,mode){
  if(mode==="identity"&&(p.organism||0)>.02){const se=clamp(p.selfEvidence||0,0,1),oe=clamp(p.otherEvidence||0,0,1);return se>oe+.12?"#72e2c3":(oe>se+.12?"#8ab7ff":"#ffc56b");}
  if(mode==="uncertainty"){const u=clamp(p.unc||0,0,1);return u>.66?"#ff7f91":(u>.33?"#ffc56b":"#71e891");}
  return(p.wall||0)>.55?"#c0c9d4":"#72e2c3";
}
export function perspectiveProjectionState(perspective,{viewD=null,axes=[0,1,2],slices={},tolerance=.35,d4=null,d5=null}={}){
  const points=perspective?.points||[],pointMax=Math.max(1,...points.map(p=>p.latent?.length||0)),maxD=Math.max(1,Math.floor(Number(perspective?.maxD)||pointMax)),d=Math.max(1,Math.min(maxD,Math.floor(Number(viewD)||Math.max(1,Math.ceil(Number(perspective?.activeD)||1))))),useAxes=projectionAxes(d,axes),unused=[];
  for(let i=0;i<d;i++)if(!useAxes.includes(i))unused.push(i);
  const resolvedSlices={...slices};if(Number.isFinite(Number(d4)))resolvedSlices[3]=Number(d4);if(Number.isFinite(Number(d5)))resolvedSlices[4]=Number(d5);
  const tol=Math.max(.001,Number(tolerance)||.35),filtered=points.filter(p=>unused.every(i=>Math.abs(latentCoord(p,i)-Number(resolvedSlices?.[i]||0))<=tol));
  return{viewD:d,renderD:useAxes.length,axes:useAxes,unused,points:filtered,maxD};
}
export function drawPerspectiveProjection(canvas,perspective,{viewD=null,axes=[0,1,2],slices={},tolerance=.35,mode="structure",d4=null,d5=null}={}){
  const{ctx,w,h}=clear(canvas);if(!perspective?.points?.length){ctx.fillStyle="#91a0b3";ctx.fillText("No perspective projection yet.",12,22);return null;}
  const st=perspectiveProjectionState(perspective,{viewD,axes,slices,tolerance,d4,d5}),pts=st.points;if(!pts.length){ctx.fillStyle="#91a0b3";ctx.font="14px system-ui";ctx.fillText("No points intersect this ND slice.",16,28);return st;}
  const pad=32,vals=pts.map(p=>st.axes.map(a=>latentCoord(p,a)));
  if(st.renderD===1){
    let min=Infinity,max=-Infinity;for(const v of vals){min=Math.min(min,v[0]);max=Math.max(max,v[0]);}const span=Math.max(1e-6,max-min),py=h*.58;
    ctx.strokeStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.moveTo(pad,py);ctx.lineTo(w-pad,py);ctx.stroke();
    for(let i=0;i<pts.length;i++){const x=pad+(vals[i][0]-min)/span*(w-2*pad);ctx.globalAlpha=.25+.7*(1-clamp(pts[i].unc||0,0,1));ctx.fillStyle=projectionColor(pts[i],mode);ctx.beginPath();ctx.arc(x,py,3,0,Math.PI*2);ctx.fill();}
  }else if(st.renderD===2){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const v of vals){minX=Math.min(minX,v[0]);maxX=Math.max(maxX,v[0]);minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);}
    const sx=(w-2*pad)/Math.max(1e-6,maxX-minX),sy=(h-2*pad)/Math.max(1e-6,maxY-minY);
    for(let i=0;i<pts.length;i++){const x=pad+(vals[i][0]-minX)*sx,y=h-pad-(vals[i][1]-minY)*sy;ctx.globalAlpha=.25+.7*(1-clamp(pts[i].unc||0,0,1));ctx.fillStyle=projectionColor(pts[i],mode);ctx.fillRect(x-2,y-2,4,4);}
  }else{
    let maxAbs=1;for(const v of vals)for(const x of v)maxAbs=Math.max(maxAbs,Math.abs(x));const scale=Math.min(w,h)/(maxAbs*5.2),ox=w*.5,oy=h*.62;
    for(let i=0;i<pts.length;i++){const v=vals[i],q=iso(v[0],v[1],v[2],scale,ox,oy);ctx.globalAlpha=.25+.7*(1-clamp(pts[i].unc||0,0,1));ctx.fillStyle=projectionColor(pts[i],mode);ctx.fillRect(q.x,q.y,Math.max(2,scale*.16),Math.max(2,scale*.16));}
  }
  ctx.globalAlpha=1;ctx.fillStyle="#aebdce";ctx.font="12px system-ui";const ax=st.axes.map(i=>"L"+(i+1)).join("/");
  ctx.fillText(`ND INTERNAL SPACE · ${st.viewD}D → ${st.renderD}D · axes ${ax} · active D ${Number(perspective.activeD||0).toFixed(2)} · effective ${Number(perspective.effectiveD||0).toFixed(2)}`,8,16);
  return st;
}
