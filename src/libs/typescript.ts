import merge from 'lodash.merge'
import { type TsConfigJson } from 'type-fest'

export function parseTsConfig(config: string): TsConfigJson {
  return JSON.parse(config)
}

export function mergeTsConfigs(config: TsConfigJson, source: TsConfigJson) {
  const mergedTsConfig = merge({}, config, source)

  // Clear all compiler options.
  delete mergedTsConfig.compilerOptions

  if (config.compilerOptions?.noEmit || config.compilerOptions?.target) {
    mergedTsConfig.compilerOptions = {}

    // Restore the noEmit option if any.
    if (config.compilerOptions?.noEmit) {
      mergedTsConfig.compilerOptions.noEmit = config.compilerOptions.noEmit
    }

    // Restore the target option if any.
    if (config.compilerOptions?.target) {
      mergedTsConfig.compilerOptions.target = config.compilerOptions.target
    }
  }

  return mergedTsConfig
}
