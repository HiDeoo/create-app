# @hideoo/create-app

## 4.3.0

### Minor Changes

- [#53](https://github.com/HiDeoo/create-app/pull/53) [`259f199`](https://github.com/HiDeoo/create-app/commit/259f19955ade65b6dfea23a0915748be157c59e1) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Updates more GitHub settings if a repository matching the name of the app exists on GitHub:

  - Enable setting to [always suggest updating pull request branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-suggestions-to-update-pull-request-branches)
  - For public npm packages:
    - Disable setting to [allow merge commits](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-merging-for-pull-requests)
    - Disable setting to [allow rebase merging](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-rebasing-for-pull-requests)
    - Enable setting to [allow GitHub Actions to create and approve pull requests](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#preventing-github-actions-from-creating-or-approving-pull-requests)

## 4.2.0

### Minor Changes

- [#51](https://github.com/HiDeoo/create-app/pull/51) [`891ec23`](https://github.com/HiDeoo/create-app/commit/891ec2360429503ce23e39bb931affe936337edb) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs of public npm packages.
