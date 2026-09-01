/**
 * Self-check for the label gate. Run with `npm run check`.
 * Plain asserts on purpose — this package has no test framework.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { hasRequiredLabel, parseRequiredLabels, resolveLabels } from "../lib/labels";

const saved = { ...process.env };
function reset() {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, saved);
  delete process.env.GITHUB_EVENT_PATH;
  delete process.env.CI_MERGE_REQUEST_LABELS;
}

async function main() {
  reset();
  assert.deepEqual(parseRequiredLabels("pentest, security ,"), [
    "pentest",
    "security",
  ]);

  assert.equal(hasRequiredLabel(["Pentest"], ["pentest"]), true);
  assert.equal(hasRequiredLabel(["bug"], ["pentest"]), false);
  assert.equal(hasRequiredLabel([], ["pentest"]), false);
  assert.equal(
    hasRequiredLabel(["bug", "security"], ["pentest", "security"]),
    true
  );

  // A pull_request event carries its labels in the payload on disk.
  reset();
  const eventPath = path.join(os.tmpdir(), `pensar-event-${Date.now()}.json`);
  fs.writeFileSync(
    eventPath,
    JSON.stringify({
      pull_request: {
        labels: [{ name: "pentest" }, { name: " " }, { name: "pentest" }],
      },
    })
  );
  process.env.GITHUB_EVENT_PATH = eventPath;
  assert.deepEqual(await resolveLabels(), ["pentest"]);
  fs.unlinkSync(eventPath);

  // GitLab hands merge-request labels over as a comma-separated env var.
  reset();
  process.env.CI_MERGE_REQUEST_LABELS = "pentest,release";
  assert.deepEqual(await resolveLabels(), ["pentest", "release"]);

  // No event, no commit to look up: no labels, and that is not an error.
  reset();
  assert.deepEqual(await resolveLabels(), []);

  // A commit to look up but no credentials to look it up with must fail loudly.
  reset();
  await assert.rejects(() => resolveLabels("abc123"), /GITHUB_TOKEN/);

  console.log("labels self-check passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
