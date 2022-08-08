import { type PackageJson } from 'type-fest'
import { fetch } from 'undici'

import { errorWithCause } from './error'

export const UNPKG_URL = 'https://unpkg.com'

export async function getPkgLatestVersion(name: string) {
  try {
    const res = await fetch(`${UNPKG_URL}/${name}/package.json`)
    const json = (await res.json()) as PackageJson

    return json.version
  } catch (error) {
    throw errorWithCause(`Could not find latest version of '${name}'`, error)
  }
}
