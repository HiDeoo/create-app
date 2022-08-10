import { spawn } from 'node:child_process'

import { errorWithCause } from './error'

export function exec(command: string, args: string[], options: ExecOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.silent ? [] : 'inherit',
    })

    const errorMessage = `Unable to run command: '${command} ${args.join(' ')}'.`

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
  silent?: boolean
}
