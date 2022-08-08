import fs from 'node:fs/promises'

import merge from 'lodash.merge'
import { type PackageJson } from 'type-fest'
import validateNpmPackageName from 'validate-npm-package-name'

import { PACKAGE_MANAGER } from '../config'

import { getPkgManagerLatestVersion } from './pm'
import { getPkgLatestVersion } from './unpkg'

export function isValidNpmPackageName(name: string) {
  return validateNpmPackageName(name).validForNewPackages
}

export async function cwdContainsPkg(): Promise<string | false> {
  try {
    const content = await fs.readFile('package.json', { encoding: 'utf8' })
    const pkg = parsePkg(content)

    if (!pkg.name) {
      throw new Error("Missing 'name' property in package.json")
    }

    return pkg.name
  } catch {
    return false
  }
}

export function mergePkgs(pkg: PackageJson, source: PackageJson) {
  const mergedPkg = merge({}, pkg, source)

  if (pkg.type) {
    // Restore the existing type if any.
    mergedPkg.type = pkg.type
  } else if (pkg.name) {
    // If we are upgrading an app which doesn't have a type, do not set it.
    delete mergedPkg.type
  }

  return mergedPkg
}

export async function pinPkgDependenciesToLatest(pkg: PackageJson) {
  if (pkg.dependencies) {
    pkg.dependencies = await pinDependenciesToLatest(pkg.dependencies)
  }

  if (pkg.devDependencies) {
    pkg.devDependencies = await pinDependenciesToLatest(pkg.devDependencies)
  }

  return pkg
}

export function parsePkg(pkg: string): PackageJson {
  return JSON.parse(pkg)
}

export async function setPkgManagerToLatest(pkg: PackageJson) {
  const latestPmVersion = await getPkgManagerLatestVersion()

  pkg.packageManager = `${PACKAGE_MANAGER}@${latestPmVersion}`

  return pkg
}

async function pinDependenciesToLatest(dependencies: PackageJson.Dependency) {
  const deps: PackageJson.Dependency = {}

  for (const name of Object.keys(dependencies)) {
    deps[name] = await getPkgLatestVersion(name)
  }

  return deps
}
