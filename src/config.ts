export const USER_NAME = 'HiDeoo'
export const USER_MAIL = 'github@hideoo.dev'
export const USER_SITE = 'https://hideoo.dev'

export const NODE_VERSION = 18

export const PACKAGE_MANAGER = 'pnpm'
export const PACKAGE_MANAGER_EXECUTE = 'pnpx'

export const NPM_REGISTRY_URL = 'https://registry.npmjs.org'
export const NPM_PROVENANCE_PERMISSION = 'id-token: write'
export const NPM_RELEASE_STEP = `- name: Publish
        run: pnpm publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true`

export const PKG_KEYS_ORDER = [
  '$schema',
  'name',
  'version',
  'license',
  'description',
  'author',
  'type',
  'main',
  'module',
  'browser',
  'types',
  'typings',
  'typesVersions',
  'bin',
  'man',
  'exports',
  'imports',
  'scripts',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
  'dependenciesMeta',
  'peerDependenciesMeta',
  'resolutions',
  'overrides',
  'pnpm',
  'engines',
  'os',
  'cpu',
  'workspaces',
  'packageManager',
  'private',
  'publishConfig',
  'sideEffects',
  'files',
  'directories',
  'keywords',
  'homepage',
  'repository',
  'bugs',
  'funding',
  'maintainers',
  'contributors',
  'activationEvents',
  'contributes',
  'capabilities',
  'extensionKind',
  'extensionPack',
  'extensionDependencies',
  'displayName',
  'publisher',
  'categories',
  'preview',
  'qna',
  'sponsor',
  'icon',
  'galleryBanner',
  'badges',
  'markdown',
  'eslintConfig',
  'eslintIgnore',
  'browserslist',
  'prettier',
  'commitlint',
  'lint-staged',
  'pre-commit',
  'simple-git-hooks',
  'simple-pre-commit',
]
