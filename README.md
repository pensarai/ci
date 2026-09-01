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
| `--require-label`   | Only run when the pull request behind this commit carries one of these labels (comma-separated). Or set `PENSAR_REQUIRE_LABEL` |
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
| `PENSAR_REQUIRE_LABEL`           | Only run when the change carries one of these labels (comma-separated) |
| `PENSAR_ERROR_SEVERITY_THRESHOLD`| Minimum severity to trigger a non-zero exit (`critical`, `high`, `medium`, `low`, `info`) |

### Running only on labelled changes

Teams that pentest a subset of changes can label the pull request and gate the
run on that label:

```bash
pensar pentest --require-label pentest
```

The labels are read from wherever the current event has them:

| Trigger | Where the labels come from |
| --- | --- |
| `pull_request` | The event payload the runner already wrote to disk. No API call. |
| `push` (a merge landing on your release branch) | The pull requests that contain `GITHUB_SHA`, via the GitHub API. |
| `workflow_run` (after a deploy) | The same lookup, against `workflow_run.head_sha` from the payload. `GITHUB_SHA` is the default branch tip on this event, not the deployed commit. |
| GitLab merge requests | `CI_MERGE_REQUEST_LABELS`. No API call. |

The lookup on `push` and `workflow_run` needs a token that can read pull
requests:

```yaml
permissions:
  contents: read
  pull-requests: read
# ...
      - run: pensar pentest --require-label pentest
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PENSAR_API_KEY: ${{ secrets.PENSAR_API_KEY }}
```

When the label is missing, nothing is dispatched, the command exits `0`, and it
logs which labels it did find. A missing label is not a failure — a required
check that goes red because nothing needed testing gets switched off.

If a gate is configured and the labels cannot be determined at all (no token, or
the API call fails), the command fails instead of guessing. Dispatching anyway
would ignore the gate; skipping silently would turn pentesting off without
anyone noticing.

Labels are only used to decide whether to run. Nothing about them is sent to
Pensar.

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
