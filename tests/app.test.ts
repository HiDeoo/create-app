import { spawn } from 'node:child_process'
import path from 'node:path'

import type { PackageJson } from 'type-fest'
import * as undici from 'undici'
import { afterAll, assert, beforeAll, describe, expect, test, vi } from 'vitest'

import { type AppOptions, createApp, updateApp } from '../src/app'
import {
  NODE_VERSION,
  NPM_PROVENANCE_PERMISSION,
  NPM_REGISTRY_URL,
  NPM_RELEASE_STEP,
  PACKAGE_MANAGER,
  PKG_INVALID_DEPENDENCIES,
  PKG_KEYS_ORDER,
  USER_MAIL,
  USER_NAME,
  USER_SITE,
} from '../src/config'
import { UNSUPPORTED_ESLINT_CONFIG_FILENAMES } from '../src/libs/eslint'
import { getPkgTsConfig } from '../src/libs/jsdelivr'
import { parsePkg } from '../src/libs/pkg'
import { getPackageManagerBinary } from '../src/libs/pm'
import type { TemplateVariables } from '../src/libs/template'
import { parseTsConfig, PRESERVED_TS_COMPILER_OPTIONS } from '../src/libs/typescript'

import { getExpectedPaths, getTestDirPaths, getTestContent, setupTest } from './utils'

vi.mock('undici', async () => {
  const mod = await vi.importActual<typeof import('undici')>('undici')

  return {
    ...mod,
  }
})

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
    appName: 'vite-react-ts-swc',
    description: 'should update a private Vite app with React & TypeScript & SWC',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'vite-react-ts-swc',
    description: 'should update a public Vite app with React & TypeScript & SWC',
    options: { access: 'public', isNew: false, npmToken: 'token' },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'vite-preact-ts',
    description: 'should update a private Vite app with Preact & TypeScript',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'vite-preact-ts',
    description: 'should update a public Vite app with Preact & TypeScript',
    options: { access: 'public', isNew: false, npmToken: 'token' },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'next-ts-pages',
    description: 'should update a private Next.js app with TypeScript using the Pages Router',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
  {
    appName: 'next-ts-app',
    description: 'should update a private Next.js app with TypeScript using the App Router',
    options: { access: 'private', isNew: false },
    setup: (testDir, appName, options) => updateApp(appName, testDir, options),
  },
]

vi.mock('node:child_process', async () => {
  const mod = await vi.importActual<typeof import('node:child_process')>('node:child_process')

  return {
    ...mod,
    spawn: vi.fn().mockReturnValue({
      on: vi.fn().mockImplementation((event: string, listener: (code: number | null) => void) => {
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

  const fetchSpy = vi.spyOn(undici, 'fetch')

  beforeAll(async () => {
    await beforeTest()

    templateVariables = {
      APP_NAME: appName,
      PACKAGE_MANAGER,
      PACKAGE_MANAGER_VERSION: 'la.te.st',
      NODE_VERSION,
      RELEASE_PERMISSIONS: options.access === 'public' ? NPM_PROVENANCE_PERMISSION : '',
      RELEASE_REGISTRY_URL: options.access === 'public' ? `registry-url: '${NPM_REGISTRY_URL}'` : '',
      RELEASE_STEP: options.access === 'public' ? NPM_RELEASE_STEP : '',
      USER_NAME,
      USER_MAIL,
      USER_SITE,
      YEAR: new Date().getFullYear(),
    }

    return setup(testDir, appName, options)
  })

  afterAll(async () => {
    fetchSpy.mockRestore()

    await afterTest()
  })

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

    expectDependenciesToLatest(filePkg.dependencies)
    expectPersistedDependencies(fixturePkg.dependencies, filePkg.dependencies, ['typescript'])

    expectDependenciesToLatest(filePkg.devDependencies)
    expectPersistedDependencies(fixturePkg.devDependencies, filePkg.devDependencies)

    assert(templatePkg.engines?.['node'] && filePkg.engines?.['node'])
    expectCompiledTemplate(templatePkg.engines['node'], filePkg.engines['node'], templateVariables)

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
      options.access === 'public' ? templatePkg.scripts?.['prepublishOnly'] : undefined,
    )

    expect(filePkg.sideEffects).toBe(templatePkg.sideEffects)

    expect(filePkg.type).toBe(fixturePkg.type ?? (fixturePkg.name ? undefined : templatePkg.type))

    expect(filePkg.version).toBe(templatePkg.version)
  })

  test('should properly order the package.json file keys', async () => {
    const { file } = await getTestContent(testDir, appName, 'package.json')

    const fileKeys = Object.keys(parsePkg(file))
    const knownKeysOrder = PKG_KEYS_ORDER.filter((key) => fileKeys.includes(key))

    expect(fileKeys).toEqual(knownKeysOrder)
  })

  test('should respect the template order for package.json scripts', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'package.json')

    const fileScripts = parsePkg(file).scripts
    assert(fileScripts, 'package.json should have scripts.')

    const templateScripts = parsePkg(template).scripts
    assert(templateScripts, 'package.json template should have scripts.')

    expect(Object.keys(fileScripts).filter((key) => templateScripts[key] !== undefined)).toEqual(
      Object.keys(templateScripts).filter((key) => fileScripts[key] !== undefined),
    )
  })

  test('should remove invalid dependencies from package.json', async () => {
    const { file } = await getTestContent(testDir, appName, 'package.json')

    const fileDependencies = parsePkg(file).dependencies

    if (fileDependencies) {
      expect(Object.keys(fileDependencies).every((key) => !PKG_INVALID_DEPENDENCIES.includes(key))).toBe(true)
    }

    const fileDevDependencies = parsePkg(file).devDependencies
    assert(fileDevDependencies, 'package.json should have dev dependencies.')

    expect(Object.keys(fileDevDependencies).every((key) => !PKG_INVALID_DEPENDENCIES.includes(key))).toBe(true)
  })

  test('should never include TypeScript as a regular depdency', async () => {
    const { file } = await getTestContent(testDir, appName, 'package.json')

    const fileDependencies = parsePkg(file).dependencies

    if (fileDependencies) {
      expect(fileDependencies['typescript']).not.toBeDefined()
    }
  })

  test('should add the readme file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'README.md')

    expectCompiledTemplate(template, file, templateVariables)
  })

  describe('should run various commands', () => {
    const spawnMock = vi.mocked(spawn)

    afterAll(() => {
      spawnMock.mockClear()
    })

    let callIndex = 0

    function expectSpawnToHaveBeenNthCalledWith(command: string, args: string[]) {
      expect(spawnMock.mock.calls[callIndex]?.[0]).toBe(command)
      expect(spawnMock.mock.calls[callIndex]?.[1]).toEqual(args)

      callIndex++
    }

    test('should run only necessary commands', () => {
      expect(spawnMock).toHaveBeenCalledTimes(
        7 + (options.isNew ? 0 : 1) + (options.npmToken && options.npmToken.length > 0 ? 1 : 0),
      )
    })

    test('should start by checking if a git repository is already initialized', () => {
      expectSpawnToHaveBeenNthCalledWith('git', ['rev-parse', '--is-inside-work-tree'])
    })

    test('should install dependencies', () => {
      expectSpawnToHaveBeenNthCalledWith(getPackageManagerBinary(), ['install'])
    })

    test('should configure Git hooks', () => {
      expectSpawnToHaveBeenNthCalledWith(getPackageManagerBinary(true), ['husky', 'init'])
    })

    test('should run ESLint when updating an existing app', () => {
      if (!options.isNew) {
        expectSpawnToHaveBeenNthCalledWith(getPackageManagerBinary(), ['exec', 'eslint', '.', '--fix'])
      }
    })

    test('should prettify the app', () => {
      expectSpawnToHaveBeenNthCalledWith(getPackageManagerBinary(), [
        'exec',
        'prettier',
        '-w',
        '--log-level',
        'silent',
        '.',
      ])
    })

    test('should check if the repository exists on GitHub', () => {
      expectSpawnToHaveBeenNthCalledWith('gh', [
        'api',
        '-H',
        'Accept: application/vnd.github+json',
        `/repos/${USER_NAME}/${appName}`,
      ])
    })

    test('should update the GitHub repository settings', () => {
      expectSpawnToHaveBeenNthCalledWith('gh', [
        'api',
        '--method',
        'PATCH',
        '-H',
        'Accept: application/vnd.github+json',
        `/repos/${USER_NAME}/${appName}`,
        '-F',
        'delete_branch_on_merge=true',
        '--silent',
      ])
    })

    test('should setup the npm automation access token if needed', () => {
      if (options.npmToken && options.npmToken.length > 0) {
        expectSpawnToHaveBeenNthCalledWith('gh', [
          'secret',
          'set',
          'NPM_TOKEN',
          '-R',
          `${USER_NAME}/${appName}`,
          '-b',
          options.npmToken,
        ])
      }
    })

    test('should stage new or updated files', () => {
      expectSpawnToHaveBeenNthCalledWith(
        'git',
        [
          'add',
          '.github/workflows/integration.yml',
          '.github/workflows/release.yml',
          '.gitignore',
          '.husky/pre-commit',
          '.prettierignore',
          '.vscode/extensions.json',
          '.vscode/settings.json',
          'LICENSE',
          'README.md',
          'eslint.config.mjs',
          'package.json',
          'pnpm-lock.yaml',
          'tsconfig.json',
        ].map((filePath) => path.normalize(filePath)),
      )
    })

    test('should cache jsdelivr results', () => {
      const jsdelivrRequestRegExp = /https:\/\/cdn.jsdelivr.net\/npm\/(?<pkg>.*)\/package.json$/
      const pkgs = new Set<string>()

      for (const call of fetchSpy.mock.calls) {
        const url = call[0]
        assert(typeof url === 'string', 'Fetch request info is not a valid URL.')

        const matches = jsdelivrRequestRegExp.exec(url)

        if (matches) {
          const pkg = matches.groups?.['pkg']
          assert(typeof pkg === 'string', 'Invalid jsdelivr package name.')

          expect(pkgs.has(pkg)).toBe(false)

          pkgs.add(pkg)
        }
      }
    })
  })

  test('should add or update the tsconfig.json file', async () => {
    const { file, fixture } = await getTestContent(testDir, appName, 'tsconfig.json')

    const fileTsConfig = parseTsConfig(file)
    const fixtureTsConfig = parseTsConfig(fixture ?? '{}')

    expect(fileTsConfig.extends).toBe('@hideoo/tsconfig')

    const inheritedConfig = await getPkgTsConfig('@hideoo/tsconfig')

    let expectedCompilerOptions = 0

    if (fixtureTsConfig.compilerOptions) {
      for (const compilerOption of PRESERVED_TS_COMPILER_OPTIONS) {
        if (
          compilerOption in fixtureTsConfig.compilerOptions &&
          (!inheritedConfig.compilerOptions?.[compilerOption] ||
            fixtureTsConfig.compilerOptions[compilerOption] !== inheritedConfig.compilerOptions[compilerOption])
        ) {
          expectedCompilerOptions += 1
        }
      }
    }

    expect(Object.keys(fileTsConfig.compilerOptions ?? {}).length).toBe(expectedCompilerOptions)

    for (const compilerOption of PRESERVED_TS_COMPILER_OPTIONS) {
      if (
        !inheritedConfig.compilerOptions?.[compilerOption] ||
        fixtureTsConfig.compilerOptions?.[compilerOption] !== inheritedConfig.compilerOptions[compilerOption]
      ) {
        const option = fileTsConfig.compilerOptions?.[compilerOption]

        if (typeof option === 'object') {
          expect(fileTsConfig.compilerOptions?.[compilerOption]).toEqual(
            fixtureTsConfig.compilerOptions?.[compilerOption],
          )
        } else {
          expect(fileTsConfig.compilerOptions?.[compilerOption]).toBe(fixtureTsConfig.compilerOptions?.[compilerOption])
        }
      }
    }
  })

  test('should partially order the tsconfig.json file keys', async () => {
    const { file } = await getTestContent(testDir, appName, 'tsconfig.json')

    const fileKeys = Object.keys(parsePkg(file))

    expect(fileKeys[0]).toBe('extends')

    if (fileKeys[1]) {
      expect(fileKeys[1]).toBe('compilerOptions')
    }
  })

  test('should add the readme file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'README.md')

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should add the eslint.config.mjs file', async () => {
    const { file, template } = await getTestContent(testDir, appName, 'eslint.config.mjs')

    expectCompiledTemplate(template, file, templateVariables)
  })

  test('should delete unsupported ESLint configuration files', async () => {
    for (const fileName of UNSUPPORTED_ESLINT_CONFIG_FILENAMES) {
      await expect(getTestContent(testDir, appName, fileName)).rejects.toThrow()
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

  test('should add the release workflow', async () => {
    const { file, template } = await getTestContent(testDir, appName, '.github/workflows/release.yml')

    expectCompiledTemplate(template, file, templateVariables)
  })
})

function expectDependenciesToLatest(deps?: PackageJson.Dependency) {
  if (!deps) {
    return
  }

  for (const version of Object.values(deps)) {
    expect(version).toBe('^la.te.st')
  }
}

function expectPersistedDependencies(
  oldDeps?: PackageJson.Dependency,
  newDeps?: PackageJson.Dependency,
  invalidDeps?: string[],
) {
  if (!oldDeps || !newDeps) {
    return
  }

  expect(Object.keys(newDeps)).toEqual(
    expect.arrayContaining(
      Object.keys(oldDeps).filter((oldDep) => ![...PKG_INVALID_DEPENDENCIES, ...(invalidDeps ?? [])].includes(oldDep)),
    ),
  )
}

function expectCompiledTemplate(template: string, content: string, variables: TemplateVariables | undefined) {
  expect(
    template
      .replaceAll(/\[\[(\w+)]]/g, (_match, variable: keyof TemplateVariables) => {
        if (!variables) {
          throw new Error('No template variables provided.')
        }

        return variables[variable].toString()
      })
      .replaceAll(/(\n\s+)\(\((\w+)\)\)/g, (_match, spacing: string, variable: keyof TemplateVariables) => {
        if (!variables) {
          throw new Error('No template variables provided.')
        }

        const value = variables[variable].toString()

        return value.length === 0 ? '' : `${spacing}${value}`
      }),
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
