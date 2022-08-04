import { constants } from 'node:fs'
import fs from 'node:fs/promises'

import validateNpmPackageName from 'validate-npm-package-name'

export function isValidNpmPackageName(name: string) {
  return validateNpmPackageName(name).validForNewPackages
}

export async function cwdContainsPkg() {
  try {
    await fs.access('package.json', constants.R_OK | constants.W_OK)

    return true
  } catch {
    return false
  }
}
