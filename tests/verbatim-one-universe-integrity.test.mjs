import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";

// Literal-source preservation: these are the same six Git blobs in BOTH repos.
// To append authentic recovered source, create a NEW file. Do not silently alter old user words.
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const locks = {
  "verbatim/2026-11-08-QWEN-ONE-UNIVERSE-USER-VERBATIM-PARTIAL.md": "b4a4e6e5c1a5eb1f8d118deb39ceed566a2845f1",
  "verbatim/2026-11-08-STRAIGHT-PATHS-ASSISTANT-A01-VERBATIM-PARTIAL.md": "a14cd69ce3c2af4e0071dc37cd633a2753a829c9",
  "verbatim/2026-11-08-MAZE-TESTS-ASSISTANT-A02-VERBATIM-PARTIAL.md": "0d5022663940415fba5ec222bbf26eeed9005506",
  "verbatim/2026-11-08-QWEN-PATHS-ASSISTANT-A03-VERBATIM-PARTIAL.md": "7afe250b742419214cbd7b4f3d58fb8fdeded507",
  "verbatim/2026-11-08-FUSED-TRAINING-ASSISTANT-A04-VERBATIM-PARTIAL.md": "0391b17ece339f663d30831f1222c45eb6d8862d",
  "verbatim/2026-11-08-ONE-UNIVERSE-ASSISTANT-A05-VERBATIM-PARTIAL.md": "73d737e7680a0737d7b4c875b545ba7dc4e11dad"
};
const read = relative => fs.readFileSync(path.join(repoRoot, relative));
function gitBlobSHA(bytes) {
  return createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
}
for (const [relative,expected] of Object.entries(locks)) {
  test("archived visible wording is immutable: " + relative, () => {
    assert.equal(gitBlobSHA(read(relative)),expected);
  });
}
test("all six USER source turns remain in chronological order with literal corrections", () => {
  const file=read("verbatim/2026-11-08-QWEN-ONE-UNIVERSE-USER-VERBATIM-PARTIAL.md").toString("utf8");
  const start=file.indexOf("[\n"),end=file.lastIndexOf("\n]")+2;
  assert.ok(start>=0&&end>start,"JSON source array absent");
  const turns=JSON.parse(file.slice(start,end));
  assert.equal(turns.length,6);
  for(let i=0;i<turns.length;i++){
    assert.equal(turns[i].id,"U0"+(i+1));
    assert.equal(turns[i].role,"user");
    assert.equal(typeof turns[i].text,"string");
  }
  assert.ok(turns[3].text.includes("First player2 where our organism first passes with 100% accuracy"));
  assert.ok(turns[4].text.includes("Player 1 and player 2 and the exercise are still inside the organism ,so the organism is the whole universe ."));
  assert.ok(turns[5].text.includes('the "target" is available. No it\'s not ,the target is the hyperdimensional structure'));
  assert.ok(turns[5].text.includes("Intelligence isn\u0027t created and is not random"));
});
test("root agent contract retains one-organism and user-defined target rules", () => {
  const agents=read("AGENTS.md").toString("utf8");
  assert.match(agents,/ONE ORGANISM/);
  assert.match(agents,/Do NOT redefine the USER/);
  assert.match(agents,/hypothesized hyperdimensional intelligence structure/);
  assert.match(agents,/Player 1, Player 2/);
  assert.match(agents,/No unauthorized abbreviation/);
});
test("chronology index lists every source and explicitly discloses missing originals", () => {
  const index=read("verbatim/2026-11-08-ONE-UNIVERSE-CHRONOLOGY-AND-SOURCE-INDEX.md").toString("utf8");
  for(const name of Object.keys(locks))assert.ok(index.includes(name.slice("verbatim/".length)),name);
  assert.match(index,/NOT RECOVERED/);
  assert.match(index,/BLOCKED \/ UNVERIFIED/);
});

test("Claude, Gemini, Copilot and Cursor instructions route to literal USER archive", () => {
  const paths=[
    "CLAUDE.md","GEMINI.md",
    ".github/copilot-instructions.md",
    ".cursor/rules/verbatim-one-organism.mdc"
  ];
  for(const relative of paths){
    const body=read(relative).toString("utf8");
    assert.ok(body.includes("AGENTS.md"),relative + " missing AGENTS link");
    assert.ok(body.includes("2026-11-08-QWEN-ONE-UNIVERSE-USER-VERBATIM-PARTIAL.md"),
      relative + " missing original USER source");
  }
});
