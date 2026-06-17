import assert from "node:assert";
import { dispatchScan } from "../lib/ci";

// Capture the request body dispatchScan sends, without hitting the network.
async function captureDispatchBody(
  params: Parameters<typeof dispatchScan>[0]
): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> = {};
  const realFetch = global.fetch;
  global.fetch = (async (_url: string, init: { body: string }) => {
    captured = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ scanId: "s1", label: "PEN-1", status: "queued" }),
    };
  }) as unknown as typeof fetch;
  try {
    await dispatchScan(params);
  } finally {
    global.fetch = realFetch;
  }
  return captured;
}

async function main() {
  // Regression: projectId must not shadow repoId — the V2 server scopes by
  // repoId and ignores projectId.
  const both = await captureDispatchBody({
    apiKey: "k",
    projectId: "proj-123",
    repoId: 456,
  });
  assert.strictEqual(both.repoId, 456, "repoId must be sent when present");

  // repo-only.
  const repoOnly = await captureDispatchBody({ apiKey: "k", repoId: 789 });
  assert.strictEqual(repoOnly.repoId, 789);
  assert.strictEqual("projectId" in repoOnly, false);

  // No identifier: workspace-wide is valid now (must not throw, sends neither).
  const none = await captureDispatchBody({ apiKey: "k" });
  assert.strictEqual("repoId" in none, false);
  assert.strictEqual("projectId" in none, false);

  console.log("✅ dispatch body tests passed");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
