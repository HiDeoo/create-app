import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import glob from 'tiny-glob'
import { MockAgent, setGlobalDispatcher } from 'undici'
import { vi } from 'vitest'

import { JSDELIVR_URL } from '../src/libs/jsdelivr'
import * as prompt from '../src/libs/prompt'

export function setupTest(testName: string) {
  const testDir = path.join(os.tmpdir(), crypto.randomUUID(), testName)

  let mockAgent: MockAgent | undefined

  const logStepSpy = vi.spyOn(prompt, 'logStep').mockReturnValue()
  const confirmationPromptSpy = vi.spyOn(prompt, 'promptForConfirmation').mockResolvedValue()
  const logStepWithProgressSpy = vi
    .spyOn(prompt, 'logStepWithProgress')
    .mockReturnValue({ addDetails: vi.fn(), removeDetails: vi.fn() })

  async function beforeTest() {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2020, 1, 1, 12, 0, 0))

    mockAgent = new MockAgent()
    setGlobalDispatcher(mockAgent)
    mockAgent.disableNetConnect()

    const mockPool = mockAgent.get(JSDELIVR_URL)

    mockPool
      .intercept({ path: () => true })
      .reply(200, (opts) => {
        if (opts.path === '/npm/@hideoo/tsconfig/tsconfig.json') {
          // This is just an excerpt of the real tsconfig.json file used to test config merging.
          return {
            $schema: 'https://json.schemastore.org/tsconfig',
            compilerOptions: {
              target: 'ESNext',
            },
          }
        }

        return { version: 'la.te.st' }
      })
      .persist()

    await fs.mkdir(testDir, { recursive: true })

    try {
      await fs.cp(`fixtures/${testName}`, testDir, { recursive: true })
    } catch {
      return
    }
  }

  async function afterTest() {
    logStepSpy.mockClear()
    confirmationPromptSpy.mockClear()
    logStepWithProgressSpy.mockClear()

    vi.useRealTimers()

    if (mockAgent) {
      await mockAgent.close()
    }

    return fs.rm(testDir, { recursive: true })
  }

  return { afterTest, beforeTest, testDir }
}

export async function getTestDirPaths(testDir: string) {
  const testDirPaths = await glob('**/*', { cwd: testDir, absolute: true, dot: true, filesOnly: true })

  return testDirPaths.map((testDirPath) => testDirPath.replace(testDir, ''))
}

export async function getExpectedPaths() {
  const expectedPaths = await glob('templates/**/*', { absolute: true, filesOnly: true })

  return expectedPaths.map((expectedPath) => expectedPath.replace(path.join(__dirname, '../templates'), ''))
}

export async function getTestContent(
  testDir: string,
  appName: string,
  filePath: string | { file: string; template: string },
) {
  const resolvedFilePath = typeof filePath === 'string' ? filePath : filePath.file
  const resolvedTemplatePath = typeof filePath === 'string' ? filePath : filePath.template

  const file = await fs.readFile(path.join(testDir, resolvedFilePath), { encoding: 'utf8' })

  let fixture: string | undefined
  let template = ''

  try {
    template = await fs.readFile(path.join('templates', resolvedTemplatePath), { encoding: 'utf8' })
  } catch {
    //
  }

  try {
    fixture = await fs.readFile(path.join('fixtures', appName, resolvedFilePath), { encoding: 'utf8' })
  } catch {
    //
  }

  return { file, fixture, template }
}
