import path from 'node:path'

import { green, reset } from 'kolorist'
import ora from 'ora'
import prompts from 'prompts'

import { UserAbortError } from './error'
import { isValidNpmPackageName } from './npm'

const spinner = ora()

export function logStep(message: string, newLine = false) {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  console.log(`${newLine ? '\n' : ''}${green('✔')} ${message}`)
}

export function logStepWithProgress(message: string) {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  return spinner.start(message)
}

export function logError(error: unknown) {
  const aborted = error instanceof UserAbortError

  if (aborted) {
    spinner.fail('Aborted').stop()
  }

  if (spinner.isSpinning) {
    spinner.fail()
  }

  if (aborted) {
    return
  }

  const isError = error instanceof Error
  console.error(`\nSomething went wrong: ${isError ? error.message : error}`)

  if (isError && error.cause) {
    console.error(error.cause)
  }
}

export async function promptForName(): Promise<string> {
  const { name } = await prompts({
    message: reset('App name:'),
    name: 'name',
    onState: onPromptStateChange,
    type: 'text',
    validate: (value) =>
      isValidNpmPackageName(value) ||
      'Invalid app name, please check https://docs.npmjs.com/cli/v8/configuring-npm/package-json#name',
  })

  return name
}

export async function promptForDirectory(name: string): Promise<string> {
  const { newDirectory } = await prompts({
    active: `new '${name}' directory`,
    inactive: 'current directory',
    message: reset('App directory:'),
    name: 'newDirectory',
    onState: onPromptStateChange,
    type: 'toggle',
  })

  return path.resolve(newDirectory ? name : '.')
}

export async function promptForConfirmation(message: string): Promise<void> {
  const { confirmed } = await prompts({
    initial: true,
    message: reset(message),
    name: 'confirmed',
    onState: onPromptStateChange,
    type: 'confirm',
  })

  if (!confirmed) {
    throw new UserAbortError()
  }
}

function onPromptStateChange(state: PromptState) {
  if (state.aborted) {
    process.nextTick(() => {
      process.exit(1)
    })
  }
}

interface PromptState {
  aborted: boolean
  value: string
}
