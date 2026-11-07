"""Create tiny, REAL Parquet shards with >=1.2M metadata rows for CI ONLY.

Exercise the full Windows PowerShell installer in -SkipDownload -VerifyOnly
mode. The fixture never trains the brain, and the full corpus row lower bound
remains enabled (1,000,000). A legacy root-level duplicate tests that the
official data/ folder alone enters the original V17 metadata reader.
"""
import json
import pathlib
import shutil
import sys

import pyarrow as pa
import pyarrow.parquet as pq

root = pathlib.Path(sys.argv[1]).resolve()
data = root / "data"
data.mkdir(parents=True, exist_ok=True)
repo = "open-thoughts/OpenThoughts3-1.2M"
count = 120
rows = 10000
table = pa.table({"row_index": pa.array(range(rows), type=pa.int32())})
paths = []
for index in range(count):
    name = f"train-{index:05d}-of-{count:05d}.parquet"
    relative = "data/" + name
    pq.write_table(table, data / name)
    if (data / name).stat().st_size < 8192:
        raise RuntimeError(f"Fixture must be a real >=8KiB Parquet file: {name}")
    paths.append(relative)

# A previous user install had this exact kind of duplicate in dataset root.
# The corrected loader must read only official data/ shards.
shutil.copyfile(data / pathlib.Path(paths[0]).name,
                root / pathlib.Path(paths[0]).name)
(root / ".magicperspective-full-source.json").write_text(
    json.dumps({
        "repository": repo,
        "parquetFiles": paths,
        "verifiedLocalFileCount": len(paths),
    }, indent=2),
    encoding="utf-8",
)
print("WINDOWS_VERIFIER_FIXTURE_CREATED", json.dumps({
    "realParquetFiles": count,
    "rowsPerFile": rows,
    "totalMetadataRows": count * rows,
    "duplicateRootShardMustBeIgnored": True,
    "dataset": str(root),
}), flush=True)
