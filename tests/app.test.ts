import { spawn } from 'node:child_process'

import { type PackageJson } from 'type-fest'
import { afterAll, assert, beforeAll, describe, expect, test, vi } from 'vitest'

import { createApp, updateApp } from '../src/app'
import { NODE_VERSION, PACKAGE_MANAGER } from '../src/config'
import { parsePkg } from '../src/libs/npm'
import { type TemplateVariables } from '../src/libs/template'

import { getExpectedPaths, getTestDirPaths, getTestContent, setupTest } from './utils'

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

vi.mock('node:child_process', async () => {
  const mod = await vi.importActual<typeof import('node:child_process')>('node:child_process')

  return {
    ...mod,
    spawn: vi.fn().mockReturnValue({
      on: vi.fn().mockImplementation((event, listener) => {
        if (event === 'close') {
          listener(0)
        }
      }),
    }),
  }
})

describe.each(testScenarios)('$description', ({ appName, setup }) => {
  const { afterTest, beforeTest, testDir } = setupTest(appName)

  let templateVariables: TemplateVariables | undefined

  beforeAll(async () => {
    await beforeTest()

    templateVariables = { APP_NAME: appName, NODE_VERSION, YEAR: new Date().getFullYear() }

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

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should add or update the package.json file', async () => {
    const { file, fixture, template } = await getTestContent(testDir, appName, 'package.json')

    const filePkg = parsePkg(file)
    const fixturePkg = parsePkg(fixture ?? '{}')
    const templatePkg = parsePkg(template)

    expect(filePkg.author).toBe(templatePkg.author)

    assert(isString(templatePkg.bugs) && isString(filePkg.bugs))
    expectCompiledTemplate(templatePkg.bugs, filePkg.bugs, templateVariables)

    expect(filePkg.description).toBe(templatePkg.description)

    expectPinnedDependenciesToLatest(filePkg.dependencies)
    expectPersistedDependencies(fixturePkg.dependencies, filePkg.dependencies)

    expectPinnedDependenciesToLatest(filePkg.devDependencies)
    expectPersistedDependencies(fixturePkg.devDependencies, filePkg.devDependencies)

    assert(templatePkg.engines?.['node'] && filePkg.engines?.['node'])
    expectCompiledTemplate(templatePkg.engines?.['node'], filePkg.engines?.['node'], templateVariables)

    assert(isString(templatePkg.homepage) && isString(filePkg.homepage))
    expectCompiledTemplate(templatePkg.homepage, filePkg.homepage, templateVariables)

    expect(filePkg.keywords).toEqual(templatePkg.keywords)

    expect(filePkg.license).toBe(templatePkg.license)

    // TODO(HiDeoo) main

    expect(filePkg.name).toBe(appName)

    expect(filePkg.packageManager).toBe(`${PACKAGE_MANAGER}@la.te.st`)

    expect(filePkg.private).toBe(templatePkg.private)

    assert(isRepositoryObject(templatePkg.repository) && isRepositoryObject(filePkg.repository))
    expectCompiledTemplate(templatePkg.repository.url, filePkg.repository.url, templateVariables)

    expect(filePkg.repository.type).toBe(templatePkg.repository.type)

    // TODO(HiDeoo) scripts

    expect(filePkg.sideEffects).toBe(templatePkg.sideEffects)

    expect(filePkg.type).toBe(fixturePkg.type ? fixturePkg.type : fixturePkg.name ? undefined : templatePkg.type)

    expect(filePkg.version).toBe(templatePkg.version)
  })

  test('should add the readme file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'README.md')

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should install dependencies', async () => {
    const spawnMock = vi.mocked(spawn)

    expect(spawnMock).toHaveBeenCalledOnce()
    expect(spawnMock.mock.lastCall?.[0]).toBe(PACKAGE_MANAGER)
    expect(spawnMock.mock.lastCall?.[1]).toEqual(['install', '-C', testDir])

    spawnMock.mockClear()
  })
})

function expectPinnedDependenciesToLatest(deps?: PackageJson.Dependency) {
  if (!deps) {
    return
  }

  for (const version of Object.values(deps)) {
    expect(version).toBe('la.te.st')
  }
}

function expectPersistedDependencies(oldDeps?: PackageJson.Dependency, newDeps?: PackageJson.Dependency) {
  if (!oldDeps || !newDeps) {
    return
  }

  expect(Object.keys(newDeps)).toEqual(Object.keys(oldDeps))
}

function expectCompiledTemplate(template: string, content: string, variables: TemplateVariables | undefined) {
  expect(
    template.replaceAll(/{{(\w+)}}/g, (_match, variable: keyof TemplateVariables) => {
      if (!variables) {
        throw new Error('No template variables provided.')
      }
      return variables[variable].toString()
    })
  ).toBe(content)
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
