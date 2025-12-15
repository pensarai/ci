import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

// Environment helpers
export function getApiKeyEnvVar(): string {
  if (!process.env.PENSAR_API_KEY)
    throw new Error('PENSAR_API_KEY not configured');

  return process.env.PENSAR_API_KEY;
}

export function getProjectIdEnvVar(): string {
  if (!process.env.PENSAR_PROJECT_ID)
    throw new Error('PENSAR_PROJECT_ID not configured');

  return process.env.PENSAR_PROJECT_ID;
}

export function getEnvironmentEnvVar(): 'dev' | 'staging' | null {
  return (process.env.PENSAR_ENVIRONMENT as 'dev' | 'staging') ?? null;
}

export function getApiUrl(environment: 'dev' | 'staging' | null): string {
  switch (environment) {
    case 'dev':
      console.warn('Using dev environment');
      return 'https://josh-pensar-api.pensar.dev';
    case 'staging':
      console.warn('Using staging environment');
      return 'https://staging-api.pensar.dev';
    default:
      return 'https://api.pensar.dev';
  }
}

// API Response schemas
const DispatchScanResponseObject = z.object({
  scanId: z.string(),
  label: z.string(),
  status: z.string(),
  error: z.string().optional(),
});

const ScanStatusResponseObject = z.object({
  scanId: z.string(),
  label: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'paused']),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  issuesCount: z.number(),
  reportReady: z.boolean(),
  error: z.string().optional(),
});

export type ScanStatus = z.infer<typeof ScanStatusResponseObject>;

// API Client
export interface DispatchScanParams {
  apiKey: string;
  projectId: string;
  branch?: string;
  scanLevel?: 'priority' | 'full';
  environment?: 'dev' | 'staging' | null;
}

export async function dispatchScan(
  params: DispatchScanParams
): Promise<{ scanId: string; label: string }> {
  const apiUrl = getApiUrl(params.environment ?? null);

  const resp = await fetch(`${apiUrl}/ci/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
    },
    body: JSON.stringify({
      projectId: params.projectId,
      branch: params.branch,
      scanLevel: params.scanLevel,
    }),
  });

  const json = (await resp.json()) as { error?: string };

  if (!resp.ok) {
    throw new Error(`Error dispatching scan: ${json.error || resp.statusText}`);
  }

  const result = DispatchScanResponseObject.parse(json);
  return { scanId: result.scanId, label: result.label };
}

export interface GetScanStatusParams {
  apiKey: string;
  scanId: string;
  environment?: 'dev' | 'staging' | null;
}

export async function getScanStatus(
  params: GetScanStatusParams
): Promise<ScanStatus> {
  const apiUrl = getApiUrl(params.environment ?? null);

  const resp = await fetch(`${apiUrl}/ci/status/${params.scanId}`, {
    method: 'GET',
    headers: {
      'x-api-key': params.apiKey,
    },
  });

  const json = (await resp.json()) as { error?: string };

  if (!resp.ok) {
    throw new Error(
      `Error getting scan status: ${json.error || resp.statusText}`
    );
  }

  return ScanStatusResponseObject.parse(json);
}

export interface PollScanStatusParams {
  apiKey: string;
  scanId: string;
  environment?: 'dev' | 'staging' | null;
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

    if (status.status === 'failed') {
      throw new Error(`Scan failed: ${status.errorMessage}`);
    }

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'paused') {
      throw new Error('Scan was paused');
    }

    console.log(
      `Scan ${status.label} status: ${status.status}. Polling again in ${pollIntervalMs / 1000}s...`
    );
    await sleep(pollIntervalMs);
  }
}

// High-level scan runner
export interface RunScanParams {
  apiKey?: string;
  projectId?: string;
  branch?: string;
  scanLevel?: 'priority' | 'full';
  environment?: 'dev' | 'staging' | null;
  wait?: boolean;
  pollIntervalMs?: number;
}

export async function runScan(params: RunScanParams = {}): Promise<ScanStatus> {
  const apiKey = params.apiKey ?? getApiKeyEnvVar();
  const projectId = params.projectId ?? getProjectIdEnvVar();
  const environment = params.environment ?? getEnvironmentEnvVar();
  const wait = params.wait ?? true;

  console.log(`Dispatching scan for project ${projectId}...`);

  const { scanId, label } = await dispatchScan({
    apiKey,
    projectId,
    branch: params.branch,
    scanLevel: params.scanLevel,
    environment,
  });

  console.log(`Scan ${label} dispatched (ID: ${scanId})`);

  if (!wait) {
    return {
      scanId,
      label,
      status: 'queued',
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    };
  }

  console.log('Waiting for scan to complete...');

  const finalStatus = await pollScanStatus({
    apiKey,
    scanId,
    environment,
    pollIntervalMs: params.pollIntervalMs,
  });

  console.log(`Scan ${label} completed with ${finalStatus.issuesCount} issues`);

  return finalStatus;
}

export * as CI from './ci';
