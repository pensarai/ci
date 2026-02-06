import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getApiKeyEnvVar,
  getProjectIdEnvVar,
  getEnvironmentEnvVar,
  getApiUrl,
  dispatchScan,
  getScanStatus,
  pollScanStatus,
  runScan,
} from './ci';

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

describe('getApiKeyEnvVar', () => {
  const original = process.env.PENSAR_API_KEY;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.PENSAR_API_KEY;
    } else {
      process.env.PENSAR_API_KEY = original;
    }
  });

  it('returns the API key when set', () => {
    process.env.PENSAR_API_KEY = 'test-key-123';
    expect(getApiKeyEnvVar()).toBe('test-key-123');
  });

  it('throws when PENSAR_API_KEY is not set', () => {
    delete process.env.PENSAR_API_KEY;
    expect(() => getApiKeyEnvVar()).toThrowError('PENSAR_API_KEY not configured');
  });
});

describe('getProjectIdEnvVar', () => {
  const original = process.env.PENSAR_PROJECT_ID;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.PENSAR_PROJECT_ID;
    } else {
      process.env.PENSAR_PROJECT_ID = original;
    }
  });

  it('returns the project ID when set', () => {
    process.env.PENSAR_PROJECT_ID = 'proj-abc';
    expect(getProjectIdEnvVar()).toBe('proj-abc');
  });

  it('throws when PENSAR_PROJECT_ID is not set', () => {
    delete process.env.PENSAR_PROJECT_ID;
    expect(() => getProjectIdEnvVar()).toThrowError(
      'PENSAR_PROJECT_ID not configured'
    );
  });
});

describe('getEnvironmentEnvVar', () => {
  const original = process.env.PENSAR_ENVIRONMENT;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.PENSAR_ENVIRONMENT;
    } else {
      process.env.PENSAR_ENVIRONMENT = original;
    }
  });

  it('returns "dev" when set to dev', () => {
    process.env.PENSAR_ENVIRONMENT = 'dev';
    expect(getEnvironmentEnvVar()).toBe('dev');
  });

  it('returns "staging" when set to staging', () => {
    process.env.PENSAR_ENVIRONMENT = 'staging';
    expect(getEnvironmentEnvVar()).toBe('staging');
  });

  it('returns null when not set', () => {
    delete process.env.PENSAR_ENVIRONMENT;
    expect(getEnvironmentEnvVar()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getApiUrl
// ---------------------------------------------------------------------------

describe('getApiUrl', () => {
  it('returns dev URL for dev environment', () => {
    expect(getApiUrl('dev')).toBe('https://josh-pensar-api.pensar.dev'); // pragma: allowlist secret
  });

  it('returns staging URL for staging environment', () => {
    expect(getApiUrl('staging')).toBe('https://staging-api.pensar.dev');
  });

  it('returns production URL when environment is null', () => {
    expect(getApiUrl(null)).toBe('https://api.pensar.dev');
  });
});

// ---------------------------------------------------------------------------
// dispatchScan
// ---------------------------------------------------------------------------

describe('dispatchScan', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  it('dispatches a scan and returns scanId and label', async () => {
    const mockResponse = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'queued',
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await dispatchScan({
      apiKey: 'key-123',
      projectId: 'proj-abc',
      branch: 'main',
      scanLevel: 'full',
      environment: null,
    });

    expect(result).toEqual({ scanId: 'scan-001', label: 'my-scan' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.pensar.dev/ci/dispatch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'key-123',
        },
        body: JSON.stringify({
          projectId: 'proj-abc',
          branch: 'main',
          scanLevel: 'full',
        }),
      }
    );
  });

  it('uses the correct API URL for dev environment', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-002',
        label: 'dev-scan',
        status: 'queued',
      }),
    } as Response);

    await dispatchScan({
      apiKey: 'key-123',
      projectId: 'proj-abc',
      environment: 'dev',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://josh-pensar-api.pensar.dev/ci/dispatch', // pragma: allowlist secret
      expect.any(Object)
    );
  });

  it('throws on non-ok response with error message from body', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Forbidden',
      json: async () => ({ error: 'Invalid API key' }),
    } as Response);

    await expect(
      dispatchScan({
        apiKey: 'bad-key',
        projectId: 'proj-abc',
        environment: null,
      })
    ).rejects.toThrowError('Error dispatching scan: Invalid API key');
  });

  it('throws on non-ok response falling back to statusText', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    } as Response);

    await expect(
      dispatchScan({
        apiKey: 'key-123',
        projectId: 'proj-abc',
        environment: null,
      })
    ).rejects.toThrowError('Error dispatching scan: Internal Server Error');
  });
});

// ---------------------------------------------------------------------------
// getScanStatus
// ---------------------------------------------------------------------------

describe('getScanStatus', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  it('returns parsed scan status', async () => {
    const mockStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 3,
      reportReady: true,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as Response);

    const result = await getScanStatus({
      apiKey: 'key-123',
      scanId: 'scan-001',
      environment: null,
    });

    expect(result).toEqual(mockStatus);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.pensar.dev/ci/status/scan-001',
      {
        method: 'GET',
        headers: {
          'x-api-key': 'key-123',
        },
      }
    );
  });

  it('uses staging URL when environment is staging', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-001',
        label: 'test',
        status: 'queued',
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        issuesCount: 0,
        reportReady: false,
      }),
    } as Response);

    await getScanStatus({
      apiKey: 'key-123',
      scanId: 'scan-001',
      environment: 'staging',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://staging-api.pensar.dev/ci/status/scan-001',
      expect.any(Object)
    );
  });

  it('throws on non-ok response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ error: 'Scan not found' }),
    } as Response);

    await expect(
      getScanStatus({
        apiKey: 'key-123',
        scanId: 'scan-999',
        environment: null,
      })
    ).rejects.toThrowError('Error getting scan status: Scan not found');
  });
});

// ---------------------------------------------------------------------------
// pollScanStatus
// ---------------------------------------------------------------------------

describe('pollScanStatus', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately when scan is already completed', async () => {
    const completedStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 2,
      reportReady: true,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => completedStatus,
    } as Response);

    const promise = pollScanStatus({
      apiKey: 'key-123',
      scanId: 'scan-001',
      environment: null,
      pollIntervalMs: 100,
    });

    const result = await promise;
    expect(result).toEqual(completedStatus);
  });

  it('polls until scan completes', async () => {
    const runningStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'running',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    };

    const completedStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 1,
      reportReady: true,
    };

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => runningStatus,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => completedStatus,
      } as Response);

    const onStatusUpdate = vi.fn();

    const promise = pollScanStatus({
      apiKey: 'key-123',
      scanId: 'scan-001',
      environment: null,
      pollIntervalMs: 100,
      onStatusUpdate,
    });

    // First poll returns running, then sleeps; advance timers
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toEqual(completedStatus);
    expect(onStatusUpdate).toHaveBeenCalledTimes(2);
    expect(onStatusUpdate).toHaveBeenCalledWith(runningStatus);
    expect(onStatusUpdate).toHaveBeenCalledWith(completedStatus);
  });

  it('throws when scan fails', async () => {
    const failedStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'failed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      errorMessage: 'Out of memory',
      issuesCount: 0,
      reportReady: false,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => failedStatus,
    } as Response);

    await expect(
      pollScanStatus({
        apiKey: 'key-123',
        scanId: 'scan-001',
        environment: null,
        pollIntervalMs: 100,
      })
    ).rejects.toThrowError('Scan failed: Out of memory');
  });

  it('throws when scan is paused', async () => {
    const pausedStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'paused',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => pausedStatus,
    } as Response);

    await expect(
      pollScanStatus({
        apiKey: 'key-123',
        scanId: 'scan-001',
        environment: null,
        pollIntervalMs: 100,
      })
    ).rejects.toThrowError('Scan was paused');
  });

  it('uses default poll interval of 5000ms', async () => {
    const runningStatus = {
      scanId: 'scan-001',
      label: 'my-scan',
      status: 'running',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    };

    const completedStatus = {
      ...runningStatus,
      status: 'completed',
      completedAt: '2026-01-01T00:05:00Z',
      reportReady: true,
    };

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => runningStatus,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => completedStatus,
      } as Response);

    const promise = pollScanStatus({
      apiKey: 'key-123',
      scanId: 'scan-001',
      environment: null,
      // no pollIntervalMs — should default to 5000
    });

    // Advance less than 5000ms — second poll should NOT have happened
    await vi.advanceTimersByTimeAsync(4000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Advance past the 5000ms mark
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual(completedStatus);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// runScan (high-level orchestrator)
// ---------------------------------------------------------------------------

describe('runScan', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
    // Save and set required env vars
    savedEnv.PENSAR_API_KEY = process.env.PENSAR_API_KEY;
    savedEnv.PENSAR_PROJECT_ID = process.env.PENSAR_PROJECT_ID;
    savedEnv.PENSAR_ENVIRONMENT = process.env.PENSAR_ENVIRONMENT;
    process.env.PENSAR_API_KEY = 'env-key';
    process.env.PENSAR_PROJECT_ID = 'env-proj';
    delete process.env.PENSAR_ENVIRONMENT;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('dispatches and returns queued status when wait=false', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-010',
        label: 'quick-scan',
        status: 'queued',
      }),
    } as Response);

    const result = await runScan({ wait: false });

    expect(result).toEqual({
      scanId: 'scan-010',
      label: 'quick-scan',
      status: 'queued',
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    });

    // Should have called fetch exactly once (dispatch only, no polling)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('dispatches and polls when wait=true (default)', async () => {
    vi.useFakeTimers();

    // dispatch response
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-020',
        label: 'full-scan',
        status: 'queued',
      }),
    } as Response);

    // first poll: running
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-020',
        label: 'full-scan',
        status: 'running',
        startedAt: '2026-01-01T00:00:00Z',
        completedAt: null,
        errorMessage: null,
        issuesCount: 0,
        reportReady: false,
      }),
    } as Response);

    // second poll: completed
    const completedStatus = {
      scanId: 'scan-020',
      label: 'full-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 5,
      reportReady: true,
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => completedStatus,
    } as Response);

    const promise = runScan({ pollIntervalMs: 100 });

    await vi.advanceTimersByTimeAsync(500);

    const result = await promise;
    expect(result).toEqual(completedStatus);
    // 1 dispatch + 2 status polls
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('uses explicit apiKey/projectId over env vars', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-030',
        label: 'custom-scan',
        status: 'queued',
      }),
    } as Response);

    await runScan({
      apiKey: 'explicit-key',
      projectId: 'explicit-proj',
      wait: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.pensar.dev/ci/dispatch',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'explicit-key',
        }),
        body: expect.stringContaining('explicit-proj'),
      })
    );
  });

  it('reads env vars when apiKey/projectId not provided', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-040',
        label: 'env-scan',
        status: 'queued',
      }),
    } as Response);

    await runScan({ wait: false });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.pensar.dev/ci/dispatch',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'env-key',
        }),
        body: expect.stringContaining('env-proj'),
      })
    );
  });

  it('passes branch and scanLevel to dispatchScan', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scanId: 'scan-050',
        label: 'branch-scan',
        status: 'queued',
      }),
    } as Response);

    await runScan({
      wait: false,
      branch: 'feature/test',
      scanLevel: 'priority',
    });

    const body = JSON.parse(
      (vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.branch).toBe('feature/test');
    expect(body.scanLevel).toBe('priority');
  });
});
