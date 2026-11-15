#!/usr/bin/env python3
"""Audit the original CatMeows extras.zip (uncut calls and excluded non-meows).

This only inventories genuine audio and estimates energy-separated acoustic
bursts; energy bursts are NOT automatically identified as cat meows or words.
"""
import hashlib
import io
import json
import urllib.request
import wave
import zipfile
from pathlib import Path
import numpy as np

URL = "https://zenodo.org/records/4008297/files/extras.zip?download=1"
MD5 = "7663bb5e1de2c808beeb202a52dc99ab"

def main():
    root = Path("runtime/catmeows")
    root.mkdir(parents=True, exist_ok=True)
    dest = root / "extras.zip"
    if dest.exists() and hashlib.md5(dest.read_bytes()).hexdigest() == MD5:
        payload = dest.read_bytes()
    else:
        req = urllib.request.Request(URL, headers={"User-Agent":"Braivour-Original-Organism-Scientific-Research/1.0"})
        with urllib.request.urlopen(req, timeout=120) as response:
            payload = response.read()
        if hashlib.md5(payload).hexdigest() != MD5:
            raise RuntimeError("Official CatMeows extras.zip MD5 mismatch")
        dest.write_bytes(payload)
    details=[]
    with zipfile.ZipFile(io.BytesIO(payload)) as source:
        for entry in source.infolist():
            if entry.is_dir():
                continue
            item={"name":entry.filename, "bytes":entry.file_size, "extension":Path(entry.filename).suffix.lower()}
            if item["extension"]==".wav":
                try:
                    with wave.open(io.BytesIO(source.read(entry.filename)),"rb") as wav:
                        sr=wav.getframerate()
                        n=wav.getnframes()
                        ch=wav.getnchannels()
                        width=wav.getsampwidth()
                        item.update(sample_rate=sr,duration_seconds=round(n/sr,3),channels=ch,width_bytes=width)
                        buf=wav.readframes(n)
                    if width==2:
                        x=np.frombuffer(buf,dtype="<i2").astype(np.float32)/32768
                    elif width==1:
                        x=(np.frombuffer(buf,dtype=np.uint8).astype(np.float32)-128)/128
                    else:
                        item["burstEstimate"]="PCM unsupported"
                        details.append(item)
                        continue
                    if ch>1:
                        x=x.reshape(-1,ch).mean(axis=1)
                    hop=max(160, int(sr*0.02))
                    e=np.array([np.sqrt(np.mean(x[i:i+hop]**2)+1e-12) for i in range(0,x.size,hop)])
                    threshold=max(0.005, float(e.max())*0.22)
                    active=(e>threshold)
                    segments=[]
                    start=None
                    for i,val in enumerate(active):
                        if val and start is None:
                            start=i
                        if not val and start is not None:
                            segments.append((start,i))
                            start=None
                    if start is not None:
                        segments.append((start,len(active)))
                    merged=[]
                    for a,b in segments:
                        if merged and a-merged[-1][1] <= 6:
                            merged[-1]=(merged[-1][0],b)
                        else:
                            merged.append((a,b))
                    item["distinct_energy_bursts_approx"]=sum((b-a)*hop/sr>=0.08 for a,b in merged)
                    item["audible_fraction_approx"]=round(float(np.mean(active)),3)
                except Exception as exc:
                    item["error"]=str(exc)
            details.append(item)
    report={"source":"Zenodo CatMeows extras.zip 4008297","verified_md5":MD5,
            "scope":"real uncut acoustic recordings and excluded sounds, NOT verified call-response dialogues",
            "file_count":len(details),
            "wav_count":sum(x["extension"]==".wav" for x in details),
            "total_wav_duration_seconds":round(sum(x.get("duration_seconds",0) for x in details),3),
            "at_least_two_energy_bursts_count":sum(x.get("distinct_energy_bursts_approx",0)>=2 for x in details),
            "files":details}
    out=root/"extras_audit.json"
    out.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print("CATMEOWS_EXTRAS_AUDIT "+json.dumps(report))
if __name__=="__main__":main()
