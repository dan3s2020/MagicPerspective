#!/usr/bin/env python3
"""Render original Brain.auditoryBody ACTION TRAJECTORIES into playable WAV.

Renderer has no training, no artificial text, no hand-authored cat-call notes.
It takes solely a 48x9 path computed by the ORIGINAL native body in the
playable sound world and maps it deterministically to oscillator/noise energy.
A decoded WAV is a synthesized approximation, NOT proved real-cat sound.

All original training/test raw WAV recordings remain private/unmodified.
"""
import json
from pathlib import Path
import wave

import numpy as np

ROOT=Path("runtime/catmeows")
WAVS=ROOT/"embodied_audio"
SR=8000
HOP=160
FRAMES=48
FREQ_BANDS=np.array([100,240,400,700,1100,1900,3900],dtype=np.float64)

def synth(frames,seed):
    # Exactly the sound state produced by native original Discoverer actions.
    levels=np.asarray(frames,dtype=np.float64)
    if levels.shape!=(FRAMES,9) or np.any(~np.isfinite(levels)):
        raise ValueError("Invalid complete original Brain body trajectory")
    if levels.min()<0 or levels.max()>11:
        raise ValueError("The original Brain generated physical state outside 0..11")
    steps=np.arange(FRAMES*HOP)/HOP
    sampled=np.stack([np.interp(steps,np.arange(FRAMES),levels[:,j])
                      for j in range(9)])
    pitch=sampled[0]
    loud=sampled[1]
    voiced=np.clip(pitch,0,1)
    f0=np.clip(145+np.maximum(0,pitch-1)*(900-145)/10,145,900)
    phase=np.cumsum(2*np.pi*f0/SR)
    gain=10**((-65+5.2*loud)/20)
    harm=np.clip(sampled[2]/11,0,1)
    tone=np.zeros_like(phase)
    bands=10**((sampled[3:9]*3.2-39)/20)
    idx=np.arange(len(phase))
    for k in range(1,23):
        hz=k*f0
        band_idx=np.clip(np.searchsorted(FREQ_BANDS,hz,side="right")-1,0,5)
        amp=bands[band_idx,idx]*np.where(hz<3900,1.0,0.0)
        tone+=np.sin(k*phase+0.21*k)*amp/(k**0.64)
    rand=np.random.default_rng(seed)
    noise=rand.normal(size=len(phase))
    breath=0.64*noise+0.36*np.r_[noise[0],noise[:-1]]
    result=gain*(tone*harm*np.where(pitch>0.75,1,0.10)+breath*(0.14+0.4*(1-harm)))
    taper=min(180,len(result)//20)
    if taper>1:
        f=np.sin(np.linspace(0,np.pi/2,taper))**2
        result[:taper]*=f
        result[-taper:]*=f[::-1]
    peak=float(np.max(np.abs(result)))
    if not np.isfinite(peak) or peak<1e-10:
        raise RuntimeError("The original Brain trajectory decoded to silence")
    result=result/max(1,peak/0.82)
    return np.clip(result,-0.98,0.98).astype(np.float32)

def write_wav(dest,audio):
    dest.parent.mkdir(parents=True,exist_ok=True)
    pcm=np.round(audio*32767).clip(-32768,32767).astype("<i2")
    with wave.open(str(dest),"wb") as w:
        w.setframerate(SR)
        w.setnchannels(1)
        w.setsampwidth(2)
        w.writeframes(pcm.tobytes())
    with wave.open(str(dest),"rb") as w:
        if w.getnframes()!=FRAMES*HOP or w.getframerate()!=SR:
            raise RuntimeError("Decoded WAV duration mismatch")

def main():
    source=ROOT/"native_embodied_audio_game.json"
    if not source.exists():
        raise RuntimeError("No ACTUALLY EXECUTED original MagicPerspective native auditory-body gameplay")
    data=json.loads(source.read_text())
    if data["status"]!="ORIGINAL_BRAIVOUR_NATIVE_AUDITORY_BODY_REAL_WORLD_EXPERIMENT":
        raise RuntimeError("Native Brain data invalid")
    outputs=[]
    for i,item in enumerate(data["imagined"]):
        audio=synth(item["frames"],1271+173*i)
        dest=WAVS/(item["id"]+".wav")
        write_wav(dest,audio)
        f=np.asarray(item["frames"],dtype=np.int64)
        changing=int(np.sum(np.any(f[1:]!=f[:-1],axis=1)))
        d={
          "file":dest.name,"mode":item["id"],"physical_meow_synthesis_only":True,
          "origin":"action trace of original Brain.disc.choose/shape and its actual auditory-body state",
          "from_real_CatMeows_body_sensory_experience":True,
          "native_original_motor_actions":item["stats"]["nativeMotorActions"],
          "native_original_motor_movements":item["stats"]["physicalMovementCount"],
          "native_original_target_events":item["stats"]["learnedBodyTargetsReached"],
          "unique_original_auditory_states":item["stats"]["distinctOriginalAuditoryWorldStates"],
          "time_frames_with_any_acoustic_change":changing,
          "pitch_levels":sorted(set(f[:,0].tolist())),
          "loudness_levels":sorted(set(f[:,1].tolist())),
          "decoded_seconds":round(len(audio)/SR,3),
          "rms":round(float(np.sqrt(np.mean(audio**2))),5),
          "peak":round(float(np.max(np.abs(audio))),5),
          "original_recording_pcm_copied":False,
          "independent_sound_grammar_decoded":False
        }
        outputs.append(d)
    if len(outputs)<2:
        raise RuntimeError("Need at least two real original organism dreams")
    (ROOT/"native_embodied_audio_metrics.json").write_text(
       json.dumps({"genuine_original_Brain_auditory_body":True,
       "decoder":"untuned deterministic harmonic/noise acoustic renderer",
       "semantic_translation_claim":False,
       "audio_is_natural_cat_voice_verified":False,
       "audio_playable":True,
       "outputs":outputs},indent=2))
    (WAVS/"README.txt").write_text(
      "Original MagicPerspective Braivour auditory-body world, CatMeows WAV-trained.\n"
      "Each WAV is rendered from the original organism's own action-controlled\n"
      "48x9 auditory body trajectory. No original PCM is copied. The output is\n"
      "experimental synthesized sound; resemblance to a feline voice is\n"
      "not verified until human listening. It is NOT decoded cat language.\n")
    print("CATMEOWS_ORIGINAL_BODY_AUDIO_WAVS "+json.dumps({
      "wav_files":len(outputs),"outputs":outputs},separators=(",",":")))

if __name__=="__main__":
    main()
