# AGENTS.md

Instructions for coding agents working in this repo. `CLAUDE.md` is a symlink to this file, so add a rule here once.

What the repo does and how to run it are in [`README.md`](README.md).

## GitHub Actions — pinned to a commit SHA

A tag such as `@v4` can be repointed by whoever controls the action's repository, and the next run then executes their code with this repository's npm publish credentials. So nothing a workflow runs is referenced by a movable name. The `zizmor` job in `.github/workflows/ci.yml` enforces this on every PR (config: `.github/zizmor.yml`).

- **Actions are pinned to a full commit SHA with the full version in a comment**: `uses: owner/repo@<40-character SHA> # v4.2.2`. This includes GitHub's own `actions/*`. The comment must be the release the SHA belongs to (`# v4` is rejected); upgrade tooling and the advisory check read the version from it.
- **Container images** (`container:`, `services.*.image`, `docker://`) carry a digest: `name:tag@sha256:<digest>`.
- **Find the SHA from the release tag**: `gh api repos/<owner>/<repo>/git/ref/tags/<tag> --jq .object`. When `.type` is `tag`, follow it with `gh api repos/<owner>/<repo>/git/tags/<sha> --jq .object.sha`. Pin a release that has been out for at least 7 days.
- **Reach for `gh` or a few lines of shell before adding a third-party action.** Every action is code that runs with the job's token.
- **Check locally** with `zizmor --pedantic .` (`brew install zizmor`). Set `GH_TOKEN` to include the checks that need the GitHub API.
- **Permissions start empty.** Every workflow sets `permissions: {}`, and each job lists only what it uses. Each write, `id-token` or non-`contents` grant carries a comment saying what needs it: `contents: write # creates the release and its tag`.
- **Expressions never go inside a script.** Pass `${{ … }}` values to `run:` steps through `env:` and quote them (`"$VERSION"`). Default variables like `$GITHUB_EVENT_NAME` and `$GITHUB_SHA` are already in the environment.
- **Checkouts set `persist-credentials: false`** unless a later step runs git against the remote. Prefer `gh api` or `gh release` for tags and releases, which need no saved credential.
- **CI workflows set a `concurrency` group** that cancels superseded PR runs. A release or publish workflow uses a group that queues instead of cancelling.
- **Never disable an audit or add an ignore to get a check green.** Each ignore in `.github/zizmor.yml` or inline `# zizmor: ignore[...]` comment says why the finding is safe. A new one needs the same, and a review. Otherwise fix the finding, or ask.

## Dependencies — exact versions

`package-lock.json` pins what CI installs. `package.json` pins what we ask for: every version is exact, so a version only changes when a diff says so. A range such as `^1.2.3` lets `npm install <pkg>`, `npm update` or a regenerated lockfile pull a release nobody chose, and a compromised release arrives the same way. `node scripts/check-dependency-pins.mjs` enforces this in CI.

- **Versions are exact**: `"left-pad": "1.3.0"`, never `^`, `~`, `*`, `latest` or a tag. This covers `dependencies`, `devDependencies`, `optionalDependencies` and `overrides`. `npm install <pkg>` writes an exact version because `.npmrc` sets `save-exact=true`; do not remove that setting. If this repository gains npm workspaces, one workspace package depends on another by exact version too; npm has no `workspace:` protocol.
- **`peerDependencies` stay ranges.** They describe what a consumer may bring, not what we install.
- **This package is published.** Everyone who installs it gets its `dependencies` at exactly these versions, so keep them few, and ship a release when one of them needs a security fix.
- **To change a version**, edit it (or `npm install <pkg>@<version>`), run `npm install`, and read the `package-lock.json` diff: it should show that package and what it pulled in, nothing else.
- **Before adding a dependency**, check that a few lines of our own code would not do, that the package is maintained and widely used, and whether it runs an install script.
- **Run tools from the lockfile**: after `npm ci`, `npx <tool>` runs the installed, pinned version of a package we depend on. If the package is not installed, `npx` downloads whatever version is current, so install first or name the version (`npx <tool>@<version>`). Do not `npx` a package that is not in `package-lock.json`.
