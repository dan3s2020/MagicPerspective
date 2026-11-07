#!/usr/bin/env python3
"""Convert Parquet text fields to JSONL without reading entire file in RAM."""
import argparse
import json
import pathlib
import sys

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("input",type=pathlib.Path)
    parser.add_argument("output",type=pathlib.Path)
    parser.add_argument("--columns",nargs="+",default=["text","question","answer","response","prompt"])
    parser.add_argument("--batch",type=int,default=2048)
    args=parser.parse_args()
    if args.batch<1 or args.batch>65536:
        parser.error("--batch must be 1..65536")
    try:
        import pyarrow.parquet as pq
    except ImportError:
        parser.error("Parquet support requires: python -m pip install pyarrow")
    if args.output.resolve()==args.input.resolve():
        parser.error("Output must differ from input")
    pfile=pq.ParquetFile(args.input)
    supported=[c for c in args.columns if c in pfile.schema_arrow.names]
    if not supported:
        parser.error("No selected text columns exist. Available: "+
            ", ".join(pfile.schema_arrow.names))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    rows=0;out_bytes=0
    with args.output.open("w",encoding="utf-8",newline="\n") as out:
        for batch in pfile.iter_batches(batch_size=args.batch,columns=supported):
            for row in batch.to_pylist():
                parts=[]
                for name in supported:
                    value=row.get(name)
                    if isinstance(value,str) and value.strip():
                        parts.append(value)
                    elif isinstance(value,(list,dict)):
                        parts.append(json.dumps(value,ensure_ascii=False))
                if not parts: continue
                line=json.dumps({"text":"\n".join(parts)},ensure_ascii=False)+"\n"
                out.write(line)
                rows+=1;out_bytes+=len(line.encode("utf-8"))
    print(json.dumps({"converted_rows":rows,"bytes_written":out_bytes,
        "columns":supported,"output":str(args.output)},ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except Exception as e:
        print(f"CONVERSION FAILED: {e}",file=sys.stderr)
        raise
