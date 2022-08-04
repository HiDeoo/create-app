import path from 'node:path'

import { green, reset } from 'kolorist'
import prompts from 'prompts'

import { isValidNpmPackageName } from './npm'

export function logStep(message: string) {
  console.log(`${green('✔')} ${message}`)
}

export async function promptForName() {
  const { name } = await prompts({
    message: reset('App name:'),
    name: 'name',
    type: 'text',
    validate: (value) =>
      isValidNpmPackageName(value) ||
      'Invalid app name, please check https://docs.npmjs.com/cli/v8/configuring-npm/package-json#name',
  })

  return name
}

export async function promptForDirectory(name: string) {
  const { newDirectory } = await prompts({
    active: `new '${name}' directory`,
    inactive: 'current directory',
    message: reset('App directory:'),
    name: 'newDirectory',
    type: 'toggle',
  })

  return path.resolve(newDirectory ? name : '.')
}
