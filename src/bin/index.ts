#!/usr/bin/env node

import { program } from 'commander';
import { CI } from '../lib/ci';

program
  .name('pensar')
  .description('Pensar CI - Security scanning for your CI/CD pipeline')
  .version('1.2.0');

program
  .command('scan')
  .description('Trigger a security scan')
  .option('-p, --project <projectId>', 'Project ID (or set PENSAR_PROJECT_ID)')
  .option('-b, --branch <branch>', 'Branch to scan')
  .option('-l, --level <level>', 'Scan level: priority or full', 'full')
  .option('--no-wait', "Don't wait for scan to complete")
  .option('-e, --environment <env>', 'Environment: dev, staging, or production')
  .action(async (options) => {
    try {
      const result = await CI.runScan({
        projectId: options.project,
        branch: options.branch,
        scanLevel: options.level as 'priority' | 'full',
        wait: options.wait,
        environment: options.environment as 'dev' | 'staging' | null,
      });

      if (result.status === 'completed') {
        if (result.issuesCount > 0) {
          console.error(
            `\n❌ Scan found ${result.issuesCount} security issues`
          );
          process.exit(1);
        } else {
          console.log('\n✅ Scan completed with no issues found');
        }
      }
    } catch (error) {
      console.error('Scan failed:', error);
      process.exit(1);
    }
  });

program
  .command('status <scanId>')
  .description('Get the status of a scan')
  .option('-e, --environment <env>', 'Environment: dev, staging, or production')
  .action(async (scanId, options) => {
    try {
      const apiKey = CI.getApiKeyEnvVar();
      const status = await CI.getScanStatus({
        apiKey,
        scanId,
        environment: options.environment as 'dev' | 'staging' | null,
      });

      console.log('\nScan Status:');
      console.log(`  ID:       ${status.scanId}`);
      console.log(`  Label:    ${status.label}`);
      console.log(`  Status:   ${status.status}`);
      console.log(`  Issues:   ${status.issuesCount}`);
      console.log(`  Report:   ${status.reportReady ? 'Ready' : 'Not ready'}`);

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
      console.error('Failed to get status:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
