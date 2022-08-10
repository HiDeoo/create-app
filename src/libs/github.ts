import { spawn } from 'node:child_process'

import { errorWithCause } from './error'

export function addRepositorySecret(repoIdentifier: string, key: string, value: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('gh', ['secret', 'set', key, '-R', repoIdentifier, '-b', value], {
      stdio: [],
    })

    const errorMessage = `Unable to add repository secret '${key}' to '${repoIdentifier}'.`

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
