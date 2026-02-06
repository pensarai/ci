#!/usr/bin/env node

import { program } from 'commander';
import { CI, type Environment } from '../lib/ci';

program
  .name('pensar')
  .description('Pensar CI - Security scanning for your CI/CD pipeline')
  .version('1.2.0');

program
  .command('pentest')
  .description('Trigger a security pentest')
  .option('-p, --project <projectId>', 'Project ID (or set PENSAR_PROJECT_ID)')
  .option('-b, --branch <branch>', 'Branch to pentest')
  .option('-l, --level <level>', 'Pentest level: priority or full', 'full')
  .option('--no-wait', "Don't wait for pentest to complete")
  .option('-e, --environment <env>', 'Environment: dev, staging, or production')
  .action(async (options) => {
    try {
      const result = await CI.runScan({
        projectId: options.project,
        branch: options.branch,
        scanLevel: options.level as 'priority' | 'full',
        wait: options.wait,
        environment: options.environment as Environment | undefined,
      });

      if (result.status === 'completed') {
        if (result.issuesCount > 0) {
          console.error(
            `\n❌ Pentest found ${result.issuesCount} security issues`
          );
          process.exit(1);
        } else {
          console.log('\n✅ Pentest completed with no issues found');
        }
      }
    } catch (error) {
      console.error('Pentest failed:', error);
      process.exit(1);
    }
  });

program
  .command('status <scanId>')
  .description('Get the status of a pentest')
  .option('-e, --environment <env>', 'Environment: dev, staging, or production')
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
