# @pensar/ci

Automated security pentesting for your CI/CD pipeline.

## Installation

```bash
npm install @pensar/ci
```

## Usage

```bash
# Run a security pentest (custom test — the AI derives objectives from the diff)
pensar pentest --project <project-id>

# Run the AI endpoint-selection test instead of a custom test
pensar pentest --project <project-id> --test-type endpoint-selection

# Run a quick pentest (highest-risk endpoints only, ~15 mins)
pensar pentest --project <project-id> --quick

# Check pentest status
pensar status <scan-id>
```

### Test types

`--test-type` controls how the pentest is scoped against the code changes since
the last scan:

- **`custom`** (default): the agent reads the git diff, derives pentest
  objectives from what changed, and runs an application-scoped custom test —
  the same kind of test as the "Custom Test" option in the console
  `/pentests/new` page, but with objectives generated automatically from the
  diff.
- **`endpoint-selection`**: the agent picks the endpoints affected by the diff
  and runs a per-endpoint test against them.

### Options

| Option              | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `-p, --project`     | Project ID (or set `PENSAR_PROJECT_ID`)                                     |
| `-b, --branch`      | Branch to pentest                                                           |
| `-l, --level`       | Pentest level: `priority` or `full` (default: `full`)                       |
| `-t, --test-type`   | Test scoping: `custom` (default) or `endpoint-selection` (or set `PENSAR_TEST_TYPE`) |
| `--quick`           | Shorthand for `--level priority`. Tests highest-risk endpoints only (~15 mins) |
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
| `PENSAR_TEST_TYPE`              | Test scoping: `custom` (default) or `endpoint-selection`                |
| `PENSAR_ERROR_SEVERITY_THRESHOLD`| Minimum severity to trigger a non-zero exit (`critical`, `high`, `medium`, `low`, `info`) |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
