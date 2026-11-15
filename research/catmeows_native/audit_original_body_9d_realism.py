#!/usr/bin/env python3
"""Blind native original Braivour BODY acoustic realism audit (not a game score).

All nine physical sound features are compared with original REAL CatMeows
48-step acoustic sequences. Train and strictly heldout cats never cross.
The native generated trajectories come from a previously ACTUALLY EXECUTED
Brain.dream() and its original sound-world motor actions.

This is no learned classifier, no outside AI and no fabricated data. Tests
detect the failure mode: a body may navigate pitch/loudness efficiently while
its spectral or actual time-forward full 9D acoustic sequence is unrealistic.

Reports exact counts + temporal displacement, novelty, feature consistency,
and real-training 9D state/transition support.
"""
import json
from pathlib import Path
import numpy as np

ROOT=Path("runtime/catmeows")
REAL=ROOT/"generative_perception.json"
DREAM=ROOT/"native_temporal_embodied_audio_game.json"
if not REAL.is_file() or not DREAM.is_file():
    raise RuntimeError("Cannot audit real cat audio and an actually run original Brain dream")
reals=json.loads(REAL.read_text())["recordings"]
manifest=json.loads(DREAM.read_text())
if manifest["status"]!="ORIGINAL_BRAIVOUR_NATIVE_TEMPORAL_AUDITORY_BODY_REAL_WORLD_EXPERIMENT":
    raise RuntimeError("Original native Brain real-audio game not executed")
if len(reals)!=440 or len(manifest["imagined"])!=4:
    raise RuntimeError("Incorrect original WAV or actual native-dream count")
held_cats=set(x["heldoutCat"] for x in manifest["heldoutGameMetrics"])
# Holdout is by cat AND owner, never use it as a learned world.
train=[r for r in reals if r["cat"] not in held_cats]
hold=[r for r in reals if r["cat"] in held_cats]
if len(train)!=252 or len(hold)!=188:
    raise RuntimeError(f"Fold mismatch train={len(train)} hold={len(hold)}")
X=np.asarray([r["frames"] for r in train],dtype=np.int8)
H=np.asarray([r["frames"] for r in hold],dtype=np.int8)
Y=np.asarray([d["frames"] for d in manifest["imagined"]],dtype=np.int8)
if X.shape!=(252,48,9) or H.shape!=(188,48,9) or Y.shape!=(4,48,9):
    raise RuntimeError("Nine-D physical speech features wrong shape")
names=["pitch","loudness","harmonicity","spectral_100_240","spectral_240_400",
       "spectral_400_700","spectral_700_1100","spectral_1100_1900","spectral_1900_3900"]
def per_channel(a):
    delta=np.abs(np.diff(a.astype(np.int16),axis=1))
    return {"meanAbsFrameChange":np.mean(delta,axis=(0,1)).round(5).tolist(),
      "nonzeroFrameChanges":np.mean(delta>0,axis=(0,1)).round(5).tolist(),
      "meanValue":np.mean(a,axis=(0,1)).round(5).tolist(),
      "valueStd":np.std(a,axis=(0,1)).round(5).tolist()}
def summarize(a):
    delta=np.abs(np.diff(a.astype(np.int16),axis=1))
    n=delta.sum(axis=2)
    return {"nRecordings":int(len(a)),
      "meanAbsoluteChangeAllNineFeatures":float(delta.mean()),
      "meanWhole9DStepManhattan":float(n.mean()),
      "medianWhole9DStepManhattan":float(np.median(n)),
      "p90Whole9DStepManhattan":float(np.percentile(n,90)),
      "exactNoFeatureChangedFraction":float(np.mean(n==0)),
      "allNineFeaturesChangedFraction":float(np.mean(np.all(delta>0,axis=2))),
      "perFeature":per_channel(a)}
def distribution(a,c):
    return np.bincount(a[:,:,c].reshape(-1),minlength=12).astype(np.float64)/a[:,:,c].size
def tv(p,q):
    return float(0.5*np.sum(np.abs(p-q)))
realFrameSet={tuple(x.tolist()) for x in X.reshape(-1,9)}
realTransitionSet={
 (tuple(src.tolist()),tuple(dst.tolist()))
 for source in X
 for src,dst in zip(source[:-1],source[1:])
}
def novelty(a):
    exactFrames=sum(tuple(f.tolist()) in realFrameSet for clip in a for f in clip)
    exactTransitions=sum((tuple(a0.tolist()),tuple(a1.tolist())) in realTransitionSet
                         for clip in a for a0,a1 in zip(clip[:-1],clip[1:]))
    return {"nativeDreamFramesExactlyPresentInRealTraining":exactFrames,
       "totalFrames":len(a)*48,"exactFull9DStateTrainingCoverageFraction":exactFrames/(len(a)*48),
       "wholeNative9DTransitionsExactlyPresentInRealTraining":exactTransitions,
       "totalTransitions":len(a)*47,
       "real9DTransitionFraction":exactTransitions/(len(a)*47)}
def relativeErrors(ref,a):
    return {names[c]:{"tvValueHistogram":tv(distribution(ref,c),distribution(a,c)),
       "meanStepMagnitude":float(np.abs(np.diff(a.astype(np.int16),axis=1)[:,:,c]).mean()),
       "trainingMeanStepMagnitude":float(np.abs(np.diff(ref.astype(np.int16),axis=1)[:,:,c]).mean())}
       for c in range(9)}
def rounded(a):
    return json.loads(json.dumps(a))
out={"status":"REAL_WAV_ORIGINAL_BRAIVOUR_BODY_9D_ACOUSTIC_REALISM_AUDIT",
 "dataset":"MD5 verified official 440 WAV CatMeows original 8kHz",
 "ninePhysicalAudioFeatures":names,
 "fold":manifest["fold"],"strictOriginalTrainCats":len(set(r["cat"] for r in train)),
 "strictUnseenCats":len(set(r["cat"] for r in hold)),
 "realOriginalTrain":summarize(X),
 "realIndependentHeldout":summarize(H),
 "originalNativeBodyImaginedSounds":summarize(Y),
 "originalNativeDreams":novelty(Y),
 "heldoutReal9DTrainingSetOverlap":novelty(H),
 "nativeVsRealFeatureMismatch":relativeErrors(H,Y),
 "heldoutVsTrainFeatureMismatch":relativeErrors(X,H),
 "perNativeDream":[dict(id=d["id"],stats=summarize(Y[i:i+1]),
                  nativeActions=d["stats"]["originalNativeMotorOutputActions"],
                  learnedBodyStates=d["stats"]["uniqueAcousticStates"],
                  genuine2DStateTransitionsOnly=d["stats"]["everyDreamTransitionInNativeActualAudioGraph"])
              for i,d in enumerate(manifest["imagined"])],
 "interpretation":"These metrics test true 9D acoustic resemblance. Perfect pitch-loud target navigation is not evidence of natural meow pronunciation."
}
p=ROOT/"native_body_9d_audio_realism_audit.json"
p.write_text(json.dumps(out,indent=2),encoding="utf-8")
print("CATMEOWS_BODY_ACTUAL_NINE_DIMENSION_ACOUSTIC_AUDIT "+json.dumps({
 "data":{"train":len(X),"heldout":len(H),"generated":len(Y)},
 "train":{k:v for k,v in out["realOriginalTrain"].items() if k!="perFeature"},
 "heldout":{k:v for k,v in out["realIndependentHeldout"].items() if k!="perFeature"},
 "generated":{k:v for k,v in out["originalNativeBodyImaginedSounds"].items() if k!="perFeature"},
 "dreamExact9DNativeTrainingCoverage":out["originalNativeDreams"],
 "heldoutActual9DTrainingCoverage":out["heldoutReal9DTrainingSetOverlap"],
 "perFeatureGeneratedMismatch":out["nativeVsRealFeatureMismatch"]
},separators=(",",":")))
