import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock the CI module before importing gitlab
vi.mock('./ci', () => {
  return {
    CI: {
      getApiKeyEnvVar: vi.fn(),
      getProjectIdEnvVar: vi.fn(),
      getEnvironmentEnvVar: vi.fn(),
      runScan: vi.fn(),
    },
  };
});

import { Gitlab } from './gitlab';
import { CI } from './ci';

describe('Gitlab.runScan', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envVarsToSave = [
    'CI_COMMIT_REF_NAME',
    'PENSAR_WAIT',
    'PENSAR_SCAN_LEVEL',
  ];

  beforeEach(() => {
    // Save env
    for (const key of envVarsToSave) {
      savedEnv[key] = process.env[key];
    }

    // Set defaults for mocked CI functions
    vi.mocked(CI.getApiKeyEnvVar).mockReturnValue('gl-api-key');
    vi.mocked(CI.getProjectIdEnvVar).mockReturnValue('gl-project-id');
    vi.mocked(CI.getEnvironmentEnvVar).mockReturnValue(null);

    // Spy on console and process.exit
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    // Restore env
    for (const key of envVarsToSave) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('calls CI.runScan with correct parameters from env', async () => {
    process.env.CI_COMMIT_REF_NAME = 'main';
    process.env.PENSAR_WAIT = 'true';
    process.env.PENSAR_SCAN_LEVEL = 'full';

    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-001',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 0,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(CI.runScan).toHaveBeenCalledWith({
      apiKey: 'gl-api-key',
      projectId: 'gl-project-id',
      branch: 'main',
      scanLevel: 'full',
      environment: null,
      wait: true,
    });
  });

  it('sets wait to false when PENSAR_WAIT is "false"', async () => {
    process.env.PENSAR_WAIT = 'false';
    delete process.env.CI_COMMIT_REF_NAME;

    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-002',
      label: 'gitlab-scan',
      status: 'queued',
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      issuesCount: 0,
      reportReady: false,
    });

    await Gitlab.runScan();

    expect(CI.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        wait: false,
      })
    );
  });

  it('branch is undefined when CI_COMMIT_REF_NAME is not set', async () => {
    delete process.env.CI_COMMIT_REF_NAME;

    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-003',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 0,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(CI.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: undefined,
      })
    );
  });

  it('logs success when scan completes with no issues', async () => {
    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-004',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 0,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(console.log).toHaveBeenCalledWith(
      '\n✅ Scan completed with no issues found'
    );
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('exits with code 1 when scan finds issues', async () => {
    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-005',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 3,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(console.error).toHaveBeenCalledWith(
      '\n❌ Scan found 3 security issues'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when scan throws an error', async () => {
    vi.mocked(CI.runScan).mockRejectedValueOnce(new Error('Network error'));

    await Gitlab.runScan();

    expect(console.error).toHaveBeenCalledWith(
      'Scan failed:',
      expect.any(Error)
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('passes environment from getEnvironmentEnvVar', async () => {
    vi.mocked(CI.getEnvironmentEnvVar).mockReturnValue('staging');

    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-006',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 0,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(CI.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'staging',
      })
    );
  });

  it('uses priority scan level from env', async () => {
    process.env.PENSAR_SCAN_LEVEL = 'priority';

    vi.mocked(CI.runScan).mockResolvedValueOnce({
      scanId: 'scan-gl-007',
      label: 'gitlab-scan',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      errorMessage: null,
      issuesCount: 0,
      reportReady: true,
    });

    await Gitlab.runScan();

    expect(CI.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        scanLevel: 'priority',
      })
    );
  });
});
