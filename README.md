# @pensar/ci

Automated security pentesting for your CI/CD pipeline.

## Installation

```bash
npm install @pensar/ci
```

## Usage

Your `PENSAR_API_KEY` determines which **workspace** the pentest runs in. In
GitHub Actions the repository is auto-detected (`GITHUB_REPOSITORY_ID`) and the
scan is scoped to that repo. Otherwise, omit the repo to scan the whole
workspace, or pass `--repo-id`.

```bash
# Run a security pentest (auto-scopes to the current repo in GitHub Actions)
pensar pentest

# Scope to a specific repository
pensar pentest --repo-id <github-repository-id>

# Run a quick pentest (highest-risk endpoints only, ~15 mins)
pensar pentest --quick

# Check pentest status
pensar status <scan-id>
```

### Options

| Option              | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `-r, --repo-id`     | Repository ID to scope to (auto-detected in GitHub Actions via `GITHUB_REPOSITORY_ID`). Omit to scan the whole workspace. |
| `-b, --branch`      | Branch to pentest                                                           |
| `-l, --level`       | Pentest level: `priority` or `full` (default: `full`)                       |
| `--quick`           | Shorthand for `--level priority`. Tests highest-risk endpoints only (~15 mins) |
| `-u, --url`         | Deploy-preview URL to pentest against                                       |
| `-e, --environment` | Target environment: `dev`, `staging`, or `production`                       |
| `-c, --commit`      | Commit SHA (auto-detected from CI env vars, or set `PENSAR_COMMIT_SHA`)     |
| `-s, --severity`    | Minimum severity threshold to error on (or set `PENSAR_ERROR_SEVERITY_THRESHOLD`) |
| `--no-wait`         | Don't wait for pentest to complete                                          |
| `-p, --project`     | Deprecated — ignored by Console V2 (projects were folded into workspaces)   |

## Environment Variables

| Variable                         | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| `PENSAR_API_KEY`                 | Your Pensar API key (determines the workspace)         |
| `PENSAR_ENVIRONMENT`             | Target environment (`dev`, `staging`, or `production`) |
| `PENSAR_PROJECT_ID`              | Deprecated — ignored by Console V2                     |
| `PENSAR_COMMIT_SHA`              | Commit SHA override (auto-detected from `GITHUB_SHA`, `CI_COMMIT_SHA`, `BITBUCKET_COMMIT`) |
| `PENSAR_ERROR_SEVERITY_THRESHOLD`| Minimum severity to trigger a non-zero exit (`critical`, `high`, `medium`, `low`, `info`) |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
