import fs from 'node:fs/promises'

import merge from 'lodash.merge'
import open from 'open'
import { type PackageJson } from 'type-fest'
import validateNpmPackageName from 'validate-npm-package-name'

import { type AppOptions } from '../app'
import { USER_NAME } from '../config'

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

  if (mergedPkg.scripts?.['lint'] && pkg.dependencies && Object.keys(pkg.dependencies).includes('next')) {
    // If updating a Next.js application, use the `next link` wrapper instead of ESLint.
    // https://github.com/vercel/next.js/blob/5d93753bc304fa65acb11e534126d37ce1d1ebe1/packages/next/cli/next-lint.ts
    mergedPkg.scripts['lint'] = mergedPkg.scripts['lint'].replace('eslint .', 'next lint -d .')
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

export function setPkgAccess(pkg: PackageJson, access: AppOptions['access']) {
  if (access === 'public') {
    delete pkg.private
  } else {
    delete pkg.publishConfig
  }

  return pkg
}

export function openNewNpmTokenPage() {
  open(`https://www.npmjs.com/settings/${USER_NAME.toLowerCase()}/tokens/new`)
}

async function pinDependenciesToLatest(dependencies: PackageJson.Dependency) {
  const deps: PackageJson.Dependency = {}

  for (const name of Object.keys(dependencies)) {
    deps[name] = await getPkgLatestVersion(name)
  }

  return deps
}
