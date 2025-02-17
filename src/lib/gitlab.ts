import { CI } from "./ci";
import dotenv from "dotenv";
dotenv.config();

function getEnvVars() {
  const apiKey = CI.getApiKeyEnvVar();
  const environment = CI.getEnvironmentEnvVar();
  if (!process.env.CI_PROJECT_ID) throw new Error("CI_PROJECT_ID unavaiable");
  const repoId = parseInt(process.env.CI_PROJECT_ID);
  if (!process.env.CI_COMMIT_REF_NAME)
    throw new Error("COMMIT_REF_NAME unavailable");
  const targetBranch = process.env.CI_COMMIT_REF_NAME;
  if (!process.env.CI_JOB_ID) throw new Error("CI_PIPELINE_ID unavailable");
  const actionRunId = parseInt(process.env.CI_JOB_ID);
  const pullRequest = process.env.CI_MERGE_REQUEST_IID
    ? process.env.CI_MERGE_REQUEST_IID
    : null;

  return {
    apiKey,
    repoId,
    targetBranch,
    actionRunId,
    pullRequest,
    environment,
  };
}

export async function runScan() {
  try {
    const {
      apiKey,
      actionRunId,
      environment,
      pullRequest,
      repoId,
      targetBranch,
    } = getEnvVars();

    const { scanId } = await CI.postDispatchScan({
      apiKey,
      actionRunId,
      environment,
      pullRequest,
      repoId,
      targetBranch,
    });

    const { status } = await CI.pollScanStatus({ apiKey, environment, scanId });

    if (status === "done") {
      const { issues } = await CI.getScanIssues({
        apiKey,
        environment,
        scanId,
      });
      if (issues.length > 0) {
        throw new Error(`Scan completed. ${issues.length} issues found`);
      }
      if (issues.length === 0) {
        console.log("Scan completed. No issues found");
      }
    }
  } catch (error) {
    console.error(error);
  }
}

export * as Gitlab from "./gitlab";
