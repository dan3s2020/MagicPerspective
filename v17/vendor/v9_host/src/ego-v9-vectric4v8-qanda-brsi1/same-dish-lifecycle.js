import {assertSameDishInvariants,dishDirs,dishKey,hiddenBody,hiddenOccupancy} from "./same-dish-shadow-world.js";

function cloneCells(cells){return cells.map(c=>({x:c.x,y:c.y,z:c.z||0}));}
function connected(cells,dimension){
  if(!cells.length)return false;
  const occ=new Map(cells.map((c,i)=>[dishKey(c.x,c.y,c.z||0),i])),seen=new Set([0]),q=[0];
  for(let h=0;h<q.length;h++){
    const p=cells[q[h]];
    for(const[dx,dy,dz]of dishDirs(dimension)){
      const j=occ.get(dishKey(p.x+dx,p.y+dy,(p.z||0)+dz));
      if(j!==undefined&&!seen.has(j)){seen.add(j);q.push(j);}
    }
  }
  return seen.size===cells.length;
}
function snapshotBodies(world){return world.bodies.map(b=>({bodyId:b.bodyId,controllerId:b.controllerId,cells:cloneCells(b.cells)}));}
function restoreBodies(world,snapshot){world.bodies=snapshot.map(b=>({bodyId:b.bodyId,controllerId:b.controllerId,cells:cloneCells(b.cells)}));}
function freeAt(world,p){
  const k=dishKey(p.x,p.y,p.z||0);
  if(world.solids.has(k))return false;
  return !hiddenOccupancy(world).has(k);
}

export function budBodyCell(world,bodyId,{anchorLocalIndex=0,position=null}={}){
  const before=snapshotBodies(world),body=hiddenBody(world,bodyId);if(!body)return{accepted:false,reason:"NO_BODY"};
  const anchor=body.cells[Math.max(0,Math.min(body.cells.length-1,Math.floor(Number(anchorLocalIndex)||0)))];if(!anchor)return{accepted:false,reason:"NO_ANCHOR"};
  let p=position?{x:Number(position.x)||0,y:Number(position.y)||0,z:Number(position.z)||0}:null;
  if(!p){
    for(const[dx,dy,dz]of dishDirs(world.dimension)){
      const q={x:anchor.x+dx,y:anchor.y+dy,z:(anchor.z||0)+dz};
      if(freeAt(world,q)){p=q;break;}
    }
  }
  if(!p||!freeAt(world,p))return{accepted:false,reason:"NO_FREE_BUD_SITE"};
  const adjacent=body.cells.some(c=>Math.abs(c.x-p.x)+Math.abs(c.y-p.y)+Math.abs((c.z||0)-(p.z||0))===1);
  if(!adjacent)return{accepted:false,reason:"BUD_NOT_ATTACHED"};
  body.cells.push(p);
  try{assertSameDishInvariants(world);}catch(error){restoreBodies(world,before);return{accepted:false,reason:"INVARIANT",error:error.message};}
  world.step++;return{accepted:true,type:"BUD",bodyId:String(bodyId),position:{...p},observerOnly:true};
}

export function retireBodyCell(world,bodyId,localIndex){
  const before=snapshotBodies(world),body=hiddenBody(world,bodyId);if(!body)return{accepted:false,reason:"NO_BODY"};
  const i=Math.floor(Number(localIndex));if(!Number.isInteger(i)||i<0||i>=body.cells.length)return{accepted:false,reason:"BAD_INDEX"};
  if(body.cells.length<=2)return{accepted:false,reason:"MIN_BODY"};
  const removed=body.cells.splice(i,1)[0];
  if(!connected(body.cells,world.dimension)){restoreBodies(world,before);return{accepted:false,reason:"WOULD_DISCONNECT"};}
  try{assertSameDishInvariants(world);}catch(error){restoreBodies(world,before);return{accepted:false,reason:"INVARIANT",error:error.message};}
  world.step++;return{accepted:true,type:"RETIRE",bodyId:String(bodyId),position:{...removed},observerOnly:true};
}


export function detachBodyCellToObject(world,bodyId,localIndex,{objectId=null,movable=true}={}){
  const beforeBodies=snapshotBodies(world),beforeObjects=world.objects.map(o=>({...o,cells:cloneCells(o.cells)})),body=hiddenBody(world,bodyId);
  if(!body)return{accepted:false,reason:"NO_BODY"};
  const i=Math.floor(Number(localIndex));if(!Number.isInteger(i)||i<0||i>=body.cells.length)return{accepted:false,reason:"BAD_INDEX"};
  if(body.cells.length<=2)return{accepted:false,reason:"MIN_BODY"};
  const removed=body.cells.splice(i,1)[0];
  if(!connected(body.cells,world.dimension)){restoreBodies(world,beforeBodies);return{accepted:false,reason:"WOULD_DISCONNECT"};}
  const id=String(objectId||("DETACHED_"+bodyId+"_"+world.step));
  if(world.objects.some(o=>o.objectId===id)){restoreBodies(world,beforeBodies);return{accepted:false,reason:"OBJECT_ID_EXISTS"};}
  world.objects.push({objectId:id,movable:movable!==false,toolCandidate:false,cells:[{...removed}]});
  try{assertSameDishInvariants(world);}catch(error){restoreBodies(world,beforeBodies);world.objects=beforeObjects;return{accepted:false,reason:"INVARIANT",error:error.message};}
  world.step++;return{accepted:true,type:"DETACH_TO_OBJECT",bodyId:String(bodyId),objectId:id,position:{...removed},observerOnly:true};
}

export function spawnIndependentSpore(world,parentBodyId,indices,{newBodyId,newControllerId}={}){
  const before=snapshotBodies(world),parent=hiddenBody(world,parentBodyId);if(!parent)return{accepted:false,reason:"NO_PARENT"};
  const uniq=[...new Set((indices||[]).map(Number).filter(Number.isInteger))].sort((a,b)=>a-b);
  if(!uniq.length||uniq.some(i=>i<0||i>=parent.cells.length))return{accepted:false,reason:"BAD_INDICES"};
  const chosen=uniq.map(i=>parent.cells[i]),remain=parent.cells.filter((_,i)=>!uniq.includes(i));
  if(remain.length<2||!connected(remain,world.dimension)||!connected(chosen,world.dimension))return{accepted:false,reason:"INVALID_FISSION"};
  const id=String(newBodyId||("SPORE_"+world.step));if(hiddenBody(world,id))return{accepted:false,reason:"BODY_ID_EXISTS"};
  parent.cells=cloneCells(remain);world.bodies.push({bodyId:id,controllerId:String(newControllerId||id),cells:cloneCells(chosen)});
  try{assertSameDishInvariants(world);}catch(error){restoreBodies(world,before);return{accepted:false,reason:"INVARIANT",error:error.message};}
  world.step++;return{accepted:true,type:"SPORE_BIRTH",parentBodyId:String(parentBodyId),newBodyId:id,observerOnly:true};
}

export function fuseBodies(world,bodyAId,bodyBId,{newBodyId=null,newControllerId=null}={}){
  const before=snapshotBodies(world),a=hiddenBody(world,bodyAId),b=hiddenBody(world,bodyBId);
  if(!a||!b||a===b)return{accepted:false,reason:"BAD_BODIES"};
  const touching=a.cells.some(x=>b.cells.some(y=>Math.abs(x.x-y.x)+Math.abs(x.y-y.y)+Math.abs((x.z||0)-(y.z||0))===1));
  if(!touching)return{accepted:false,reason:"NOT_TOUCHING"};
  const combined=[...cloneCells(a.cells),...cloneCells(b.cells)];
  if(!connected(combined,world.dimension))return{accepted:false,reason:"NOT_CONNECTED"};
  const id=String(newBodyId||a.bodyId),controller=String(newControllerId||a.controllerId);
  a.bodyId=id;a.controllerId=controller;a.cells=combined;world.bodies=world.bodies.filter(x=>x!==b);
  try{assertSameDishInvariants(world);}catch(error){restoreBodies(world,before);return{accepted:false,reason:"INVARIANT",error:error.message};}
  world.step++;return{accepted:true,type:"FUSION",oldBodies:[String(bodyAId),String(bodyBId)],newBodyId:id,observerOnly:true};
}
