import { spawn } from 'node:child_process'

import { errorWithCause } from './error'

export function exec(command: string, args: string[], options: ExecOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.silent ?? options.onStdout ? [] : 'inherit',
    })

    const errorMessage = `Unable to run command: '${command} ${args.join(' ')}'.`

    if (options.onStdout && child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        const lines = data
          .toString()
          .split('\n')
          .filter((line) => line.length > 0)

        for (const line of lines) {
          options.onStdout?.(line.trim())
        }
      })
    }

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

export interface ExecOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  onStdout?: (data: string) => void
  silent?: boolean
}
