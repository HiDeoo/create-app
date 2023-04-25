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
- ESLint with a configuration extending [@hideoo/eslint-config](https://github.com/HiDeoo/eslint-config)
- Prettier with a configuration extending [@hideoo/prettier-config](https://github.com/HiDeoo/prettier-config) and a pre-filled `.prettierignore` file

### Package.json

- Pre-fill most common fields
- Add a `lint` script to lint, ensure formatting and typecheck the code
- Enforce the package manager to the latest version of pnpm (reused in GitHub Actions)
- Enforce a minimum Node.js version (reused in GitHub Actions)
- Optionally add the configuration for publishing to npm
- Sort all well-known fields based on [custom rules](src/config.ts#L16-L88)

### Dependencies

- Automatically install all dependencies using `pnpm`
- Pin all new and existing dependencies to the exact latest version (versions are fetched from [jsDelivr](https://www.jsdelivr.com))

### Miscellaneous

- Automatically run Prettier and ESLint with the `--fix` option on all files _(this is particularly useful when updating an existing project to ensure all files match the proper code style)_
- Add various various pre-filled files like `.gitignore`, `README.md` and `LICENSE`

### Git

- Initialize a new Git repository if needed
- Setup a pre-commit hook to run Prettier on all staged files and ESLint on supported staged files
- If a repository matching the name of the app exists on GitHub, enable the GitHub repository setting to [automatically delete head branches after pull requests are merged](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches)
- Stage _added_ or _updated_ files during the creation of the app at the end of the process

### GitHub Actions

- Create an integration workflow to lint, ensure formatting, typecheck and test the project for every push on the main branch or pull request
- Add a customizable release workflow that can be triggered by bumping the version number in a commit with a tag matching the new version number (or just running `pnpx bumpp`)
  - The release workflow will fail if the integration workflow fails
  - A new release containing the changelog will be published on GitHub based on [conventional commits](https://www.conventionalcommits.org)
  - Optionally, if the app is a public npm package, a webpage to create a new npm automation access token will be opened during the installation in order to automatically add the new token as a secret to the repository matching the name of the app on GitHub if it exists. The release workflow will also be modified to publish the package with [provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance) to the npm registry.

## License

Licensed under the MIT License, Copyright © HiDeoo.

See [LICENSE](https://github.com/HiDeoo/create-app/blob/main/LICENSE) for more information.
