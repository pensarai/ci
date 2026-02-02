#!/usr/bin/env node

import { program } from "commander";
import { CI, type Environment, type SeverityLevel } from "../lib/ci";

program
  .name("pensar")
  .description("Pensar CI - Security scanning for your CI/CD pipeline")
  .version("1.2.0");

program
  .command("pentest")
  .description("Trigger a security pentest")
  .option("-p, --project <projectId>", "Project ID (or set PENSAR_PROJECT_ID)")
  .option(
    "-r, --repo-id <repoId>",
    "Repository ID (auto-detected in GitHub Actions via GITHUB_REPOSITORY_ID)"
  )
  .option("-b, --branch <branch>", "Branch to pentest")
  .option("-l, --level <level>", "Pentest level: priority or full", "full")
  .option("--no-wait", "Don't wait for pentest to complete")
  .option("-e, --environment <env>", "Environment: dev, staging, or production")
  .option(
    "-s, --severity <severity>",
    "Minimum severity threshold to trigger error (critical, high, medium, low, info). Or set PENSAR_ERROR_SEVERITY_THRESHOLD env var.",
    undefined
  )
  .action(async (options) => {
    try {
      // Get severity threshold from CLI option or env var (defaults to 'critical')
      const severityThreshold: SeverityLevel = options.severity
        ? (options.severity.toLowerCase() as SeverityLevel)
        : CI.getErrorSeverityThresholdEnvVar();

      // Validate severity if provided via CLI
      if (options.severity && !CI.SEVERITY_LEVELS.includes(severityThreshold)) {
        console.error(
          `Invalid severity threshold "${options.severity}". Valid values: ${CI.SEVERITY_LEVELS.join(", ")}`
        );
        process.exit(1);
      }

      const result = await CI.runScan({
        projectId: options.project,
        repoId: options.repoId ? parseInt(options.repoId, 10) : undefined,
        branch: options.branch,
        scanLevel: options.level as "priority" | "full",
        wait: options.wait,
        environment: options.environment as Environment | undefined,
        errorSeverityThreshold: severityThreshold,
      });

      if (result.status === "completed") {
        // Check for issues at or above the severity threshold
        const issuesAtThreshold = CI.getIssueCountAtOrAboveThreshold(
          result.issueCountsBySeverity,
          severityThreshold
        );

        if (issuesAtThreshold > 0) {
          console.error(
            `\n❌ Pentest found ${issuesAtThreshold} security issue(s) at severity "${severityThreshold}" or higher`
          );
          if (result.issueCountsBySeverity) {
            console.error("  Issue breakdown:");
            for (const level of CI.SEVERITY_LEVELS) {
              const count = result.issueCountsBySeverity[level];
              if (count > 0) {
                console.error(`    ${level}: ${count}`);
              }
            }
          }
          process.exit(1);
        } else if (result.issuesCount > 0) {
          // There are issues but none at or above the threshold
          console.log(
            `\n✅ Pentest completed. Found ${result.issuesCount} issue(s), but none at severity "${severityThreshold}" or higher.`
          );
        } else {
          console.log("\n✅ Pentest completed with no issues found");
        }
      }
    } catch (error) {
      console.error("Pentest failed:", error);
      process.exit(1);
    }
  });

program
  .command("status <scanId>")
  .description("Get the status of a pentest")
  .option("-e, --environment <env>", "Environment: dev, staging, or production")
  .action(async (scanId, options) => {
    try {
      const apiKey = CI.getApiKeyEnvVar();
      const environment =
        (options.environment as Environment | undefined) ??
        CI.getEnvironmentEnvVar();
      const status = await CI.getScanStatus({
        apiKey,
        scanId,
        environment,
      });

      console.log("\nScan Status:");
      console.log(`  ID:       ${status.scanId}`);
      console.log(`  Label:    ${status.label}`);
      console.log(`  Status:   ${status.status}`);
      console.log(`  Issues:   ${status.issuesCount}`);
      console.log(`  Report:   ${status.reportReady ? "Ready" : "Not ready"}`);

      if (status.startedAt) {
        console.log(`  Started:  ${status.startedAt}`);
      }
      if (status.completedAt) {
        console.log(`  Completed: ${status.completedAt}`);
      }
      if (status.errorMessage) {
        console.log(`  Error:    ${status.errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to get status:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
