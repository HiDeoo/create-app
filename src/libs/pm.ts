import { PACKAGE_MANAGER, PACKAGE_MANAGER_EXECUTE } from '../config'

import { exec, type ExecOptions } from './exec'
import { getPkgLatestVersion } from './unpkg'

export function getPkgManagerLatestVersion() {
  return getPkgLatestVersion(PACKAGE_MANAGER)
}

export function installDependencies(appPath: string) {
  return runPackageManager(appPath, ['install'], { env: { ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' } })
}

export function runPackageManagerCommand(appPath: string, args: string[], silent?: boolean) {
  return runPackageManager(appPath, ['exec', ...args], { silent: !!silent })
}

export function executePackageManagerCommand(appPath: string, args: string[], silent?: boolean) {
  return runPackageManager(appPath, args, { execute: true, silent: !!silent })
}

function runPackageManager(appPath: string, args: string[], options: RunOptions = {}) {
  return exec(options.execute ? PACKAGE_MANAGER_EXECUTE : PACKAGE_MANAGER, args, { ...options, cwd: appPath })
}

interface RunOptions extends ExecOptions {
  execute?: boolean
}
