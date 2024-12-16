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

export async function updateRepositorySettings(
  repoIdentifier: RepositoryIdentifier,
  keyValues: [string, string | number | boolean][],
) {
  try {
    await runCommand([
      'api',
      '--method',
      'PATCH',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}`,
      ...keyValues.flatMap(([key, value]) => ['-F', `${key}=${value}`]),
      '--silent',
    ])
  } catch (error) {
    throw errorWithCause(
      `Unable to update repository setting ${keyValues.map(([key]) => `'${key}'`).join(', ')} to '${repoIdentifier}'.`,
      error,
    )
  }
}

export async function updateRepositoryWorkflowPermissions(
  repoIdentifier: RepositoryIdentifier,
  keyValues: [string, string | number | boolean][],
) {
  try {
    await runCommand([
      'api',
      '--method',
      'PUT',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}/actions/permissions/workflow`,
      ...keyValues.flatMap(([key, value]) => ['-F', `${key}=${value}`]),
      '--silent',
    ])
  } catch (error) {
    throw errorWithCause(
      `Unable to update workflow permissions ${keyValues.map(([key]) => `'${key}'`).join(', ')} to '${repoIdentifier}'.`,
      error,
    )
  }
}

export async function addRepositorySecret(repoIdentifier: RepositoryIdentifier, key: string, value: string) {
  try {
    await runCommand(['secret', 'set', key, '-R', repoIdentifier, '-b', value])
  } catch (error) {
    throw errorWithCause(`Unable to add repository secret '${key}' to '${repoIdentifier}'.`, error)
  }
}

export async function getRepositoryLastCommitHash(repoIdentifier: RepositoryIdentifier) {
  try {
    const stdout = await runCommand([
      'api',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}/commits/main`,
    ])

    return (JSON.parse(stdout) as { sha: string }).sha
  } catch (error) {
    throw errorWithCause(`Unable to get the last commit hash of '${repoIdentifier}'.`, error)
  }
}

function runCommand(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    let stdout = ''

    const child = spawn('gh', args, {
      stdio: [],
    })

    child.stdout.on('data', (data) => {
      stdout += String(data)
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Something went wrong while running a GitHub CLI command.'))

        return
      }

      resolve(stdout)
    })
  })
}

export type RepositoryIdentifier = `${string}/${string}`
