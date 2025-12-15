import { CI } from './ci';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Get GitLab CI environment variables and map them to Pensar config
 */
function getGitLabEnvVars() {
  const apiKey = CI.getApiKeyEnvVar();
  const projectId = CI.getProjectIdEnvVar();
  const environment = CI.getEnvironmentEnvVar();

  // GitLab CI provides the branch name in CI_COMMIT_REF_NAME
  const branch = process.env.CI_COMMIT_REF_NAME ?? undefined;

  // Check if we should wait for completion
  const wait = process.env.PENSAR_WAIT !== 'false';

  // Scan level from env or default to full
  const scanLevel =
    (process.env.PENSAR_SCAN_LEVEL as 'priority' | 'full') ?? 'full';

  return {
    apiKey,
    projectId,
    branch,
    environment,
    wait,
    scanLevel,
  };
}

/**
 * Run a Pensar scan from GitLab CI
 */
export async function runScan(): Promise<void> {
  try {
    const { apiKey, projectId, branch, environment, wait, scanLevel } =
      getGitLabEnvVars();

    console.log('Starting Pensar security scan from GitLab CI...');

    const result = await CI.runScan({
      apiKey,
      projectId,
      branch,
      scanLevel,
      environment,
      wait,
    });

    if (result.status === 'completed') {
      if (result.issuesCount > 0) {
        console.error(`\n❌ Scan found ${result.issuesCount} security issues`);
        process.exit(1);
      } else {
        console.log('\n✅ Scan completed with no issues found');
      }
    }
  } catch (error) {
    console.error('Scan failed:', error);
    process.exit(1);
  }
}

export * as Gitlab from './gitlab';
