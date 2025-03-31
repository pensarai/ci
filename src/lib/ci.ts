import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

export function getApiKeyEnvVar() {
  if (!process.env.PENSAR_API_KEY)
    throw new Error("PENSAR_API_KEY not configured");

  return process.env.PENSAR_API_KEY;
}

export function getEnvironmentEnvVar() {
  return (process.env.ENVIRONMENT as "dev" | "staging") ?? null;
}

export function getApiUrl(environment: "dev" | "staging" | null) {
  switch (environment) {
    case "dev":
      console.warn("Using dev url https://josh-pensar-api.pensar.dev");
      return "https://josh-pensar-api.pensar.dev";
    case "staging":
      console.warn("Using staging url https://console-staging-api.pensar.dev");

      return "https://staging-api.pensar.dev";
    default:
      return "https://api.pensar.dev";
  }
}

interface DispatchScanParams {
  apiKey: string;
  repoId: number;
  targetBranch: string;
  actionRunId: number;
  pullRequest: string | null;
  environment: "dev" | "staging" | null;
}

const DispatchScanRequestObject = z.object({
  apiKey: z.string(),
  repoId: z.number(),
  targetBranch: z.string(),
  actionRunId: z.number(),
  pullRequest: z.string().nullable(),
  eventType: z.enum(["pull-request", "commit"]),
});

const DispatchScanResponseObject = z.object({
  scanId: z.string().optional(),
  message: z.string().optional(),
});

export async function postDispatchScan(
  params: DispatchScanParams
): Promise<{ scanId: string }> {
  const apiUrl = getApiUrl(params.environment);
  const requestBody: z.infer<typeof DispatchScanRequestObject> = {
    apiKey: params.apiKey,
    repoId: params.repoId,
    targetBranch: params.targetBranch,
    actionRunId: params.actionRunId,
    pullRequest: params.pullRequest,
    eventType: params.pullRequest ? "pull-request" : "commit",
  };

  const resp = await fetch(`${apiUrl}/ci/scan/dispatch`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  const json = await resp.json();
  const result = DispatchScanResponseObject.parse(json);

  if (resp.status !== 200 || !result.scanId)
    throw new Error(`Error dispatching scan ${result.message}`);

  return { scanId: result.scanId };
}

interface GetScanStatusParams {
  apiKey: string;
  scanId: string;
  environment: "dev" | "staging" | null;
}

const ScanStatusResponseObject = z.object({
  status: z.enum(["done", "triaging", "scanning", "error", "patching"]),
  errorMessage: z.string().optional(),
  message: z.string().optional(),
});

export async function getScanStatus(params: GetScanStatusParams): Promise<{
  status: "done" | "triaging" | "scanning" | "error" | "patching";
  errorMessage?: string;
}> {
  const apiUrl = getApiUrl(params.environment);

  const resp = await fetch(`${apiUrl}/ci/scan/status`, {
    method: "POST",
    body: JSON.stringify({ scanId: params.scanId, apiKey: params.apiKey }),
  });

  const result = ScanStatusResponseObject.parse(await resp.json());

  if (resp.status !== 200)
    throw new Error(`Error getting scan status ${result.message}`);

  return { status: result.status, errorMessage: result.errorMessage };
}

const IssueObject = z.object({});

const ScanIssuesResponseObject = IssueObject.array();

export async function getScanIssues(
  params: GetScanStatusParams
): Promise<{ issues: z.infer<typeof IssueObject>[] }> {
  const apiUrl = getApiUrl(params.environment);

  const resp = await fetch(`${apiUrl}/ci/scan/issues`, {
    method: "POST",
    body: JSON.stringify({ scanId: params.scanId, apiKey: params.apiKey }),
  });
  const json = await resp.json();
  const result = ScanIssuesResponseObject.parse(json);

  if (resp.status !== 200 && result)
    throw new Error(`Error getting scan status}`);

  return { issues: result };
}

export async function pollScanStatus(
  params: GetScanStatusParams,
  pollIntervalMs = 1000
): Promise<{ status: "done" }> {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    const { status, errorMessage } = await getScanStatus(params);
    if (status === "error") {
      throw new Error(`Error occurent during scan: ${errorMessage}`);
    }
    if (status === "done") {
      return { status };
    }
    console.log(
      `Current scan status: ${status}. Polling again in ${pollIntervalMs}ms...`
    );
    await sleep(pollIntervalMs);
  }
}

export * as CI from "./ci";
