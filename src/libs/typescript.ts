import { parse as parseJsonc } from 'comment-json'
import merge from 'lodash.merge'
import sortObjectKey from 'sort-object-keys'
import { sortPackageJson } from 'sort-package-json'
import type { TsConfigJson } from 'type-fest'

import { getPkgTsConfig } from './jsdelivr'

export const PRESERVED_TS_COMPILER_OPTIONS = new Set<keyof TsConfigJson.CompilerOptions>([
  'allowJs',
  'jsx',
  'jsxFactory',
  'jsxFragmentFactory',
  'jsxImportSource',
  'noEmit',
  'paths',
  'plugins',
  'target',
])

export function parseTsConfig(config: string): TsConfigJson {
  return parseJsonc(config, undefined, true) as TsConfigJson
}

export async function mergeTsConfigs(config: TsConfigJson, source: TsConfigJson) {
  const mergedTsConfig = merge({}, config, source)

  const inheritedConfigName = typeof mergedTsConfig.extends === 'string' ? mergedTsConfig.extends : undefined
  let inheritedConfig: TsConfigJson | undefined

  if (inheritedConfigName) {
    inheritedConfig = await getPkgTsConfig(inheritedConfigName)
  }

  if (mergedTsConfig.compilerOptions) {
    for (const compilerOption of Object.keys(mergedTsConfig.compilerOptions)) {
      const option = compilerOption as keyof TsConfigJson.CompilerOptions

      if (
        !PRESERVED_TS_COMPILER_OPTIONS.has(option) ||
        mergedTsConfig.compilerOptions[option] === source.compilerOptions?.[option] ||
        (inheritedConfig && mergedTsConfig.compilerOptions[option] === inheritedConfig.compilerOptions?.[option])
      ) {
        delete mergedTsConfig.compilerOptions[option]
      }
    }
  }

  return mergedTsConfig
}

export function sortTsConfig(config: TsConfigJson) {
  const sortedConfig = sortPackageJson(config, { sortOrder: ['extends', 'compilerOptions'] })

  if (sortedConfig.compilerOptions) {
    sortedConfig.compilerOptions = sortObjectKey(sortedConfig.compilerOptions)
  }

  return sortedConfig
}
