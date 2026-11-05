export const dishKey=(x,y,z=0)=>`${x},${y},${z}`;
export function dishDirs(dim=2){return dim===3?[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];}
function cloneCell(c){return{x:Number(c.x)||0,y:Number(c.y)||0,z:Number(c.z)||0};}
function bodyKey(id){return String(id);}
function objectKey(id){return String(id);}
function materialId(kind,owner,index){return`${kind}:${owner}:${index}`;}

export function createSameDishShadowWorld(spec={}){
  const dimension=Number(spec.dimension)===3?3:2,width=Math.max(8,Math.floor(Number(spec.width)||24)),height=Math.max(8,Math.floor(Number(spec.height)||16)),depth=dimension===3?Math.max(4,Math.floor(Number(spec.depth)||8)):1;
  const bodies=(spec.bodies||[]).map((b,bi)=>({
    bodyId:bodyKey(b.bodyId??`B${bi}`),controllerId:String(b.controllerId??b.bodyId??`C${bi}`),cells:(b.cells||[]).map(cloneCell)
  }));
  const objects=(spec.objects||[]).map((o,oi)=>({
    objectId:objectKey(o.objectId??`O${oi}`),movable:o.movable!==false,toolCandidate:o.toolCandidate===true,cells:(o.cells||[]).map(cloneCell)
  }));
  const solids=new Set((spec.solids||[]).map(c=>dishKey(Number(c.x)||0,Number(c.y)||0,Number(c.z)||0)));
  const world={version:1,dimension,width,height,depth,bodies,objects,solids,step:0};
  assertSameDishInvariants(world);return world;
}

export function cloneSameDishWorld(world){
  return createSameDishShadowWorld({
    dimension:world.dimension,width:world.width,height:world.height,depth:world.depth,
    solids:[...world.solids].map(k=>{const[x,y,z]=k.split(",").map(Number);return{x,y,z};}),
    bodies:world.bodies.map(b=>({bodyId:b.bodyId,controllerId:b.controllerId,cells:b.cells.map(cloneCell)})),
    objects:world.objects.map(o=>({objectId:o.objectId,movable:o.movable,toolCandidate:o.toolCandidate,cells:o.cells.map(cloneCell)}))
  });
}

export function hiddenMaterials(world){
  const out=[];
  for(const b of world.bodies)for(let i=0;i<b.cells.length;i++)out.push({materialId:materialId("body",b.bodyId,i),kind:"body",bodyId:b.bodyId,controllerId:b.controllerId,localIndex:i,...cloneCell(b.cells[i])});
  for(const o of world.objects)for(let i=0;i<o.cells.length;i++)out.push({materialId:materialId("object",o.objectId,i),kind:"object",objectId:o.objectId,movable:o.movable,toolCandidate:o.toolCandidate,localIndex:i,...cloneCell(o.cells[i])});
  return out;
}
export function hiddenOccupancy(world){
  const m=new Map();
  for(const q of hiddenMaterials(world)){const k=dishKey(q.x,q.y,q.z);if(m.has(k))throw new Error("Duplicate shared-dish occupancy");m.set(k,q);}
  return m;
}
function inBounds(world,x,y,z=0){return x>=0&&x<world.width&&y>=0&&y<world.height&&(world.dimension===2?(z===0):(z>=0&&z<world.depth));}
function bodyConnected(cells,dimension){
  if(!cells.length)return false;
  const occ=new Map(cells.map((c,i)=>[dishKey(c.x,c.y,c.z),i])),seen=new Set([0]),q=[0];
  for(let h=0;h<q.length;h++){const p=cells[q[h]];for(const[dX,dY,dZ]of dishDirs(dimension)){const j=occ.get(dishKey(p.x+dX,p.y+dY,p.z+dZ));if(j!==undefined&&!seen.has(j)){seen.add(j);q.push(j);}}}
  return seen.size===cells.length;
}
export function assertSameDishInvariants(world){
  const occ=new Set();
  for(const b of world.bodies){
    if(!b.cells.length)throw new Error("Empty organism body");
    if(!bodyConnected(b.cells,world.dimension))throw new Error(`Disconnected body ${b.bodyId}`);
    for(const c of b.cells){
      if(!inBounds(world,c.x,c.y,c.z))throw new Error("Out of bounds body cell");
      const k=dishKey(c.x,c.y,c.z);
      if(world.solids.has(k))throw new Error("Body inside solid");
      if(occ.has(k))throw new Error("Duplicate shared-dish occupancy");
      occ.add(k);
    }
  }
  for(const o of world.objects)for(const c of o.cells){
    if(!inBounds(world,c.x,c.y,c.z))throw new Error("Out of bounds object");
    const k=dishKey(c.x,c.y,c.z);
    if(world.solids.has(k))throw new Error("Object inside solid");
    if(occ.has(k))throw new Error("Duplicate shared-dish occupancy");
    occ.add(k);
  }
  return true;
}
export function hiddenBody(world,bodyId){return world.bodies.find(b=>b.bodyId===String(bodyId))||null;}
export function hiddenControllerBody(world,controllerId){return world.bodies.find(b=>b.controllerId===String(controllerId))||null;}
export function hiddenAnchorPosition(world,bodyId,localIndex=0){const b=hiddenBody(world,bodyId);if(!b||!b.cells[localIndex])throw new Error("Missing anchor cell");return cloneCell(b.cells[localIndex]);}

function setObjectCells(obj,cells){obj.cells=cells.map(cloneCell);}
function translated(cells,dx,dy,dz){return cells.map(c=>({x:c.x+dx,y:c.y+dy,z:c.z+dz}));}
function candidateFits(world,cells,ignoreKeys=new Set()){
  const occ=hiddenOccupancy(world);
  for(const c of cells){
    const k=dishKey(c.x,c.y,c.z);
    if(!inBounds(world,c.x,c.y,c.z)||world.solids.has(k))return{ok:false,reason:"SOLID_OR_BOUNDS"};
    const q=occ.get(k);
    if(q&&!ignoreKeys.has(q.materialId))return{ok:false,reason:"OCCUPIED",occupant:q};
  }
  return{ok:true};
}
function objectMaterialIds(obj){return new Set(obj.cells.map((_,i)=>materialId("object",obj.objectId,i)));}
function bodyMaterialIds(body){return new Set(body.cells.map((_,i)=>materialId("body",body.bodyId,i)));}

export function translateObject(world,objectId,dx,dy,dz=0){
  const obj=world.objects.find(o=>o.objectId===String(objectId));
  if(!obj||!obj.movable)return{accepted:false,reason:"IMMOVABLE_OR_MISSING"};
  const next=translated(obj.cells,dx,dy,dz),fit=candidateFits(world,next,objectMaterialIds(obj));
  if(!fit.ok)return{accepted:false,reason:fit.reason};
  setObjectCells(obj,next);world.step++;assertSameDishInvariants(world);return{accepted:true,reason:"OBJECT_TRANSLATED"};
}

export function applyControllerTranslation(world,controllerId,dx,dy,dz=0,{forceReject=false}={}){
  dx=Math.sign(Number(dx)||0);dy=Math.sign(Number(dy)||0);dz=world.dimension===3?Math.sign(Number(dz)||0):0;
  const body=hiddenControllerBody(world,controllerId);
  if(!body)return{accepted:false,reason:"NO_CONTROLLER",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
  if(forceReject||(!dx&&!dy&&!dz))return{accepted:false,reason:forceReject?"FORCED_REJECT":"ZERO_INTENT",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};

  const ownIds=bodyMaterialIds(body),occ=hiddenOccupancy(world),pushObjects=new Map(),nextBody=translated(body.cells,dx,dy,dz);
  for(const c of nextBody){
    const k=dishKey(c.x,c.y,c.z);
    if(!inBounds(world,c.x,c.y,c.z)||world.solids.has(k))return{accepted:false,reason:"SOLID_OR_BOUNDS",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
    const hit=occ.get(k);
    if(!hit||ownIds.has(hit.materialId))continue;
    if(hit.kind==="body")return{accepted:false,reason:"OTHER_BODY_BLOCK",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
    const obj=world.objects.find(o=>o.objectId===hit.objectId);
    if(!obj?.movable)return{accepted:false,reason:"OBJECT_BLOCK",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
    pushObjects.set(obj.objectId,obj);
  }

  // Push is a physical contact consequence. It never changes organism membership.
  const ignored=new Set(ownIds);
  for(const obj of pushObjects.values())for(const id of objectMaterialIds(obj))ignored.add(id);
  const planned=[];
  for(const obj of pushObjects.values()){
    const cells=translated(obj.cells,dx,dy,dz);planned.push([obj,cells]);
    for(const c of cells){
      const k=dishKey(c.x,c.y,c.z);
      if(!inBounds(world,c.x,c.y,c.z)||world.solids.has(k))return{accepted:false,reason:"PUSH_SOLID",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
      const hit=occ.get(k);
      if(hit&&!ignored.has(hit.materialId))return{accepted:false,reason:"PUSH_OCCUPIED",anchorDelta:{x:0,y:0,z:0},pushedObjects:[]};
    }
  }

  body.cells=nextBody;
  for(const[obj,cells]of planned)setObjectCells(obj,cells);
  world.step++;assertSameDishInvariants(world);
  return{accepted:true,reason:"BODY_TRANSLATED",anchorDelta:{x:dx,y:dy,z:dz},pushedObjects:[...pushObjects.keys()]};
}


export function applyBodyPush(world,pusherBodyId,targetBodyId,dx,dy,dz=0){
  const pusher=hiddenBody(world,pusherBodyId),target=hiddenBody(world,targetBodyId);
  if(!pusher||!target||pusher===target)return{accepted:false,reason:"BAD_BODIES"};
  dx=Math.sign(Number(dx)||0);dy=Math.sign(Number(dy)||0);dz=world.dimension===3?Math.sign(Number(dz)||0):0;
  if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)!==1)return{accepted:false,reason:"BAD_DIRECTION"};
  const targetOcc=new Set(target.cells.map(c=>dishKey(c.x,c.y,c.z||0)));
  const touching=pusher.cells.some(c=>targetOcc.has(dishKey(c.x+dx,c.y+dy,(c.z||0)+dz)));
  if(!touching)return{accepted:false,reason:"NO_PUSH_CONTACT"};

  const nextP=translated(pusher.cells,dx,dy,dz),nextT=translated(target.cells,dx,dy,dz);
  const ignored=new Set([...bodyMaterialIds(pusher),...bodyMaterialIds(target)]),occ=hiddenOccupancy(world),seen=new Set();
  for(const cells of [nextP,nextT])for(const q of cells){
    const k=dishKey(q.x,q.y,q.z||0);
    if(!inBounds(world,q.x,q.y,q.z||0)||world.solids.has(k))return{accepted:false,reason:"PUSH_SOLID_OR_BOUNDS"};
    if(seen.has(k))return{accepted:false,reason:"PUSH_BODY_OVERLAP"};
    seen.add(k);
    const hit=occ.get(k);
    if(hit&&!ignored.has(hit.materialId))return{accepted:false,reason:"PUSH_OCCUPIED",occupant:hit};
  }
  pusher.cells=nextP;target.cells=nextT;world.step++;assertSameDishInvariants(world);
  return{
    accepted:true,reason:"BODY_PUSH",direction:{x:dx,y:dy,z:dz},
    pusherBodyId:String(pusherBodyId),targetBodyId:String(targetBodyId),
    pusherDelta:{x:dx,y:dy,z:dz},targetDelta:{x:dx,y:dy,z:dz}
  };
}

export function applyExternalBodyTranslation(world,bodyId,dx,dy,dz=0){
  const body=hiddenBody(world,bodyId);
  if(!body)return{accepted:false,reason:"NO_BODY"};
  dx=Math.sign(Number(dx)||0);dy=Math.sign(Number(dy)||0);dz=world.dimension===3?Math.sign(Number(dz)||0):0;
  const next=translated(body.cells,dx,dy,dz),fit=candidateFits(world,next,bodyMaterialIds(body));
  if(!fit.ok)return{accepted:false,reason:fit.reason};
  body.cells=next;world.step++;assertSameDishInvariants(world);return{accepted:true,reason:"EXTERNAL_BODY_TRANSLATED"};
}

function occluded2D(world,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,steps=Math.max(Math.abs(dx),Math.abs(dy));
  if(steps<=1)return false;
  for(let i=1;i<steps;i++){
    const x=Math.round(ax+dx*i/steps),y=Math.round(ay+dy*i/steps);
    if(world.solids.has(dishKey(x,y,0)))return true;
  }
  return false;
}
export function localAnonymousMaterialObservation(world,anchor,{radius=8,occlusion=true,shuffleSeed=0}={}){
  const points=[];
  for(const q of hiddenMaterials(world)){
    const dx=q.x-anchor.x,dy=q.y-anchor.y,dz=(q.z||0)-(anchor.z||0),dist=Math.abs(dx)+Math.abs(dy)+Math.abs(dz);
    if(dist>radius)continue;
    if(occlusion&&world.dimension===2&&occluded2D(world,anchor.x,anchor.y,q.x,q.y))continue;
    // Learner-facing observation intentionally carries geometry only: no material ID, body ID, object kind, controller ID, lineage or SELF label.
    points.push({relX:dx,relY:dy,relZ:dz});
  }

  // Deliberately destroy simulator storage order. Ordering is based only on learner-visible geometry + a non-semantic episode seed.
  const s=(Number(shuffleSeed)||0)>>>0;
  const hash=p=>{let h=(s^0x9e3779b9)>>>0;h=Math.imul(h^(p.relX+257),0x85ebca6b)>>>0;h=Math.imul(h^(p.relY+263),0xc2b2ae35)>>>0;h=Math.imul(h^(p.relZ+269),0x27d4eb2d)>>>0;return h>>>0;};
  points.sort((a,b)=>hash(a)-hash(b)||a.relX-b.relX||a.relY-b.relY||a.relZ-b.relZ);
  return{dimension:world.dimension,radius,points};
}

export function observerTruthAt(world,x,y,z=0,focalBodyId=null){
  const q=hiddenOccupancy(world).get(dishKey(x,y,z));
  if(!q)return null;
  if(q.kind==="body")return q.bodyId===String(focalBodyId)?"SELF_BODY":"OTHER_AUTONOMOUS_AGENT";
  return q.toolCandidate?"CONTROLLED_EXTERNAL_OR_TOOL":"PASSIVE_WORLD_OR_OBJECT";
}
export function observerTruthForRelative(world,anchor,rel,focalBodyId){
  return observerTruthAt(world,anchor.x+rel.x,anchor.y+rel.y,(anchor.z||0)+rel.z,focalBodyId);
}
