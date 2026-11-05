import { GRID_W, GRID_H, WALL_L, WALL_R, DEFAULT_SWARM_SIZE } from "./config.js";
import { clamp, RNG } from "./math.js";
import {resolveExactV5RouteSeed,v5CompactConnectedShape} from "./v5-procedural-maps.js";

export const key = (x, y) => `${x},${y}`;
const PROC_KINDS=new Set(["direct","bend","s-curve","backtrack","maze-zigzag","spiral"]);
export function isProceduralMapKind(kind){return PROC_KINDS.has(kind);}
export function isV5ProceduralWorld(world){return world?.v5Procedural===true;}

export function openingForStage(stage, seed) {
  const open = [];
  const rng = new RNG((seed >>> 0) ^ 0x9e3779b9);
  for (let x = WALL_L; x <= WALL_R; x++) {
    let lo = 7, hi = 18;
    const c = x - WALL_L;
    if (stage === 0) { lo = 6; hi = 19; }
    else if (stage === 1) { const shrink = Math.min(c, 3); lo = 6 + shrink; hi = 19 - shrink; }
    else if (stage === 2) { lo = 11; hi = 14; }
    else if (stage === 3) { const centers = [10, 11, 13, 14, 13]; const center = centers[c]; lo = center - 2; hi = center + 2; }
    else if (stage === 4) { const halfWidths = [2, 2, 5, 3, 2], centers = [13, 13, 12, 12, 12]; lo = centers[c] - halfWidths[c]; hi = centers[c] + halfWidths[c]; }
    else {
      if (c === 0) { const center = 10 + rng.int(7), half = 2 + rng.int(3); lo = center - half; hi = center + half; }
      else { const prev = open[c - 1], center = clamp(Math.round((prev.lo + prev.hi) / 2 + (rng.int(3) - 1)), 8, 17), half = 2 + rng.int(3); lo = center - half; hi = center + half; }
    }
    lo = clamp(Math.round(lo), 1, GRID_H - 2); hi = clamp(Math.round(hi), lo + 1, GRID_H - 2);
    open.push({ x, lo, hi, center: (lo + hi) / 2 });
  }
  return open;
}

const COMPOSITE_V1_KINDS=Object.freeze(["v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural"]);
function v1StageIndex(kind){return Math.max(0,COMPOSITE_V1_KINDS.indexOf(String(kind)));}
function shuffledCompositeKinds(seed){
  const a=[...COMPOSITE_V1_KINDS],rng=new RNG((seed>>>0)^0xC011AB1E);
  for(let i=a.length-1;i>0;i--){const j=rng.int(i+1),q=a[i];a[i]=a[j];a[j]=q;}
  return a;
}
export function compositeV1Spec(seed=1){
  const rng=new RNG((seed>>>0)^0x51CEB00C),order=shuffledCompositeKinds(seed),segments=[];
  let cursor=10;
  for(let i=0;i<order.length;i++){
    const kind=order[i],stage=v1StageIndex(kind),stretch=1+rng.int(2),shift=rng.int(5)-2;
    const sourceSeed=((seed>>>0)+0x9e3779b9*(i+1))>>>0;
    const width=5*stretch;
    segments.push({index:i,kind,stage,startX:cursor,endX:cursor+width-1,stretch,shift,sourceSeed});
    cursor+=width+4;
  }
  return{schema:"octopus-v1-composite-spec-v1",seed:seed>>>0,order,segments,gridW:cursor+10,gridH:GRID_H};
}
function makeCompositeV1World(stage,seed,maxGlobalActions,swarmSize){
  const n=Math.max(2,Math.floor(Number(swarmSize)||DEFAULT_SWARM_SIZE)),spec=compositeV1Spec(seed),gridW=spec.gridW,gridH=spec.gridH,free=new Uint8Array(gridW*gridH);
  const carve=(x,y)=>{if(x>0&&x<gridW-1&&y>0&&y<gridH-1)free[y*gridW+x]=1;};
  const wideLo=3,wideHi=gridH-4;
  for(let x=1;x<gridW-1;x++)for(let y=wideLo;y<=wideHi;y++)carve(x,y);
  for(const seg of spec.segments){
    const opening=openingForStage(seg.stage,seg.sourceSeed);
    for(let x=seg.startX;x<=seg.endX;x++){
      const sourceColumn=Math.min(4,Math.floor((x-seg.startX)/seg.stretch)),b=opening[sourceColumn];
      const lo=clamp(Math.round(b.lo+seg.shift),1,gridH-2),hi=clamp(Math.round(b.hi+seg.shift),lo+1,gridH-2);
      for(let y=1;y<gridH-1;y++)free[y*gridW+x]=(y>=lo&&y<=hi)?1:0;
    }
  }
  const shape=v5CompactConnectedShape(n,new RNG(((seed>>>0)^0xC0A1B1A5)>>>0)),b=shapeBounds(shape),spawnMaxX=8;
  if(b.w>spawnMaxX-1||b.h>wideHi-wideLo+1)throw new Error("swarm size "+n+" exceeds composite-map spawn capacity");
  const ox=clamp(4-b.minX,1-b.minX,spawnMaxX-b.maxX),oy=clamp(Math.round((gridH-b.h)/2)-b.minY,wideLo-b.minY,wideHi-b.maxY);
  const cubes=shape.map(c=>({x:c.x+ox,y:c.y+oy}));
  const cpY=Math.floor(gridH/2),world={
    stage,seed:seed>>>0,mapKind:"v1-composite-long",routeKind:"v1-composite-long",v5Procedural:true,
    gridW,gridH,free,terrain:free,opening:[],cubes,swarmSize:n,
    checkpoint:{edge:"RIGHT",plane:gridW-2,x:gridW-2,y:cpY,bandHalf:Math.max(3,Math.floor((wideHi-wideLo)/3))},
    entryEdge:"LEFT",pathLength:gridW-6,radius:null,checkpointCount:spec.segments.length,
    globalStep:0,maxGlobalActions,success:false,lastMove:null,lastMoves:[],simTime:0,egoRuntime:null,distanceField:null
  };
  // Ground-truth slice provenance is deliberately not attached to world. The proof
  // harness can recreate it from compositeV1Spec(seed); learner/runtime packets
  // therefore cannot accidentally consume segment identities.
  world.distanceField=buildDistanceField(world);
  world.egoRuntime=Array.from({length:world.cubes.length},(_,i)=>createEgoRuntime(i,world));
  assertWorldInvariants(world);
  return world;
}


export function worldGridW(world){return isV5ProceduralWorld(world)?world.gridW:GRID_W;}
export function worldGridH(world){return isV5ProceduralWorld(world)?world.gridH:GRID_H;}

export function isSolid(world, x, y) {
  if(isV5ProceduralWorld(world)){
    if(x<0||x>=world.gridW||y<0||y>=world.gridH)return true;
    return world.free[y*world.gridW+x]!==1;
  }
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return true;
  if (x < WALL_L || x > WALL_R) return false;
  const b = world.opening[x - WALL_L];
  return y < b.lo || y > b.hi;
}

export function occupiedMap(cubes, skip = -1) {
  const map = new Map(); for (let i = 0; i < cubes.length; i++) if (i !== skip) map.set(key(cubes[i].x, cubes[i].y), i); return map;
}
export function cubesConnected(cubes) {
  if (!cubes.length) return true;
  const occ = occupiedMap(cubes), seen = new Set([0]), q = [0], dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let qi = 0; qi < q.length; qi++) { const i = q[qi], p = cubes[i]; for (const [dx,dy] of dirs) { const j = occ.get(key(p.x + dx, p.y + dy)); if (j !== undefined && !seen.has(j)) { seen.add(j); q.push(j); } } }
  return seen.size === cubes.length;
}
export function connectedWithout(cubes, skip) { if (cubes.length <= 2) return true; return cubesConnected(cubes.filter((_, i) => i !== skip)); }
export function destinationDegree(cubes, movingIdx, x, y) { const occ = occupiedMap(cubes, movingIdx); let d = 0; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (occ.has(key(x + dx, y + dy))) d++; return d; }

export function zoneForX(x) { if (x > WALL_R) return "PASSED"; if (x >= WALL_L) return "IN_GATE"; return "PRE_GATE"; }
export function isPassed(world,c){
  if(!isV5ProceduralWorld(world))return c.x>WALL_R;
  const cp=world.checkpoint,band=Math.max(0,Number(cp.bandHalf)||0);
  if(cp.edge==="RIGHT")return c.x>=cp.plane&&Math.abs(c.y-cp.y)<=band;
  if(cp.edge==="TOP")return c.y<=cp.plane&&Math.abs(c.x-cp.x)<=band;
  return c.y>=cp.plane&&Math.abs(c.x-cp.x)<=band;
}
export function checkpointZone(world,c){
  if(!isV5ProceduralWorld(world))return zoneForX(c.x);
  const cp=world.checkpoint,band=Math.max(0,Number(cp.bandHalf)||0);
  if(isPassed(world,c))return"PASSED";
  if(cp.edge==="RIGHT"&&c.x===cp.plane-1&&Math.abs(c.y-cp.y)<=band)return"IN_GATE";
  if(cp.edge==="TOP"&&c.y===cp.plane+1&&Math.abs(c.x-cp.x)<=band)return"IN_GATE";
  if(cp.edge==="BOTTOM"&&c.y===cp.plane-1&&Math.abs(c.x-cp.x)<=band)return"IN_GATE";
  return"PRE_GATE";
}
export function checkpointVector(world,c){
  if(!isV5ProceduralWorld(world))return{dx:WALL_R+1-c.x,dy:(world.opening[clamp(Math.round(c.x),WALL_L,WALL_R)-WALL_L]?.center??13)-c.y};
  const cp=world.checkpoint;
  if(cp.edge==="RIGHT")return{dx:cp.plane-c.x,dy:cp.y-c.y};
  if(cp.edge==="TOP")return{dx:cp.x-c.x,dy:cp.plane-c.y};
  return{dx:cp.x-c.x,dy:cp.plane-c.y};
}
export function localGateHalfWidth(world,c){
  if(isV5ProceduralWorld(world))return Math.max(0,Number(world.checkpoint?.bandHalf)||0);
  const ix=clamp(Math.round(c.x),WALL_L,WALL_R)-WALL_L,b=world.opening[ix];return Math.max(0,(b.hi-b.lo+1)/2);
}

export function bodyMetrics(world) {
  let sx=0, sy=0, minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, passed=0, inGate=0;
  for (const c of world.cubes) { sx += c.x; sy += c.y; minX = Math.min(minX,c.x); maxX=Math.max(maxX,c.x); minY = Math.min(minY,c.y); maxY=Math.max(maxY,c.y); const z=checkpointZone(world,c); if(z==="PASSED")passed++;else if(z==="IN_GATE")inGate++; }
  return {centroidX:sx/world.cubes.length, centroidY:sy/world.cubes.length,minX,maxX,minY,maxY,spanX:maxX-minX+1,spanY:maxY-minY+1,passed,inGate,preGate:world.cubes.length-passed-inGate};
}

export function buildDistanceField(world) {
  if(isV5ProceduralWorld(world)){
    const n=world.gridW*world.gridH,INF=1<<28,dist=new Int32Array(n);dist.fill(INF);
    const qx=new Int32Array(n),qy=new Int32Array(n);let head=0,tail=0;
    for(let y=0;y<world.gridH;y++)for(let x=0;x<world.gridW;x++){const k=y*world.gridW+x;if(world.free[k]===1&&isPassed(world,{x,y})){dist[k]=0;qx[tail]=x;qy[tail]=y;tail++;}}
    while(head<tail){const x=qx[head],y=qy[head++],base=dist[y*world.gridW+x];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=world.gridW||ny<0||ny>=world.gridH)continue;const k=ny*world.gridW+nx;if(world.free[k]!==1)continue;if(dist[k]>base+1){dist[k]=base+1;qx[tail]=nx;qy[tail]=ny;tail++;}}}
    return dist;
  }
  const n = GRID_W * GRID_H, dist = new Int32Array(n); dist.fill(1 << 28);
  const qx = new Int16Array(n), qy = new Int16Array(n); let head = 0, tail = 0, targetX = WALL_R + 1;
  for (let y=0; y<GRID_H; y++) { if (isSolid(world,targetX,y)) continue; const idx = y*GRID_W+targetX; dist[idx]=0; qx[tail]=targetX; qy[tail]=y; tail++; }
  for (; head<tail; head++) { const x=qx[head], y=qy[head], base=dist[y*GRID_W+x]; for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx, ny=y+dy; if (nx<0||nx>=GRID_W||ny<0||ny>=GRID_H||isSolid(world,nx,ny)) continue; const ni=ny*GRID_W+nx; if (dist[ni] > base+1) { dist[ni]=base+1; qx[tail]=nx; qy[tail]=ny; tail++; } } }
  return dist;
}
export function distanceAt(world, x, y) {
  if(isPassed(world,{x,y}))return 0;
  if(isV5ProceduralWorld(world)){
    if(x<0||x>=world.gridW||y<0||y>=world.gridH)return world.gridW+world.gridH;
    const v=world.distanceField[y*world.gridW+x];return v>=(1<<27)?world.gridW+world.gridH:v;
  }
  const v = world.distanceField[y*GRID_W+x]; return v >= (1<<27) ? GRID_W + GRID_H : v;
}

export function createEgoRuntime(i, world) {
  const d = distanceAt(world, world.cubes[i].x, world.cubes[i].y);
  return {intentAction:0,confidence:0,lastOwnActualDx:0,lastOwnActualDy:0,lastGlobalDx:0,lastGlobalDy:0,sinceLastDx:0,sinceLastDy:0,motorMismatchX:0,motorMismatchY:0,previousReward:0,pendingReward:0,initialDistance:d,maxProgress:0,enteredGate:false,crossedExit:false,actionCount:0,lastActiveGlobalStep:-1};
}
function classicStageForKind(stage,mapKind){
  if(mapKind==="v1-wide")return 0;if(mapKind==="v1-funnel")return 1;if(mapKind==="v1-slit")return 2;if(mapKind==="v1-offset")return 3;if(mapKind==="v1-keyhole")return 4;if(mapKind==="v1-procedural")return 5;
  if(typeof mapKind==="string"&&mapKind.startsWith("v1-stage-"))return clamp(Math.floor(Number(mapKind.slice(9))||0),0,5);return stage;
}
function shapeBounds(cells){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const c of cells){minX=Math.min(minX,c.x);minY=Math.min(minY,c.y);maxX=Math.max(maxX,c.x);maxY=Math.max(maxY,c.y);}
  return{minX,minY,maxX,maxY,w:maxX-minX+1,h:maxY-minY+1};
}
function classicSpawnCubes(cellCount,seed){
  const n=Math.max(2,Math.floor(Number(cellCount)||DEFAULT_SWARM_SIZE));
  const shape=v5CompactConnectedShape(n,new RNG(((seed>>>0)^0xC1A551C)>>>0)),b=shapeBounds(shape);
  const minX=1,maxX=WALL_L-2,minY=1,maxY=GRID_H-2;
  if(b.w>maxX-minX+1||b.h>maxY-minY+1)throw new Error("swarm size "+n+" exceeds classic-map spawn capacity");
  const ox=clamp(8-b.minX,minX-b.minX,maxX-b.maxX);
  const oy=clamp(Math.round((GRID_H-b.h)/2)-b.minY,minY-b.minY,maxY-b.maxY);
  return shape.map(c=>({x:c.x+ox,y:c.y+oy}));
}
export function makeWorld(stage=0, seed=1, maxGlobalActions=4096, mapKind="stage", swarmSize=DEFAULT_SWARM_SIZE) {
  const n=Math.max(2,Math.floor(Number(swarmSize)||DEFAULT_SWARM_SIZE));
  if(mapKind==="v1-composite-long")return makeCompositeV1World(stage,seed,maxGlobalActions,n);
  if(isProceduralMapKind(mapKind)){
    const resolved=resolveExactV5RouteSeed(mapKind,seed>>>0,n),layout=resolved.layout,actualStage=resolved.stage;
    const world={stage:actualStage,seed:seed>>>0,v5Seed:resolved.seed,v5SeedAttempts:resolved.attempts,mapKind,routeKind:layout.routeKind,v5Procedural:true,gridW:layout.gridW,gridH:layout.gridH,free:layout.free,terrain:layout.free,
      opening:[],cubes:layout.cubes.map(c=>({...c})),swarmSize:n,checkpoint:{...layout.checkpoint},entryEdge:layout.entryEdge,pathLength:layout.pathLength,radius:layout.radius,checkpointCount:0,
      globalStep:0,maxGlobalActions,success:false,lastMove:null,lastMoves:[],simTime:0,egoRuntime:null,distanceField:null};
    world.distanceField=buildDistanceField(world);world.egoRuntime=Array.from({length:world.cubes.length},(_,i)=>createEgoRuntime(i,world));assertWorldInvariants(world);return world;
  }
  const actualStage=classicStageForKind(stage,mapKind),opening=openingForStage(actualStage, seed),cubes=classicSpawnCubes(n,seed);
  const world={stage:actualStage,seed:seed>>>0,opening,cubes,swarmSize:n,mapKind:mapKind==="stage"?`v1-stage-${actualStage}`:mapKind,routeKind:null,terrain:null,v5Procedural:false,
    globalStep:0,maxGlobalActions,success:false,lastMove:null,lastMoves:[],simTime:0,egoRuntime:null,distanceField:null};
  world.distanceField=buildDistanceField(world);world.egoRuntime=Array.from({length:world.cubes.length},(_,i)=>createEgoRuntime(i,world));assertWorldInvariants(world);return world;
}
export function cloneWorld(world) {
  const out={...world,opening:(world.opening||[]).map(b=>({...b})),cubes:world.cubes.map(c=>({...c})),lastMoves:[...(world.lastMoves||[])],distanceField:Int32Array.from(world.distanceField),egoRuntime:world.egoRuntime.map(r=>({...r}))};
  if(isV5ProceduralWorld(world)){out.free=Uint8Array.from(world.free);out.terrain=out.free;out.checkpoint={...world.checkpoint};}
  return out;
}
export function assertWorldInvariants(world) {
  if (!Array.isArray(world.cubes)||world.cubes.length<2) throw new Error("Swarm must contain at least 2 cells");
  if (world.swarmSize!=null&&world.cubes.length!==world.swarmSize) throw new Error("Swarm-size metadata mismatch");
  if(isV5ProceduralWorld(world)){
    if(!Number.isSafeInteger(world.gridW)||!Number.isSafeInteger(world.gridH)||world.gridW<1||world.gridH<1)throw new Error("invalid V5 procedural dimensions");
    if(!(world.free instanceof Uint8Array)||world.free.length!==world.gridW*world.gridH)throw new Error("invalid V5 procedural free field");
    const cp=world.checkpoint;if(!cp||!["RIGHT","TOP","BOTTOM"].includes(cp.edge)||!Number.isSafeInteger(cp.plane)||!Number.isSafeInteger(cp.bandHalf))throw new Error("invalid V5 procedural checkpoint");
  }
  const seen = new Set();
  for (const c of world.cubes) { const k=key(c.x,c.y); if (seen.has(k)) throw new Error("Duplicate occupancy"); if (isSolid(world,c.x,c.y)) throw new Error("Cell inside solid"); seen.add(k); }
  if (!cubesConnected(world.cubes)) throw new Error("Body disconnected");
  return true;
}
