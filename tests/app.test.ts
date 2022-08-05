import { stripIndents } from 'common-tags'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { createApp } from '../src/app'

import { diffStrings, getExpectedPaths, getTestDirPaths, getTestFileAndTemplateContent, setupTest } from './utils'

const testScenarios: TestScenario[] = [
  {
    appName: 'new-app',
    description: 'should create a new app',
    setup: (testDir, appName) => createApp(appName, testDir),
  },
  {
    appName: 'vite-react-ts',
    description: 'should update a Vite app with React & TypeScript',
    setup: (testDir, appName) => createApp(appName, testDir),
  },
  {
    appName: 'next-ts',
    description: 'should update a Next.js app with TypeScript',
    setup: (testDir, appName) => createApp(appName, testDir),
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

  test('should add the license file and replace the year', async () => {
    const { file, template } = await getTestFileAndTemplateContent(testDir, 'LICENSE')

    expect(diffStrings(template, file)).toMatch(
      stripIndents`
        - Copyright (c) {{YEAR}}-present, HiDeoo
        + Copyright (c) 2020-present, HiDeoo
      `
    )
  })
})

interface TestScenario {
  appName: string
  description: string
  setup: (testDir: string, appName: string) => Promise<void>
}
