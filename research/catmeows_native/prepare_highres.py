#!/usr/bin/env python3
"""Verified CatMeows WAV -> 24 true chronological auditory frames, 64ms FFT.
Targeted fidelity intervention after 8-frame first-7/8 causal blindness.
All older audio-only experiment outputs are kept unchanged.
No call identity/context is included in acoustic sensory event arrays.
"""
import hashlib
import io
import json
import wave
import zipfile
from pathlib import Path

import numpy as np
from prepare import get_archive, load_wav, EXPECTED_MD5

ROOT=Path("runtime/catmeows")
N_FRAMES=24
W=512
FREQ_BANDS=[130,270,450,700,1050,1600,2450]

def encode_audio(x,sr):
    hop=max(128,sr//110)
    energies=np.array([np.sqrt(np.mean(x[i:i+hop]**2)+1e-12)
                       for i in range(0,len(x),hop)],dtype=np.float32)
    active=np.flatnonzero(energies>max(0.004,.12*float(energies.max())))
    if len(active):
        left=max(0,int(active[0]*hop-.08*sr))
        right=min(len(x),int((active[-1]+1)*hop+.08*sr))
        x=x[left:right]
    positions=np.linspace(0,max(0,len(x)-1),N_FRAMES+2)[1:-1].astype(int)
    win=np.hanning(W).astype(np.float32)
    hz=np.fft.rfftfreq(W,d=1/sr)
    matrix=[]
    for pos in positions:
        left=max(0,int(pos)-W//2)
        segment=x[left:left+W]
        if segment.size<W:segment=np.pad(segment,(0,W-segment.size))
        p=np.abs(np.fft.rfft(segment*win))**2+1e-12
        power=float(p.sum())
        band=[]
        for low,high in zip(FREQ_BANDS[:-1],FREQ_BANDS[1:]):
            portion=float(p[(hz>=low)&(hz<high)].sum())/power
            db=10*np.log10(max(1e-12,portion))
            band.append(float(np.clip((db+44)/4,0,11)))
        rms=np.sqrt(np.mean(segment*segment)+1e-12)
        centroid=float((p*hz).sum()/power)
        zcr=float(np.mean((segment[1:]>=0)!=(segment[:-1]>=0)))
        matrix.append(band+[float(np.clip((20*np.log10(rms+1e-9)+75)/6,0,11)),
                           float(np.clip(centroid/650,0,11)),
                           float(np.clip(zcr*28,0,11))])
    m=np.asarray(matrix)
    absvals=np.floor(m).clip(0,11).astype(np.uint8)
    changes=np.floor(m-np.median(m,axis=0)[None,:]+5.5).clip(0,11).astype(np.uint8)
    def serialize(a):
        return [int(20+j*12+a[t,j]) for t in range(a.shape[0]) for j in range(a.shape[1])]
    return {"audio_absolute24":serialize(absvals),"audio_change24":serialize(changes),
            "trimmedDurationSeconds":float(len(x)/sr),
            "uniqueFrameCenters":len(set(positions.tolist()))}

def main():
    root=ROOT
    root.mkdir(parents=True,exist_ok=True)
    archive=get_archive(root/"dataset.zip")
    if hashlib.md5(archive).hexdigest()!=EXPECTED_MD5:raise RuntimeError("Real dataset checksum mismatch")
    samples=[]
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        for name in sorted(z.namelist()):
            if not name.lower().endswith(".wav"):continue
            stem=Path(name).stem
            parts=stem.split("_")
            if len(parts)<6 or parts[0] not in {"B","F","I"}:raise ValueError("Official WAV filename unexpected "+name)
            x,sr=load_wav(z.read(name))
            observation=encode_audio(x,sr)
            samples.append({"recording":stem,"cat":parts[1],"owner":parts[4],
                            "context":parts[0],**observation})
    if len(samples)!=440:raise RuntimeError("Expected genuine 440 meows, got "+str(len(samples)))
    out=root/"highres_sensory.json"
    out.write_text(json.dumps(samples,separators=(",",":")),encoding="utf-8")
    info={"source":"official checksum verified CatMeows dataset.zip",
          "wav_files":len(samples),
          "originalCatCount":len(set(s["cat"] for s in samples)),
          "originalOwnerCount":len(set(s["owner"] for s in samples)),
          "framesPerRecording":N_FRAMES,
          "fftSamples":W,
          "eventsPerRecording":len(samples[0]["audio_change24"]),
          "minTrimmedDuration":round(min(x["trimmedDurationSeconds"] for x in samples),5),
          "medianTrimmedDuration":round(float(np.median([x["trimmedDurationSeconds"] for x in samples])),5),
          "maxTrimmedDuration":round(max(x["trimmedDurationSeconds"] for x in samples),5),
          "clipsWithDuplicatedFrameCenter":sum(x["uniqueFrameCenters"]<N_FRAMES for x in samples),
          "newMethodClaim":False}
    (root/"highres_provenance.json").write_text(json.dumps(info,indent=2),encoding="utf-8")
    print("CATMEOWS_HIGHRES_REAL_WAV_PREPARED "+json.dumps(info))
if __name__=="__main__":main()
