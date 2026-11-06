// Select the real training graph rather than assuming that graph #0 is alive.
// An explicit graph selection is retained until that graph is removed.
export function chooseVisibleGraph(graphs, current, explicit = false) {
  if (!Array.isArray(graphs) || !graphs.length) return current;
  const selected = graphs.find(g => g.w === current);
  if (explicit && selected) return current;
  const active = graphs.filter(g => g.status === "antrenează")
    .sort((a, b) => (Number(b.chars) || 0) - (Number(a.chars) || 0))[0];
  if (!selected) return active?.w ?? graphs[0].w;
  if (active && !explicit && selected.status !== "antrenează") return active.w;
  if (active && !explicit && !(Number(selected.chars) > 0) && Number(active.chars) > 0) return active.w;
  return current;
}
