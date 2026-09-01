import fs from "node:fs";

/** Raised when labels were asked for but could not be determined. */
export class LabelLookupError extends Error {}

type GithubEventPayload = {
  pull_request?: { labels?: Array<{ name?: string }> };
  workflow_run?: { head_sha?: string };
};

type GithubPullSummary = { labels?: Array<{ name?: string }> };

function readGithubEventPayload(): GithubEventPayload | null {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path) return null;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8")) as GithubEventPayload;
  } catch {
    return null;
  }
}

function cleanLabels(names: Array<string | undefined>): string[] {
  return Array.from(
    new Set(names.map((n) => n?.trim()).filter((n): n is string => !!n))
  );
}

/**
 * Ask GitHub which pull requests contain a commit. Needed on push and
 * workflow_run, where the event payload carries no pull request.
 */
async function lookUpPullsForCommit(sha: string): Promise<GithubPullSummary[]> {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new LabelLookupError(
      "Cannot resolve pull request labels for this commit: GITHUB_REPOSITORY and GITHUB_TOKEN must both be set. Give the job `permissions: pull-requests: read` and pass GITHUB_TOKEN in its env."
    );
  }

  const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const resp = await fetch(`${api}/repos/${repo}/commits/${sha}/pulls`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    throw new LabelLookupError(
      `Could not list the pull requests for commit ${sha}: ${resp.status} ${resp.statusText}`
    );
  }

  return (await resp.json()) as GithubPullSummary[];
}

/**
 * The labels on the change that triggered this run. On a pull_request event
 * they are already on disk in the payload; on a push or workflow_run the pull
 * request carrying the commit has to be looked up.
 */
export async function resolveLabels(commitSha?: string): Promise<string[]> {
  const event = readGithubEventPayload();
  if (event?.pull_request) {
    return cleanLabels((event.pull_request.labels ?? []).map((l) => l.name));
  }

  // GitLab hands merge-request labels over directly, no API call needed.
  const gitlabLabels = process.env.CI_MERGE_REQUEST_LABELS;
  if (gitlabLabels !== undefined) return cleanLabels(gitlabLabels.split(","));

  // On workflow_run, GITHUB_SHA is the tip of the default branch rather than
  // the commit the triggering run tested, so the caller's SHA would gate on
  // whatever landed most recently. The head SHA is only in the payload, which
  // is why these workflows already read head_branch from there too.
  const sha = event?.workflow_run?.head_sha ?? commitSha;
  if (!sha) return [];

  const pulls = await lookUpPullsForCommit(sha);
  return cleanLabels(
    pulls.flatMap((pull) => (pull.labels ?? []).map((l) => l.name))
  );
}

/** Comma-separated on the flag; the run proceeds if any one of them is present. */
export function parseRequiredLabels(value: string): string[] {
  return cleanLabels(value.split(","));
}

export function hasRequiredLabel(
  labels: string[],
  required: string[]
): boolean {
  const present = new Set(labels.map((l) => l.toLowerCase()));
  return required.some((r) => present.has(r.toLowerCase()));
}
