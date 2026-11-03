"""Disk-backed text corpus ingestion with schema-based Parquet discovery.

All imported text is from the selected file. There are no built-in example strings.
"""
from __future__ import annotations
import hashlib
import json
import mmap
import os
import uuid
from pathlib import Path

# Known conversational and instruction dataset fields (not a fixed allowlist).
PREFERRED = ('messages', 'conversations', 'conversation', 'turns', 'dialogue',
             'text', 'content', 'instruction', 'prompt', 'question', 'problem',
             'input', 'reasoning', 'solution', 'answer', 'response', 'completion',
             'output', 'chosen', 'assistant', 'user', 'system')
NON_TEXT = {'id', '_id', 'uuid', 'hash', 'sha256', 'source', 'dataset', 'split',
            'url', 'timestamp', 'created_at', 'updated_at', 'domain', 'model', 'model_id',
            'language', 'license', 'score', 'reward', 'index', 'row_id'}

class Corpus:
    def __init__(self, path):
        self.path = Path(path)
        self.file = open(self.path, 'rb')
        try:
            self.memory = mmap.mmap(self.file.fileno(), length=0, access=mmap.ACCESS_READ)
            if len(self.memory) < 32:
                raise ValueError('Corpus must contain at least 32 real bytes')
            h = hashlib.sha256()
            for i in range(0, len(self.memory), 1 << 20):
                h.update(self.memory[i:i+(1 << 20)])
            self.digest = h.hexdigest()
        except BaseException:
            self.file.close()
            raise
    def __len__(self): return len(self.memory)
    def __getitem__(self, key): return self.memory[key]
    def close(self):
        self.memory.close()
        self.file.close()


def _extract(value, parent='', depth=0):
    """Recursively extract human-readable content, preserving conversation order.

    Do not accidentally train on numeric ids/labels or metadata fields; nested
    conversation role/content fields are treated as genuine source text.
    """
    if depth > 14 or value is None:
        return []
    if isinstance(value, bytes):
        value = value.decode('utf-8', errors='replace')
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, (list, tuple)):
        result = []
        for part in value:
            result.extend(_extract(part, parent, depth+1))
        return result
    if isinstance(value, dict):
        result = []
        role = value.get('role') or value.get('from') or value.get('speaker')
        content_keys = [k for k in value if k.lower() in PREFERRED or
                        k.lower() in ('parts', 'value', 'message', 'body', 'segments')]
        # Preserve source field order. If this is not a known format, use all
        # meaningful string/list/struct fields rather than refusing the row.
        keys = content_keys or [k for k in value if k.lower() not in NON_TEXT
                                and k.lower() not in ('role', 'from', 'speaker', 'type')]
        for key in keys:
            if key.lower() in NON_TEXT or key.lower() in ('role', 'from', 'speaker'):
                continue
            result.extend(_extract(value[key], key, depth+1))
        if role and result:
            result[0] = str(role) + ': ' + result[0]
        return result
    return []


def _text_type(dtype):
    """True for Arrow string/binary, struct, list and map holding text."""
    import pyarrow as pa
    t = pa.types
    if t.is_string(dtype) or t.is_large_string(dtype) or t.is_binary(dtype) or t.is_large_binary(dtype):
        return True
    if t.is_list(dtype) or t.is_large_list(dtype) or t.is_fixed_size_list(dtype):
        return _text_type(dtype.value_type)
    if t.is_struct(dtype):
        return any(_text_type(field.type) for field in dtype)
    if t.is_map(dtype):
        return _text_type(dtype.item_type)
    return False


def ingest(path, cache_dir, limit_bytes=None, on_progress=None):
    """Stream TXT/MD/JSONL/Parquet into a memory-mappable byte corpus.

    For Parquet, inspect top-level Arrow schema and recursively flatten actual
    textual fields, including arbitrary conversation/turn/assistant schemas.
    Progress messages are measurements, not synthetic training events.
    """
    path = Path(path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(str(path))
    cache = Path(cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    ext = path.suffix.lower()
    if ext not in ('.txt', '.md', '.jsonl', '.parquet'):
        raise ValueError('Supported corpora: TXT / MD / JSONL / Parquet')
    temporary = cache / ('training-corpus-' + uuid.uuid4().hex + '.tmp')
    total = 0
    rows = 0
    populated = 0
    skipped = 0
    detected = []
    selected = []
    h = hashlib.sha256()
    source_size = max(1, path.stat().st_size)

    def progress(phase, fraction=0):
        if on_progress:
            on_progress({'state': phase, 'source': str(path), 'source_bytes': source_size,
                         'progress': round(min(1.0, max(0.0, fraction)), 5),
                         'bytes_written': total, 'rows_read': rows,
                         'rows_with_text': populated, 'rows_without_text': skipped,
                         'columns_detected': detected, 'columns_selected': selected})

    def emit(out, value):
        nonlocal total
        if not value:
            return
        if limit_bytes is not None:
            value = value[:max(0, limit_bytes-total)]
        if not value:
            return
        out.write(value)
        h.update(value)
        total += len(value)

    progress('reading', 0)
    try:
        with open(temporary, 'wb') as out:
            if ext in ('.txt', '.md'):
                with open(path, 'rb') as src:
                    while True:
                        b = src.read(1 << 20)
                        if not b:
                            break
                        emit(out, b)
                        progress('reading', src.tell()/source_size)
                        if limit_bytes is not None and total >= limit_bytes:
                            break
                rows = populated = int(total > 0)
            elif ext == '.jsonl':
                with open(path, 'rb') as src:
                    for line in src:
                        rows += 1
                        try: doc = json.loads(line)
                        except (json.JSONDecodeError, UnicodeDecodeError):
                            skipped += 1
                            continue
                        pieces = _extract(doc)
                        if pieces:
                            emit(out, ('\n'.join(pieces)+'\n').encode('utf-8'))
                            populated += 1
                        else: skipped += 1
                        if rows % 256 == 0:
                            progress('reading', src.tell()/source_size)
                        if limit_bytes is not None and total >= limit_bytes:
                            break
            else:
                try:
                    import pyarrow.parquet as pq
                except ImportError as exc:
                    raise RuntimeError('Parquet requires pyarrow in the Portal virtual environment') from exc
                reader = pq.ParquetFile(str(path))
                # .schema.names can return nested leaf names such as 'element',
                # whereas .schema_arrow.names are the actual top-level columns.
                schema = reader.schema_arrow
                detected = list(schema.names)
                selected = [field.name for field in schema if
                            field.name.lower() not in NON_TEXT and _text_type(field.type)]
                selected.sort(key=lambda name: (name.lower() not in PREFERRED,
                                                detected.index(name)))
                if not selected:
                    raise ValueError('No textual Parquet fields found; detected columns: '+', '.join(detected))
                groups = max(1, reader.num_row_groups)
                for group in range(reader.num_row_groups):
                    for batch in reader.iter_batches(batch_size=128, row_groups=[group], columns=selected):
                        for record in batch.to_pylist():
                            rows += 1
                            pieces = _extract(record)
                            if pieces:
                                emit(out, ('\n'.join(pieces)+'\n').encode('utf-8'))
                                populated += 1
                            else:
                                skipped += 1
                            if limit_bytes is not None and total >= limit_bytes:
                                break
                        if limit_bytes is not None and total >= limit_bytes:
                            break
                    progress('reading', (group+1)/groups)
                    if limit_bytes is not None and total >= limit_bytes:
                        break
        if total < 32:
            raise ValueError('Corpus conversion yielded fewer than 32 bytes; columns='+repr(selected))
        digest = h.hexdigest()
        target = cache / ('training-corpus-'+digest[:24]+'.bin')
        # Preserve any currently memory-mapped old corpus (Windows locks it).
        if target.exists():
            if target.stat().st_size != total:
                raise RuntimeError('Corpus cache collision/size mismatch')
            temporary.unlink(missing_ok=True)
        else:
            os.replace(temporary, target)
        progress('ready', 1)
        return {'path':str(target), 'bytes':total, 'sha256':digest, 'source':str(path),
                'source_bytes':source_size,'source_format':ext.lstrip('.'),
                'columns_detected':detected,'columns_selected':selected,
                'rows_read':rows,'rows_with_text':populated,'rows_without_text':skipped}
    finally:
        temporary.unlink(missing_ok=True)
