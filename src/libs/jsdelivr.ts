import type { PackageJson } from 'type-fest'
import { fetch } from 'undici'

import { errorWithCause } from './error'
import { parseTsConfig } from './typescript'

export const JSDELIVR_URL = 'https://cdn.jsdelivr.net'

const jsdelivrPkgVersionCache = new Map<string, string>()

export async function getPkgLatestVersion(name: string) {
  if (jsdelivrPkgVersionCache.has(name)) {
    return jsdelivrPkgVersionCache.get(name)
  }

  try {
    const res = await fetch(`${JSDELIVR_URL}/npm/${name}/package.json`)
    const json = (await res.json()) as PackageJson
    const version = json.version

    if (!version) {
      throw new Error(`Missing \`version\` property in package.json for '${name}'.`)
    }

    jsdelivrPkgVersionCache.set(name, version)

    return version
  } catch (error) {
    throw errorWithCause(`Could not find latest version of '${name}'`, error)
  }
}

export async function getPkgTsConfig(name: string) {
  try {
    const res = await fetch(`${JSDELIVR_URL}/npm/${name}/tsconfig.json`)

    return parseTsConfig(await res.text())
  } catch (error) {
    throw errorWithCause(`Could not find tsconfig of '${name}'`, error)
  }
}
