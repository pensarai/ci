# @pensar/ci

Automated security pentesting for your CI/CD pipeline.

## Installation

```bash
npm install @pensar/ci
```

## Usage

```bash
# Run a security pentest
pensar pentest --project <project-id>

# Check pentest status
pensar status <scan-id>
```

### Options

| Option              | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `-p, --project`     | Project ID (or set `PENSAR_PROJECT_ID`)                                     |
| `-b, --branch`      | Branch to pentest                                                           |
| `-l, --level`       | Pentest level: `priority` or `full`                                         |
| `-e, --environment` | Target environment: `dev`, `staging`, or `production`                       |
| `-c, --commit`      | Commit SHA (auto-detected from CI env vars, or set `PENSAR_COMMIT_SHA`)     |
| `-s, --severity`    | Minimum severity threshold to error on (or set `PENSAR_ERROR_SEVERITY_THRESHOLD`) |
| `--no-wait`         | Don't wait for pentest to complete                                          |

## Environment Variables

| Variable                         | Description                                            |
| -------------------------------- | ------------------------------------------------------ |
| `PENSAR_API_KEY`                 | Your Pensar API key                                    |
| `PENSAR_PROJECT_ID`              | Your Pensar project ID                                 |
| `PENSAR_ENVIRONMENT`             | Target environment (`dev`, `staging`, or `production`) |
| `PENSAR_COMMIT_SHA`              | Commit SHA override (auto-detected from `GITHUB_SHA`, `CI_COMMIT_SHA`, `BITBUCKET_COMMIT`) |
| `PENSAR_ERROR_SEVERITY_THRESHOLD`| Minimum severity to trigger a non-zero exit (`critical`, `high`, `medium`, `low`, `info`) |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
