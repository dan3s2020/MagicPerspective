import {ACTIONS} from "./config.js";
import {cubesConnected,isSolid,key,occupiedMap,worldDimension} from "./world.js";
import * as V8Mechanics from "./mechanics-2d-v8.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DIR6=Object.freeze([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]);
const ROTATIONS=Object.freeze([
  {axis:"x",turn:1},{axis:"x",turn:-1},
  {axis:"y",turn:1},{axis:"y",turn:-1},
  {axis:"z",turn:1},{axis:"z",turn:-1}
]);
function unit3(x,y,z){const m=Math.hypot(x,y,z);return m?{x:x/m,y:y/m,z:z/m}:{x:0,y:0,z:0};}
function dot3(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function rotate90(x,y,z,axis,turn){
  if(axis==="x")return turn>0?{x,y:-z,z:y}:{x,y:z,z:-y};
  if(axis==="y")return turn>0?{x:z,y,z:-x}:{x:-z,y,z:x};
  return turn>0?{x:-y,y:x,z}:{x:y,y:-x,z};
}
function samePos(a,b){return a.x===b.x&&a.y===b.y&&(a.z||0)===(b.z||0);}

export function desiredDrive(world,egoId){
  const r=world.egoRuntime[egoId],a=ACTIONS[r.intentAction]||ACTIONS[0],u=unit3(a.dx||0,a.dy||0,a.dz||0);
  return{x:u.x*(r.confidence||0),y:u.y*(r.confidence||0),z:u.z*(r.confidence||0)};
}
export function actionResultCubes(world,action){
  const cubes=world.cubes.map(c=>({...c}));
  for(const m of action.moves)cubes[m.i]={x:m.x,y:m.y,z:m.z||0};
  return cubes;
}
function actionSignature(action){return action.moves.map(m=>`${m.i}:${m.x}:${m.y}:${m.z||0}`).sort().join("|");}

export function componentAcrossEdge3D(cubes,root,anchor){
  const occ=occupiedMap(cubes),seen=new Set([root]),q=[root];
  for(let h=0;h<q.length;h++){
    const i=q[h],p=cubes[i];
    for(const[dx,dy,dz]of DIR6){
      const j=occ.get(key(p.x+dx,p.y+dy,(p.z||0)+dz));if(j===undefined)continue;
      if((i===root&&j===anchor)||(i===anchor&&j===root))continue;
      if(!seen.has(j)){seen.add(j);q.push(j);}
    }
  }
  if(seen.has(anchor))return null;
  return[...seen];
}

export function mechanicalCandidates3D(world,activeEgo){
  const cubes=world.cubes,occ=occupiedMap(cubes),out=[],seen=new Set(),p=cubes[activeEgo];
  const push=action=>{
    if(!action.moves.some(m=>m.i===activeEgo))return;
    if(action.moves.every(m=>samePos(cubes[m.i],m)))return;
    const sig=actionSignature(action);if(seen.has(sig))return;
    const next=actionResultCubes(world,action),occ2=new Set();
    for(const c of next){const k=key(c.x,c.y,c.z||0);if(occ2.has(k)||isSolid(world,c.x,c.y,c.z||0))return;occ2.add(k);}
    if(!cubesConnected(next,3))return;seen.add(sig);out.push(action);
  };

  for(const[dx,dy,dz]of DIR6){
    const anchor=occ.get(key(p.x+dx,p.y+dy,(p.z||0)+dz));if(anchor===undefined)continue;
    const a=cubes[anchor],rx=p.x-a.x,ry=p.y-a.y,rz=(p.z||0)-(a.z||0);

    // One-cell hinge: in 3D an attached cell has four orthogonal positions
    // around the same anchor. We generate them through all valid 90° axis turns.
    for(const rot of ROTATIONS){
      const rr=rotate90(rx,ry,rz,rot.axis,rot.turn),nx=a.x+rr.x,ny=a.y+rr.y,nz=(a.z||0)+rr.z;
      if(nx===p.x&&ny===p.y&&nz===(p.z||0))continue;
      push({kind:"cell3d-hinge",cube:activeEgo,anchor,axis:rot.axis,turn:rot.turn,movingSize:1,moves:[{i:activeEgo,x:nx,y:ny,z:nz}]});
    }

    // Generalized limb hinge: cut only the local attachment edge, then rotate
    // the detached connected component by +/-90° around x/y/z through anchor.
    const moving=componentAcrossEdge3D(cubes,activeEgo,anchor);
    if(!moving||!moving.length||moving.length===cubes.length)continue;
    for(const rot of ROTATIONS){
      const moves=moving.map(i=>{
        const c=cubes[i],rr=rotate90(c.x-a.x,c.y-a.y,(c.z||0)-(a.z||0),rot.axis,rot.turn);
        return{i,x:a.x+rr.x,y:a.y+rr.y,z:(a.z||0)+rr.z};
      });
      push({kind:"limb3d-hinge",cube:activeEgo,anchor,axis:rot.axis,turn:rot.turn,movingSize:moving.length,moves});
    }
  }
  return out;
}

export function candidateDrive3D(world,candidate){
  let support=0,opposition=0;const moved=new Set(candidate.moves.map(m=>m.i)),occ=occupiedMap(world.cubes),seenBoundary=new Set();
  for(const mv of candidate.moves){
    const from=world.cubes[mv.i],move=unit3(mv.x-from.x,mv.y-from.y,(mv.z||0)-(from.z||0)),own=desiredDrive(world,mv.i),ownProj=dot3(own,move);
    if(ownProj>=0)support+=ownProj;else opposition+=-ownProj;
    for(const[dx,dy,dz]of DIR6){
      const j=occ.get(key(from.x+dx,from.y+dy,(from.z||0)+dz));if(j===undefined||moved.has(j))continue;
      const edge=mv.i<j?`${mv.i}:${j}`:`${j}:${mv.i}`;if(seenBoundary.has(edge))continue;seenBoundary.add(edge);
      const nv=desiredDrive(world,j),proj=dot3(nv,move);if(proj>=0)support+=proj;else opposition+=-proj;
    }
  }
  return{support,opposition};
}

function resolve3D(world,activeEgo,actionIndex,confidence,mechanicsCfg){
  for(const r of world.egoRuntime){r.lastGlobalDx=0;r.lastGlobalDy=0;r.lastGlobalDz=0;}
  const rt=world.egoRuntime[activeEgo],a=ACTIONS[actionIndex]||ACTIONS[0],desired=unit3(a.dx||0,a.dy||0,a.dz||0);
  rt.intentAction=actionIndex;rt.confidence=clamp(confidence,0,1);rt.actionCount++;rt.lastActiveGlobalStep=world.globalStep;
  const before=world.cubes.map(c=>({...c}));
  if(a.kind!=="motion"||actionIndex===0){
    rt.lastOwnActualDx=rt.lastOwnActualDy=rt.lastOwnActualDz=0;rt.motorMismatchX=rt.motorMismatchY=rt.motorMismatchZ=0;
    return{accepted:true,reason:a.kind||"stay",requested:{dx:a.dx||0,dy:a.dy||0,dz:a.dz||0},actual:{dx:0,dy:0,dz:0},movedIds:[],beforeCells:before,afterCells:before.map(c=>({...c})),mechanicalAction:null};
  }

  let best=null;
  for(const c of mechanicalCandidates3D(world,activeEgo)){
    const mv=c.moves.find(m=>m.i===activeEgo),from=world.cubes[activeEgo],actual=unit3(mv.x-from.x,mv.y-from.y,(mv.z||0)-(from.z||0)),alignment=dot3(desired,actual);
    if(alignment<(mechanicsCfg.minAlignment??.25))continue;
    const drive=candidateDrive3D(world,c),passive=(mechanicsCfg.passiveLoadBase??.06)+(mechanicsCfg.passiveLoadPerExtraCell??.19)*Math.max(0,c.movingSize-1),net=drive.support-drive.opposition-passive,score=alignment*2+net-.02*c.movingSize;
    if(!best||score>best.score)best={c,alignment,drive,passive,net,score};
  }
  if(!best||best.net<(mechanicsCfg.minNetDrive??.02)){
    rt.lastOwnActualDx=rt.lastOwnActualDy=rt.lastOwnActualDz=0;rt.motorMismatchX=rt.confidence*desired.x;rt.motorMismatchY=rt.confidence*desired.y;rt.motorMismatchZ=rt.confidence*desired.z;
    return{accepted:false,reason:best?"insufficient_local_drive":"no_aligned_mechanical_candidate",requested:{dx:desired.x,dy:desired.y,dz:desired.z},actual:{dx:0,dy:0,dz:0},movedIds:[],beforeCells:before,afterCells:before.map(c=>({...c})),mechanicalAction:best?.c||null,drive:best?.drive||null,netDrive:best?.net??0};
  }

  const after=actionResultCubes(world,best.c);world.cubes=after;world.lastMove=activeEgo;world.lastMoves=best.c.moves.map(m=>m.i);
  for(let i=0;i<after.length;i++){
    const dx=after[i].x-before[i].x,dy=after[i].y-before[i].y,dz=(after[i].z||0)-(before[i].z||0),r=world.egoRuntime[i];
    r.lastGlobalDx=dx;r.lastGlobalDy=dy;r.lastGlobalDz=dz;r.sinceLastDx+=dx;r.sinceLastDy+=dy;r.sinceLastDz+=dz;
  }
  const ownDx=after[activeEgo].x-before[activeEgo].x,ownDy=after[activeEgo].y-before[activeEgo].y,ownDz=(after[activeEgo].z||0)-(before[activeEgo].z||0),actual=unit3(ownDx,ownDy,ownDz);
  rt.lastOwnActualDx=ownDx;rt.lastOwnActualDy=ownDy;rt.lastOwnActualDz=ownDz;rt.motorMismatchX=rt.confidence*(desired.x-actual.x);rt.motorMismatchY=rt.confidence*(desired.y-actual.y);rt.motorMismatchZ=rt.confidence*(desired.z-actual.z);
  return{accepted:true,reason:"moved",requested:{dx:desired.x,dy:desired.y,dz:desired.z},actual:{dx:ownDx,dy:ownDy,dz:ownDz},movedIds:[...world.lastMoves],beforeCells:before,afterCells:after.map(c=>({...c})),mechanicalAction:best.c,drive:best.drive,netDrive:best.net};
}

const V9_TO_V8={1:3,2:7,3:5,4:1};
export function resolveIntent(world,activeEgo,actionIndex,confidence,mechanicsCfg={}){
  const a=ACTIONS[actionIndex]||ACTIONS[0],rt=world.egoRuntime[activeEgo];
  if(a.kind==="echo"||a.kind==="signal"||actionIndex===0){
    rt.intentAction=actionIndex;rt.confidence=clamp(confidence,0,1);rt.actionCount++;rt.lastActiveGlobalStep=world.globalStep;rt.lastGlobalDx=rt.lastGlobalDy=rt.lastGlobalDz=0;
    return{accepted:true,reason:a.kind||"stay",requested:{dx:0,dy:0,dz:0},actual:{dx:0,dy:0,dz:0},movedIds:[],beforeCells:world.cubes.map(c=>({...c})),afterCells:world.cubes.map(c=>({...c})),mechanicalAction:null};
  }
  if(worldDimension(world)===3)return resolve3D(world,activeEgo,actionIndex,confidence,mechanicsCfg);

  const mapped=V9_TO_V8[actionIndex];
  if(mapped==null){
    rt.intentAction=actionIndex;rt.confidence=clamp(confidence,0,1);rt.actionCount++;rt.lastActiveGlobalStep=world.globalStep;rt.motorMismatchX=rt.motorMismatchY=0;rt.motorMismatchZ=rt.confidence*Math.sign(a.dz||0);
    return{accepted:false,reason:"axis_unavailable_in_2d",requested:{dx:a.dx,dy:a.dy,dz:a.dz},actual:{dx:0,dy:0,dz:0},movedIds:[],beforeCells:world.cubes.map(c=>({...c})),afterCells:world.cubes.map(c=>({...c})),mechanicalAction:null};
  }
  const saved=world.egoRuntime.map(r=>r.intentAction);
  for(let i=0;i<world.egoRuntime.length;i++){const q=V9_TO_V8[saved[i]];world.egoRuntime[i].intentAction=q==null?0:q;}
  const out=V8Mechanics.resolveIntent(world,activeEgo,mapped,confidence,mechanicsCfg);
  for(let i=0;i<world.egoRuntime.length;i++)world.egoRuntime[i].intentAction=saved[i];
  rt.intentAction=actionIndex;rt.motorMismatchZ=0;rt.lastGlobalDz=0;rt.sinceLastDz=rt.sinceLastDz||0;
  out.requested={dx:a.dx,dy:a.dy,dz:0};out.actual={dx:out.actual.dx,dy:out.actual.dy,dz:0};return out;
}
