import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

// Environment type for targeting different Pensar API instances
export type Environment = "dev" | "staging" | "production" | null;

// Severity levels in order from most to least severe
export const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

// Environment helpers
export function getApiKeyEnvVar(): string {
  if (!process.env.PENSAR_API_KEY)
    throw new Error("PENSAR_API_KEY not configured");

  return process.env.PENSAR_API_KEY;
}

export function getProjectIdEnvVar(): string | undefined {
  return process.env.PENSAR_PROJECT_ID;
}

export function getRepoIdEnvVar(): number | undefined {
  const val = process.env.GITHUB_REPOSITORY_ID;
  if (!val) return undefined;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return undefined;
  return parsed;
}

export function getEnvironmentEnvVar(): Environment {
  return (process.env.PENSAR_ENVIRONMENT as Environment) ?? null;
}

export function getErrorSeverityThresholdEnvVar(): SeverityLevel {
  const value = process.env.PENSAR_ERROR_SEVERITY_THRESHOLD;
  if (!value) return 'critical'; // Default to critical
  
  const normalized = value.toLowerCase() as SeverityLevel;
  if (!SEVERITY_LEVELS.includes(normalized)) {
    console.warn(
      `Invalid severity threshold "${value}". Valid values: ${SEVERITY_LEVELS.join(', ')}. Defaulting to "critical".`
    );
    return 'critical';
  }
  
  return normalized;
}

export function getApiUrl(environment: Environment): string {
  switch (environment) {
    case "dev":
      console.warn("Using dev environment");
      return "https://josh-pensar-api.pensar.dev";
    case "staging":
      console.warn("Using staging environment");
      return "https://staging-api.pensar.dev";
    case "production":
    default:
      return "https://api.pensar.dev";
  }
}

// API Response schemas
const DispatchScanResponseObject = z.object({
  scanId: z.string(),
  label: z.string(),
  status: z.string(),
  error: z.string().optional(),
});

const IssueCountsBySeverityObject = z.object({
  critical: z.number().default(0),
  high: z.number().default(0),
  medium: z.number().default(0),
  low: z.number().default(0),
  info: z.number().default(0),
});

export type IssueCountsBySeverity = z.infer<typeof IssueCountsBySeverityObject>;

const ScanStatusResponseObject = z.object({
  scanId: z.string(),
  label: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "paused"]),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  issuesCount: z.number(),
  issueCountsBySeverity: IssueCountsBySeverityObject.optional(),
  reportReady: z.boolean(),
  error: z.string().optional(),
});

export type ScanStatus = z.infer<typeof ScanStatusResponseObject>;

// Helper function to count issues at or above a severity threshold
export function getIssueCountAtOrAboveThreshold(
  issueCountsBySeverity: IssueCountsBySeverity | undefined,
  threshold: SeverityLevel
): number {
  if (!issueCountsBySeverity) {
    return 0;
  }
  
  const thresholdIndex = SEVERITY_LEVELS.indexOf(threshold);
  let count = 0;
  
  for (let i = 0; i <= thresholdIndex; i++) {
    const severity = SEVERITY_LEVELS[i];
    count += issueCountsBySeverity[severity];
  }
  
  return count;
}

// API Client
export interface DispatchScanParams {
  apiKey: string;
  projectId?: string;
  repoId?: number;
  branch?: string;
  scanLevel?: "priority" | "full";
  environment?: Environment;
}

export async function dispatchScan(
  params: DispatchScanParams
): Promise<{ scanId: string; label: string }> {
  if (!params.projectId && !params.repoId) {
    throw new Error(
      "Either projectId or repoId must be provided. Set PENSAR_PROJECT_ID or run in a GitHub Actions environment (GITHUB_REPOSITORY_ID)."
    );
  }

  const apiUrl = getApiUrl(params.environment ?? null);

  const resp = await fetch(`${apiUrl}/ci/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
    },
    body: JSON.stringify({
      ...(params.projectId
        ? { projectId: params.projectId }
        : { repoId: params.repoId }),
      branch: params.branch,
      scanLevel: params.scanLevel,
    }),
  });

  const json = (await resp.json()) as { error?: string };

  if (!resp.ok) {
    throw new Error(
      `Error dispatching pentest: ${json.error || resp.statusText}`
    );
  }

  const result = DispatchScanResponseObject.parse(json);
  return { scanId: result.scanId, label: result.label };
}

export interface GetScanStatusParams {
  apiKey: string;
  scanId: string;
  environment?: Environment;
}

export async function getScanStatus(
  params: GetScanStatusParams
): Promise<ScanStatus> {
  const apiUrl = getApiUrl(params.environment ?? null);

  const resp = await fetch(`${apiUrl}/ci/status/${params.scanId}`, {
    method: "GET",
    headers: {
      "x-api-key": params.apiKey,
    },
  });

  const json = (await resp.json()) as { error?: string };

  if (!resp.ok) {
    throw new Error(
      `Error getting pentest status: ${json.error || resp.statusText}`
    );
  }

  return ScanStatusResponseObject.parse(json);
}

export interface PollScanStatusParams {
  apiKey: string;
  scanId: string;
  environment?: Environment;
  pollIntervalMs?: number;
  onStatusUpdate?: (status: ScanStatus) => void;
}

export async function pollScanStatus(
  params: PollScanStatusParams
): Promise<ScanStatus> {
  const pollIntervalMs = params.pollIntervalMs ?? 5000;

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  while (true) {
    const status = await getScanStatus({
      apiKey: params.apiKey,
      scanId: params.scanId,
      environment: params.environment,
    });

    params.onStatusUpdate?.(status);

    if (status.status === "failed") {
      throw new Error(`Pentest failed: ${status.errorMessage}`);
    }

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "paused") {
      throw new Error("Pentest was paused");
    }

    console.log(
      `Pentest ${status.label} status: ${status.status}. Polling again in ${
        pollIntervalMs / 1000
      }s...`
    );
    await sleep(pollIntervalMs);
  }
}

// High-level pentest runner
export interface RunScanParams {
  apiKey?: string;
  projectId?: string;
  repoId?: number;
  branch?: string;
  scanLevel?: "priority" | "full";
  environment?: Environment;
  wait?: boolean;
  pollIntervalMs?: number;
  errorSeverityThreshold?: SeverityLevel;
}

export async function runScan(params: RunScanParams = {}): Promise<ScanStatus> {
  const apiKey = params.apiKey ?? getApiKeyEnvVar();
  const projectId = params.projectId ?? getProjectIdEnvVar();
  const repoId = params.repoId ?? getRepoIdEnvVar();
  const environment = params.environment ?? getEnvironmentEnvVar();
  const wait = params.wait ?? true;

  if (!projectId && !repoId) {
    throw new Error(
      "No project identifier found. Either set PENSAR_PROJECT_ID, pass --project, or run in a GitHub Actions environment (GITHUB_REPOSITORY_ID is auto-detected)."
    );
  }

  const identifier = projectId ? `project ${projectId}` : `repo ${repoId}`;
  console.log(`Dispatching pentest for ${identifier}...`);

  const { scanId, label } = await dispatchScan({
    apiKey,
    projectId,
    repoId,
    branch: params.branch,
    scanLevel: params.scanLevel,
    environment,
  });

  console.log(`Pentest ${label} dispatched (ID: ${scanId})`);

  if (!wait) {
    return {
      scanId,
      label,
      status: "queued",
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    };
  }

  console.log("Waiting for pentest to complete...");

  const finalStatus = await pollScanStatus({
    apiKey,
    scanId,
    environment,
    pollIntervalMs: params.pollIntervalMs,
  });

  console.log(
    `Pentest ${label} completed with ${finalStatus.issuesCount} issues`
  );

  return finalStatus;
}

export * as CI from "./ci";
