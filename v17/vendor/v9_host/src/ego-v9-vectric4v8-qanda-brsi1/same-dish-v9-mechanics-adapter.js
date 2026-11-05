import {ACTIONS} from "./config.js";
import {resolveIntent} from "./mechanics.js";
import {assertSameDishInvariants,dishKey,hiddenBody} from "./same-dish-shadow-world.js";

function runtimeCell(){
  return{intentAction:0,confidence:0,lastOwnActualDx:0,lastOwnActualDy:0,lastOwnActualDz:0,lastGlobalDx:0,lastGlobalDy:0,lastGlobalDz:0,sinceLastDx:0,sinceLastDy:0,sinceLastDz:0,motorMismatchX:0,motorMismatchY:0,motorMismatchZ:0,previousReward:0,pendingReward:0,initialDistance:0,maxProgress:0,enteredGate:false,crossedExit:false,actionCount:0,lastActiveGlobalStep:-1};
}
function idx3(w,x,y,z){return(z*w.height+y)*w.width+x;}
function blockers(world,bodyId){
  const out=new Set(world.solids);
  for(const b of world.bodies)if(b.bodyId!==String(bodyId))for(const c of b.cells)out.add(dishKey(c.x,c.y,c.z||0));
  for(const o of world.objects)for(const c of o.cells)out.add(dishKey(c.x,c.y,c.z||0));
  return out;
}
function mechanicsView(world,bodyId){
  const body=hiddenBody(world,bodyId);if(!body)throw new Error("Missing mechanics body "+bodyId);
  const block=blockers(world,bodyId),base={
    physicalDimensions:world.dimension,cubes:body.cells.map(c=>({...c})),swarmSize:body.cells.length,
    globalStep:world.step,lastMove:null,lastMoves:[],simTime:0,egoRuntime:Array.from({length:body.cells.length},runtimeCell)
  };
  if(world.dimension===3){
    const free3d=new Uint8Array(world.width*world.height*world.depth);free3d.fill(1);
    for(let z=0;z<world.depth;z++)for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(block.has(dishKey(x,y,z)))free3d[idx3(world,x,y,z)]=0;
    return{...base,gridW:world.width,gridH:world.height,gridD:world.depth,free3d};
  }
  const free=new Uint8Array(world.width*world.height);free.fill(1);
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(block.has(dishKey(x,y,0)))free[y*world.width+x]=0;
  return{...base,v5Procedural:true,gridW:world.width,gridH:world.height,free,terrain:free,opening:[],checkpoint:{edge:"RIGHT",plane:world.width-1,x:world.width-1,y:Math.floor(world.height/2),bandHalf:1},distanceField:new Int32Array(world.width*world.height)};
}

export function applyV9MechanicalIntentInDish(world,bodyId,localEgo,actionIndex,confidence=1,mechanicsCfg={}){
  const body=hiddenBody(world,bodyId);if(!body)return{accepted:false,reason:"NO_BODY"};
  const ego=Math.floor(Number(localEgo));if(!Number.isInteger(ego)||ego<0||ego>=body.cells.length)return{accepted:false,reason:"BAD_EGO"};
  const view=mechanicsView(world,bodyId),defaults={minAlignment:.25,passiveLoadBase:.06,passiveLoadPerExtraCell:.19,minNetDrive:.02},cfg={...defaults,...mechanicsCfg};
  const out=resolveIntent(view,ego,actionIndex,confidence,cfg);
  if(out.accepted){
    body.cells=view.cubes.map(c=>({x:c.x,y:c.y,z:c.z||0}));
    world.step++;assertSameDishInvariants(world);
  }
  return{
    ...out,
    bodyId:String(bodyId),localEgo:ego,actionName:ACTIONS[actionIndex]?.name||"UNKNOWN",
    // Runtime mechanics IDs are local to this body and are observer/debug metadata only.
    movedLocalIds:[...(out.movedIds||[])]
  };
}

export function previewV9MechanicalCandidatesInDish(world,bodyId,localEgo,actionIndex,confidence=1,mechanicsCfg={}){
  const clone=structuredClone({
    version:world.version,dimension:world.dimension,width:world.width,height:world.height,depth:world.depth,
    bodies:world.bodies,objects:world.objects,solids:[...world.solids],step:world.step
  });
  clone.solids=new Set(clone.solids);
  return applyV9MechanicalIntentInDish(clone,bodyId,localEgo,actionIndex,confidence,mechanicsCfg);
}
