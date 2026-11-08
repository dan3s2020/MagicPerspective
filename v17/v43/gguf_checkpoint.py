"""Read-only, slice-bounded local safetensors / GGUF checkpoint inspection.

The model is NEVER instantiated, executed, finetuned, or copied by this module.
A model may be a single .safetensors, sharded directory, or a GGUF file.
Partial tensor slices avoid loading whole Qwen weight tensors into RAM/VRAM.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator
import json, hashlib, re, math
import numpy as np

SUPPORTED = {'.safetensors', '.gguf'}
LAYER_RE = re.compile(r'(?:^|\.)(?:layers|h|blocks|blk)\.(\d+)(?:\.|$)')


class CheckpointError(ValueError):
    pass


@dataclass(frozen=True)
class TensorRecord:
    name: str
    shape: tuple[int, ...]
    dtype: str
    file: str
    role: str
    layer: int | None
    backend: str
    n_elements: int

    def public(self) -> dict:
        return dict(name=self.name, shape=list(self.shape), dtype=self.dtype,
                    file=Path(self.file).name, role=self.role, layer=self.layer,
                    backend=self.backend, n_elements=self.n_elements)


def classify(name: str) -> tuple[int | None, str]:
    m = LAYER_RE.search(name)
    layer = int(m.group(1)) if m else None
    s=name.lower()
    roles=(('q_proj','attention.query'),('k_proj','attention.key'),('v_proj','attention.value'),
           ('o_proj','attention.output'),('qkv','attention.qkv'),('attn_q','attention.query'),
           ('attn_k','attention.key'),('attn_v','attention.value'),('attn_output','attention.output'),
           ('gate_proj','mlp.gate'),('up_proj','mlp.up'),('down_proj','mlp.down'),
           ('ffn_gate','mlp.gate'),('ffn_up','mlp.up'),('ffn_down','mlp.down'),
           ('experts','moe.experts'),('router','moe.router'),('embed','embedding'),
           ('norm','normalization'),('lm_head','output_head'))
    for frag,role in roles:
        if frag in s:return layer,role
    return layer,'other'


class CheckpointIndex:
    def __init__(self,path: str|Path):
        self.path=Path(path).expanduser().resolve(strict=True)
        self.records: list[TensorRecord]=[]
        self.metadata: dict={}
        self._gguf_readers={}
        self._add()
        if not self.records:raise CheckpointError('No supported tensor weights found')
        self.records.sort(key=lambda r: (r.layer if r.layer is not None else -1,r.name))
        self.by_name={x.name:x for x in self.records}
        if len(self.by_name)!=len(self.records):raise CheckpointError('Duplicate tensor names across files')

    def _add(self):
        if self.path.is_file():
            if self.path.suffix.lower() not in SUPPORTED:
                raise CheckpointError('Choose a .safetensors, .gguf or a checkpoint folder')
            paths=[self.path]
        elif self.path.is_dir():
            paths=sorted(self.path.glob('*.safetensors'))
            if not paths:paths=sorted(self.path.glob('*.gguf'))
            # No recursively scanning every nested data folder or downloading models.
            if not paths:raise CheckpointError('No .safetensors or .gguf files directly inside folder')
            conf=self.path/'config.json'
            if conf.is_file() and conf.stat().st_size<2_000_000:
                try:
                    c=json.loads(conf.read_text(encoding='utf-8'))
                    self.metadata={'model_type':c.get('model_type'),'architectures':c.get('architectures'),
                                   'hidden_size':c.get('hidden_size'),'num_hidden_layers':c.get('num_hidden_layers')}
                except (ValueError,OSError):pass
        else:raise CheckpointError('Checkpoint path does not exist')
        for path in paths:
            if path.suffix.lower()=='.safetensors':self._add_safe(path)
            else:self._add_gguf(path)

    def _add_safe(self,path):
        try:from safetensors import safe_open
        except ImportError as exc:raise CheckpointError('Install safetensors (pip install safetensors)') from exc
        with safe_open(str(path),framework='pt',device='cpu') as f:
            for key in f.keys():
                sh=tuple(int(v) for v in f.get_slice(key).get_shape())
                layer,role=classify(key)
                # dtype from a one-element partial slice is unnecessary; avoid any full allocation.
                self.records.append(TensorRecord(key,sh,'safetensors',str(path),role,layer,
                                                 'safetensors',math.prod(sh)))

    def _add_gguf(self,path):
        try:from gguf import GGUFReader
        except ImportError as exc:raise CheckpointError('GGUF support requires pip install gguf') from exc
        reader=GGUFReader(str(path),mode='r')
        self._gguf_readers[str(path)]=reader
        for tensor in reader.tensors:
            name=str(tensor.name)
            sh=tuple(int(d) for d in reversed(tensor.shape))
            layer,role=classify(name)
            self.records.append(TensorRecord(name,sh,str(tensor.tensor_type),str(path),role,layer,
                                             'gguf',math.prod(sh)))

    def public(self):
        roles={}; layers={}; parameters=0
        for t in self.records:
            roles[t.role]=roles.get(t.role,0)+1
            if t.layer is not None:layers[str(t.layer)]=layers.get(str(t.layer),0)+1
            parameters+=t.n_elements
        return {'path':str(self.path),'format':'GGUF' if self.records[0].backend=='gguf' else 'safetensors',
                'tensor_count':len(self.records),'total_elements':parameters,
                'role_counts':roles,'layers':layers,'config':self.metadata,
                'tensors':[r.public() for r in self.records]}

    def sample(self,name: str,rows: int=32,cols: int=64,seed: int=17) -> np.ndarray:
        """Read bounded, actual matrix coefficients, never a full huge tensor.

        Flatten leading dimensions conceptually into rows. For GGUF quantization,
        read the required encoded blocks from mmap then dequantize just those blocks.
        Columns are a contiguous prefix in the last axis, rows are reproducibly spaced.
        """
        if name not in self.by_name:raise CheckpointError('Unknown tensor: '+name)
        t=self.by_name[name]
        if len(t.shape)<2:raise CheckpointError('Only matrix-like tensors can be sampled')
        if not (1<=rows<=128 and 1<=cols<=256):raise CheckpointError('Patch exceeds safety limit (128×256)')
        height=math.prod(t.shape[:-1]);width=t.shape[-1]
        rcount=min(rows,height);ccount=min(cols,width)
        # Use uniform deterministic coordinates with no full tensor conversion.
        coords=np.linspace(0,height-1,rcount,dtype=np.int64)
        if t.backend=='safetensors':
            from safetensors import safe_open
            with safe_open(t.file,framework='pt',device='cpu') as f:
                obj=f.get_slice(t.name)
                pieces=[]
                leading=t.shape[:-1]
                for rid in coords:
                    multi=np.unravel_index(int(rid),leading)
                    sl=tuple(int(j) for j in multi)+(slice(0,ccount),)
                    piece=obj[sl] # only one short row, no full tensor
                    pieces.append(piece.float().numpy().copy())
            return np.ascontiguousarray(np.stack(pieces),dtype=np.float32)
        return self._sample_gguf(t,coords,ccount)

    def sample_rows(self, name: str, row_ids: list[int], cols: int = 128) -> np.ndarray:
        """Sample exact vocabulary-indexed rows without loading an embedding matrix.

        Unlike sample(), which spreads rows across the model, this reads the
        precise supplied IDs; required to compare learned token representations.
        Existing sample() behavior and GGUF dequantization remain unchanged.
        """
        if name not in self.by_name:
            raise CheckpointError('Unknown tensor: ' + name)
        t = self.by_name[name]
        if len(t.shape) < 2:
            raise CheckpointError('Cannot address rows of a non-matrix tensor')
        if not isinstance(row_ids, (list, tuple)) or not 1 <= len(row_ids) <= 128:
            raise CheckpointError('Must request 1..128 exact rows')
        if not 1 <= cols <= 256:
            raise CheckpointError('Column sample must be 1..256')
        height, width = math.prod(t.shape[:-1]), t.shape[-1]
        if any(type(v) is not int or v < 0 or v >= height for v in row_ids):
            raise CheckpointError('Row ID outside the actual tensor dimensions')
        ids = np.asarray(row_ids, dtype=np.int64)
        ccount = min(cols, width)
        if t.backend == 'gguf':
            return self._sample_gguf(t, ids, ccount)
        from safetensors import safe_open
        with safe_open(t.file, framework='pt', device='cpu') as f:
            tensor = f.get_slice(t.name)
            leading = t.shape[:-1]
            pieces = []
            for row_id in ids:
                coordinates = np.unravel_index(int(row_id), leading)
                slices = tuple(int(j) for j in coordinates) + (slice(0, ccount),)
                pieces.append(tensor[slices].float().numpy().copy())
        return np.ascontiguousarray(np.stack(pieces), dtype=np.float32)

    def _sample_gguf(self,t,coords,ccount):
        try:
            from gguf.constants import GGML_QUANT_SIZES, GGMLQuantizationType
            from gguf.quants import dequantize
        except ImportError as e:raise CheckpointError('Installed gguf does not provide quantization readers') from e
        reader=self._gguf_readers[t.file]
        tensor=next((v for v in reader.tensors if v.name==t.name),None)
        if tensor is None:raise CheckpointError('GGUF tensor not indexed')
        width=t.shape[-1]
        try:block,encoded_block=GGML_QUANT_SIZES[tensor.tensor_type]
        except KeyError as exc:raise CheckpointError('Unsupported GGUF tensor quantization '+str(tensor.tensor_type)) from exc
        if width%block!=0:raise CheckpointError('GGUF row is not block-aligned')
        readblocks=min((ccount+block-1)//block,width//block)
        rowstride=(width//block)*encoded_block
        readbytes=readblocks*encoded_block
        encoded=np.asarray(tensor.data).view(np.uint8).reshape(-1)
        # No full-tensor dequantization: only <=128 bounded short row slices.
        samples=[]
        for rid in coords:
            start=int(rid)*rowstride
            patch=encoded[start:start+readbytes]
            if len(patch)!=readbytes:raise CheckpointError('GGUF tensor data incomplete')
            result=dequantize(np.ascontiguousarray(patch),tensor.tensor_type)
            samples.append(np.asarray(result,dtype=np.float32).reshape(-1)[:ccount])
        return np.ascontiguousarray(np.stack(samples),dtype=np.float32)

    def close(self):
        self._gguf_readers.clear()
