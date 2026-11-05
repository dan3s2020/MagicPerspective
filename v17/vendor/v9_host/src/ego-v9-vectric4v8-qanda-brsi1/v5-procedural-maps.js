import {RNG,clamp} from "./math.js";

export const V5_PROC_STAGES=Object.freeze([
  {name:"Open procedural cave",pass:.70,detour:.08,branchScale:.01,widthScale:.78},
  {name:"Curved cave",pass:.68,detour:.18,branchScale:.025,widthScale:.70},
  {name:"Branching cave",pass:.64,detour:.28,branchScale:.05,widthScale:.64},
  {name:"Maze cave",pass:.60,detour:.38,branchScale:.08,widthScale:.58},
  {name:"Tortuous cave",pass:.56,detour:.48,branchScale:.11,widthScale:.53},
  {name:"Infinite procedural",pass:.52,detour:.55,branchScale:.14,widthScale:.48}
]);
export const V5_ROUTE_KINDS=Object.freeze(["DIRECT","BEND","S_CURVE","BACKTRACK","MAZE_ZIGZAG","SPIRAL"]);
const DIR4=[[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y)=>x+","+y;
function mixSeed(x){x=(Number(x)>>>0)+0x9e3779b9;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
function bounds(cells){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const c of cells){minX=Math.min(minX,c.x);minY=Math.min(minY,c.y);maxX=Math.max(maxX,c.x);maxY=Math.max(maxY,c.y);}return{minX,minY,maxX,maxY,w:maxX-minX+1,h:maxY-minY+1};}
export function v5CompactConnectedShape(n,seed=1){
  const rng=seed instanceof RNG?seed:new RNG(seed),cells=[{x:0,y:0}],occ=new Set(["0,0"]),frontier=new Map();
  const addFrontier=(x,y)=>{for(const [dx,dy] of DIR4){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!occ.has(k))frontier.set(k,{x:nx,y:ny});}};
  addFrontier(0,0);
  while(cells.length<n){
    let bestKey=null,best=null,bestScore=Infinity;
    for(const [k,p] of frontier){const score=Math.hypot(p.x,p.y)+rng.next()*1.7;if(score<bestScore){bestKey=k;best=p;bestScore=score;}}
    if(!best)throw new Error("compact shape frontier exhausted");
    frontier.delete(bestKey);cells.push(best);occ.add(bestKey);addFrontier(best.x,best.y);
  }
  return cells;
}
function placeShape(shape,edge,w,h,margin=4){
  const b=bounds(shape);margin=Math.max(4,Math.floor(Number(margin)||4));let ox=0,oy=0;
  if(edge==="LEFT"){ox=margin-b.minX;oy=Math.round((h-b.h)/2)-b.minY;}
  else if(edge==="TOP"){ox=Math.round((w-b.w)/2)-b.minX;oy=margin-b.minY;}
  else if(edge==="BOTTOM"){ox=Math.round((w-b.w)/2)-b.minX;oy=h-margin-1-b.maxY;}
  else {ox=w-margin-1-b.maxX;oy=Math.round((h-b.h)/2)-b.minY;}
  return shape.map(c=>({...c,x:c.x+ox,y:c.y+oy}));
}
function setFree(free,w,h,x,y){if(x>=0&&x<w&&y>=0&&y<h)free[y*w+x]=1;}
function carveDisk(free,w,h,x,y,r){const rr=r*r;for(let yy=Math.max(0,y-r);yy<=Math.min(h-1,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(w-1,x+r);xx++){const dx=xx-x,dy=yy-y;if(dx*dx+dy*dy<=rr)setFree(free,w,h,xx,yy);}}
function centroid(cells){let x=0,y=0;for(const c of cells){x+=c.x;y+=c.y;}return{x:x/cells.length,y:y/cells.length};}
function chooseCheckpoint(edgeCandidates,w,h,bodyDiameter,rng){
  const edge=edgeCandidates[rng.int(edgeCandidates.length)],m=Math.max(4,bodyDiameter+2);
  if(edge==="RIGHT")return{edge,x:w-1,y:m+rng.int(Math.max(1,h-2*m))};
  const lo=Math.max(m,Math.floor(w*.68)),hi=Math.max(lo,w-1-m),x=lo+rng.int(Math.max(1,hi-lo+1));
  return edge==="TOP"?{edge,x,y:0}:{edge,x,y:h-1};
}
function stepToward(cur,target,rng,detour,w,h){
  const dirs=DIR4.map(([dx,dy])=>({dx,dy})),old=Math.abs(target.x-cur.x)+Math.abs(target.y-cur.y);let best=null,bestScore=Infinity;
  for(const d of dirs){const nx=cur.x+d.dx,ny=cur.y+d.dy;if(nx<2||nx>=w-2||ny<2||ny>=h-2)continue;const nd=Math.abs(target.x-nx)+Math.abs(target.y-ny);let score=nd+rng.next()*3;if(rng.next()<detour&&nd<=old)score+=8+rng.next()*8;if(score<bestScore){best={x:nx,y:ny};bestScore=score;}}
  return best||cur;
}
function routePoint(x,y,w,h,margin=3){return{x:clamp(Math.round(x),margin,w-1-margin),y:clamp(Math.round(y),margin,h-1-margin)};}
function routeKindsForStage(stage){
  const st=Math.max(0,Math.min(V5_PROC_STAGES.length-1,stage));
  if(st===0)return["DIRECT","BEND"];
  if(st===1)return["BEND","S_CURVE"];
  if(st===2)return["S_CURVE","BACKTRACK","BEND"];
  if(st===3)return["MAZE_ZIGZAG","BACKTRACK","SPIRAL"];
  if(st===4)return["SPIRAL","MAZE_ZIGZAG","BACKTRACK","S_CURVE"];
  return["BACKTRACK","BACKTRACK","MAZE_ZIGZAG","SPIRAL","S_CURVE","BEND"];
}
function routeWaypoints(start,target,radius,rng,stage,w,h){
  const kinds=routeKindsForStage(stage),kind=kinds[rng.int(kinds.length)],pts=[],dx=target.x-start.x,dy=target.y-start.y,sx=Math.sign(dx)||1,sy=Math.sign(dy)||1,m=Math.max(4,radius+3),spanX=Math.max(8,Math.floor(w*.22)),spanY=Math.max(8,Math.floor(h*.25));
  if(kind==="DIRECT")return{kind,points:[routePoint(target.x,target.y,w,h,m)]};
  if(kind==="BEND"){
    if(Math.abs(dx)>=Math.abs(dy))pts.push(routePoint(start.x+dx*.45,start.y+(rng.next()<.5?-1:1)*Math.min(spanY,Math.max(radius*3,Math.abs(dy)+radius*2)),w,h,m));
    else pts.push(routePoint(start.x+(rng.next()<.5?-1:1)*Math.min(spanX,Math.max(radius*3,Math.abs(dx)+radius*2)),start.y+dy*.45,w,h,m));
  }else if(kind==="S_CURVE"){
    const y1=clamp(start.y+(rng.next()<.5?-1:1)*spanY,m,h-1-m),y2=clamp(start.y-(y1-start.y),m,h-1-m);
    pts.push(routePoint(start.x+dx*.28,y1,w,h,m));pts.push(routePoint(start.x+dx*.58,y2,w,h,m));pts.push(routePoint(start.x+dx*.78,(y1+y2)*.5,w,h,m));
  }else if(kind==="BACKTRACK"){
    if(Math.abs(dx)>=Math.abs(dy)){pts.push(routePoint(start.x-sx*Math.max(radius*4,Math.floor(spanX*.65)),start.y,w,h,m));pts.push(routePoint(start.x-sx*Math.max(radius*3,Math.floor(spanX*.45)),clamp(start.y+(rng.next()<.5?-1:1)*spanY,m,h-1-m),w,h,m));pts.push(routePoint(start.x+dx*.35,pts.at(-1).y,w,h,m));}
    else{pts.push(routePoint(start.x,start.y-sy*Math.max(radius*4,Math.floor(spanY*.65)),w,h,m));pts.push(routePoint(clamp(start.x+(rng.next()<.5?-1:1)*spanX,m,w-1-m),start.y-sy*Math.max(radius*3,Math.floor(spanY*.45)),w,h,m));pts.push(routePoint(pts.at(-1).x,start.y+dy*.35,w,h,m));}
  }else if(kind==="MAZE_ZIGZAG"){
    const lo=m+radius,hi=h-1-m-radius,a=clamp(start.y-spanY,lo,hi),b=clamp(start.y+spanY,lo,hi),count=4+rng.int(3);
    for(let k=1;k<=count;k++){const q=k/(count+1);pts.push(routePoint(start.x+dx*q,(k%2?a:b),w,h,m));}
  }else if(kind==="SPIRAL"){
    const cx=clamp(start.x+dx*.48,m+radius*3,w-1-m-radius*3),cy=clamp(start.y+dy*.35,m+radius*3,h-1-m-radius*3),rx=Math.max(radius*3,Math.min(Math.floor(w*.19),Math.floor(Math.abs(dx)*.45)+radius*2)),ry=Math.max(radius*3,Math.min(Math.floor(h*.27),Math.floor(Math.abs(dy)*.5)+radius*4)),left=clamp(cx-rx,m,w-1-m),right=clamp(cx+rx,m,w-1-m),top=clamp(cy-ry,m,h-1-m),bottom=clamp(cy+ry,m,h-1-m),inset=Math.max(radius*2+2,3);
    pts.push(routePoint(left,top,w,h,m));pts.push(routePoint(right,top,w,h,m));pts.push(routePoint(right,bottom,w,h,m));pts.push(routePoint(left,bottom,w,h,m));pts.push(routePoint(left+inset,bottom-inset,w,h,m));pts.push(routePoint(left+inset,top+inset,w,h,m));pts.push(routePoint(right-inset,top+inset,w,h,m));
  }else throw new Error("invalid V5 route kind "+kind);
  pts.push(routePoint(target.x,target.y,w,h,m));return{kind,points:pts};
}
function carvePath(free,w,h,start,target,radius,rng,stage){
  const path=[{x:Math.round(start.x),y:Math.round(start.y)}],cur={...path[0]},detour=V5_PROC_STAGES[Math.max(0,Math.min(V5_PROC_STAGES.length-1,stage))].detour,randomBudget=Math.max(w+h,Math.floor((w+h)*(1+detour*2.5)));
  for(let i=0;i<randomBudget;i++){if(Math.abs(target.x-cur.x)+Math.abs(target.y-cur.y)<=radius+2)break;const nx=stepToward(cur,target,rng,detour,w,h);cur.x=nx.x;cur.y=nx.y;path.push({...cur});}
  let guard=0;while((cur.x!==target.x||cur.y!==target.y)&&guard++<w+h+20){const dx=target.x===cur.x?0:(target.x>cur.x?1:-1),dy=target.y===cur.y?0:(target.y>cur.y?1:-1);if(dx&&dy){if(rng.next()<.5)cur.x+=dx;else cur.y+=dy;}else{cur.x+=dx;cur.y+=dy;}path.push({...cur});}
  for(const p of path)carveDisk(free,w,h,p.x,p.y,radius);return path;
}
function carveRoute(free,w,h,start,target,radius,rng,stage){const route=routeWaypoints(start,target,radius,rng,stage,w,h);let cur={x:Math.round(start.x),y:Math.round(start.y)},path=[];for(const wp of route.points){const seg=carvePath(free,w,h,cur,wp,radius,rng,stage);if(path.length&&seg.length)seg.shift();path.push(...seg);cur={...wp};}return{kind:route.kind,path};}
function carveBranches(free,w,h,path,radius,rng,stage){const st=V5_PROC_STAGES[Math.max(0,Math.min(V5_PROC_STAGES.length-1,stage))],count=Math.floor(path.length*st.branchScale);for(let b=0;b<count;b++){let p={...path[rng.int(path.length)]};const len=5+rng.int(Math.max(6,Math.floor((w+h)/9)));let d=DIR4[rng.int(4)];for(let i=0;i<len;i++){if(rng.next()<.25)d=DIR4[rng.int(4)];p={x:clamp(p.x+d[0],2,w-3),y:clamp(p.y+d[1],2,h-3)};carveDisk(free,w,h,p.x,p.y,Math.max(1,Math.floor(radius*.55)));}}}
export function v5ProceduralLayout({cellCount=16,seed=1,stage=0,entryEdge="LEFT",shape=null}={}){
  const n=Math.max(2,Math.floor(cellCount)),bodyShape=shape||v5CompactConnectedShape(n,new RNG(((seed>>>0)^0x51f15e)>>>0)),rng=new RNG(mixSeed((seed>>>0)^Math.imul(stage+1,0x85ebca6b)^Math.imul(entryEdge.charCodeAt(0),0xc2b2ae35))),b=bounds(bodyShape),diam=Math.max(b.w,b.h,Math.ceil(Math.sqrt(n))),w=Math.max(48,diam*4+30),h=Math.max(32,diam*4+24),st=V5_PROC_STAGES[Math.max(0,Math.min(V5_PROC_STAGES.length-1,stage))],entryInset=stage>=3?Math.max(6,Math.ceil(diam*2.75)):4,cubes=placeShape(bodyShape,entryEdge,w,h,entryInset),free=new Uint8Array(w*h),radius=Math.max(2,Math.ceil(diam*st.widthScale*.5));
  for(const c of cubes)carveDisk(free,w,h,c.x,c.y,radius+2);
  const checkpoint=chooseCheckpoint(["RIGHT","TOP","BOTTOM"],w,h,diam,rng),start=centroid(cubes),route=carveRoute(free,w,h,start,checkpoint,radius,rng,stage),path=route.path;
  carveBranches(free,w,h,path,radius,rng,stage);
  const corridorWidth=radius*2+1,exitDepth=Math.max(radius+3,Math.ceil(n/Math.max(3,corridorWidth))+3);let plane,bandHalf=Math.max(radius+2,Math.ceil(n/Math.max(2,2*exitDepth))+3);
  if(checkpoint.edge==="RIGHT"){plane=Math.max(Math.floor(w*.62),w-exitDepth-1);for(let x=plane;x<w;x++)for(let y=Math.max(1,checkpoint.y-bandHalf);y<=Math.min(h-2,checkpoint.y+bandHalf);y++)setFree(free,w,h,x,y);}
  else if(checkpoint.edge==="TOP"){plane=Math.min(Math.floor(h*.38),exitDepth);for(let y=0;y<=plane;y++)for(let x=Math.max(1,checkpoint.x-bandHalf);x<=Math.min(w-2,checkpoint.x+bandHalf);x++)setFree(free,w,h,x,y);}
  else{plane=Math.max(Math.floor(h*.62),h-exitDepth-1);for(let y=plane;y<h;y++)for(let x=Math.max(1,checkpoint.x-bandHalf);x<=Math.min(w-2,checkpoint.x+bandHalf);x++)setFree(free,w,h,x,y);}
  for(const c of cubes)setFree(free,w,h,c.x,c.y);
  return{gridW:w,gridH:h,free,cubes,checkpoint:{...checkpoint,plane,bandHalf},entryEdge,pathLength:path.length,radius,routeKind:route.kind};
}
export function nativeV5RouteKindForSeed(seed,stage,cellCount=16,entryEdge="LEFT"){
  const n=Math.max(2,Math.floor(cellCount)),shape=v5CompactConnectedShape(n,new RNG(((seed>>>0)^0x51f15e)>>>0)),b=bounds(shape),diam=Math.max(b.w,b.h,Math.ceil(Math.sqrt(n))),w=Math.max(48,diam*4+30),h=Math.max(32,diam*4+24);
  const rng=new RNG(mixSeed((seed>>>0)^Math.imul(stage+1,0x85ebca6b)^Math.imul(entryEdge.charCodeAt(0),0xc2b2ae35)));
  chooseCheckpoint(["RIGHT","TOP","BOTTOM"],w,h,diam,rng);
  const kinds=routeKindsForStage(stage);
  return kinds[rng.int(kinds.length)];
}

export const V5_EXPLICIT_ROUTE_STAGE=Object.freeze({
  "direct":0,
  "bend":1,
  "s-curve":2,
  "backtrack":3,
  "maze-zigzag":4,
  "spiral":5
});
export function routeKindForMapKind(kind){
  if(kind==="direct")return"DIRECT";if(kind==="bend")return"BEND";if(kind==="s-curve")return"S_CURVE";
  if(kind==="backtrack")return"BACKTRACK";if(kind==="maze-zigzag")return"MAZE_ZIGZAG";if(kind==="spiral")return"SPIRAL";return null;
}
export function canonicalV5StageForMapKind(kind){const s=V5_EXPLICIT_ROUTE_STAGE[kind];return Number.isInteger(s)?s:null;}
export function resolveExactV5RouteIdentity(kind,requestedSeed,cellCount=16,maxAttempts=4096){
  const target=routeKindForMapKind(kind),stage=canonicalV5StageForMapKind(kind);
  if(!target||stage==null)return null;
  const n=Math.max(2,Math.floor(Number(cellCount)||16)),base=Number(requestedSeed)>>>0;
  for(let i=0;i<maxAttempts;i++){
    const candidate=(base+Math.imul(i,0x9e3779b9))>>>0;
    if(nativeV5RouteKindForSeed(candidate,stage,n,"LEFT")===target)return{seed:candidate,stage,routeKind:target,attempts:i+1,cellCount:n};
  }
  throw new Error("unable to resolve exact V5 route "+target+" from seed "+base+" at swarm size "+n);
}
export function resolveExactV5RouteSeed(kind,requestedSeed,cellCount=16,maxAttempts=4096){
  const id=resolveExactV5RouteIdentity(kind,requestedSeed,cellCount,maxAttempts);
  if(!id)return null;
  const layout=v5ProceduralLayout({cellCount:id.cellCount,seed:id.seed,stage:id.stage,entryEdge:"LEFT"});
  if(layout.routeKind!==id.routeKind)throw new Error("V5 route predictor mismatch for "+id.routeKind+" seed "+id.seed);
  return{...id,layout};
}

