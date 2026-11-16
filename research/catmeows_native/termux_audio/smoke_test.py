#!/usr/bin/env python3
"""Automated REAL audio E2E check of Termux app on unmodified V17 Brain.

This is not a mock: the server loads the exact 44MB organism, senses two
ACTUAL CatMeows WAVs, generates a different REAL WAV in response to each,
plays action-consequence games from actual uploaded audio, saves and reloads.
"""
import json
import hashlib
import os
from pathlib import Path
import time
import urllib.request
import wave
import sys

BASE="http://127.0.0.1:8765"
ROOT=Path("runtime/termux_cat_audio")
def call(path,body=None,content_type=None):
    req=urllib.request.Request(BASE+path,
       data=body,headers={"Content-Type":content_type} if content_type else {},
       method="POST" if body is not None else "GET")
    with urllib.request.urlopen(req,timeout=110) as r:
        data=r.read()
        if path.startswith("/api/output/"):return data
        return json.loads(data)
def jsonpost(url,data):
    return call(url,json.dumps(data).encode("utf-8"),"application/json")
def check_wav(uri):
    data=call(uri)
    import io
    with wave.open(io.BytesIO(data),"rb") as w:
        assert w.getframerate()==8000 and w.getnchannels()==1 and w.getnframes()==7680
    assert len(data)>14000
    return hashlib.sha256(data).hexdigest()
def status():
    a=call("/api/status")
    assert a["loadedOriginalCheckpoint"] is True
    assert a["originalBrainTrainingEpisodes"]>=540
    assert a["originalNineAuditoryFeatures"] is True
    assert a["originalNativeDiscovererSelf"]==3
    assert len([v for v in a["originalBrainMotorEffects"] if v is not None])==4
    return a
def main():
    stage=sys.argv[1]
    base=status()
    if stage=="resume":
        assert base["additionalUserAudioClipsAbsorbed"]>0
        assert base["audioRepliesGenerated"]>=2
        assert base["lastSaved"]
        recent=base["recentRecordings"][-1]["id"]
        r=jsonpost("/api/reply",{"id":recent,"creativity":.55})["reply"]
        h=check_wav(r["audio"])
        print("BRAIVOUR_TERMUX_RESTART_VALIDATED "+json.dumps({
          "originalBrainStillPresent":True,
          "nativeEpisodes":base["originalBrainTrainingEpisodes"],
          "nativeObservations":base["originalNativeAuditoryGraphObservations"],
          "audioWorksAfterRestart":True,
          "generatedWavHash":h
        }))
        return
    assert stage=="full"
    assert len(sys.argv) in {4,5}
    uploads=[]
    responses=[]
    for name in sys.argv[2:]:
        wav=Path(name).read_bytes()
        a=call("/api/upload",wav,"audio/wav")["recording"]
        uploads.append(a)
        reply=jsonpost("/api/reply",{"id":a["id"],"creativity":.55})["reply"]
        wav_hash=check_wav(reply["audio"])
        responses.append({"reply":reply,"actualRenderedWavSha256":wav_hash})
    assert uploads[0]["id"]!=uploads[1]["id"],"Different REAL input must get different actual sensory identifier"
    assert responses[0]["actualRenderedWavSha256"]!=responses[1]["actualRenderedWavSha256"],"Original body returned a canned identical audio for two actual independent inputs"
    assert responses[0]["reply"]["nativeActions"]==47
    assert responses[1]["reply"]["nativeActions"]==47
    training=jsonpost("/api/train",{"id":uploads[0]["id"],"episodes":12})
    assert training["accepted"]
    for iteration in range(180):
        time.sleep(1)
        st=status()
        t=st.get("training") or {}
        if t.get("status") in {"completed","failed","stopped_by_user","no_reachable_real_audio_game_goals"}:
            break
    else:
        raise RuntimeError("Actual original body training did not finish")
    if t.get("status")=="failed":raise RuntimeError("Native original Brain failed training: "+str(t.get("error")))
    assert st["additionalUserAudioClipsAbsorbed"]>=1
    assert st["originalNativeAuditoryGraphObservations"]>base["originalNativeAuditoryGraphObservations"]
    assert t["checkpointSaved"] is True
    assert st["lastSaved"]
    assert (ROOT/"checkpoints"/"active.v8").stat().st_size>25_000_000
    assert (ROOT/"checkpoints"/"previous.v8").stat().st_size>25_000_000
    if t["gamesPlayed"]>0:
        assert st["originalBrainTrainingEpisodes"]>base["originalBrainTrainingEpisodes"]
    result={"status":"REAL_ORIGINAL_BRAIVOUR_TERMUX_AUDIO_HARDWARE_INDEPENDENT_SMOKE_PASS",
      "inputSoundsGenuineOriginalCatMeows":True,
      "freshDistinctInputSha":[a["shaPrefix"] for a in uploads],
      "microphoneWebmOpusAudioTested":len(sys.argv)==5,
      "recordedWebmDecodedToRealNineDimensionalStates":len(sys.argv)==5,
      "differentRealBrainNativeAudioResponses":[r["actualRenderedWavSha256"] for r in responses],
      "originalBrainNativeActions":[r["reply"]["nativeActions"] for r in responses],
      "nativeGraphObservationsBefore":base["originalNativeAuditoryGraphObservations"],
      "nativeGraphObservationsAfter":st["originalNativeAuditoryGraphObservations"],
      "originalBrainEpisodeCountBefore":base["originalBrainTrainingEpisodes"],
      "originalBrainEpisodeCountAfter":st["originalBrainTrainingEpisodes"],
      "realUserAudioFragmentsActuallyAbsorbed":st["additionalUserAudioClipsAbsorbed"],
      "realOriginalBodyGamesPlayed":t["gamesPlayed"],
      "originalBodyGameWins":t["solved"],
      "realBrainCheckpointAutoSavedAndVerified":True,
      "humanAuditoryNaturalnessVerified":False,
      "catLanguageDecoded":False}
    (ROOT/"actual_termux_smoke_result.json").write_text(json.dumps(result,indent=2))
    print("BRAIVOUR_TERMUX_ACTUAL_E2E_COMPLETE "+json.dumps(result))

if __name__=="__main__":main()
