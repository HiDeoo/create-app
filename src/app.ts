import fs from 'node:fs/promises'
import path from 'node:path'

import { mergePkgs, parsePkg, pinPkgDependenciesToLatest, setPkgManagerToLatest } from './libs/npm'
import { logStepWithProgress, promptForConfirmation } from './libs/prompt'
import { compileTemplate, getTemplateContent, getTemplatePath, getTemplatePaths } from './libs/template'

export async function updateApp(appName: string, appPath = process.cwd()) {
  await promptForConfirmation('Update the application?')

  return bootstrapApp(appName, appPath)
}

export async function createApp(appName: string, appPath: string) {
  await promptForConfirmation('Create the application?')

  await fs.mkdir(appPath, { recursive: true })

  return bootstrapApp(appName, appPath)
}

async function bootstrapApp(appName: string, appPath: string) {
  await copyTemplates(appPath)
  await copyPkg(appName, appPath)
}

async function copyTemplates(appPath: string) {
  logStepWithProgress('Copying templates…')

  const templatePaths = await getTemplatePaths()

  const templateVariables = { YEAR: new Date().getFullYear() }

  return Promise.all(
    templatePaths.map(async ({ destination, source }) => {
      const templateContent = await getTemplateContent(source)
      const compiledTemplate = await compileTemplate(templateContent, templateVariables)

      return writeAppFile(appPath, destination, compiledTemplate)
    })
  )
}

async function copyPkg(appName: string, appPath: string) {
  logStepWithProgress('Brewing package.json…')

  const fileName = 'package.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templatePkg = parsePkg(template)
  const existingPkg = parsePkg(existing)

  let pkg = mergePkgs(existingPkg, templatePkg)
  pkg = await pinPkgDependenciesToLatest(pkg)
  pkg = await setPkgManagerToLatest(pkg)

  const compiledPkg = await compileTemplate(JSON.stringify(pkg, null, 2), { APP_NAME: appName })
  return writeAppFile(appPath, fileName, compiledPkg)
}

async function readAppFile(appPath: string, filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path.join(appPath, filePath), { encoding: 'utf8' })
  } catch {
    return
  }
}

function writeAppFile(appPath: string, filePath: string, data: string) {
  return fs.writeFile(path.join(appPath, filePath), data)
}
