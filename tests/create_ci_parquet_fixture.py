"""CI integration fixture ONLY: asserts real Parquet reader, worker and original UI routes.
This is never used as user training data and no fixture scores are reported as evidence.
"""
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq

p = Path("ci-research-parquet")
p.mkdir(exist_ok=True)
q = [
    "Where is the archive located in the building?",
    "What is the name of the nearby river?",
    "Why does water evaporate during heating?",
    "How does one find a library within a city?",
    "What object is found inside a closed box?",
    "What are the movements of a simple 2D maze?",
    "What is a measured real world transition?",
    "How do we count the shortest paths in a graph?",
    "What is the location of the first symbol?",
    "Where did the ball move after the box was moved?",
    "What causes a liquid to become a gas?",
    "What is the next action after observing a wall?",
]
a = [
    "The archive is located inside the library.",
    "The river is near the large forest.",
    "Heating adds energy to water and it can turn to vapor.",
    "The library lies next to the central square.",
    "The small key is inside the closed box.",
    "The player moves right left up or down.",
    "A new observation confirms an attempted action.",
    "Count only paths whose lengths match the shortest distance.",
    "The first symbol is at the start of the sequence.",
    "The ball remains in the box after the box moves.",
    "Heating water can cause a phase change.",
    "After observing a wall choose another available direction.",
]
pq.write_table(pa.table({"prompt": q, "answer": a}), p / "records.parquet",
    compression="NONE", version="1.0", data_page_version="1.0", use_dictionary=False)
print(f"CI-only Parquet: {p / 'records.parquet'} | {len(q)} rows")
