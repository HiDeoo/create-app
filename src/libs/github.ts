import { spawn } from 'node:child_process'

import { errorWithCause } from './error'

export async function isGitHubRepository(repoIdentifier: RepositoryIdentifier) {
  try {
    await runCommand(['api', '-H', 'Accept: application/vnd.github+json', `/repos/${repoIdentifier}`])

    return true
  } catch {
    return false
  }
}

export async function updateRepositorySetting(
  repoIdentifier: RepositoryIdentifier,
  key: string,
  value: string | number | boolean
) {
  try {
    await runCommand([
      'api',
      '--method',
      'PATCH',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}`,
      '-F',
      `${key}=${value}`,
      '--silent',
    ])
  } catch (error) {
    throw errorWithCause(`Unable to update repository setting '${key}' to '${repoIdentifier}'.`, error)
  }
}

export async function addRepositorySecret(repoIdentifier: RepositoryIdentifier, key: string, value: string) {
  try {
    await runCommand(['secret', 'set', key, '-R', repoIdentifier, '-b', value])
  } catch (error) {
    throw errorWithCause(`Unable to add repository secret '${key}' to '${repoIdentifier}'.`, error)
  }
}

function runCommand(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: [],
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Something went wrong while running a GitHub CLI command.'))

        return
      }

      resolve()
    })
  })
}

export type RepositoryIdentifier = `${string}/${string}`
