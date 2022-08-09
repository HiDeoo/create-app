import merge from 'lodash.merge'
import { type TsConfigJson } from 'type-fest'

export const PRESERVED_TS_COMPILER_OPTIONS = new Set(['allowJs', 'jsx', 'noEmit', 'target'])

export function parseTsConfig(config: string): TsConfigJson {
  return JSON.parse(config)
}

export function mergeTsConfigs(config: TsConfigJson, source: TsConfigJson) {
  const mergedTsConfig = merge({}, config, source)

  if (mergedTsConfig.compilerOptions) {
    for (const compilerOption of Object.keys(mergedTsConfig.compilerOptions)) {
      if (!PRESERVED_TS_COMPILER_OPTIONS.has(compilerOption)) {
        delete mergedTsConfig.compilerOptions[compilerOption as keyof TsConfigJson['compilerOptions']]
      }
    }
  }

  return mergedTsConfig
}
