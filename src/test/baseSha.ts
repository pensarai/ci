import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { dispatchScan } from "../lib/ci";

const base = "a".repeat(40);
const head = "b".repeat(40);
const otherBase = "c".repeat(40);
const directory = mkdtempSync(join(tmpdir(), "pensar-base-sha-"));
const preload = join(directory, "fetch.cjs");
writeFileSync(preload, `
global.fetch = async (url, init) => {
  if (!url.endsWith('/ci/dispatch')) throw new Error('Unexpected URL');
  process.stdout.write('DISPATCH:' + init.body + '\\n');
  return new Response(JSON.stringify({scanId:'test-scan', label:'TEST-1', status:'queued'}), {status:200});
};
`);

function cli(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--require", preload, resolve("dist/bin/index.js"), "pentest", "--no-wait", ...args], {
    cwd: directory,
    env: { PATH: process.env.PATH, PENSAR_API_KEY: "test-key", GITHUB_REPOSITORY_ID: "123", ...env },
    encoding: "utf8",
  });
}

function request(args: string[], env: Record<string, string> = {}) {
  const result = cli(args, env);
  assert.equal(result.status, 0, result.stderr);
  const line = result.stdout.split("\n").find((value) => value.startsWith("DISPATCH:"));
  assert.ok(line, result.stdout);
  return JSON.parse(line.slice("DISPATCH:".length));
}

async function check() {
  try {
    assert.deepEqual(request(["--base", base, "--commit", head]), {
      repoId: 123, scanLevel: "full", commitSha: head, baseSha: base, testType: "custom",
    });
    assert.equal(request([], { PENSAR_BASE_SHA: base, GITHUB_SHA: head }).baseSha, base);
    const projectRange = request(["--project", "workspace", "--base", base, "--commit", head]);
    assert.equal(projectRange.projectId, "workspace");
    assert.equal(projectRange.repoId, 123);
    assert.ok(!("repoId" in request(["--project", "workspace"])));
    const overridden = request(["--base", otherBase, "--commit", head], {
      PENSAR_BASE_SHA: "invalid-env-base", GITHUB_SHA: base,
    });
    assert.equal(overridden.baseSha, otherBase);
    assert.equal(overridden.commitSha, head);
    assert.equal(request(["--commit", "legacy-short-sha"]).commitSha, "legacy-short-sha");
    assert.ok(!("baseSha" in request([])));

    for (const [args, env, error] of [
      [["--base", base], {}, /commitSha.*required/],
      [["--base", "bad", "--commit", head], {}, /baseSha.*full 40-character commit SHA/],
      [["--base", "a".repeat(64), "--commit", head], {}, /baseSha.*full 40-character commit SHA/],
      [["--base", base, "--commit", "short"], {}, /commitSha.*required/],
      [[], { PENSAR_BASE_SHA: "", GITHUB_SHA: head }, /baseSha.*full 40-character commit SHA/],
      [[], { PENSAR_BASE_SHA: base }, /commitSha.*required/],
    ] as [string[], Record<string, string>, RegExp][]) {
      const result = cli(args, env);
      assert.equal(result.status, 1);
      assert.match(result.stderr, error);
      assert.ok(!result.stdout.includes("DISPATCH:"), "invalid ranges must not reach the network");
    }

    await assert.rejects(dispatchScan({ apiKey: "test", repoId: 123, baseSha: base }), /commitSha.*required/);
    await assert.rejects(dispatchScan({ apiKey: "test", repoId: 123, baseSha: "bad", commitSha: head }), /baseSha.*full 40-character commit SHA/);
    console.log("Explicit commit range checks passed");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
