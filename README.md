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

| Option              | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `-p, --project`     | Project ID (or set `PENSAR_PROJECT_ID`)               |
| `-b, --branch`      | Branch to pentest                                     |
| `-l, --level`       | Pentest level: `priority` or `full`                   |
| `-e, --environment` | Target environment: `dev`, `staging`, or `production` |
| `--no-wait`         | Don't wait for pentest to complete                    |

## Environment Variables

| Variable             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `PENSAR_API_KEY`     | Your Pensar API key                                    |
| `PENSAR_PROJECT_ID`  | Your Pensar project ID                                 |
| `PENSAR_ENVIRONMENT` | Target environment (`dev`, `staging`, or `production`) |

## CI/CD Integration

See [`examples/`](./examples) for ready-to-use workflows:

- **GitHub Actions** — pentest on PR, push, or after deploy
- **GitLab CI** — merge request and pipeline triggers

## License

MIT
