import { spawn } from 'node:child_process'

import { type PackageJson } from 'type-fest'
import { afterAll, assert, beforeAll, describe, expect, test, vi } from 'vitest'

import { type AppOptions, createApp, updateApp } from '../src/app'
import { NODE_VERSION, PACKAGE_MANAGER, PACKAGE_MANAGER_EXECUTE, USER_MAIL, USER_NAME, USER_SITE } from '../src/config'
import { parseEsLintConfig } from '../src/libs/eslint'
import { parsePkg } from '../src/libs/npm'
import { type TemplateVariables } from '../src/libs/template'
import { parseTsConfig } from '../src/libs/typescript'

import { getExpectedPaths, getTestDirPaths, getTestContent, setupTest } from './utils'

const testScenarios: TestScenario[] = [
  {
    appName: 'new-private-app',
    description: 'should create a new private app',
    options: { access: 'private', isNew: true },
    setup: (testDir, appName, options) => createApp(appName, testDir, options),
  },
  {
    appName: 'new-public-app',
    description: 'should create a new public app',
    options: { access: 'public', isNew: true, npmToken: 'token' },
    setup: (testDir, appName, options) => createApp(appName, testDir, options),
  },
  {
    appName: 'vite-react-ts',
    description: 'should update a private Vite app with React & TypeScript',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'vite-react-ts',
    description: 'should update a public Vite app with React & TypeScript',
    options: { access: 'public', isNew: false, npmToken: 'token' },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'next-ts',
    description: 'should update a private Next.js app with TypeScript',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
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

describe.each(testScenarios)('$description', ({ appName, options, setup }) => {
  const { afterTest, beforeTest, testDir } = setupTest(appName)

  let templateVariables: TemplateVariables | undefined

  beforeAll(async () => {
    await beforeTest()

    templateVariables = {
      APP_NAME: appName,
      PACKAGE_MANAGER,
      PACKAGE_MANAGER_VERSION: 'la.te.st',
      NODE_VERSION,
      USER_NAME,
      USER_MAIL,
      USER_SITE,
      YEAR: new Date().getFullYear(),
    }

    return setup(testDir, appName, options)
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

    assert(isString(templatePkg.author) && isString(filePkg.author))
    expectCompiledTemplate(templatePkg.author, filePkg.author, templateVariables)

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

    expect(filePkg.name).toBe(appName)

    expect(filePkg.packageManager).toBe(`${PACKAGE_MANAGER}@la.te.st`)

    expect(filePkg.prettier).toBe(templatePkg.prettier)

    expect(filePkg.private).toBe(options.access === 'private' ? true : undefined)

    expect(filePkg.publishConfig).toEqual(options.access === 'private' ? undefined : templatePkg.publishConfig)

    assert(isRepositoryObject(templatePkg.repository) && isRepositoryObject(filePkg.repository))
    expectCompiledTemplate(templatePkg.repository.url, filePkg.repository.url, templateVariables)

    expect(filePkg.repository.type).toBe(templatePkg.repository.type)

    if (filePkg.dependencies && Object.keys(filePkg.dependencies).includes('next')) {
      expect(filePkg.scripts?.['lint']).toBe(templatePkg.scripts?.['lint']?.replace('eslint .', 'next lint -d .'))
    } else {
      expect(filePkg.scripts?.['lint']).toBe(templatePkg.scripts?.['lint'])
    }

    expect(filePkg.scripts?.['prepublishOnly']).toBe(
      options.access === 'public' ? templatePkg.scripts?.['prepublishOnly'] : undefined
    )

    expect(filePkg.sideEffects).toBe(templatePkg.sideEffects)

    expect(filePkg.type).toBe(fixturePkg.type ? fixturePkg.type : fixturePkg.name ? undefined : templatePkg.type)

    expect(filePkg.version).toBe(templatePkg.version)
  })

  test('should add the readme file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'README.md')

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should install dependencies, optionally setup the npm automation access token, and prettify the app', async () => {
    const spawnMock = vi.mocked(spawn)

    const hasNpmToken = options.npmToken && options.npmToken.length > 0

    expect(spawnMock).toHaveBeenCalledTimes((options.isNew ? 5 : 6) + (hasNpmToken ? 1 : 0))

    let callIndex = 0

    if (hasNpmToken) {
      expect(spawnMock.mock.calls[0]?.[0]).toBe('gh')
      expect(spawnMock.mock.calls[0]?.[1]).toEqual([
        'secret',
        'set',
        'NPM_TOKEN',
        '-R',
        `${USER_NAME}/${appName}`,
        '-b',
        options.npmToken,
      ])

      callIndex++
    }

    expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(PACKAGE_MANAGER)
    expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['install'])

    callIndex++

    expect(spawnMock.mock.calls[callIndex]?.[0]).toBe('git')
    expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['rev-parse', '--is-inside-work-tree'])

    callIndex++

    expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(PACKAGE_MANAGER)
    expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['exec', 'husky', 'install'])

    callIndex++

    expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(PACKAGE_MANAGER_EXECUTE)
    expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['husky', 'add', '.husky/pre-commit', 'pnpx lint-staged'])

    callIndex++

    if (!options.isNew) {
      expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(PACKAGE_MANAGER)
      expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['exec', 'eslint', '.', '--fix'])

      callIndex++
    }

    expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(PACKAGE_MANAGER)
    expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(['exec', 'prettier', '-w', '--loglevel', 'silent', '.'])

    spawnMock.mockClear()
  })

  test('should add or update the tsconfig.json file', async () => {
    const { file, fixture } = await getTestContent(testDir, appName, 'tsconfig.json')

    const fileTsConfig = parseTsConfig(file)
    const fixtureTsConfig = parseTsConfig(fixture ?? '{}')

    expect(fileTsConfig.extends).toBe('@hideoo/tsconfig')

    let expectedCompilerOptions = 0

    if (fixtureTsConfig.compilerOptions?.noEmit) {
      expectedCompilerOptions += 1
    }

    if (fixtureTsConfig.compilerOptions?.target) {
      expectedCompilerOptions += 1
    }

    expect(Object.keys(fileTsConfig.compilerOptions ?? {}).length).toBe(expectedCompilerOptions)

    expect(fileTsConfig.compilerOptions?.noEmit).toBe(fixtureTsConfig.compilerOptions?.noEmit)
    expect(fileTsConfig.compilerOptions?.target).toBe(fixtureTsConfig.compilerOptions?.target)
  })

  test('should add or update the .eslintrc.json file', async () => {
    const { file, fixture } = await getTestContent(testDir, appName, '.eslintrc.json')

    const fileEsLintConfig = parseEsLintConfig(file)
    const fixtureEsLintConfig = parseEsLintConfig(fixture ?? '{}')

    expect(Object.keys(fileEsLintConfig).length).toBe(1)
    expect(fileEsLintConfig.extends).toEqual(expect.arrayContaining(['@hideoo']))

    if (fixtureEsLintConfig.extends) {
      expect(fileEsLintConfig.extends).toEqual(expect.arrayContaining([fixtureEsLintConfig.extends]))
    }
  })

  test('should add the .prettierignore file', async () => {
    const { file, template } = await getTestContent(testDir, appName, '.prettierignore')

    expect(file).toBe(template)
  })

  test('should add the .gitignore file', async () => {
    const { file, template } = await getTestContent(testDir, appName, '.gitignore')

    expect(file).toBe(template)
  })

  test('should add the integration workflow', async () => {
    const { file, template } = await getTestContent(testDir, appName, '.github/workflows/integration.yml')

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should only add the release workflow to public app', async () => {
    const fileName = '.github/workflows/release.yml'

    if (options.access === 'private') {
      const testDirPaths = await getTestDirPaths(testDir)

      expect(testDirPaths).not.toContain(`/${fileName}`)
    } else {
      const { file, template } = await getTestContent(testDir, appName, fileName)

      expectCompiledTemplate(template, file, templateVariables)
    }
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

  expect(Object.keys(newDeps)).toEqual(expect.arrayContaining(Object.keys(oldDeps)))
}

function expectCompiledTemplate(template: string, content: string, variables: TemplateVariables | undefined) {
  expect(
    template.replaceAll(/\[\[(\w+)]]/g, (_match, variable: keyof TemplateVariables) => {
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
  options: AppOptions
  setup: (testDir: string, appName: string, options: AppOptions) => Promise<void>
}
