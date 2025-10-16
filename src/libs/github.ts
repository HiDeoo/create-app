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

export async function updateRepositoryActionPermissions(
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
      `/repos/${repoIdentifier}/actions/permissions`,
      ...keyValues.flatMap(([key, value]) => ['-F', `${key}=${value}`]),
      '--silent',
    ])
  } catch (error) {
    throw errorWithCause(
      `Unable to update action permissions ${keyValues.map(([key]) => `'${key}'`).join(', ')} to '${repoIdentifier}'.`,
      error,
    )
  }
}

export async function getActionLatestReleaseHash(repoIdentifier: RepositoryIdentifier) {
  try {
    let stdout = await runCommand([
      'api',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}/releases/latest`,
    ])

    const release = JSON.parse(stdout) as { tag_name: string }

    stdout = await runCommand([
      'api',
      '-H',
      'Accept: application/vnd.github+json',
      `/repos/${repoIdentifier}/git/refs/tags/${release.tag_name.replace(/^refs\/tags\//u, '')}`,
    ])

    const ref = JSON.parse(stdout) as { object: { sha: string; type: 'commit' | 'tag' } }

    if (ref.object.type === 'tag') {
      stdout = await runCommand([
        'api',
        '-H',
        'Accept: application/vnd.github+json',
        `/repos/${repoIdentifier}/git/tags/${ref.object.sha}`,
      ])

      const tag = JSON.parse(stdout) as { object: { sha: string } }
      ref.object.sha = tag.object.sha
    }

    return `${ref.object.sha} # ${release.tag_name}`
  } catch (error) {
    throw errorWithCause(`Unable to get the last release hash of '${repoIdentifier}'.`, error)
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
