import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { diff, type DiffOptions } from 'jest-diff'
import glob from 'tiny-glob'
import { vi } from 'vitest'

const diffColorTransformer = (input: string) => input

const diffOptions: DiffOptions = {
  aColor: diffColorTransformer,
  bColor: diffColorTransformer,
  changeColor: diffColorTransformer,
  commonColor: diffColorTransformer,
  contextLines: 0,
  expand: false,
  omitAnnotationLines: true,
  patchColor: diffColorTransformer,
}

export function setupTest(testName: string) {
  const testDir = path.join(os.tmpdir(), crypto.randomUUID(), testName)

  async function beforeTest() {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2020, 1, 1, 12, 0, 0))

    await fs.mkdir(testDir, { recursive: true })

    try {
      await fs.cp(`fixtures/${testName}`, testDir, { recursive: true })
    } catch {
      return
    }
  }

  function afterTest() {
    vi.useRealTimers()

    return fs.rm(testDir, { recursive: true })
  }

  return { afterTest, beforeTest, testDir }
}

export async function getTestDirPaths(testDir: string) {
  const testDirPaths = await glob(path.join(testDir, '**/*'), { absolute: true, filesOnly: true })

  return testDirPaths.map((testDirPath) => testDirPath.replace(testDir, ''))
}

export async function getExpectedPaths() {
  const expectedPaths = await glob('templates/**/*', { absolute: true, filesOnly: true })

  return expectedPaths.map((expectedPath) => expectedPath.replace(path.join(__dirname, '../templates'), ''))
}

export async function getTestFileAndTemplateContent(testDir: string, filePath: string) {
  const file = await fs.readFile(path.join(testDir, filePath), 'utf8')
  const template = await fs.readFile(path.join('templates', filePath), 'utf8')

  return { template, file }
}

export function diffStrings(left: string, right: string) {
  return diff(left, right, diffOptions)?.replaceAll(/^@@.*\n/gm, '')
}
