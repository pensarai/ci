# Pensar CI Examples

Example workflows for integrating Pensar security scanning into your CI/CD pipeline.

## Setup

Before using these examples, you'll need:

1. A Pensar account and API key
2. Your project ID from the Pensar console

### Required Secrets

| Secret              | Description            |
| ------------------- | ---------------------- |
| `PENSAR_API_KEY`    | Your Pensar API key    |
| `PENSAR_PROJECT_ID` | Your Pensar project ID |

## GitHub Actions

### Scan on Pull Request

[`github-actions/pensar-on-pr.yml`](./github-actions/pensar-on-pr.yml)

Runs a security scan whenever a pull request is opened or updated. Great for catching security issues before they're merged.

### Scan on Push

[`github-actions/pensar-on-push.yml`](./github-actions/pensar-on-push.yml)

Runs a security scan whenever code is pushed to main branches. Useful for continuous security monitoring.

### Scan After Deployment

[`github-actions/pensar-after-deploy.yml`](./github-actions/pensar-after-deploy.yml)

Runs a security scan after another workflow completes (e.g., after deployment). Uses GitHub's `workflow_run` trigger.

## GitLab CI

### GitLab CI Configuration

[`gitlab-ci/pensar-gitlab-ci.yml`](./gitlab-ci/pensar-gitlab-ci.yml)

Example GitLab CI jobs for:

- Scanning on merge requests
- Scanning on pushes to main branches
- Scanning after deployment (triggered by upstream pipeline)

## CLI Options

```bash
pensar scan [options]

Options:
  -p, --project <projectId>  Project ID (or set PENSAR_PROJECT_ID env var)
  -b, --branch <branch>      Branch to scan
  -l, --level <level>        Scan level: priority or full (default: full)
  --no-wait                  Don't wait for scan to complete
  -e, --environment <env>    Environment: dev, staging, or production
```

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Scan completed with no issues        |
| 1    | Scan found security issues or failed |
