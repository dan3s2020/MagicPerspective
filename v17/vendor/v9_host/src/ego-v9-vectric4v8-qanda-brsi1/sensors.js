import {ACTIONS,FACE_DEFS,IDENTITY_OBS_FEATURE_NAMES,OBS_FIELDS,OBS_N} from "./config.js";
import {desiredDrive} from "./mechanics.js";
import {isSolid,key,occupiedMap,worldDimension} from "./world.js";
import {consumeEcho} from "./echo-field.js";
import {hearCortical} from "./cortical-sound.js";
import {calibrateEchoOnTouch,injectLearnedPrior,noteEchoEvidence,spatialContext,spatialPriorAt,spatialSummary,updateSpatialFromLocal} from "./spatial-cortex.js";
import {encodeWorldModelFeatures,predictWorldModel} from "./world-model-learner.js";
import {perspectiveContext} from "./perspective-engine.js";
import {energyContext} from "./energy.js";
import {identityFeatureVector,prepareIdentityPerception} from "./identity-field.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function localEdgeSense(world,egoId,face,occupied=null){
  const p=world.cubes[egoId];if(!p)return{contact:0,wall:0,push:0,pull:0,relativeMotion:0};
  if(worldDimension(world)===2&&face.dz)return{contact:0,wall:0,push:0,pull:0,relativeMotion:0,dimensionAbsent:1};
  const occ=occupied||occupiedMap(world.cubes),tx=p.x+face.dx,ty=p.y+face.dy,tz=(p.z||0)+face.dz,j=occ.get(key(tx,ty,tz)),wall=isSolid(world,tx,ty,tz)?1:0;
  if(j===undefined)return{contact:0,wall,push:0,pull:0,relativeMotion:0};
  const vi=desiredDrive(world,egoId),vj=desiredDrive(world,j),rel=(vj.x-vi.x)*face.dx+(vj.y-vi.y)*face.dy+(vj.z-vi.z)*face.dz,pull=Math.max(0,rel),push=Math.max(0,-rel),ri=world.egoRuntime[egoId],rj=world.egoRuntime[j];
  const relative=((rj.lastGlobalDx-ri.lastGlobalDx)*face.dx+(rj.lastGlobalDy-ri.lastGlobalDy)*face.dy+((rj.lastGlobalDz||0)-(ri.lastGlobalDz||0))*face.dz);
  return{contact:1,wall,push,pull,relativeMotion:clamp(relative,-2,2)/2,neighborId:j};
}
export function preparePerception(world,egoId){
  const occupied=occupiedMap(world.cubes),senses=FACE_DEFS.map(f=>localEdgeSense(world,egoId,f,occupied)),v9=world.v9||(world.v9={perception:[],computeSpent:0,computeBudget:1}),g=v9.featureGates||{};
  const cortical=g.corticalSound!==false&&v9?.cortical?hearCortical(v9.cortical,egoId):{coherence:0,conflict:0,energy:0,phase:0,spectrumAmplitude:Array(8).fill(0),spectrumPhase:Array(8).fill(0)};
  let echo={energy:0,novelty:0,phase:0,delay:0,dir:-1,spectrum:{amplitude:[],phase:[]}};if(g.echo!==false&&v9?.echo)echo=consumeEcho(v9.echo,egoId,world.globalStep);

  // Learned spatial prior is evaluated BEFORE the current tactile label is
  // written into the map. The current wall/free contact becomes the
  // self-supervised target only after prediction, so simulator truth is not
  // leaked into the mini-brain's input.
  if(g.spatial!==false&&g.worldModel!==false&&v9?.spatial&&v9?.worldModel){
    const pose=v9.spatial.poses?.[egoId];
    if(pose){
      if(!Array.isArray(v9.worldModelRecords))v9.worldModelRecords=[];
      const cap=Math.max(64,Math.floor(Number(v9.worldModelRecordCap)||1024));
      for(let fi=0;fi<FACE_DEFS.length;fi++){
        const face=FACE_DEFS[fi],sense=senses[fi];if(worldDimension(world)===2&&face.dz)continue;
        const tx=pose.x+face.dx,ty=pose.y+face.dy,tz=pose.z+face.dz,prior=spatialPriorAt(v9.spatial,tx,ty,tz),features=encodeWorldModelFeatures({priorWall:prior.wall,priorConfidence:prior.confidence,cortical,echo,face,physicalDimensions:worldDimension(world)}),pWall=predictWorldModel(v9.worldModel,features);
        injectLearnedPrior(v9.spatial,tx,ty,tz,pWall,.30,world.globalStep);
        if(v9.worldModelRecords.length<cap)v9.worldModelRecords.push({features,targetWall:sense.wall?1:0,weight:sense.wall?1.5:1,cell:egoId,face:fi,step:world.globalStep,predicted:pWall});
      }
    }
  }

  if(g.spatial!==false&&v9?.spatial)updateSpatialFromLocal(v9.spatial,world,egoId,senses,world.globalStep,cortical);
  if(g.spatial!==false&&g.echo!==false&&v9?.spatial&&v9?.echo){noteEchoEvidence(v9.spatial,egoId,echo,world.globalStep,cortical);if(echo.dir>=0&&senses[echo.dir]?.wall)calibrateEchoOnTouch(v9.spatial,egoId,echo,world.globalStep);}
  const spatial=g.spatial!==false&&v9?.spatial?spatialSummary(v9.spatial):{uncertainty:0,frontier:0,predictionError:0,bodyConstraintError:0};
  const identity=g.identity!==false&&v9?.identity?prepareIdentityPerception(v9.identity,world,egoId,world.globalStep,v9.spatial):null;
  if(!v9.perception)v9.perception=[];v9.perception[egoId]={senses,echo,cortical,spatial,identity};return v9.perception[egoId];
}
export function buildObservation(world,egoId){
  const o=new Float64Array(OBS_N),F=OBS_FIELDS.offsets,r=world.egoRuntime[egoId],p=world.v9?.perception?.[egoId]||preparePerception(world,egoId),v9=world.v9;
  for(let fi=0;fi<FACE_DEFS.length;fi++){
    const face=FACE_DEFS[fi],sense=p.senses[fi],n=face.name;
    o[F[n+"_contact"]]=sense.contact;o[F[n+"_wall"]]=sense.wall;o[F[n+"_push"]]=clamp(sense.push,0,1);o[F[n+"_pull"]]=clamp(sense.pull,0,1);o[F[n+"_relativeMotion"]]=clamp(sense.relativeMotion,-1,1);
  }
  o[F.actualDx]=clamp((r.sinceLastDx||0)/4,-1,1);o[F.actualDy]=clamp((r.sinceLastDy||0)/4,-1,1);o[F.actualDz]=clamp((r.sinceLastDz||0)/4,-1,1);
  o[F.prevConfidence]=clamp(r.confidence||0,0,1);o[F.prevReward]=Math.tanh((r.previousReward+r.pendingReward)*.25);o[F.motorMismatch]=clamp(Math.hypot(r.motorMismatchX||0,r.motorMismatchY||0,r.motorMismatchZ||0),0,1);

  o[F.corticalCoherence]=clamp(p.cortical.coherence||0,0,1);o[F.corticalConflict]=clamp(p.cortical.conflict||0,0,1);o[F.corticalEnergy]=clamp(p.cortical.energy||0,0,1);o[F.corticalPhase]=clamp(p.cortical.phase||0,-1,1);
  for(let i=0;i<8;i++){o[F["corticalAmp"+i]]=clamp(Number(p.cortical.spectrumAmplitude?.[i])||0,0,1);o[F["corticalPhase"+i]]=clamp(Number(p.cortical.spectrumPhase?.[i])||0,-1,1);}
  o[F.echoEnergy]=clamp(p.echo.energy||0,0,1);o[F.echoNovelty]=clamp(p.echo.novelty||0,0,1);o[F.echoPhase]=clamp(p.echo.phase||0,-1,1);o[F.echoDelayLog]=Math.tanh(Math.log2(1+Math.max(0,Number(p.echo.delay)||0))/6);
  const echoAmp=p.echo?.spectrum?.amplitude||[];for(let i=0;i<8;i++){const a=(Number(echoAmp[i*2])||0)+(Number(echoAmp[i*2+1])||0);o[F["echoSpec"+i]]=Math.tanh(a);}
  o[F.spatialUncertainty]=clamp(p.spatial.uncertainty||0,0,1);o[F.spatialFrontier]=clamp(p.spatial.frontier||0,0,1);o[F.spatialPredictionError]=clamp(p.spatial.predictionError||0,0,1);o[F.bodyConstraintError]=Math.tanh(Math.max(0,p.spatial.bodyConstraintError||0));
  const g=v9?.featureGates||{},sc=g.spatial!==false&&v9?.spatial?spatialContext(v9.spatial,egoId):{rays:FACE_DEFS.map(()=>({distance:0,confidence:0})),frontier:{x:0,y:0,z:0},knownBodyFraction:0,knownMapLog:0};
  o[F.knownBodyFraction]=clamp(sc.knownBodyFraction||0,0,1);o[F.knownMapLog]=clamp(sc.knownMapLog||0,0,1);
  const pc=g.perspective!==false?perspectiveContext(v9?.perspective||{}):{activeD:0,effectiveD:0,bestError:0,gap:0,latentContext:new Float64Array(8)};
  const maxD=Math.max(1,Number(v9?.perspective?.maxD)||8);o[F.perspectiveActiveD]=clamp(pc.activeD/maxD,0,1);o[F.perspectiveEffectiveD]=clamp(pc.effectiveD/maxD,0,1);o[F.perspectiveBestError]=clamp(pc.bestError,0,1);o[F.perspectiveGap]=Math.tanh(Math.max(0,pc.gap)*4);
  for(let i=0;i<8;i++)o[F["perspectiveLatent"+i]]=clamp(Number(pc.latentContext?.[i])||0,-1,1);
  const rem=v9?1-v9.computeSpent/Math.max(1,v9.computeBudget):1,actionRem=1-(Number(world.globalStep)||0)/Math.max(1,Number(world.maxGlobalActions)||1),ec=g.energy!==false?energyContext(v9?.energy):{remaining:0,debt:0,recentCost:0,efficiency:0,spent:0,capacity:0};
  o[F.computeRemaining]=clamp(rem,0,1);o[F.actionBudgetRemaining]=clamp(actionRem,0,1);o[F.energyRemaining]=ec.remaining;o[F.energyDebt]=ec.debt;o[F.energyRecentCost]=ec.recentCost;o[F.energyEfficiency]=ec.efficiency;
  o[F.swarmSizeLog]=Math.tanh(Math.log2(Math.max(1,world.cubes.length))/4);o[F.kNorm]=Math.tanh((Number(v9?.currentK)||1)/4);o[F.recentProgress]=Math.tanh(Number(v9?.recentReward)||0);
  for(let fi=0;fi<FACE_DEFS.length;fi++){const face=FACE_DEFS[fi],q=sc.rays[fi]||{};o[F["belief_"+face.name+"_distance"]]=clamp(q.distance||0,0,1);o[F["belief_"+face.name+"_confidence"]]=clamp(q.confidence||0,0,1);}
  o[F.frontierDx]=clamp(sc.frontier?.x||0,-1,1);o[F.frontierDy]=clamp(sc.frontier?.y||0,-1,1);o[F.frontierDz]=clamp(sc.frontier?.z||0,-1,1);
  const iv=identityFeatureVector(p.identity);for(let i=0;i<IDENTITY_OBS_FEATURE_NAMES.length;i++)o[F[IDENTITY_OBS_FEATURE_NAMES[i]]]=iv[i]||0;
  return o;
}
export function consumeSinceLastMotion(world,egoId){const r=world.egoRuntime[egoId];r.sinceLastDx=0;r.sinceLastDy=0;r.sinceLastDz=0;}
