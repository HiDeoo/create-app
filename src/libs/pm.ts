import { PACKAGE_MANAGER } from '../config'

import { getPkgLatestVersion } from './unpkg'

export function getPkgManagerLatestVersion() {
  return getPkgLatestVersion(PACKAGE_MANAGER)
}
