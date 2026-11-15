#!/usr/bin/env python3
"""CatMeows -> AUDIO-ONLY sensory events for the original Braivour Brain.

No metadata/label/cat ID is present in the sensory event stream. Labels and IDs
are retained only for training feedback and genuinely grouped evaluation.
Dataset: Ludovico et al., CatMeows v1.0.2, doi:10.5281/zenodo.4008297.
Research/non-commercial scope; never commit or redistribute the audio.
"""
import hashlib
import io
import json
import re
import sys
import time
import urllib.request
import wave
import zipfile
from pathlib import Path
import numpy as np

URL = "https://zenodo.org/records/4008297/files/dataset.zip?download=1"
EXPECTED_MD5 = "b5fa911bcd6514e39dfef6876f747df4"
CONTEXT = {"B", "F", "I"}
SAMPLE_WINDOWS = 8
FREQ_BANDS = [130, 270, 450, 700, 1050, 1600, 2450]
W = 2048

def get_archive(dest):
    if dest.is_file() and hashlib.md5(dest.read_bytes()).hexdigest() == EXPECTED_MD5:
        return dest.read_bytes()
    for attempt in range(4):
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": "Braivour-CatMeows-Research/1.0"})
            with urllib.request.urlopen(req, timeout=75) as source:
                payload = source.read()
            observed = hashlib.md5(payload).hexdigest()
            if observed != EXPECTED_MD5:
                raise ValueError(f"Zenodo MD5 mismatch: {observed}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(payload)
            return payload
        except Exception as ex:
            if attempt == 3:
                raise RuntimeError("CatMeows audio unavailable, no synthetic substitute") from ex
            print(f"Zenodo download retry {attempt + 1}: {ex}", file=sys.stderr)
            time.sleep(3 * (attempt + 1))

def load_wav(raw):
    with wave.open(io.BytesIO(raw), "rb") as wav:
        sr = wav.getframerate()
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        frames = wav.getnframes()
        data = wav.readframes(frames)
    if width == 2:
        x = np.frombuffer(data, dtype="<i2").astype(np.float32) / 32768.0
    elif width == 1:
        x = (np.frombuffer(data, dtype=np.uint8).astype(np.float32) - 128) / 128
    elif width == 4:
        x = np.frombuffer(data, dtype="<i4").astype(np.float32) / 2147483648
    else:
        raise ValueError(f"Unsupported PCM sample width: {width}")
    if channels > 1:
        x = x.reshape(-1, channels).mean(axis=1)
    return x, sr

def audio_only_events(x, sr):
    if x.size < 128 or sr <= 0:
        raise ValueError("Invalid waveform")
    # Trim long silence, using only the signal, never context labels.
    hop = max(128, sr // 110)
    energy = np.array([np.sqrt(np.mean(x[i:i+hop]**2) + 1e-12)
                       for i in range(0, len(x), hop)], dtype=np.float32)
    active = np.flatnonzero(energy > max(0.004, 0.12 * energy.max()))
    if len(active) > 0:
        left = max(0, int(active[0] * hop - 0.08 * sr))
        right = min(len(x), int((active[-1] + 1) * hop + 0.08 * sr))
        x = x[left:right]
    positions = np.linspace(0, max(0, len(x) - 1), SAMPLE_WINDOWS + 2)[1:-1].astype(int)
    win = np.hanning(W).astype(np.float32)
    freqs = np.fft.rfftfreq(W, d=1/sr)
    rows = []
    for pos in positions:
        a = max(0, pos - W // 2)
        segment = x[a:a+W]
        if len(segment) < W:
            segment = np.pad(segment, (0, W - len(segment)))
        p = np.abs(np.fft.rfft(segment * win))**2 + 1e-12
        power = float(p.sum())
        bands = []
        for f1, f2 in zip(FREQ_BANDS[:-1], FREQ_BANDS[1:]):
            val = float(p[(freqs >= f1) & (freqs < f2)].sum()) / power
            db = 10*np.log10(max(1e-12, val))
            bands.append(float(np.clip((db + 44) / 4, 0, 11)))
        rms = np.sqrt(np.mean(segment * segment) + 1e-12)
        centroid = float((p * freqs).sum() / power)
        zcr = float(np.mean((segment[1:] >= 0) != (segment[:-1] >= 0)))
        rows.append(bands + [
            float(np.clip((20*np.log10(rms + 1e-9) + 75)/6, 0, 11)),
            float(np.clip(centroid/650, 0, 11)),
            float(np.clip(zcr*28, 0, 11)),
        ])
    matrix = np.asarray(rows)
    absolute = np.clip(np.floor(matrix), 0, 11).astype(int)
    # Second genuine auditory perspective: a spectral MOVEMENT relative to this
    # same vocalization, not an independent learning model or an oracle.
    differential = np.clip(np.floor(matrix - np.median(matrix, axis=0)[None, :] + 5.5), 0, 11).astype(int)
    def encode(m):
        return [int(20 + column * 12 + m[frame, column])
                for frame in range(m.shape[0]) for column in range(m.shape[1])]
    median = np.clip(np.rint(np.median(matrix, axis=0)), 0, 11).astype(int).reshape(1, -1)
    spread = np.clip(np.rint(np.std(matrix, axis=0) * 2.0), 0, 11).astype(int).reshape(1, -1)
    # Distinct sensory perspectives of actual acoustic events only. No context
    # classification, external model or label information enters this function.
    duration_bin = int(np.clip(round((len(x)/sr - 0.25) / 0.24), 0, 11))
    duration_summary = median.copy()
    duration_summary[0, -1] = duration_bin
    return {
        "audio_absolute": encode(absolute),
        "audio_change": encode(differential),
        "audio_global": encode(median),
        "audio_shape": encode(np.concatenate([spread, median], axis=0)),
        "audio_contextual": encode(absolute) + encode(median),
        "audio_duration": encode(duration_summary),
    }

def main():
    root = Path("runtime/catmeows")
    root.mkdir(parents=True, exist_ok=True)
    archive = get_archive(root / "dataset.zip")
    samples = []
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        for name in sorted(z.namelist()):
            if not name.lower().endswith(".wav"):
                continue
            stem = Path(name).stem
            parts = stem.split("_")
            if len(parts) < 6 or parts[0] not in CONTEXT:
                raise ValueError(f"Unexpected official CatMeows filename: {name}")
            x, sr = load_wav(z.read(name))
            auditory = audio_only_events(x, sr)
            samples.append({
                "context": parts[0], "cat": parts[1], "owner": parts[4],
                "recording": stem, "duration": round(len(x)/sr, 5),
                **auditory,
            })
    if len(samples) != 440:
        raise RuntimeError(f"Expected 440 genuine audio clips, found {len(samples)}")
    out = root / "sensory.json"
    out.write_text(json.dumps(samples, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"dataset": "CatMeows v1.0.2", "wav_files": len(samples),
                      "cats": len(set(r["cat"] for r in samples)),
                      "owners": len(set(r["owner"] for r in samples)),
                      "class_counts": {x: sum(s["context"] == x for s in samples) for x in sorted(CONTEXT)},
                      "audio_md5": EXPECTED_MD5, "events_per_clip": len(samples[0]["audio_absolute"]),
                      "sensory_file": str(out)}, indent=2))

if __name__ == "__main__":
    main()
