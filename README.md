# Update Packmind Artifacts

A GitHub Action that runs `packmind-cli install` on a working branch in your repository and opens (or updates) a pull request with the latest Packmind playbook artifacts (standards, commands, skills).

Designed for nightly automation: schedule it on a cron, the action will only commit and open a PR when artifacts actually changed.

## Usage

```yaml
name: Nightly Packmind Artifacts Update

on:
  schedule:
    - cron: '0 2 * * 1-5' # Weeknights at 02:00 UTC
  workflow_dispatch:
    inputs:
      upgrade:
        description: 'Upgrade installed Packmind packages to their latest versions'
        type: boolean
        default: false

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout main
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Update Packmind artifacts
        uses: PackmindHub/update-packmind-artifacts@v1
        with:
          packmind-api-key: ${{ secrets.PACKMIND_API_KEY }}
          upgrade: ${{ inputs.upgrade || false }}
```

### Upgrading packages

By default, the action runs `packmind-cli install`, which renders the package versions already pinned in `packmind-lock.json`. Set `upgrade: true` to run `packmind-cli install --upgrade` instead, bumping installed packages to their latest versions (requires `@packmind/cli` >= 0.37.0).

The example above keeps scheduled runs on pinned versions and lets you opt into an upgrade when triggering the workflow manually (**Run workflow** → check **Upgrade**). To always upgrade, pass `upgrade: true` directly.

### Self-hosted runners

The action invokes the GitHub CLI (`gh`) and `jq`. They are pre-installed on GitHub-hosted runners. On self-hosted runners, make sure both binaries are available on `PATH`.

## Inputs

| Name               | Required | Default                                                  | Description                                                                              |
|--------------------|----------|----------------------------------------------------------|------------------------------------------------------------------------------------------|
| `packmind-api-key` | yes      | —                                                        | API key for Packmind. Pass as a secret.                                                  |
| `github-token`     | no       | `${{ github.token }}`                                    | Token used to push the working branch and open the pull request.                         |
| `branch-name`      | no       | `packmind-cli-update`                                    | Working branch. Created if missing, otherwise reused and merged with the base branch.    |
| `base-branch`      | no       | `main`                                                   | Base branch the pull request targets and that the working branch is merged from.         |
| `upgrade`          | no       | `false`                                                  | When `true`, runs `packmind-cli install --upgrade` to bump packages to latest versions.  |
| `node-version`     | no       | `22.17.0`                                                | Node.js version installed before running `packmind-cli`.                                 |
| `commit-message`   | no       | `chore(packmind): nightly artifacts update`              | Commit message used when artifacts changed.                                              |
| `pr-title`         | no       | _(falls back to `commit-message`)_                       | Title for the pull request when one is opened.                                           |
| `pr-body`          | no       | _(see `action.yml`)_                                     | Body for the pull request when one is opened.                                            |
| `git-user-name`    | no       | `packmind-bot`                                           | Git `user.name` used for the commit.                                                     |
| `git-user-email`   | no       | `packmind-bot@users.noreply.github.com`                  | Git `user.email` used for the commit.                                                    |

## Outputs

| Name        | Description                                                                                  |
|-------------|----------------------------------------------------------------------------------------------|
| `changed`   | `"true"` if artifacts changed in this run, `"false"` otherwise.                              |
| `pr-url`    | URL of the pull request associated with the working branch (newly created or already open). |
| `pr-number` | Number of the pull request associated with the working branch.                               |

## Required permissions

The job calling this action needs:

```yaml
permissions:
  contents: write       # push the working branch
  pull-requests: write  # create or update the PR
```

## Versioning

This action follows Semantic Versioning. Pin to a major-version tag (e.g. `@v1`) to receive non-breaking updates automatically; pin to a full version (e.g. `@v1.0.0`) for fully reproducible builds.

## License

Apache License 2.0 — see [LICENSE](./LICENSE).
