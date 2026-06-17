# Pensar CI Examples

Example workflows for integrating Pensar security pentesting into your CI/CD pipeline.

## Setup

Before using these examples, you'll need:

1. A Pensar account and API key (the key determines the workspace to scan)

In GitHub Actions the repository is auto-detected (`GITHUB_REPOSITORY_ID`) and
the scan is scoped to it. Elsewhere, omit the repo to scan the whole workspace
or pass `--repo-id`.

### Required Secrets

| Secret           | Description                                    |
| ---------------- | ---------------------------------------------- |
| `PENSAR_API_KEY` | Your Pensar API key (determines the workspace) |

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
  -r, --repo-id <repoId>     Repository to scope to (auto-detected in GitHub
                             Actions via GITHUB_REPOSITORY_ID). Omit to scan
                             the whole workspace.
  -b, --branch <branch>      Branch to pentest
  -l, --level <level>        Pentest level: priority or full (default: full)
  -u, --url <url>            Deploy-preview URL to pentest against
  -e, --environment <env>    Target environment: dev, staging, or production
  -s, --severity <severity>  Minimum severity threshold to error on
  --no-wait                  Don't wait for pentest to complete
```

## Exit Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 0    | Pentest completed with no issues        |
| 1    | Pentest found security issues or failed |
