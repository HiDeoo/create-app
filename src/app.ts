import fs from 'node:fs/promises'
import path from 'node:path'

import { USER_NAME } from './config'
import { mergeEsLintConfigs, parseEsLintConfig } from './libs/eslint'
import { initGitRepository, isGitRepository } from './libs/git'
import { addRepositorySecret } from './libs/github'
import { mergePkgs, parsePkg, pinPkgDependenciesToLatest, setPkgAccess } from './libs/npm'
import { executePackageManagerCommand, installDependencies, runPackageManagerCommand } from './libs/pm'
import { logStep, logStepWithProgress, promptForConfirmation } from './libs/prompt'
import { compileTemplate, getTemplateContent, getTemplatePath, getTemplatePaths } from './libs/template'
import { mergeTsConfigs, parseTsConfig } from './libs/typescript'

export async function updateApp(appName: string, appPath: string, options: AppOptions) {
  await promptForConfirmation('Update the application?')

  return bootstrapApp(appName, appPath, options)
}

export async function createApp(appName: string, appPath: string, options: AppOptions) {
  await promptForConfirmation('Create the application?')

  await fs.mkdir(appPath, { recursive: true })

  return bootstrapApp(appName, appPath, options)
}

async function bootstrapApp(appName: string, appPath: string, options: AppOptions) {
  await copyTemplates(appName, appPath)
  await copyPkg(appName, appPath, options.access)
  await copyTsConfig(appPath)
  await copyEsLintConfig(appPath)

  if (options.access === 'public') {
    await setupReleaseWorkflow(appName, appPath, options.npmToken)
  }

  await install(appPath)
  await addGitHooks(appPath)
  await prettify(appPath, options.isNew)
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

async function copyPkg(appName: string, appPath: string, access: AppOptions['access']) {
  const fileName = 'package.json'

  logStepWithProgress(`Brewing ${fileName}…`)

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templatePkg = parsePkg(template)
  const existingPkg = parsePkg(existing)

  let pkg = mergePkgs(existingPkg, templatePkg)
  pkg = await pinPkgDependenciesToLatest(pkg)
  pkg = setPkgAccess(pkg, access)

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

  return writeAppJsonFile(appPath, fileName, tsConfig)
}

async function copyEsLintConfig(appPath: string) {
  logStepWithProgress('Setting up ESLint…')

  const fileName = '.eslintrc.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templateEsLintConfig = parseEsLintConfig(template)
  const existingEsLintConfig = parseEsLintConfig(existing)

  const esLintConfig = mergeEsLintConfigs(existingEsLintConfig, templateEsLintConfig)

  return writeAppJsonFile(appPath, fileName, esLintConfig)
}

async function setupReleaseWorkflow(appName: string, appPath: string, npmToken: AppOptions['npmToken']) {
  const fileName = '.github/workflows/release.yml'

  logStepWithProgress('Configuring release workflow…')

  const template = await getTemplateContent(getTemplatePath(fileName))
  const compiledTemplate = await compileTemplate(appPath, template)

  await writeAppFile(appPath, fileName, compiledTemplate)

  if (npmToken && npmToken.length > 0) {
    await addRepositorySecret(`${USER_NAME}/${appName}`, 'NPM_TOKEN', npmToken)
  }
}

async function install(appPath: string) {
  logStep('Preparing dependencies…\n')

  await installDependencies(appPath)
}

async function addGitHooks(appPath: string) {
  logStepWithProgress('Configuring Git hooks…', true)

  const isGitRepo = await isGitRepository(appPath)

  if (!isGitRepo) {
    await initGitRepository(appPath)
  }

  await runPackageManagerCommand(appPath, ['husky', 'install'], true)

  return executePackageManagerCommand(appPath, ['husky', 'add', '.husky/pre-commit', 'pnpx lint-staged'], true)
}

async function prettify(appPath: string, isNew: boolean) {
  logStepWithProgress('Prettifying application…')

  if (!isNew) {
    await runPackageManagerCommand(appPath, ['eslint', '.', '--fix'])
  }

  return runPackageManagerCommand(appPath, ['prettier', '-w', '--loglevel', 'silent', '.'])
}

async function readAppFile(appPath: string, filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path.join(appPath, filePath), { encoding: 'utf8' })
  } catch {
    return
  }
}

async function writeAppFile(appPath: string, filePath: string, data: string) {
  const absolutePath = path.join(appPath, filePath)

  await ensureDirectory(path.dirname(absolutePath))

  return fs.writeFile(absolutePath, data)
}

function writeAppJsonFile(appPath: string, filePath: string, data: unknown) {
  return writeAppFile(appPath, filePath, JSON.stringify(data, null, 2))
}

function ensureDirectory(dirPath: string) {
  return fs.mkdir(dirPath, { recursive: true })
}

export interface AppOptions {
  access: 'private' | 'public'
  isNew: boolean
  npmToken?: string
}
