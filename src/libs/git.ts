import { exec } from './exec'

export async function isGitRepository(repoPath: string) {
  try {
    await exec('git', ['rev-parse', '--is-inside-work-tree'], { cwd: repoPath, silent: true })

    return true
  } catch {
    return false
  }
}

export function initGitRepository(repoPath: string) {
  return exec('git', ['init'], { cwd: repoPath, silent: true })
}

export function stageFiles(repoPath: string, files: string[]) {
  return exec('git', ['add', ...files], { cwd: repoPath, silent: true })
}
