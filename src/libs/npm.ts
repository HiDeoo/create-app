import fs from 'node:fs/promises'

import validateNpmPackageName from 'validate-npm-package-name'

export function isValidNpmPackageName(name: string) {
  return validateNpmPackageName(name).validForNewPackages
}

export async function cwdContainsPkg() {
  try {
    await fs.stat('package.json')

    return true
  } catch {
    return false
  }
}
