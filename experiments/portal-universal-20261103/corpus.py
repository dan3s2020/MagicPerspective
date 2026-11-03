"""Disk-backed real text corpora; optional Parquet support via pyarrow."""
from __future__ import annotations
import hashlib
import json
import mmap
import os
from pathlib import Path

class Corpus:
    def __init__(self, path):
        self.path=Path(path)
        self.file=open(self.path,'rb')
        self.memory=mmap.mmap(self.file.fileno(),length=0,access=mmap.ACCESS_READ)
        if len(self.memory)<32:
            raise ValueError('Corpus must contain at least 32 real bytes')
        h=hashlib.sha256()
        # Hash the actual real corpus once, not per training example.
        for i in range(0,len(self.memory),1<<20):h.update(self.memory[i:i+(1<<20)])
        self.digest=h.hexdigest()
    def __len__(self):return len(self.memory)
    def __getitem__(self,key):return self.memory[key]
    def close(self):
        self.memory.close();self.file.close()


def ingest(path, cache_dir, limit_bytes=None):
    """Stream TXT/MD/JSONL/Parquet into a memory-mappable byte corpus.
    Does not materialize the source file as a Python list.
    """
    path=Path(path).expanduser().resolve()
    if not path.is_file():raise FileNotFoundError(str(path))
    cache=Path(cache_dir);cache.mkdir(parents=True,exist_ok=True)
    ext=path.suffix.lower()
    if ext not in ('.txt','.md','.jsonl','.parquet'):
        raise ValueError('Supported corpora: TXT / MD / JSONL / Parquet')
    target=cache/'training-corpus.bin';temporary=cache/'training-corpus.bin.tmp'
    total=0;h=hashlib.sha256()
    def emit(out,b):
        nonlocal total
        if not b:return
        if limit_bytes is not None:
            b=b[:max(0,limit_bytes-total)]
        out.write(b);h.update(b);total+=len(b)
    with open(temporary,'wb') as out:
        if ext in ('.txt','.md'):
            with open(path,'rb') as src:
                while True:
                    b=src.read(1<<20)
                    if not b:break
                    emit(out,b)
                    if limit_bytes is not None and total>=limit_bytes:break
        elif ext=='.jsonl':
            with open(path,'r',encoding='utf-8',errors='replace') as src:
                for line in src:
                    try:doc=json.loads(line)
                    except json.JSONDecodeError:continue
                    if isinstance(doc,str):v=doc
                    elif isinstance(doc,dict):
                        v=doc.get('text') or doc.get('content') or doc.get('response') or doc.get('solution')
                        if not v and 'messages' in doc:
                            v='\n'.join(m.get('content','') for m in doc['messages'] if isinstance(m,dict) and isinstance(m.get('content'),str))
                    else:v=None
                    if isinstance(v,str):emit(out,(v+'\n').encode('utf-8'))
                    if limit_bytes is not None and total>=limit_bytes:break
        elif ext=='.parquet':
            try:import pyarrow.parquet as pq
            except ImportError as exc:raise RuntimeError('Install pyarrow to read Parquet') from exc
            reader=pq.ParquetFile(str(path))
            supported=('text','content','response','solution','reasoning','problem','messages')
            cols=[c for c in supported if c in reader.schema.names]
            if not cols:raise ValueError('Parquet requires text/content/response/solution/reasoning/problem/messages')
            for batch in reader.iter_batches(batch_size=128,columns=cols):
                data=batch.to_pydict()
                for i in range(batch.num_rows):
                    pieces=[]
                    for c in cols:
                        v=data[c][i]
                        if isinstance(v,str):pieces.append(v)
                        elif c=='messages' and isinstance(v,list):
                            pieces.extend(m.get('content','') for m in v if isinstance(m,dict) and isinstance(m.get('content'),str))
                    if pieces:emit(out,('\n'.join(pieces)+'\n').encode('utf-8'))
                    if limit_bytes is not None and total>=limit_bytes:break
                if limit_bytes is not None and total>=limit_bytes:break
    if total<32:
        temporary.unlink(missing_ok=True)
        raise ValueError('Corpus conversion yielded fewer than 32 bytes')
    os.replace(temporary,target)
    return {'path':str(target),'bytes':total,'sha256':h.hexdigest(),'source':str(path)}
