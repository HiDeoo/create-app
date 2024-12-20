<div align="center">
  <h1>@hideoo/create-app 🏗️</h1>
  <p>Don't Repeat Yourself</p>
</div>

<div align="center">
  <a href="https://github.com/HiDeoo/create-app/actions/workflows/integration.yml">
    <img alt="Integration Status" src="https://github.com/HiDeoo/create-app/actions/workflows/integration.yml/badge.svg" />
  </a>
  <a href="https://github.com/HiDeoo/create-app/blob/main/LICENSE">
    <img alt="License" src="https://badgen.net/github/license/HiDeoo/create-app" />
  </a>
  <br />
  <br />
</div>

Bootstrapping a new project always consists of the exact same steps like setting up TypeScript, installing dependencies, configuring a linter, adding various miscellaneous files and so on.

`@hideoo/create-app` is a very opinionated CLI utility to help me quickly bootstrap a new project by either:

- creating a new project from scratch
- updating a new project generated with `pnpm create vite` or `pnpm create next-app`

<br />

> **Note**: [pnpm](https://pnpm.io) and the [GitHub CLI](https://cli.github.com) are required to use this utility.

## Usage

```shell
$ pnpm create @hideoo/app
```

And that's it, no options, no configuration and no extra tweaks needed, you are ready to go!

## Features

Either **create** a new app from scratch (in the current directory or a new directory) or **update** an existing app.

### Tools

- TypeScript with a configuration extending [@hideoo/tsconfig](https://github.com/HiDeoo/tsconfig)
- ESLint with a flat configuration extending [@hideoo/eslint-config](https://github.com/HiDeoo/eslint-config)
- Prettier with a configuration extending [@hideoo/prettier-config](https://github.com/HiDeoo/prettier-config) and a pre-filled `.prettierignore` file

### Package.json

- Pre-fill most common fields
- Add a `lint` script to lint and typecheck the code
- Add a `format` script to ensure formatting
- Enforce the package manager to the latest version of pnpm (reused in GitHub Actions)
- Enforce a minimum Node.js version (reused in GitHub Actions)
- Optionally add the configuration for publishing to npm
- Sort all well-known fields based on [custom rules](src/config.ts#L16-L88)

### Dependencies

- Automatically install all dependencies using `pnpm`
- Use the latest version for all new and existing dependencies (versions are fetched from [jsDelivr](https://www.jsdelivr.com))

### Miscellaneous

- Automatically run Prettier and ESLint with the `--fix` option on all files _(this is particularly useful when updating an existing project to ensure all files match the proper code style)_
- Add various various pre-filled files like `.gitignore`, `README.md` and `LICENSE`

### Git

- Initialize a new Git repository if needed
- If a repository matching the name of the app exists on GitHub, update various GitHub repository settings
  - Enable setting to [automatically delete head branches after pull requests are merged](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches)
  - Enable setting to [always suggest updating pull request branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-suggestions-to-update-pull-request-branches)
  - For public npm packages:
    - Disable setting to [allow merge commits](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-merging-for-pull-requests)
    - Disable setting to [allow rebase merging](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-rebasing-for-pull-requests)
    - Enable setting to [allow GitHub Actions to create and approve pull requests](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#preventing-github-actions-from-creating-or-approving-pull-requests)
- If a repository matching the name of the app exists on GitHub, enable the GitHub repository setting to [automatically delete head branches after pull requests are merged](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches)
- Stage _added_ or _updated_ files during the creation of the app at the end of the process

### GitHub Actions

- Create an autofix workflow to ensure formatting and using [autofix.ci](https://autofix.ci/) to automatically update pull requests if needed
- Create an integration workflow to lint, typecheck and test the project for every push on the main branch or pull request
- Add a customizable release workflow
  - For public npm packages:
    - Use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs
    - A webpage to create a new npm automation access token will be opened during the installation in order to automatically add the new token as a secret to the repository matching the name of the app on GitHub if it exists
    - The released package(s) will be published with [provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance) to the npm registry
  - For other projects:
    - The release workflow can be triggered by bumping the version number in a commit with a tag matching the new version number (or just running `pnpx bumpp`)
    - A new release containing the changelog will be published on GitHub based on [conventional commits](https://www.conventionalcommits.org)

## License

Licensed under the MIT License, Copyright © HiDeoo.

See [LICENSE](https://github.com/HiDeoo/create-app/blob/main/LICENSE) for more information.
