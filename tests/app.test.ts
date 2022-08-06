import { stripIndents } from 'common-tags'
import { type PackageJson } from 'type-fest'
import { afterAll, assert, beforeAll, describe, expect, test } from 'vitest'

import { createApp, updateApp } from '../src/app'
import { parsePkg } from '../src/libs/npm'
import { PACKAGE_MANAGER } from '../src/libs/pm'

import { diffStrings, getExpectedPaths, getTestDirPaths, getTestContent, setupTest } from './utils'

const testScenarios: TestScenario[] = [
  {
    appName: 'new-app',
    description: 'should create a new app',
    setup: (testDir, appName) => createApp(appName, testDir),
  },
  {
    appName: 'vite-react-ts',
    description: 'should update a Vite app with React & TypeScript',
    setup: (testDir, appName) => updateApp(appName, testDir),
  },
  {
    appName: 'next-ts',
    description: 'should update a Next.js app with TypeScript',
    setup: (testDir, appName) => updateApp(appName, testDir),
  },
]

describe.each(testScenarios)('$description', ({ appName, setup }) => {
  const { afterTest, beforeTest, testDir } = setupTest(appName)

  beforeAll(async () => {
    await beforeTest()

    return setup(testDir, appName)
  })

  afterAll(() => afterTest())

  test('should copy all templates', async () => {
    const testDirPaths = await getTestDirPaths(testDir)
    const expectedPaths = await getExpectedPaths()

    expect(testDirPaths).toEqual(expect.arrayContaining(expectedPaths))
  })

  test('should add the license file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'LICENSE')

    expect(diffStrings(template, file)).toMatch(
      stripIndents`
        - Copyright (c) {{YEAR}}-present, HiDeoo
        + Copyright (c) 2020-present, HiDeoo
      `
    )
  })

  test('should add or update the package.json file', async () => {
    const { file, fixture, template } = await getTestContent(testDir, appName, 'package.json')

    const filePkg = parsePkg(file)
    const fixturePkg = parsePkg(fixture ?? '{}')
    const templatePkg = parsePkg(template)

    expect(filePkg.author).toBe(templatePkg.author)
    assert(isString(templatePkg.bugs))
    assert(isString(filePkg.bugs))
    expect(diffStrings(templatePkg.bugs, filePkg.bugs)).toMatch(
      stripIndents`
        - ${templatePkg.bugs}
        + https://github.com/HiDeoo/${appName}/issues
      `
    )
    expect(filePkg.description).toBe(templatePkg.description)
    // TODO(HiDeoo) dependencies (persist existing)
    expectPinnedDependenciesToLatest(filePkg.dependencies)
    // TODO(HiDeoo) devDependencies (persist existing)
    expectPinnedDependenciesToLatest(filePkg.devDependencies)
    // TODO(HiDeoo) engine
    assert(isString(templatePkg.homepage))
    assert(isString(filePkg.homepage))
    expect(diffStrings(templatePkg.homepage, filePkg.homepage)).toMatch(
      stripIndents`
        - ${templatePkg.homepage}
        + https://github.com/HiDeoo/${appName}
      `
    )
    expect(filePkg.keywords).toEqual(templatePkg.keywords)
    expect(filePkg.license).toBe(templatePkg.license)
    // TODO(HiDeoo) main
    expect(filePkg.name).toBe(appName)
    expect(filePkg.packageManager).toBe(`${PACKAGE_MANAGER}@la.te.st`)
    expect(filePkg.private).toBe(templatePkg.private)
    assert(isRepositoryObject(templatePkg.repository))
    assert(isRepositoryObject(filePkg.repository))
    expect(diffStrings(templatePkg.repository.url, filePkg.repository.url)).toMatch(
      stripIndents`
        - ${templatePkg.repository.url}
        + https://github.com/HiDeoo/${appName}.git
      `
    )
    expect(filePkg.repository.type).toBe(templatePkg.repository.type)
    // TODO(HiDeoo) scripts
    expect(filePkg.sideEffects).toBe(templatePkg.sideEffects)
    expect(filePkg.type).toBe(fixturePkg.type ? fixturePkg.type : fixturePkg.name ? undefined : templatePkg.type)
    expect(filePkg.version).toBe(templatePkg.version)
  })
})

function expectPinnedDependenciesToLatest(dependencies?: PackageJson.Dependency) {
  if (!dependencies) {
    return
  }

  for (const version of Object.values(dependencies)) {
    expect(version).toBe('la.te.st')
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isRepositoryObject(value: unknown): value is NonNullable<Exclude<PackageJson['repository'], string>> {
  return typeof value === 'object'
}

interface TestScenario {
  appName: string
  description: string
  setup: (testDir: string, appName: string) => Promise<void>
}
