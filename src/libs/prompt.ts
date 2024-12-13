import path from 'node:path'

import { bold, green, red } from 'kolorist'
import ora from 'ora'
import prompts from 'prompts'

import { UserAbortError } from './error'
import { isValidPkgName } from './pkg'

const spinner = ora()

export function logStep(message: string) {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  // eslint-disable-next-line no-console
  console.log(`${green('✔')} ${bold(message)}`)
}

export function logStepWithProgress(message: string): StepWithProgress {
  if (spinner.isSpinning) {
    spinner.succeed()
  }

  spinner.start(bold(message))

  return {
    addDetails(details) {
      spinner.text = `${bold(message)} › ${details}`
    },
    removeDetails() {
      spinner.text = bold(message)
    },
  }
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
  console.error(bold(red('\nSomething went wrong:')), isError ? error.message : error)

  if (isError && error.cause) {
    console.error(error.cause)
  }
}

export function logMessage(message: string) {
  // eslint-disable-next-line no-console
  console.log(bold(message))
}

export async function promptForName() {
  const nameAnswer = await prompts({
    initial: path.basename(process.cwd()),
    message: 'App name:',
    name: 'name',
    onState: onPromptStateChange,
    type: 'text',
    validate: (value: string) =>
      isValidPkgName(value) ||
      'Invalid app name, please check https://docs.npmjs.com/cli/v8/configuring-npm/package-json#name',
  })

  return nameAnswer.name as string
}

export async function promptForDirectory(name: string) {
  const newDirectoryAnswer = await prompts({
    active: `new '${name}' directory`,
    inactive: 'current directory',
    message: 'App directory:',
    name: 'newDirectory',
    onState: onPromptStateChange,
    type: 'toggle',
  })

  return path.resolve((newDirectoryAnswer.newDirectory as boolean) ? name : '.')
}

export async function promptForYesNo(message: string): Promise<boolean> {
  const responseAnswer = await prompts({
    active: 'no',
    inactive: 'yes',
    message: message,
    name: 'response',
    onState: onPromptStateChange,
    type: 'toggle',
  })

  return !responseAnswer.response
}

export async function promptForConfirmation(message: string): Promise<void> {
  const confirmedAnswer = await prompts({
    initial: true,
    message: message,
    name: 'confirmed',
    onState: onPromptStateChange,
    type: 'confirm',
  })

  if (!confirmedAnswer.confirmed) {
    throw new UserAbortError()
  }
}

export async function promptForToken(message: string) {
  const tokenAnswer = await prompts({
    message: message,
    name: 'token',
    onState: onPromptStateChange,
    type: 'password',
  })

  return tokenAnswer.token as string
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

interface StepWithProgress {
  addDetails: (detail: string) => void
  removeDetails: () => void
}
