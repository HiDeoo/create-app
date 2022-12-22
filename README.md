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

- Either create a new app from scratch (in the current directory or a new directory) or update an existing app
- Add and configure the following build tools:
  - TypeScript with a configuration extending [@hideoo/tsconfig](https://github.com/HiDeoo/tsconfig)
  - ESLint with a configuration extending [@hideoo/eslint-config](https://github.com/HiDeoo/eslint-config)
  - Prettier with a configuration extending [@hideoo/prettier-config](https://github.com/HiDeoo/prettier-config) and a pre-filled `.prettierignore` file
- Automatically install all dependencies using pnpm
- Automatically run Prettier and ESLint with the `--fix` option on all files (this is particularly useful when updating an existing project to ensure all files match the proper code style)
- Setup the `package.json` file:
  - Pre-fill most common fields
  - Pin all new and existing dependencies to the exact latest version (versions are fetched from [unpkg](https://unpkg.com))
  - Add a `lint` script to lint, ensure formatting and typecheck the code
  - Enforce the package manager to the latest version of pnpm (reused in GitHub Actions)
  - Enforce a minimum Node.js version (reused in GitHub Actions)
  - Optionally add the configuration for publishing to npm
  - Sort all well-known fields based on [custom rules](src/config.ts#L10-L82)
- Add various miscellaneous pre-filled files like `.gitignore`, `README.md` and `LICENSE`
- Git
  - Initialize a new Git repository if needed
  - Setup a pre-commit hook to run Prettier on all staged files and ESLint on supported staged files
  - If a repository matching the name of the app exists on GitHub, enable the GitHub repository setting to [automatically delete head branches after pull requests are merged](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches)
- GitHub Actions
  - Create an integration workflow to lint, ensure formatting, typecheck and test the project for every push on the main branch or pull request
  - Optionally, if the app is meant to be published on the npm registry, a workflow to trigger a new release will be added
    - The webpage to create a new npm automation access token will automatically be opened during the installation in order to automatically add the new token as a repository secret using the GitHub CLI to the repository matching the name of the app
    - To trigger a new release, bump the version number in a commit with a tag matching the new version number (or just run `pnpx bumpp`)
    - The release workflow will fail if the integration workflow fails
    - A new release containing the changelog will be published on GitHub based on [conventional commits](https://www.conventionalcommits.org)

## License

Licensed under the MIT License, Copyright © HiDeoo.

See [LICENSE](https://github.com/HiDeoo/create-app/blob/main/LICENSE) for more information.
