#!/usr/bin/env python3
"""CI ONLY — 82 genuine Parquet rows with OpenThoughts-style nested conversations.
The production reader uses only its V17 vendored Node hyparquet / fzstd, no Python.
"""
import os,sys
import pyarrow as pa
import pyarrow.parquet as pq
root=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else "v30-parquet-ci")
os.makedirs(root,exist_ok=True)
schema=pa.schema([("conversations",pa.list_(pa.struct([
    ("from",pa.string()),("value",pa.string())]))])
rows=[]
for i in range(82):
    if i%4==0:
        question=f"The planet number {i} feels cold."
        answer=f"The planet number {i} feels warm."
    elif i%4==1:
        question=f"The metal number {i} feels cold."
        answer=f"The metal number {i} feels warm."
    elif i%4==2:
        question=f"Alice has {i} books."
        answer=f"Alice has {i+2} books."
    else:
        question=f"How does object {i} change?"
        answer=f"The observed object {i} changes its state."
    rows.append({"conversations":[
        {"from":"human","value":question},
        {"from":"gpt","value":answer}
    ]})
table=pa.Table.from_pylist(rows,schema=schema)
pq.write_table(table,os.path.join(root,"actual-nested-open-thoughts.parquet"),
 compression="zstd",row_group_size=23)
print("V30_NESTED_PARQUET_FIXTURE",root,"rows",len(rows),
      "heldout16",16,"train66",66,"compression","zstd")
