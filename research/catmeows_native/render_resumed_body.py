#!/usr/bin/env python3
"""Produce a playable sound from a newly imagined state of a RESTORED original Brain.

No new training and no second AI model. Original native body output states were
saved by resume_temporal_body.mjs from the actual loaded v8 organism.
"""
import json
from pathlib import Path
import numpy as np
from render_temporal_body_audio import synth, write_wav
root=Path("runtime/catmeows")
e=json.loads((root/"resumed_native_temporal_dream.json").read_text(encoding="utf-8"))
if e["status"]!="ACTUALLY_RESTORED_ORIGINAL_BRAIVOUR_BODY_GENERATED_NEW_AUDIO_TRAJECTORY":
    raise RuntimeError("The actual original Brain was not successfully restored")
states=e["generated"]["frames"]
seed=e["seed"]
wav=synth(states,seed)
out=root/"temporal_embodied_audio"/("resumed_original_brain_"+str(seed)+".wav")
write_wav(out,wav)
stats={"file":str(out),"seed":seed,"seconds":len(wav)/8000,
       "actual_native_motor_actions":e["generated"]["stats"]["originalNativeMotorOutputActions"],
       "all_motor_transitions_observed_in_real_training_wavs":e["generated"]["stats"]["everyDreamTransitionInNativeActualAudioGraph"],
       "max_audio_peak":float(np.max(np.abs(wav))),
       "no_new_learning_after_loading":True,"no_external_audio_model":True}
(root/"resumed_native_body_render_metrics.json").write_text(json.dumps(stats,indent=2),encoding="utf-8")
print("CATMEOWS_RESUMED_NATIVE_BODY_WAV "+json.dumps(stats))
