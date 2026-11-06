// Strict world/source compatibility contract.
// The selected worlds of any NEW graph must have a source that actually exists.
// In particular, a map-only process has source.kind === 'none' and must never
// silently create a text worker that tries to iterate source.files.
export const WORLD_TYPES = Object.freeze(['text','maze','transform','code','maptext','cognitivemap']);

export function validateWorldSource(worlds, source) {
  if (!Array.isArray(worlds) || worlds.length === 0)
    throw new Error('Select at least one world before creating a brain.');
  for (const w of worlds)
    if (!WORLD_TYPES.includes(w)) throw new Error('Unknown world: ' + String(w));
  if (!worlds.includes('text') && !worlds.includes('cognitivemap')) return true;
  if (source?.kind === 'parquet' && typeof source.root === 'string' && source.root.length > 0) return true;
  if (source?.kind === 'text' && Array.isArray(source.files) && source.files.length > 0 &&
      source.files.every(x => typeof x === 'string' && x.length > 0) &&
      Array.isArray(source.heldSet)) return true;
  throw new Error('Cannot add text/cognitivemap: this trainer was started without a text dataset. ' +
    'The current map-only training and checkpoints are unchanged. ' +
    'To enable text, start an isolated full trainer with -FullCUDA and a valid -Data path ' +
    '(or start devour.mjs with --worlds text,maptext and a valid --text file).');
}
