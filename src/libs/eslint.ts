import { type Linter } from 'eslint'
import merge from 'lodash.merge'

export function parseEsLintConfig(config: string): Linter.Config {
  return JSON.parse(config)
}

export function mergeEsLintConfigs(config: Linter.Config, source: Linter.Config) {
  const mergedEsLintConfig = merge({}, config, source)

  // Restore any shareable configs used if any.
  if (config.extends) {
    if (!mergedEsLintConfig.extends) {
      mergedEsLintConfig.extends = []
    } else if (typeof mergedEsLintConfig.extends === 'string') {
      mergedEsLintConfig.extends = [mergedEsLintConfig.extends]
    }

    mergedEsLintConfig.extends =
      typeof config.extends === 'string'
        ? [...mergedEsLintConfig.extends, config.extends]
        : [...mergedEsLintConfig.extends, ...config.extends]
  }

  return mergedEsLintConfig
}
