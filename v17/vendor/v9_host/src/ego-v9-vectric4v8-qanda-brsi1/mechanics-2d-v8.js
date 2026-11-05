import { ACTIONS } from "./v8-2d-actions.js";
import { dot2, unit2 } from "./math.js";
import { key, occupiedMap, connectedWithout, destinationDegree, cubesConnected, isSolid } from "./world-2d-v8.js";

export function componentAcrossEdge(cubes, root, anchor) {
  const occ=occupiedMap(cubes), seen=new Set([root]), q=[root];
  for (let qi=0; qi<q.length; qi++) {
    const i=q[qi], p=cubes[i];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const j=occ.get(key(p.x+dx,p.y+dy));
      if (j===undefined) continue;
      if ((i===root&&j===anchor)||(i===anchor&&j===root)) continue;
      if (!seen.has(j)) { seen.add(j); q.push(j); }
    }
  }
  if (seen.has(anchor)) return null;
  return Array.from(seen);
}

export function actionResultCubes(world, action) {
  const cubes=world.cubes.map(c=>({...c}));
  for (const m of action.moves) cubes[m.i]={x:m.x,y:m.y};
  return cubes;
}

function actionSignature(action) {
  return action.moves.map(m=>`${m.i}:${m.x}:${m.y}`).sort().join("|");
}

export function mechanicalCandidates(world, activeEgo) {
  const cubes=world.cubes, occ=occupiedMap(cubes), out=[], seen=new Set();
  const push=(action)=>{
    if (!action.moves.some(m=>m.i===activeEgo)) return;
    const sig=actionSignature(action); if (seen.has(sig)) return;
    const next=actionResultCubes(world,action), occ2=new Set();
    for (const c of next) {
      const k=key(c.x,c.y);
      if (occ2.has(k)||isSolid(world,c.x,c.y)) return;
      occ2.add(k);
    }
    if (!cubesConnected(next)) return;
    seen.add(sig); out.push(action);
  };
  const p=cubes[activeEgo];
  if (connectedWithout(cubes,activeEgo)) {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const anchor=occ.get(key(p.x+dx,p.y+dy)); if (anchor===undefined) continue;
      const a=cubes[anchor], rx=p.x-a.x, ry=p.y-a.y;
      for (const turn of [-1,1]) {
        const nrx=turn===1?-ry:ry, nry=turn===1?rx:-rx;
        const nx=a.x+nrx, ny=a.y+nry;
        if (occ.has(key(nx,ny))||isSolid(world,nx,ny)||destinationDegree(cubes,activeEgo,nx,ny)<1) continue;
        push({kind:"cell",cube:activeEgo,anchor,turn,movingSize:1,moves:[{i:activeEgo,x:nx,y:ny}]});
      }
    }
  }
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const anchor=occ.get(key(p.x+dx,p.y+dy)); if (anchor===undefined) continue;
    const moving=componentAcrossEdge(cubes,activeEgo,anchor);
    if (!moving||!moving.length||moving.length===cubes.length) continue;
    const a=cubes[anchor];
    for (const turn of [-1,1]) {
      const moves=moving.map(i=>{
        const c=cubes[i], rx=c.x-a.x, ry=c.y-a.y;
        const nrx=turn===1?-ry:ry, nry=turn===1?rx:-rx;
        return {i,x:a.x+nrx,y:a.y+nry};
      });
      push({kind:"limb",cube:activeEgo,anchor,turn,movingSize:moving.length,moves});
    }
  }
  return out;
}

export function desiredDrive(world, egoId) {
  const r=world.egoRuntime[egoId], a=ACTIONS[r.intentAction]||ACTIONS[0];
  const u=unit2(a.dx,a.dy);
  return {x:u.x*r.confidence,y:u.y*r.confidence};
}

export function candidateDrive(world, candidate) {
  let support=0, opposition=0;
  const moved=new Set(candidate.moves.map(m=>m.i));
  const occ=occupiedMap(world.cubes);
  const seenBoundary=new Set();

  for (const mv of candidate.moves) {
    const from=world.cubes[mv.i];
    const move=unit2(mv.x-from.x,mv.y-from.y);
    const own=desiredDrive(world,mv.i);
    const ownProj=dot2(own.x,own.y,move.x,move.y);
    if (ownProj>=0) support+=ownProj; else opposition+=-ownProj;

    // Only immediate attachment neighbours may mechanically support/resist.
    // This is not a global vote: it is local force transmission across the
    // boundary between the moving component and stationary attached cells.
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const j=occ.get(key(from.x+dx,from.y+dy));
      if (j===undefined || moved.has(j)) continue;
      const edge=mv.i<j?`${mv.i}:${j}`:`${j}:${mv.i}`;
      if (seenBoundary.has(edge)) continue;
      seenBoundary.add(edge);
      const nv=desiredDrive(world,j);
      const proj=dot2(nv.x,nv.y,move.x,move.y);
      if (proj>=0) support+=proj; else opposition+=-proj;
    }
  }
  return {support,opposition};
}

export function resolveIntent(world, activeEgo, actionIndex, confidence, mechanicsCfg) {
  // Comparable local-motion sensor: every global transition starts with zero
  // displacement and records exactly what this transition physically moved.
  for (const r of world.egoRuntime) { r.lastGlobalDx=0; r.lastGlobalDy=0; }
  const runtime=world.egoRuntime[activeEgo];
  runtime.intentAction=actionIndex;
  runtime.confidence=Math.max(0,Math.min(1,Number(confidence)||0));
  runtime.actionCount++;
  runtime.lastActiveGlobalStep=world.globalStep;

  const desired=ACTIONS[actionIndex]||ACTIONS[0];
  const desiredUnit=unit2(desired.dx,desired.dy);
  const before=world.cubes.map(c=>({...c}));

  if (actionIndex===0) {
    runtime.lastOwnActualDx=0; runtime.lastOwnActualDy=0;
    runtime.motorMismatchX=0; runtime.motorMismatchY=0;
    return {accepted:true,reason:"stay",requested:{dx:0,dy:0},actual:{dx:0,dy:0},movedIds:[],beforeCells:before,afterCells:before.map(c=>({...c})),mechanicalAction:null};
  }

  const candidates=mechanicalCandidates(world,activeEgo);
  let best=null;
  for (const c of candidates) {
    const mv=c.moves.find(m=>m.i===activeEgo);
    const from=world.cubes[activeEgo], au=unit2(mv.x-from.x,mv.y-from.y);
    const alignment=dot2(desiredUnit.x,desiredUnit.y,au.x,au.y);
    if (alignment < mechanicsCfg.minAlignment) continue;
    const drive=candidateDrive(world,c);
    const passive=mechanicsCfg.passiveLoadBase + mechanicsCfg.passiveLoadPerExtraCell*Math.max(0,c.movingSize-1);
    const net=drive.support-drive.opposition-passive;
    const score=alignment*2+net-0.02*c.movingSize;
    if (!best||score>best.score) best={c,alignment,drive,passive,net,score};
  }

  if (!best) {
    runtime.lastOwnActualDx=0; runtime.lastOwnActualDy=0;
    runtime.motorMismatchX=runtime.confidence*desiredUnit.x;
    runtime.motorMismatchY=runtime.confidence*desiredUnit.y;
    return {accepted:false,reason:"no_aligned_mechanical_candidate",requested:{dx:desiredUnit.x,dy:desiredUnit.y},actual:{dx:0,dy:0},movedIds:[],beforeCells:before,afterCells:before.map(c=>({...c})),mechanicalAction:null};
  }
  if (best.net < mechanicsCfg.minNetDrive) {
    runtime.lastOwnActualDx=0; runtime.lastOwnActualDy=0;
    runtime.motorMismatchX=runtime.confidence*desiredUnit.x;
    runtime.motorMismatchY=runtime.confidence*desiredUnit.y;
    return {accepted:false,reason:"insufficient_local_drive",requested:{dx:desiredUnit.x,dy:desiredUnit.y},actual:{dx:0,dy:0},movedIds:[],beforeCells:before,afterCells:before.map(c=>({...c})),mechanicalAction:best.c,drive:best.drive,netDrive:best.net};
  }

  const after=actionResultCubes(world,best.c);
  world.cubes=after;
  world.lastMove=activeEgo;
  world.lastMoves=best.c.moves.map(m=>m.i);
  for (let i=0;i<world.cubes.length;i++) {
    const dx=after[i].x-before[i].x, dy=after[i].y-before[i].y;
    world.egoRuntime[i].lastGlobalDx=dx;
    world.egoRuntime[i].lastGlobalDy=dy;
    world.egoRuntime[i].sinceLastDx+=dx;
    world.egoRuntime[i].sinceLastDy+=dy;
  }
  const ownDx=after[activeEgo].x-before[activeEgo].x, ownDy=after[activeEgo].y-before[activeEgo].y;
  const au=unit2(ownDx,ownDy);
  runtime.lastOwnActualDx=ownDx; runtime.lastOwnActualDy=ownDy;
  runtime.motorMismatchX=runtime.confidence*(desiredUnit.x-au.x);
  runtime.motorMismatchY=runtime.confidence*(desiredUnit.y-au.y);

  return {
    accepted:true,reason:"moved",requested:{dx:desiredUnit.x,dy:desiredUnit.y},
    actual:{dx:ownDx,dy:ownDy},movedIds:best.c.moves.map(m=>m.i),
    beforeCells:before,afterCells:after.map(c=>({...c})),mechanicalAction:best.c,
    drive:best.drive,netDrive:best.net
  };
}
