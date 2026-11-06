import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=path=>readFileSync(resolve(root,path),"utf8");
const id="MP-REG-2026-11-06-001";
const issue="https://github.com/dan3s2020/MagicPerspective/issues/25";
const exact="MARCHEAZA REGRESIA IN REPO SA O VADA TOATA LUMEA !!!! SA NU MAI FACA NICIUNU CE VREA !! SA SE FACA EXACT CE TI-AM ZIS SI SA INTERZICI SA FACI CE AI FACUT TU ! SA NU SE MAI FACA NICIODATA ! SA NU VA MAI IMPUNETI PROPRIILE DEFINITII PESTE ALE MELE !";

test("literal original user words remain preserved and full Verbatim remains BLOCKED",()=>{
 const s=source("verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md");
 assert.ok(s.includes(exact),"The exact USER correction must not be paraphrased or deleted");
 assert.match(s,/NOT an export of the full native conversation/);
 assert.match(s,/BLOCKED/);
 const policy=source("verbatim/SOURCE_POLICY.md");
 assert.ok(policy.includes(id));
 assert.match(policy,/remain BLOCKED/);
});
test("all supported agent instruction entry points clearly prohibit user-definition substitution",()=>{
 for(const path of ["AGENTS.md","CLAUDE.md",".github/copilot-instructions.md","README.md","VERBATIM_ROOT.md"]){
  const s=source(path);
  assert.ok(s.includes(id)||s.includes("BLOCKING REGRESSION"),path+" lacks regression");
  assert.ok(s.includes(issue)||s.includes("REGRESSION_USER_DIRECTIVE_2026-11-06.md"),path+" lacks public tracking");
 }
 const rules=source("AGENTS.md");
 assert.match(rules,/MUST NOT/i);
 assert.match(rules,/same original organism/i);
 assert.match(rules,/original maze/);
});
test("pull-request gate, owner-review file and cannot-silently-close warnings persist",()=>{
 const w=source(".github/workflows/user-intent-guard.yml");
 assert.match(w,/pull_request:/);
 assert.match(w,/branches:\s*\[main\]/);
 assert.match(w,/user-intent-guard:/);
 assert.match(w,/user-intent-gate\.mjs --base/);
 assert.match(source(".github/CODEOWNERS"),/@dan3s2020/);
 const doc=source("docs/REQUIRED_GITHUB_PROTECTION_USER_INTENT.md");
 assert.match(doc,/not.*claim.*already active/i);
 const entry=source("REGRESSION_USER_DIRECTIVE_2026-11-06.md");
 assert.ok(entry.includes(id)&&entry.includes("OPEN / BLOCKING"));
});
