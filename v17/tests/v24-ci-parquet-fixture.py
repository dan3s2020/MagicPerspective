# CI-only actual Parquet format; not a sample substituted into user training.
# 28 learned Q/A episodes + 16 genuinely reserved unseen Q/A episodes.
import sys
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq

root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
pairs=[
 ("Which route reaches the east wooden gate?", "Walk east through the narrow hall and stop by the green tower."),
 ("Which route reaches the west wooden gate?", "Walk west through the open courtyard then stop by the red tower."),
 ("Where does the bridge path finish?", "Cross the northern bridge before reaching the quiet river bank."),
 ("How do we reach the library door?", "Enter the library hall after turning at the blue staircase."),
 ("What is two plus two?", "The result is four after adding two and two."),
 ("How to cross the garden?", "Follow the garden trail then move past the stone bridge."),
 ("Which way to the north bridge?", "Walk north past the green tower and cross the wooden bridge."),
]
rows=[]
for i in range(44):
 q,a=pairs[i%len(pairs)]
 if i<28:
  question=f"{q} Observation {i}. Explain the learned exit path."
  answer=a
 else:
  question=f"{q} Unseen question index {i} with new conditions."
  answer=f"WITHHELD_UNOBSERVED_ANSWER_{i} requires a novel correct complete route beyond the training corpus."
 rows.append({"question":question,"answer":answer})
pq.write_table(pa.Table.from_pylist(rows),root/"part-000.parquet",compression="zstd")
print(f"Created original native parquet schema with 44 rows; last 16 are withheld from training: {root}")
