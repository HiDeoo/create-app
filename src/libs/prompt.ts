import path from 'node:path'

import { green, reset } from 'kolorist'
import prompts from 'prompts'

import { isValidNpmPackageName } from './npm'

export function logStep(message: string) {
  console.log(`${green('✔')} ${message}`)
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
