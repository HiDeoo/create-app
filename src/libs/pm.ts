import { spawn } from 'node:child_process'

import { PACKAGE_MANAGER } from '../config'

import { errorWithCause } from './error'
import { getPkgLatestVersion } from './unpkg'

export function getPkgManagerLatestVersion() {
  return getPkgLatestVersion(PACKAGE_MANAGER)
}

export function installDependencies(appPath: string) {
  return runPackageManager(appPath, ['install'], { ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' })
}

export function runPackageManagerCommand(appPath: string, args: string[]) {
  return runPackageManager(appPath, ['exec', ...args])
}

function runPackageManager(appPath: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  return new Promise<void>((resolve, reject) => {
    const argsWithCwd = ['-C', appPath, ...args]

    const child = spawn(PACKAGE_MANAGER, argsWithCwd, {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })

    const errorMessage = `Unable to run package manager command: '${PACKAGE_MANAGER} ${argsWithCwd.join(' ')}'.`

    child.on('error', (error) => {
      reject(errorWithCause(errorMessage, error))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorMessage))

        return
      }

      resolve()
    })
  })
}
