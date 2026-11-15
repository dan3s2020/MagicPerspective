#!/usr/bin/env python3
"""True temporal episodes from official CatMeows extras.zip, no semantic labels.
Plausible energy bursts are sound events, NOT certified individual meows.
"""
import hashlib
import io
import json
import wave
import zipfile
from pathlib import Path

import numpy as np
from prepare_highres import encode_audio

ROOT=Path("runtime/catmeows")
ZIP=ROOT/"extras.zip"
MD5="7663bb5e1de2c808beeb202a52dc99ab"

def events(x,sr):
    hop=max(160,int(sr*0.02))
    e=np.array([np.sqrt(np.mean(x[i:i+hop]*x[i:i+hop])+1e-12)
                for i in range(0,len(x),hop)])
    th=max(0.005,float(e.max())*0.22)
    active=e>th
    intervals=[]
    begin=None
    for i,v in enumerate(active):
        if bool(v) and begin is None:begin=i
        if not v and begin is not None:intervals.append((begin,i));begin=None
    if begin is not None:intervals.append((begin,len(active)))
    merged=[]
    for a,b in intervals:
        if merged and a-merged[-1][1]<=6:merged[-1]=(merged[-1][0],b)
        else:merged.append((a,b))
    return [(max(0,a*hop-int(.03*sr)),min(len(x),b*hop+int(.03*sr)))
            for a,b in merged if (b-a)*hop/sr>=0.08]

def main():
    if not ZIP.is_file() or hashlib.md5(ZIP.read_bytes()).hexdigest()!=MD5:
        raise RuntimeError("Official extras.zip was not downloaded and MD5-verified")
    episodes=[]
    with zipfile.ZipFile(ZIP) as z:
        for name in sorted(z.namelist()):
            if not (name.startswith("sequences/") and name.endswith(".wav")):
                continue
            p=Path(name).stem.split("_")
            if len(p)<6:raise RuntimeError("Unexpected original sequence filename: "+name)
            with wave.open(io.BytesIO(z.read(name)),"rb") as wav:
                sr=wav.getframerate();raw=wav.readframes(wav.getnframes())
                if wav.getsampwidth()!=2 or wav.getnchannels()!=1:
                    raise RuntimeError("Unrecognized genuine PCM sequence format: "+name)
            x=np.frombuffer(raw,dtype="<i2").astype(np.float32)/32768
            bursts=events(x,sr)
            samples=[]
            for a,b in bursts:
                acoustic=encode_audio(x[a:b],sr)
                samples.append({
                    "start":round(a/sr,4),"stop":round(b/sr,4),
                    "audio_absolute24":acoustic["audio_absolute24"],
                    "audio_change24":acoustic["audio_change24"],
                    "trimmedDurationSeconds":acoustic["trimmedDurationSeconds"],
                    "uniqueFrameCenters":acoustic["uniqueFrameCenters"]
                })
            episodes.append({"recording":name, "cat":p[1],"owner":p[4],
                             "context_for_audit_only":p[0],
                             "duration":round(len(x)/sr,4),"bursts":samples})
    if len(episodes)!=30:raise RuntimeError(f"Expected 30 original uncut recordings, found {len(episodes)}")
    out=ROOT/"real_sequences_highres.json"
    out.write_text(json.dumps(episodes,separators=(",",":")),encoding="utf-8")
    report={"source":"verified original CatMeows extras.zip","episode_count":len(episodes),
            "cats":len(set(e["cat"] for e in episodes)),
            "owners":len(set(e["owner"] for e in episodes)),
            "bursts_total":sum(len(e["bursts"]) for e in episodes),
            "bursts_min":min(len(e["bursts"]) for e in episodes),
            "bursts_max":max(len(e["bursts"]) for e in episodes),
            "bursts_mean":round(np.mean([len(e["bursts"]) for e in episodes]),3),
            "note":"Energy-burst boundaries are algorithmic estimates; highres frames from true waveform, not annotated cat messages"}
    (ROOT/"real_sequences_highres_metadata.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print("CATMEOWS_REAL_HIGHRES_SEQUENCE_PREPARED "+json.dumps(report))
if __name__=="__main__":main()
