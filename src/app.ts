import fs from 'node:fs/promises'
import path from 'node:path'

import { mergePkgs, parsePkg, pinPkgDependenciesToLatest, setPkgManagerToLatest } from './libs/npm'
import { installDependencies } from './libs/pm'
import { logStep, logStepWithProgress, promptForConfirmation } from './libs/prompt'
import { compileTemplate, getTemplateContent, getTemplatePath, getTemplatePaths } from './libs/template'
import { mergeTsConfigs, parseTsConfig } from './libs/typescript'

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
  await copyTemplates(appName, appPath)
  await copyPkg(appName, appPath)
  await copyTsConfig(appPath)

  return install(appPath)
}

async function copyTemplates(appName: string, appPath: string) {
  logStepWithProgress('Copying templates…')

  const templatePaths = await getTemplatePaths()

  return Promise.all(
    templatePaths.map(async ({ destination, source }) => {
      const templateContent = await getTemplateContent(source)
      const compiledTemplate = await compileTemplate(appName, templateContent)

      return writeAppFile(appPath, destination, compiledTemplate)
    })
  )
}

async function copyPkg(appName: string, appPath: string) {
  const fileName = 'package.json'

  logStepWithProgress(`Brewing ${fileName}…`)

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templatePkg = parsePkg(template)
  const existingPkg = parsePkg(existing)

  let pkg = mergePkgs(existingPkg, templatePkg)
  pkg = await pinPkgDependenciesToLatest(pkg)
  pkg = await setPkgManagerToLatest(pkg)

  const compiledPkg = await compileTemplate(appName, JSON.stringify(pkg, null, 2))

  return writeAppFile(appPath, fileName, compiledPkg)
}

async function copyTsConfig(appPath: string) {
  logStepWithProgress('Configuring TypeScript…')

  const fileName = 'tsconfig.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templateTsConfig = parseTsConfig(template)
  const existingTsConfig = parseTsConfig(existing)

  const tsConfig = mergeTsConfigs(existingTsConfig, templateTsConfig)

  return writeAppFile(appPath, fileName, JSON.stringify(tsConfig, null, 2))
}

function install(appPath: string) {
  logStep('Preparing dependencies…\n')

  return installDependencies(appPath)
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
