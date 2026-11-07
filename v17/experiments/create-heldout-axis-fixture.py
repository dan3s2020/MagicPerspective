# CI-only tiny Parquet fixture for the actual native openTextDataset reader.
# Python and pyarrow are NOT required by the Windows user launcher.
import json
import sys
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq

if len(sys.argv) != 2:
    raise SystemExit("Usage: python create-heldout-axis-fixture.py OUTPUT_PARQUET_DIR")
root = Path(sys.argv[1])
root.mkdir(parents=True, exist_ok=True)
rows = []
for i in range(120):
    n = i % 5
    rows.append({
      "question": f"What comes after the repeated word at index {i}? Give the next token.",
      "answer": [
        "The next token belongs to the learned sequence of words.",
        "A valid state transformation requires one observed transition.",
        "The answer can be read from the actual sequence and context.",
        "The geometry predicts which nearby paths share similar prefixes.",
        "Four is the result of adding two plus two."
      ][n]
    })
pq.write_table(pa.Table.from_pylist(rows), root / "part-000.parquet", compression="zstd")
print(json.dumps({"files": 1, "rows": len(rows), "heldout_expected": 16,
                  "path": str(root / "part-000.parquet")}))
