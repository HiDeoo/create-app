import path from 'node:path'

import { green, reset } from 'kolorist'
import ora from 'ora'
import prompts from 'prompts'

import { UserAbortError } from './error'
import { isValidPkgName } from './pkg'

const spinner = ora()

export function logStep(message: string) {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  console.log(`${green('✔')} ${message}`)
}

export function logStepWithProgress(message: string, prependNewLine = false) {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  if (prependNewLine) {
    console.log('\n')
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
  console.error('\nSomething went wrong:', isError ? error.message : error)

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
    validate: (value: string) =>
      isValidPkgName(value) ||
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

export async function promptForYesNo(message: string): Promise<boolean> {
  const { response } = await prompts({
    active: 'no',
    inactive: 'yes',
    message: reset(message),
    name: 'response',
    onState: onPromptStateChange,
    type: 'toggle',
  })

  return !response
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

export async function promptForToken(message: string): Promise<string> {
  const { token } = await prompts({
    message: reset(message),
    name: 'token',
    onState: onPromptStateChange,
    type: 'password',
  })

  return token
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
