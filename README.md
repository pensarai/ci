# @pensar/ci

Automated security scanning for your CI/CD pipeline.

## Installation

```bash
npm install @pensar/ci
```

## Usage

```bash
# Run a security scan
pensar scan --project <project-id>

# Check scan status
pensar status <scan-id>
```

### Options

| Option          | Description                             |
| --------------- | --------------------------------------- |
| `-p, --project` | Project ID (or set `PENSAR_PROJECT_ID`) |
| `-b, --branch`  | Branch to scan                          |
| `-l, --level`   | Scan level: `priority` or `full`        |
| `--no-wait`     | Don't wait for scan to complete         |

## Environment Variables

| Variable            | Description            |
| ------------------- | ---------------------- |
| `PENSAR_API_KEY`    | Your Pensar API key    |
| `PENSAR_PROJECT_ID` | Your Pensar project ID |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — scan on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
