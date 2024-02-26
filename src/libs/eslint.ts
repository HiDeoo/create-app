import fs from 'node:fs/promises'
import path from 'node:path'

// All possible ESLint config file names except `eslint.config.mjs` which is used by `create-app`.
export const UNSUPPORTED_ESLINT_CONFIG_FILENAMES = [
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.cjs',
]

export async function deleteUnsupportedEslintConfigs(targetPath: string) {
  for (const fileName of UNSUPPORTED_ESLINT_CONFIG_FILENAMES) {
    await fs.rm(path.join(targetPath, fileName), { force: true })
  }
}
