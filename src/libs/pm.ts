import { spawn } from 'node:child_process'

import { PACKAGE_MANAGER } from '../config'

import { errorWithCause } from './error'
import { getPkgLatestVersion } from './unpkg'

export function getPkgManagerLatestVersion() {
  return getPkgLatestVersion(PACKAGE_MANAGER)
}

export function installDependencies(appPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(PACKAGE_MANAGER, ['install', '-C', appPath], {
      stdio: 'inherit',
      env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
    })

    const errorMessage = `Unable to install dependencies with ${PACKAGE_MANAGER}.`

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
