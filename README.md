# @pensar/ci

Automated security pentesting for your CI/CD pipeline.

## Installation

```bash
npm install @pensar/ci
```

## Usage

```bash
# Run a security pentest (full scan, all endpoints).
# In GitHub Actions the repository is auto-detected via GITHUB_REPOSITORY_ID;
# elsewhere pass it explicitly with --repo-id.
pensar pentest --repo-id <repo-id>

# Run a quick pentest (highest-risk endpoints only, ~15 mins)
pensar pentest --repo-id <repo-id> --quick

# Check pentest status
pensar status <scan-id>
```

The pentest is scoped to the applications discovered for that repository, so
each connected repo is tested independently.

### Options

| Option              | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `-r, --repo-id`     | Repository ID — scopes the pentest to one repo's applications (auto-detected in GitHub Actions via `GITHUB_REPOSITORY_ID`) |
| `-p, --project`     | _(legacy)_ Project ID (or set `PENSAR_PROJECT_ID`). Prefer `--repo-id`.     |
| `-b, --branch`      | Branch to pentest                                                           |
| `-l, --level`       | Pentest level: `priority` or `full` (default: `full`)                       |
| `--quick`           | Shorthand for `--level priority`. Tests highest-risk endpoints only (~15 mins) |
| `-e, --environment` | Target environment: `dev`, `staging`, or `production`                       |
| `-c, --commit`      | Commit SHA (auto-detected from CI env vars, or set `PENSAR_COMMIT_SHA`)     |
| `-s, --severity`    | Minimum severity threshold to error on (or set `PENSAR_ERROR_SEVERITY_THRESHOLD`) |
| `--no-wait`         | Don't wait for pentest to complete                                          |

## Environment Variables

| Variable                         | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| `PENSAR_API_KEY`                 | Your Pensar API key                                    |
| `GITHUB_REPOSITORY_ID`           | Repository ID, auto-detected in GitHub Actions (maps to `--repo-id`) |
| `PENSAR_PROJECT_ID`              | _(legacy)_ Your Pensar project ID                      |
| `PENSAR_ENVIRONMENT`             | Target environment (`dev`, `staging`, or `production`) |
| `PENSAR_COMMIT_SHA`              | Commit SHA override (auto-detected from `GITHUB_SHA`, `CI_COMMIT_SHA`, `BITBUCKET_COMMIT`) |
| `PENSAR_ERROR_SEVERITY_THRESHOLD`| Minimum severity to trigger a non-zero exit (`critical`, `high`, `medium`, `low`, `info`) |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
