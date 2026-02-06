# Pensar CI Examples

Example workflows for integrating Pensar security pentesting into your CI/CD pipeline.

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

### Pentest on Pull Request

[`github-actions/pensar-on-pr.yml`](./github-actions/pensar-on-pr.yml)

Runs a security pentest whenever a pull request is opened or updated. Great for catching security issues before they're merged.

### Pentest on Push

[`github-actions/pensar-on-push.yml`](./github-actions/pensar-on-push.yml)

Runs a security pentest whenever code is pushed to main branches. Useful for continuous security monitoring.

### Pentest After Deployment

[`github-actions/pensar-after-deploy.yml`](./github-actions/pensar-after-deploy.yml)

Runs a security pentest after another workflow completes (e.g., after deployment). Uses GitHub's `workflow_run` trigger.

## GitLab CI

### GitLab CI Configuration

[`gitlab-ci/pensar-gitlab-ci.yml`](./gitlab-ci/pensar-gitlab-ci.yml)

Example GitLab CI jobs for:

- Pentesting on merge requests
- Pentesting on pushes to main branches
- Pentesting after deployment (triggered by upstream pipeline)

## CLI Options

```bash
pensar pentest [options]

Options:
  -p, --project <projectId>  Project ID (or set PENSAR_PROJECT_ID env var)
  -b, --branch <branch>      Branch to pentest
  -l, --level <level>        Pentest level: priority or full (default: full)
  -e, --environment <env>    Target environment: dev, staging, or production
  --no-wait                  Don't wait for pentest to complete
```

## Exit Codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 0    | Pentest completed with no issues       |
| 1    | Pentest found security issues or failed |
