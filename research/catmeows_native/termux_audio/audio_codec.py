#!/usr/bin/env python3
"""Termux AUDIO <-> original Braivour physical 9D sense and deterministic sound.

No external sound-generating AI, no text-to-meow, no fake transcript.
- 'sense' uses the SAME verified PCM acoustic sensor as the original 440 WAV
  research: prepare_generative.sense(). This output alone cannot mean words.
- 'render' uses the SAME existing 9D deterministic acoustic sound renderer
  as the research (not a separate trained model). Original Brain owns every
  action and the complete nine acoustic values; this module only sounds them.
Dependencies: original Python modules + Termux python-numpy and ffmpeg.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import wave
import numpy as np

HERE=Path(__file__).resolve().parent
NATIVE=HERE.parent
sys.path.insert(0,str(NATIVE))
from prepare_generative import sense
from render_temporal_body_audio import synth, write_wav

SR=8000
SEGMENT=8000              # One second of real input makes one real vocal world
MAX_CLIPS=12              # Local safe cap (up to 12 sec)
MIN_SAMPLES=1024

def physical_wav(input_file):
    filename=Path(input_file).resolve()
    if not filename.is_file():raise RuntimeError("Input recording does not exist")
    if filename.stat().st_size>12_000_000:raise RuntimeError("Maximum file size: 12 MB")
    with tempfile.TemporaryDirectory(prefix="braivour-pcm-") as directory:
        fixed=Path(directory)/"actual-input-8khz.wav"
        subprocess.run(["ffmpeg","-nostdin","-y","-hide_banner","-loglevel","error",
                        "-t","12","-i",str(filename),"-vn","-ac","1",
                        "-ar",str(SR),"-acodec","pcm_s16le",str(fixed)],
                       check=True,timeout=60)
        with wave.open(str(fixed),"rb") as w:
            if w.getnchannels()!=1 or w.getsampwidth()!=2 or w.getframerate()!=SR:
                raise RuntimeError("Invalid actual 8000 Hz mono PCM conversion")
            x=np.frombuffer(w.readframes(w.getnframes()),dtype="<i2").astype(np.float64)/32768
    if len(x)<MIN_SAMPLES:raise RuntimeError("Audio is too short: at least 0.13 sec")
    if np.max(np.abs(x))<.00001:raise RuntimeError("Microphone recording is silent")
    return x

def perceive(inp,out):
    x=physical_wav(inp)
    pieces=[]
    if len(x)<=SEGMENT:
        pieces=[x]
    else:
        for i in range(0,min(len(x),SEGMENT*MAX_CLIPS),SEGMENT):
            clip=x[i:min(len(x),i+SEGMENT)]
            if len(clip)>=MIN_SAMPLES:pieces.append(clip)
    if not pieces:raise RuntimeError("No actual audio body could be perceived")
    records=[]
    for index,piece in enumerate(pieces):
        signals=sense(piece,SR)
        frames=signals["frames"]
        if len(frames)!=48 or any(len(f)!=9 for f in frames):
            raise RuntimeError("Original physical nine-dimensional auditory sensor incompatible")
        records.append({
            "name":"termux_measured_clip_"+str(index),
            "source":"USER_REAL_MIC_OR_UPLOADED_AUDIO_NOT_ASSUMED_CAT",
            "index":index,
            "duration_seconds":round(len(piece)/SR,3),
            "frames":frames,
            "sound_pitch_mean":round(float(np.mean([f[0] for f in frames])),4),
            "sound_energy_mean":round(float(np.mean([f[1] for f in frames])),4),
            "frame_change_9d_mean":round(float(np.mean(np.sum(
               np.abs(np.diff(np.array(frames,dtype=np.int16),axis=0)),axis=1))),4)
        })
    outpath=Path(out)
    outpath.parent.mkdir(parents=True,exist_ok=True)
    outcome={"status":"REAL_9D_SOUND_OBSERVED","waveformSource":"recording supplied by the user",
       "sampleRate":SR,"originalAuditorySensor":"prepare_generative.sense",
       "originalBrainModelUsedForPerception":False,
       "noAssumedCatIntention":True,
       "duration_seconds":round(len(x)/SR,3),
       "realClipCount":len(records),"records":records}
    outpath.write_text(json.dumps(outcome,separators=(",",":")),encoding="utf-8")
    print("TERMUX_BRAIVOUR_REAL_AUDIO_PERCEIVED "+json.dumps({
       "seconds":outcome["duration_seconds"],"clips":len(records),
       "pitchFirst":records[0]["sound_pitch_mean"],
       "energyFirst":records[0]["sound_energy_mean"]
    }))

def play(manifest,out):
    data=json.loads(Path(manifest).read_text(encoding="utf-8"))
    if data.get("status")!="ORIGINAL_BRAIVOUR_HEARD_AND_ACTED":
        raise RuntimeError("Only actual original organism-driven 9D acoustic movements can be heard")
    frames=data.get("frames")
    if not isinstance(frames,list) or len(frames)!=48:raise RuntimeError("Expected 48 genuinely imagined original-body 9D states")
    seed=int(data.get("renderSeed",1731))
    audio=synth(frames,seed)
    peak=float(np.max(np.abs(audio)))
    if peak<1e-9:raise RuntimeError("Original organism generated silence")
    # Audibility normalization is OUTPUT ONLY: no acoustic information or
    # destination is invented and it never enters the learner as training.
    gain=min(50.0,0.78/peak)
    audio=np.clip(audio*gain,-0.90,0.90)
    write_wav(Path(out),audio)
    print("TERMUX_BRAIVOUR_ORIGINAL_BODY_AUDIO "+json.dumps({
      "output":str(out),"duration":len(audio)/SR,
      "physical9DFrames":len(frames),"originalMotorActions":data["nativeMotorActions"],
      "initialAudioConditionedOnUser":True,
      "playbackGainOnly":round(gain,4),
      "meanAbsAmplitude":round(float(np.mean(np.abs(audio))),5)}))

if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("Usage: python audio_codec.py sense INPUT_FILE OUT_JSON | render BODY_JSON OUT_WAV")
    command,source,dest=sys.argv[1:]
    if command=="sense":perceive(source,dest)
    elif command=="render":play(source,dest)
    else:raise SystemExit("Unknown audio_codec command")
