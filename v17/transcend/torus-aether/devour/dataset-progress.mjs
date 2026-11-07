// Native V21 corpus accounting. Unique SYMBOLS are a finite vocabulary,
// not a measure of rows consumed. All counts come from real source metadata
// and existing Brain counters. This module has no training side effects.
const nonneg = x => Number.isSafeInteger(+x) && +x >= 0 ? +x : 0;
const shardCount = (total, w, n) =>
  total <= w ? 0 : Math.floor((total - 1 - w) / n) + 1;

export function trainingShardSize(source, w = 0, n = 1) {
  if (!source || !["parquet", "text"].includes(source.kind)) return null;
  const total = nonneg(source.trainRows);
  const index = nonneg(w), shards = Math.max(1, nonneg(n));
  if (source.kind === "parquet") return shardCount(total, index, shards);
  // Original TXT reader numbers candidates from 0, heldSet from 1.
  // Preserve its exact selection predicate: (k % n === w) &&
  // !heldSet.includes(k + 1).
  const candidates = nonneg(source.totalRows);
  const excluded = Array.isArray(source.heldSet) ? source.heldSet : [];
  let count = shardCount(candidates, index, shards);
  for (const k of excluded) if (Number.isInteger(k) && k >= 1 &&
      k <= candidates && ((k - 1) % shards) === index) count--;
  return Math.max(0, count);
}
export function trainingProgress(source, {w = 0, n = 1, learned = 0, mode = "text"} = {}) {
  const assigned = trainingShardSize(source, w, n);
  if (assigned === null) return null;
  const raw = nonneg(learned);
  const processed = Math.min(assigned, raw);
  const percent = assigned ? Number((100 * processed / assigned).toFixed(6)) : 100;
  return {
    kind: source.kind,
    mode, // "native-text" = Brain.exercises, "observed-only" = brain.cognitiveDocuments
    trained: processed,
    total: assigned,
    remaining: assigned - processed,
    percent,
    complete: processed === assigned,
    heldOut: nonneg(source.heldRows),
    datasetTrainRows: nonneg(source.trainRows),
    datasetTotalRows: nonneg(source.totalRows),
    shardIndex: nonneg(w),
    shards: Math.max(1, nonneg(n)),
    source: "actual-source-metadata-and-brain-counters",
    overflow: raw > assigned
  };
}
