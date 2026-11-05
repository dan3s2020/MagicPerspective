import {
  applyControllerTranslation,applyExternalBodyTranslation,createSameDishShadowWorld,hiddenAnchorPosition,hiddenMaterials,
  localAnonymousMaterialObservation,observerTruthForRelative
} from "./same-dish-shadow-world.js";
import {createCausalBodyDiscovery,updateCausalBodyDiscovery} from "./same-dish-body-discovery.js";
import {sameDishAmbiguityRecovery,sameDishCalibrationReport} from "./same-dish-calibration.js";

function visibleTruth(world,anchor,snapshot,focalBodyId){
  return snapshot.tracks.filter(t=>t.visible).map(t=>({...t,observerTruth:observerTruthForRelative(world,anchor,t.rel,focalBodyId)}));
}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function metricFor(rows,truth,key){const q=rows.filter(x=>x.observerTruth===truth);return mean(q.map(x=>Number(x.probability?.[key])||0));}

export function makeReferenceSameDishWorld({rename=false}={}){
  const A=rename?"ORGANISM_917":"A",B=rename?"ORGANISM_204":"B";
  return createSameDishShadowWorld({
    dimension:2,width:24,height:16,
    bodies:[
      {bodyId:A,controllerId:"FOCAL",cells:[{x:5,y:5},{x:6,y:5},{x:7,y:5}]},
      {bodyId:B,controllerId:"OTHER",cells:[{x:12,y:5},{x:13,y:5},{x:14,y:5}]}
    ],
    objects:[
      {objectId:"TOOL",movable:true,toolCandidate:true,cells:[{x:8,y:5}]},
      {objectId:"ROCK",movable:false,toolCandidate:false,cells:[{x:5,y:9}]}
    ]
  });
}

export function runReferenceSameDishShadow({renameHiddenIds=false}={}){
  const focalBodyId=renameHiddenIds?"ORGANISM_917":"A",otherBodyId=renameHiddenIds?"ORGANISM_204":"B";
  const world=makeReferenceSameDishWorld({rename:renameHiddenIds}),state=createCausalBodyDiscovery({dimension:2,maxAssociationJump:2.25});

  let anchor=hiddenAnchorPosition(world,focalBodyId,0);
  let obs=localAnonymousMaterialObservation(world,anchor,{radius:12,shuffleSeed:101});
  updateCausalBodyDiscovery(state,obs,{accepted:false,anchorDelta:{x:0,y:0,z:0},command:{x:0,y:0,z:0}});

  // 1) Accepted +X. Other perfectly mimics. Tool is pushed and also co-moves.
  // Correct behavior is ambiguity rather than a forced SELF decision.
  const a1=applyControllerTranslation(world,"FOCAL",1,0,0);
  applyExternalBodyTranslation(world,otherBodyId,1,0,0);
  anchor=hiddenAnchorPosition(world,focalBodyId,0);
  obs=localAnonymousMaterialObservation(world,anchor,{radius:12,shuffleSeed:102});
  const s1=updateCausalBodyDiscovery(state,obs,{accepted:a1.accepted,anchorDelta:a1.anchorDelta,command:{x:1,y:0,z:0}});
  const stage1=visibleTruth(world,anchor,s1,focalBodyId);

  // 2) Accepted -X. Other mimics again, but the pushed tool is released and stays behind.
  const a2=applyControllerTranslation(world,"FOCAL",-1,0,0);
  applyExternalBodyTranslation(world,otherBodyId,-1,0,0);
  anchor=hiddenAnchorPosition(world,focalBodyId,0);
  obs=localAnonymousMaterialObservation(world,anchor,{radius:12,shuffleSeed:103});
  const s2=updateCausalBodyDiscovery(state,obs,{accepted:a2.accepted,anchorDelta:a2.anchorDelta,command:{x:-1,y:0,z:0}});
  const stage2=visibleTruth(world,anchor,s2,focalBodyId);

  // 3) Focal actuator is rejected. Other continues +Y. This separates independent autonomy from focal ownership.
  const a3=applyControllerTranslation(world,"FOCAL",0,1,0,{forceReject:true});
  applyExternalBodyTranslation(world,otherBodyId,0,1,0);
  anchor=hiddenAnchorPosition(world,focalBodyId,0);
  obs=localAnonymousMaterialObservation(world,anchor,{radius:12,shuffleSeed:104});
  const s3=updateCausalBodyDiscovery(state,obs,{accepted:a3.accepted,anchorDelta:a3.anchorDelta,command:{x:0,y:1,z:0}});
  const stage3=visibleTruth(world,anchor,s3,focalBodyId);

  // 4) Accepted +Y with no mimic. A second accepted direction strengthens persistent root-coupled body evidence.
  const a4=applyControllerTranslation(world,"FOCAL",0,1,0);
  anchor=hiddenAnchorPosition(world,focalBodyId,0);
  obs=localAnonymousMaterialObservation(world,anchor,{radius:12,shuffleSeed:105});
  const s4=updateCausalBodyDiscovery(state,obs,{accepted:a4.accepted,anchorDelta:a4.anchorDelta,command:{x:0,y:1,z:0}});
  const stage4=visibleTruth(world,anchor,s4,focalBodyId);

  const calibration=sameDishCalibrationReport(stage4),recovery=sameDishAmbiguityRecovery(stage1,stage4);
  return{
    world,state,
    snapshots:{afterMimicPush:s1,afterRelease:s2,afterRejectedDivergence:s3,final:s4},
    truthStages:{afterMimicPush:stage1,afterRelease:stage2,afterRejectedDivergence:stage3,final:stage4},
    calibration,recovery,
    metrics:{
      selfOnSelf:metricFor(stage4,"SELF_BODY","self"),
      selfOnTool:metricFor(stage4,"CONTROLLED_EXTERNAL_OR_TOOL","self"),
      toolOnTool:metricFor(stage4,"CONTROLLED_EXTERNAL_OR_TOOL","tool"),
      otherOnOther:metricFor(stage4,"OTHER_AUTONOMOUS_AGENT","other"),
      passiveOnPassive:metricFor(stage4,"PASSIVE_WORLD_OR_OBJECT","passive"),
      mimicSelfOnOtherAtFirstStep:metricFor(stage1,"OTHER_AUTONOMOUS_AGENT","self"),
      materialCount:hiddenMaterials(world).length
    }
  };
}

export function sameDishShadowPass(metrics={}){
  return Number(metrics.selfOnSelf)>.55&&
    Number(metrics.selfOnTool)<.40&&
    Number(metrics.toolOnTool)>.35&&
    Number(metrics.otherOnOther)>.45&&
    Number(metrics.passiveOnPassive)>.35&&
    Number(metrics.mimicSelfOnOtherAtFirstStep)<.42;
}
