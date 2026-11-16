#!/usr/bin/env python3
"""Audible proof of original Braivour's 9D sound body causal transformations.

The WAV renderer is a deterministic physics utility, NOT a learned model.
What sound to produce was decided by the ORIGINAL saved Brain's bodily
motor actions plus 7-dimensional original native ConstructedPaths effects.
The matching unchanged old BODY average decoder is included as a control.
"""
from pathlib import Path
import json
import numpy as np
from render_temporal_body_audio import synth, write_wav

ROOT=Path("runtime/catmeows")
mode=__import__("os").environ.get("CATMEOWS_9D_TRANSFORM_ORDER","chronological")
if mode not in {"chronological","shuffled"}:raise RuntimeError("Unknown actual Brain control")
input=ROOT/("original_native_9d_action_consequence_"+mode+".json")
if not input.is_file():raise RuntimeError("Native original Brain 9D sound bodily experience missing")
data=json.loads(input.read_text(encoding="utf-8"))
if data["status"]!="BRAIVOUR_NATIVE_REAL_WORLD_NINE_FEATURE_ACTION_CONSEQUENCES":
    raise RuntimeError("No original Brain constructedPaths auditory motor learning")
out=ROOT/("native_9d_bodily_audio_"+mode)
out.mkdir(exist_ok=True,parents=True)
records=[]
for i,item in enumerate(data["nativeMotorGenerated9DSoundDreams"]):
    for kind,features in [("nine_dim_native",item["frames"]),
                          ("old_centroid_control",item["originalTwoDimBodyNaiveFrames"])]:
        wav=synth(features,100101+i*179)
        dest=out/(item["id"]+"_"+kind+".wav")
        write_wav(dest,wav)
        fv=np.asarray(features,dtype=np.int16)
        if fv.shape!=(48,9) or np.min(fv)<0 or np.max(fv)>11:
            raise RuntimeError("Original Brain transformed invalid acoustic physical body state")
        delta=np.abs(np.diff(fv,axis=0))
        records.append({"file":dest.name,"mode":kind,"id":item["id"],
          "humanAuditoryNaturalnessVerified":False,"soundsGeneratedByOriginalBrain":True,
          "full9DFrameDelta":float(np.mean(np.sum(delta,axis=1))),
          "full9DAverageFeatureDelta":float(delta.mean()),
          "actualOriginalMotorActions":len(item["originalActualMotorActions"]),
          "audioSeconds":len(wav)/8000,"rms":float(np.sqrt(np.mean(wav**2))),
          "peak":float(np.max(np.abs(wav)))})
(root:=ROOT/("native_9d_audio_physical_render_"+mode+".json")).write_text(
    json.dumps({"experiment":"ORIGINAL_BRAIVOUR_ACTUALLY_LEARNED_9D_ACOUSTIC_EFFECTS",
       "trainedExternalGenerativeModel":False,"verifiedOriginalBrain":True,
       "nativeFeatureMovementOnly":True,"recordings":records},indent=2),encoding="utf-8")
print("CATMEOWS_NATIVE_BODY_REAL_NINE_DIM_SOUND_WAV "+json.dumps({
 "mode":mode,"records":records
},separators=(",",":")))
