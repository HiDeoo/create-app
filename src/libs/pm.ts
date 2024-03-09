import os from 'node:os'

import { PACKAGE_MANAGER, PACKAGE_MANAGER_EXECUTE } from '../config'

import { exec, type ExecOptions } from './exec'
import { getPkgLatestVersion } from './jsdelivr'

export function getPkgManagerLatestVersion() {
  return getPkgLatestVersion(PACKAGE_MANAGER)
}

export function installDependencies(appPath: string, onStdout: NonNullable<ExecOptions['onStdout']>) {
  return runPackageManager(appPath, ['install'], {
    env: { ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
    onStdout: (data) => {
      if (!data.includes('+++++')) {
        onStdout(data.replaceAll(/\s{2,}/g, ''))
      }
    },
  })
}

export function runPackageManagerCommand(appPath: string, args: string[], silent?: boolean) {
  return runPackageManager(appPath, ['exec', ...args], { silent: !!silent })
}

export function executePackageManagerCommand(appPath: string, args: string[], silent?: boolean) {
  return runPackageManager(appPath, args, { execute: true, silent: !!silent })
}

export function getPackageManagerBinary(execute?: RunOptions['execute']) {
  const executable = execute ? PACKAGE_MANAGER_EXECUTE : PACKAGE_MANAGER
  const extension = os.platform() === 'win32' ? '.cmd' : ''

  return `${executable}${extension}`
}

function runPackageManager(appPath: string, args: string[], options: RunOptions = {}) {
  return exec(getPackageManagerBinary(options.execute), args, { ...options, cwd: appPath })
}

interface RunOptions extends ExecOptions {
  execute?: boolean
}
