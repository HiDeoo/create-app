import fs from 'node:fs/promises'
import path from 'node:path'

import type { Linter } from 'eslint'
import merge from 'lodash.merge'

// All possible ESLint config file names except `.eslintrc.json` which is used by `create-app`.
export const UNSUPPORTED_ESLINT_CONFIG_FILENAMES = ['.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml']

export function parseEslintConfig(config: string): Linter.Config {
  return JSON.parse(config)
}

export function mergeEslintConfigs(config: Linter.Config, source: Linter.Config) {
  const mergedEslintConfig = merge({}, config, source)

  // Restore any shareable configs used if any.
  if (config.extends) {
    if (!mergedEslintConfig.extends) {
      mergedEslintConfig.extends = []
    } else if (typeof mergedEslintConfig.extends === 'string') {
      mergedEslintConfig.extends = [mergedEslintConfig.extends]
    }

    mergedEslintConfig.extends =
      typeof config.extends === 'string'
        ? [...mergedEslintConfig.extends, config.extends]
        : [...mergedEslintConfig.extends, ...config.extends]
  }

  return mergedEslintConfig
}

export async function deleteUnsupportedEslintConfigs(targetPath: string) {
  for (const fileName of UNSUPPORTED_ESLINT_CONFIG_FILENAMES) {
    await fs.rm(path.join(targetPath, fileName), { force: true })
  }
}
