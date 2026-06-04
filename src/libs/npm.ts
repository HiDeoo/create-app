import { getVersions, type PackageVersionsInfo } from 'fast-npm-meta'

import { PACKAGE_MANAGER_MINIMUM_RELEASE_AGE } from '../config'

import { errorWithCause } from './error'

const npmPkgVersionCache = new Map<string, string>()

const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:\+.+)?$/

export async function getPkgLatestVersionMatchingMinimumReleaseAge(specifier: string) {
  if (npmPkgVersionCache.has(specifier)) {
    return npmPkgVersionCache.get(specifier)
  }

  try {
    const metadata = await getVersions(specifier, { retry: false })
    const version = getVersionMatchingMinimumReleaseAge(metadata, hasVersionSpecifier(specifier))

    npmPkgVersionCache.set(specifier, version)

    return version
  } catch (error) {
    throw errorWithCause(
      `Could not find latest version of '${specifier}' matching the minimum release age requirement.`,
      error,
    )
  }
}

function hasVersionSpecifier(specifier: string) {
  const separatorIndex = specifier.startsWith('@')
    ? specifier.indexOf('@', specifier.indexOf('/') + 1)
    : specifier.indexOf('@')

  return separatorIndex !== -1
}

function getVersionMatchingMinimumReleaseAge(metadata: PackageVersionsInfo, withVersionSpecifier: boolean) {
  const minimumReleaseAge = Date.now() - PACKAGE_MANAGER_MINIMUM_RELEASE_AGE * 60 * 1000
  const latestVersion = parseVersion(metadata.distTags.latest)

  const version = metadata.versions
    .filter((versionSpecifier) => {
      const version = parseVersion(versionSpecifier)

      if (!version) return false
      if (!withVersionSpecifier && latestVersion && compareVersions(version, latestVersion) > 0) return false

      return versionMatchesMinimumReleaseAge(metadata, versionSpecifier, minimumReleaseAge)
    })
    .toSorted((a, b) => compareVersions(parseVersion(b), parseVersion(a)))[0]

  if (!version) {
    throw new Error(
      `No version satisfies the minimum release age of ${PACKAGE_MANAGER_MINIMUM_RELEASE_AGE / 60 / 24} days for '${metadata.name}'.`,
    )
  }

  return version
}

function versionMatchesMinimumReleaseAge(metadata: PackageVersionsInfo, version: string, minimumReleaseAge: number) {
  const publishedAt = metadata.time[version]

  return publishedAt === undefined || Date.parse(publishedAt) <= minimumReleaseAge
}

function parseVersion(version: string): Version | undefined {
  const match = versionRegex.exec(version)
  if (!match) return

  const [, major, minor, patch] = match

  if (!major || !minor || !patch) return

  return [Number(major), Number(minor), Number(patch)]
}

function compareVersions(a: Version | undefined, b: Version | undefined) {
  if (!a || !b) return 0

  const [aMajor, aMinor, aPatch] = a
  const [bMajor, bMinor, bPatch] = b

  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch
}

type Version = readonly [number, number, number]
