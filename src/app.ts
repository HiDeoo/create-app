import fs from 'node:fs/promises'
import path from 'node:path'

import { compileTemplate, getTemplatePaths } from './libs/template'

export function updateApp() {
  return bootstrapApp()
}

export async function createApp(_appName: string, appPath: string) {
  await fs.mkdir(appPath, { recursive: true })

  return bootstrapApp(appPath)
}

async function bootstrapApp(appPath = process.cwd()) {
  await copyTemplates(appPath)
}

async function copyTemplates(appPath: string) {
  const templatePaths = await getTemplatePaths()

  const templateVariables = { YEAR: new Date().getFullYear() }

  return Promise.all(
    templatePaths.map(async ({ destination, source }) => {
      const content = await compileTemplate(source, templateVariables)

      return fs.writeFile(path.join(appPath, destination), content, { encoding: 'utf8' })
    })
  )
}
