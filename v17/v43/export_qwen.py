"""MagicPerspective V43: verified port of Braivour read-only GGUF coordinate exporter.

Exact byte atlas, quantized tensor slicing and real donor movement axes are retained.
No synthetic donor directions; Qwen's full forward pass is NOT run.
Run with the original V42 CUDA Python environment after installing gguf/numpy.
"""

from __future__ import annotations

import os

import json

import argparse

from pathlib import Path

import numpy as np

from gguf_checkpoint import CheckpointIndex

def _byte_alphabet():
    first=list(range(ord('!'),ord('~')+1))+list(range(ord('¡'),ord('¬')+1))+list(range(ord('®'),ord('ÿ')+1))
    bs=first[:];cs=first[:]; n=0
    for b in range(256):
        if b not in first:
            bs.append(b);cs.append(256+n);n+=1
    return {chr(c):b for b,c in zip(bs,cs)}, {b:chr(c) for b,c in zip(bs,cs)}


def load_byte_weight_atlas(gguf: str, dims: int = 128):
    """Exact GGUF token IDs of all 256 individual bytes, sampled from real weights."""
    rev, chars = _byte_alphabet()
    idx = CheckpointIndex(gguf)
    try:
        reader=next(iter(idx._gguf_readers.values()),None)
        if reader is None:raise ValueError('A genuine GGUF donor is required')
        field=reader.get_field('tokenizer.ggml.tokens')
        model=reader.get_field('tokenizer.ggml.model')
        if field is None or model is None or model.contents()!='gpt2':
            raise ValueError('Expected GPT2 ByteLevel GGUF tokenizer metadata')
        sought={chars[b] for b in range(256)}
        lookup={}
        for i in range(len(field.data)):
            p=field.contents(i)
            if p in sought and p not in lookup:lookup[p]=i
            if len(lookup)==256:break
        if len(lookup)!=256:
            raise ValueError('Missing byte token pieces; not safe to guess token IDs')
        tensor_names=[name for name in ('token_embd.weight','output.weight')
                      if name in idx.by_name and idx.by_name[name].shape[0]==len(field.data)
                      and idx.by_name[name].shape[1]>=dims]
        if not tensor_names:raise ValueError('No compatible vocabulary-weight matrices')
        ids=[lookup[chars[b]] for b in range(256)]
        arrays={}
        for name in tensor_names:
            chunks=[idx.sample_rows(name,ids[i:i+128],cols=dims) for i in (0,128)]
            arrays[name]=np.concatenate(chunks).astype(np.float32)
        inp=arrays.get('token_embd.weight',arrays[tensor_names[0]])
        out=arrays.get('output.weight',inp)
        return inp,out,{'donor_path':str(gguf),'token_ids':ids,'tensors':tensor_names,
                        'dimensions':dims,'vocabulary_size':len(field.data),
                        'gguf_sha256':None,'method':'exact 256 byte token row sampling, no donor inference'}
    finally:idx.close()


def prepare_donor(gguf,dim=64,probe_tensors=1024,progress=None):
    """Read-only sample of all tensor layers + exact 256 byte pieces.

    Do NOT claim the full 35B tensor contents are resident: the entire donor is
    indexed as one object, and a sampled subset defines bounded player moves.
    """
    inp,out,meta=load_byte_weight_atlas(gguf,dim)
    index=CheckpointIndex(gguf)
    try:
        choices=[r for r in index.records if len(r.shape)>=2 and r.shape[-1]>=dim]
        if not choices:raise ValueError('No compatible donor tensor directions')
        # Sample tensors spanning the entire layer distribution, not just 256 token rows.
        loc=np.linspace(0,len(choices)-1,min(probe_tensors,len(choices))).astype(int).tolist()
        vectors=[];provenance=[]
        for i in loc:
            t=choices[i]
            if progress is not None:progress({'phase':'absorbing','tensor_name':t.name,'tensors_seen':len(provenance),'tensors_to_scan':len(loc)})
            try:
                row=index.sample(t.name,rows=2,cols=dim,seed=29).astype('float32')
                if row.shape[1]==dim and np.isfinite(row).all():
                    vectors.append(row[0]);vectors.append(row[-1]);provenance.append(t.name)
            except (ValueError,IndexError,TypeError):continue
        if not vectors:raise ValueError('Could not sample donor transformation directions')
        if progress is not None:progress({'phase':'absorbing','tensors_seen':len(provenance),'tensors_to_scan':len(loc)})
        basis=np.stack(vectors)
        basis-=basis.mean(axis=0,keepdims=True)
        basis/=np.maximum(np.linalg.norm(basis,axis=1,keepdims=True),1e-6)
        return inp,out,basis.astype('float32'),{'format':'brain-world/read-only-donor-index-v1',
            'donor':str(gguf),'total_tensors':len(index.records),'sampled_tensor_names':provenance,
            'move_vectors':len(basis),'dimensions':dim,'donor_forward_executed':False,
            'full_tensor_weights_loaded':False,'checkpoint_is_read_only':True,**meta}
    finally:index.close()


def export(gguf, output, *, dim=64, tensor_limit=1024, axes_limit=96, gain=1.4):
    if not 16 <= dim <= 256:
        raise ValueError('Donor dimensions must be 16..256')
    if not 1 <= tensor_limit <= 1024:
        raise ValueError('Tensor sampling bound must be 1..1024')
    if not 2 <= axes_limit <= 1024:
        raise ValueError('Axes bound must be 2..1024')
    if not .05 <= gain <= 5:
        raise ValueError('Move gain must be between .05 and 5')
    inp, out, axes, details = prepare_donor(str(gguf), dim, tensor_limit)
    indices = np.unique(np.linspace(0, len(axes)-1, min(axes_limit,len(axes))).astype(int))
    vectors = np.ascontiguousarray(axes[indices],dtype=np.float32)
    if vectors.shape[0] < 2 or not np.isfinite(vectors).all():
        raise ValueError('Insufficient finite donor movement axes')
    obj = {
        'format':'braivour/v42-brain-character/v1',
        'input_rows':np.asarray(inp,dtype=np.float32).tolist(),
        'output_rows':np.asarray(out,dtype=np.float32).tolist(),
        'movement_axes':vectors.tolist(),
        'dimensions':dim,
        'move_gain':gain,
        'provenance':details,
        'source_genuine_gguf':True,
        'tensor_values_sampled_only':True,
        'entire_checkpoint_loaded_to_vram':False,
        'actual_donor_forward_pass':False,
        'immutable_donor_atlas':True
    }
    target=Path(output)
    target.parent.mkdir(parents=True,exist_ok=True)
    stage=target.with_suffix(target.suffix+'.tmp')
    try:
        with stage.open('w',encoding='utf-8') as file:
            json.dump(obj,file,separators=(',',':'),allow_nan=False)
            file.flush();os.fsync(file.fileno())
        os.replace(stage,target)
    finally:
        if stage.is_file():stage.unlink()
    return {'file':str(target),'bytes':target.stat().st_size,'dimensions':dim,
            'movement_axes':len(vectors),'indexed_tensors':details.get('total_tensors'),
            'sampled_tensors':len(details.get('sampled_tensor_names',[]))}


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--gguf',required=True)
    p.add_argument('--output',required=True)
    p.add_argument('--dim',type=int,default=64)
    p.add_argument('--tensor-limit',type=int,default=1024)
    p.add_argument('--axes-limit',type=int,default=96)
    p.add_argument('--gain',type=float,default=1.4)
    a=p.parse_args()
    print(json.dumps(export(a.gguf,a.output,dim=a.dim,tensor_limit=a.tensor_limit,
                            axes_limit=a.axes_limit,gain=a.gain)),flush=True)


if __name__=='__main__':main()
