#!/usr/bin/env python3
"""Real CatMeows -> one sensory stream for ORIGINAL Braivour generative Brain.

Only verified WAV bytes are used. The 48x9 auditory observations are physical
pitch, harmonicity, loudness and six relative spectral-band energies. They
contain no labels, text, identifiers or target audio in their sensory part.

The sound decoder lives in render_imagined.py. Nothing in this script generates
the Braivour output; it prepares the real-world observations to learn from.
"""
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from prepare import get_archive, load_wav, EXPECTED_MD5

OUT=Path("runtime/catmeows")
FRAMES=48
WINDOW=1024
SAMPLE_RATE=8000
BANDS=[100,240,400,700,1100,1900,3800]

def quantize(x):
    return int(np.clip(round(x),0,11))

def sense(x,sr):
    if sr!=SAMPLE_RATE:
        raise ValueError(f"Expected original 8 kHz PCM; found {sr}")
    x=np.asarray(x,dtype=np.float64)
    if x.size<512:
        raise ValueError("Recording too short to contain an original vocalization")
    hop=160
    rms=np.array([np.sqrt(np.mean(x[i:i+hop]**2)+1e-12) for i in range(0,len(x),hop)])
    active=np.flatnonzero(rms>max(0.004,float(rms.max())*.14))
    if len(active):
        low=max(0,int(active[0]*hop-0.08*sr))
        high=min(len(x),int((active[-1]+1)*hop+0.08*sr))
        x=x[low:high]
    if x.size<512:
        raise ValueError("Trimmed genuine WAV too short")
    centers=np.linspace(WINDOW//2,max(WINDOW//2,len(x)-WINDOW//2),FRAMES).astype(int)
    win=np.hanning(WINDOW)
    freq=np.fft.rfftfreq(WINDOW,1/sr)
    lag_low=int(sr/900)
    lag_high=int(sr/145)
    fields=[]
    f0_pitched=0
    for center in centers:
        a=max(0,int(center)-WINDOW//2)
        segment=x[a:a+WINDOW]
        if segment.size<WINDOW:
            segment=np.pad(segment,(0,WINDOW-segment.size))
        segment=segment-segment.mean()
        taper=segment*win
        power=np.abs(np.fft.rfft(taper))**2+1e-12
        total=float(np.sum(power))
        # Autocorrelation is purely physical perception, not a classifier.
        auto=np.fft.irfft(np.abs(np.fft.rfft(taper,n=2048))**2,n=2048)
        z=auto[lag_low:lag_high+1]
        if z.size==0 or auto[0]<=1e-12:
            lag=lag_low
            confidence=0
        else:
            best=int(np.argmax(z))
            lag=lag_low+best
            confidence=float(np.clip(z[best]/(auto[0]+1e-12),0,1))
        f0=sr/lag if confidence>.21 else 0.0
        if f0>0:f0_pitched+=1
        pitch=quantize(1+10*(np.clip(f0,145,900)-145)/(900-145)) if f0 else 0
        loud=float(np.sqrt(np.mean(segment**2)+1e-12))
        loudness=quantize((20*np.log10(loud+1e-10)+65)/5.2)
        harmonicity=quantize(confidence*11)
        spectral=[]
        for lo,hi in zip(BANDS[:-1],BANDS[1:]):
            frac=float(power[(freq>=lo)&(freq<hi)].sum()/total)
            db=10*np.log10(max(frac,1e-12))
            spectral.append(quantize((db+39)/3.2))
        field=[pitch,loudness,harmonicity,*spectral]
        if len(field)!=9 or any(not 0<=v<=11 for v in field):
            raise RuntimeError("Invalid physical audio sensory state")
        fields.append(field)
    return {"frames":fields,"duration_s":round(x.size/sr,5),
            "pitched_frames":f0_pitched,
            "frame_centers_unique":len(set(centers.tolist()))}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    payload=get_archive(OUT/"dataset.zip")
    if hashlib.md5(payload).hexdigest()!=EXPECTED_MD5:
        raise RuntimeError("Incorrect real CatMeows dataset ZIP")
    recordings=[]
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        for filename in sorted(z.namelist()):
            if not filename.lower().endswith(".wav"):
                continue
            parts=Path(filename).stem.split("_")
            if len(parts)<6 or parts[0] not in {"B","F","I"}:
                raise RuntimeError("Unknown original CatMeows filename convention")
            wav,sr=load_wav(z.read(filename))
            auditory=sense(wav,sr)
            recordings.append({
              "name":Path(filename).stem,
              "cat":parts[1],
              "owner":parts[4],
              "context_for_split_only":parts[0],
              **auditory
            })
    if len(recordings)!=440:
        raise RuntimeError(f"Expected 440 unmodified real recordings, got {len(recordings)}")
    data={"dataset":"CatMeows v1.0.2 MD5 "+EXPECTED_MD5,
          "sensory_frames":FRAMES,"channels":9,"sample_rate":SAMPLE_RATE,
          "models_or_manually_labeled_meanings":0,"recordings":recordings}
    (OUT/"generative_perception.json").write_text(json.dumps(data,separators=(",",":")),encoding="utf-8")
    summary={
      "recordings":len(recordings),"cats":len(set(r["cat"] for r in recordings)),
      "owners":len(set(r["owner"] for r in recordings)),
      "frames":FRAMES,"bands":len(BANDS)-1,
      "pitched_clip_count":sum(r["pitched_frames"]>8 for r in recordings),
      "percent_voiced_frames":round(100*sum(r["pitched_frames"] for r in recordings)/(len(recordings)*FRAMES),3),
      "median_trimmed_duration_s":round(float(np.median([r["duration_s"] for r in recordings])),3),
      "from_verified_original_WAV_only":True
    }
    (OUT/"generative_perception_summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print("CATMEOWS_GENERATIVE_REAL_PERCEPTION "+json.dumps(summary))

if __name__=="__main__":
    main()
