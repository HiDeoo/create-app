import { type PackageJson } from 'type-fest'
import { fetch } from 'undici'

import { errorWithCause } from './error'

export const JSDELIVR_URL = 'https://cdn.jsdelivr.net'

const jsdelivrCache = new Map<string, string>()

export async function getPkgLatestVersion(name: string) {
  if (jsdelivrCache.has(name)) {
    return jsdelivrCache.get(name)
  }

  try {
    const res = await fetch(`${JSDELIVR_URL}/npm/${name}/package.json`)
    const json = (await res.json()) as PackageJson
    const version = json.version

    if (!version) {
      throw new Error(`Missing \`version\` property in package.json for '${name}'.`)
    }

    jsdelivrCache.set(name, version)

    return version
  } catch (error) {
    throw errorWithCause(`Could not find latest version of '${name}'`, error)
  }
}
