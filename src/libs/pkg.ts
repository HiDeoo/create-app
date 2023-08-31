import fs from 'node:fs/promises'

import merge from 'lodash.merge'
import { sortPackageJson } from 'sort-package-json'
import type { PackageJson } from 'type-fest'
import validateNpmPackageName from 'validate-npm-package-name'

import type { AppOptions } from '../app'
import { NODE_VERSION, PKG_INVALID_DEPENDENCIES, PKG_KEYS_ORDER } from '../config'

import { getPkgLatestVersion } from './jsdelivr'

export function isValidPkgName(name: string) {
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

  // Scripts in the template should be merged after the existing ones and respect the template's order.
  if (pkg.scripts) {
    // Restore existing scripts if any.
    mergedPkg.scripts = pkg.scripts

    for (const script of Object.keys(mergedPkg.scripts)) {
      if (source.scripts?.[script]) {
        // Delete the script if it is also defined in the template.
        delete mergedPkg.scripts[script]
      }
    }

    // Merge the scripts from the template.
    Object.assign(mergedPkg.scripts, source.scripts)
  }

  if (mergedPkg.scripts?.['lint'] && dependenciesContains(pkg.dependencies, 'next')) {
    // If updating a Next.js application, use the `next lint` wrapper instead of ESLint.
    // https://github.com/vercel/next.js/blob/5d93753bc304fa65acb11e534126d37ce1d1ebe1/packages/next/cli/next-lint.ts
    mergedPkg.scripts['lint'] = mergedPkg.scripts['lint'].replace('eslint .', 'next lint -d .')
  }

  // Remove invalid dependencies, e.g. some ESLint related dependencies that are provided by `@hideoo/eslint-config`.
  for (const dependency of Object.keys(mergedPkg.dependencies ?? {})) {
    if (PKG_INVALID_DEPENDENCIES.includes(dependency)) {
      delete mergedPkg.dependencies?.[dependency]
    }
  }

  // Remove TypeScript regular dependency if it exists as it is already a devDependency.
  delete mergedPkg.dependencies?.['typescript']

  // Repeat the same process for devDependencies.
  for (const devDependency of Object.keys(mergedPkg.devDependencies ?? {})) {
    if (PKG_INVALID_DEPENDENCIES.includes(devDependency)) {
      delete mergedPkg.devDependencies?.[devDependency]
    }
  }

  return mergedPkg
}

export async function pinPkgDependenciesToLatest(pkg: PackageJson, onPin: (name: string) => void) {
  if (pkg.dependencies) {
    pkg.dependencies = await pinDependenciesToLatest(pkg.dependencies, onPin)
  }

  if (pkg.devDependencies) {
    pkg.devDependencies = await pinDependenciesToLatest(pkg.devDependencies, onPin)

    if (dependenciesContains(pkg.devDependencies, '@types/node')) {
      const pkgName = `@types/node@${NODE_VERSION}`

      onPin(pkgName)
      pkg.devDependencies['@types/node'] = await getPkgLatestVersion(pkgName)
    }
  }

  return pkg
}

export function parsePkg(pkg: string): PackageJson {
  return JSON.parse(pkg) as PackageJson
}

export function setPkgAccess(pkg: PackageJson, access: AppOptions['access']) {
  if (access === 'public') {
    delete pkg.private
  } else {
    delete pkg.publishConfig
    delete pkg.scripts?.['prepublishOnly']
  }

  return pkg
}

async function pinDependenciesToLatest(dependencies: PackageJson.Dependency, onPin: (name: string) => void) {
  const deps: PackageJson.Dependency = {}

  for (const name of Object.keys(dependencies)) {
    onPin(name)

    deps[name] = await getPkgLatestVersion(name)
  }

  return deps
}

export function sortPkg(pkg: PackageJson) {
  const sortedPkg: PackageJson = sortPackageJson(pkg, { sortOrder: PKG_KEYS_ORDER })

  if (pkg.scripts) {
    // Revert the order of the scripts which are already sorted in the template.
    sortedPkg.scripts = pkg.scripts
  }

  return sortedPkg
}

function dependenciesContains(dependencies: PackageJson.Dependency | undefined, name: string) {
  if (!dependencies) {
    return false
  }

  return Object.keys(dependencies).includes(name)
}
