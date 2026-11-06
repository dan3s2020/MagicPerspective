# 2026-11-06 — user request: VERBATIM first, then implement the update

## SOURCE CLASS: exact user-turn text visible in the current conversation

> SI DOCUMENTEAZA TOT IN VERBATIM SI APOI IMPLEMENTEAZA UPDATE-UL

## SOURCE CLASS: exact user-turn text preceding the uploaded research discussion

> ok,hai ,demonstreaza intr-o versiune izolata,fara niciun demo.,in D:/ ,astept powershell command

These quotes are literal user text. They are not a reconstruction of a complete multi-turn conversation.

## SOURCE CLASS: user-provided text attachments preserved byte-for-byte

- `verbatim/attachments/2026-11-06-language-maze-comparison-Pasted-markdown6.md`: original uploaded `Pasted markdown(6)(1).md` as text, Git blob SHA `b31348704de978345d3ff0f744d28ee53884d974`, SHA256 `aeff48c75dfc7cf4491dd28cabad0d9b3fcb5bc5ad7028a7a631affe5c27fbb1`, 27,353 bytes.
- `verbatim/attachments/2026-11-06-quantum-path-research-Pasted-text.txt`: original uploaded `Pasted text(20261106-192259).txt` as text, Git blob SHA `ac733aba063b3083e749d9a03157c871bd0622bd`, SHA256 `c61d679ca5ff85eb4b0e7859dac55d899fba961243bfc55afe763d2cb4d5a07c`, 20,197 bytes.
- Original user-provided `MagicPerspective_Puzzle_Research_20261106(1).zip` SHA256 `07ce8efb53371b944b8b4532f045566817d93a14e42c1de1fae0b3b2ac17fa8b` (18,813 bytes); the archive was examined but its binary bytes are not included in this Git commit. Source remains an uploaded attachment to this conversation.
- Original screenshot `image(20261106-192213).png`, SHA256 `93fbdc9ea9e76da2ce089f7a4bb2991dc5427c348aa5ce5d615b7eebd2b1908a`, 39,911 bytes; it is a source upload, not recreated in Git.

## SOURCE CLASS: findings inside the uploaded research ZIP

`FINDINGS.md`, `puzzle_lab.py`, `extra_checks.py`, `replication_checks.py`, `hybrid_experiment.py`, `test_research.py`, and four JSON evidence reports are supplied in that archive. The ZIP claims reproductions on synthetic, isolated tasks and explicitly says it DID NOT execute the live V17 repository. Its findings must NOT be reclassified as tested live-V17 outcomes.

### Interpretation / IMPLEMENTATION SPEC — NOT VERBATIM QUOTE

- Preserve original `Discoverer.shape()` as the default choice in the 2D maze and language graph.
- Evaluate graph alternatives with exact shortest-path counts and optional discounted successor occupancy; do not confuse expected occupancy with exact shortest-path multiplicity.
- On observed *stochastic* ties, compare SR tie breaking against a stronger probability-based baseline; report negatives and costs.
- Detect repeated-generation loops rather than treating repetition as evidence of quantum interference.
- Preserve research distinction between classical maximum propagation, successor representation, and properly phase-sensitive unitary interference. No unvalidated claim of quantum speedup or real language understanding.
- Train and evaluate with real dataset rows on a separate branch, no canned/demo corpus. Keep held-out answers out of training and report baseline and leakage checks.
- Keep the original UI, controls and checkpoint interfaces unchanged unless a change is strictly necessary.

This implementation spec is a separate derived interpretation. It is NOT part of the user's literal original messages. Prior `SOURCE_POLICY.md`, older verbatim records and blocking regression issue #25 remain authoritative.
