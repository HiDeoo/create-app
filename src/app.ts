import fs from 'node:fs/promises'
import path from 'node:path'

import { NPM_REGISTRY_URL, NPM_RELEASE_STEP, USER_NAME } from './config'
import { mergeEsLintConfigs, parseEsLintConfig } from './libs/eslint'
import { initGitRepository, isGitRepository, stageFiles } from './libs/git'
import {
  addRepositorySecret,
  isGitHubRepository,
  type RepositoryIdentifier,
  updateRepositorySetting,
} from './libs/github'
import { mergePkgs, parsePkg, pinPkgDependenciesToLatest, setPkgAccess, sortPkg } from './libs/pkg'
import { executePackageManagerCommand, installDependencies, runPackageManagerCommand } from './libs/pm'
import { logStep, logStepWithProgress, promptForConfirmation } from './libs/prompt'
import {
  compileTemplate,
  getTemplateContent,
  getTemplatePath,
  getTemplatePaths,
  setTemplateVariables,
  type UserDefinedTemplateVariables,
} from './libs/template'
import { mergeTsConfigs, parseTsConfig, sortTsConfig } from './libs/typescript'

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
  await setupGitRepository(appPath)

  await copyTemplates(appName, appPath, options.access)
  await copyPkg(appPath, options.access)
  await copyTsConfig(appPath)
  await copyEsLintConfig(appPath)

  await install(appPath)

  await addGitHooks(appPath)
  await prettify(appPath, options.isNew)

  await updateGitHubRepositorySettings(appName)
  await addGitHubRepositorySecrets(appName, options.access, options.npmToken)

  await stageBootstrapFiles(appPath)
}

async function setupGitRepository(appPath: string) {
  const isGitRepo = await isGitRepository(appPath)

  if (!isGitRepo) {
    logStepWithProgress('Baking Git repository???')

    await initGitRepository(appPath)
  }
}

async function copyTemplates(appName: string, appPath: string, access: AppOptions['access']) {
  logStepWithProgress('Copying templates???')

  setTemplateVariables(getUserDefinedTemplateVariables(appName, access))

  const templatePaths = await getTemplatePaths()

  return Promise.all(
    templatePaths.map(async ({ destination, source }) => {
      const templateContent = await getTemplateContent(source)
      const compiledTemplate = await compileTemplate(templateContent)

      return writeAppFile(appPath, destination, compiledTemplate)
    })
  )
}

async function copyPkg(appPath: string, access: AppOptions['access']) {
  const fileName = 'package.json'

  logStepWithProgress(`Brewing ${fileName}???`)

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templatePkg = parsePkg(template)
  const existingPkg = parsePkg(existing)

  let pkg = mergePkgs(existingPkg, templatePkg)
  pkg = await pinPkgDependenciesToLatest(pkg)
  pkg = setPkgAccess(pkg, access)
  pkg = sortPkg(pkg)

  const compiledPkg = await compileTemplate(JSON.stringify(pkg, null, 2))

  return writeAppFile(appPath, fileName, compiledPkg)
}

async function copyTsConfig(appPath: string) {
  logStepWithProgress('Configuring TypeScript???')

  const fileName = 'tsconfig.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templateTsConfig = parseTsConfig(template)
  const existingTsConfig = parseTsConfig(existing)

  let tsConfig = mergeTsConfigs(existingTsConfig, templateTsConfig)
  tsConfig = sortTsConfig(tsConfig)

  return writeAppJsonFile(appPath, fileName, tsConfig)
}

async function copyEsLintConfig(appPath: string) {
  logStepWithProgress('Setting up ESLint???')

  const fileName = '.eslintrc.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templateEsLintConfig = parseEsLintConfig(template)
  const existingEsLintConfig = parseEsLintConfig(existing)

  const esLintConfig = mergeEsLintConfigs(existingEsLintConfig, templateEsLintConfig)

  return writeAppJsonFile(appPath, fileName, esLintConfig)
}

async function install(appPath: string) {
  logStep('Preparing dependencies???\n')

  await installDependencies(appPath)
}

async function addGitHooks(appPath: string) {
  logStepWithProgress('Configuring Git hooks???', true)

  return executePackageManagerCommand(appPath, ['husky', 'add', '.husky/pre-commit', 'pnpx lint-staged'], true)
}

async function prettify(appPath: string, isNew: boolean) {
  logStepWithProgress('Prettifying application???')

  if (!isNew) {
    await runPackageManagerCommand(appPath, ['eslint', '.', '--fix'])
  }

  return runPackageManagerCommand(appPath, ['prettier', '-w', '--loglevel', 'silent', '.'])
}

async function updateGitHubRepositorySettings(appName: string) {
  const repoIdentifier = `${USER_NAME}/${appName}` satisfies RepositoryIdentifier

  const shouldUpdateSettings = await isGitHubRepository(repoIdentifier)

  if (!shouldUpdateSettings) {
    return
  }

  logStepWithProgress('Updating GitHub repository settings???')

  await updateRepositorySetting(repoIdentifier, 'delete_branch_on_merge', true)
}

async function addGitHubRepositorySecrets(
  appName: string,
  access: AppOptions['access'],
  npmToken: AppOptions['npmToken']
) {
  if (access !== 'public' || !npmToken || npmToken.length === 0) {
    return
  }

  logStepWithProgress('Adding GitHub repository secrets???')

  await addRepositorySecret(`${USER_NAME}/${appName}`, 'NPM_TOKEN', npmToken)
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

function getUserDefinedTemplateVariables(appName: string, access: AppOptions['access']): UserDefinedTemplateVariables {
  return {
    APP_NAME: appName,
    RELEASE_REGISTRY_URL: access === 'public' ? `registry-url: '${NPM_REGISTRY_URL}'` : '',
    RELEASE_STEP: access === 'public' ? NPM_RELEASE_STEP : '',
  }
}

async function stageBootstrapFiles(appPath: string) {
  logStepWithProgress('Tying up a few loose ends???')

  const templatePaths = await getTemplatePaths(false)

  const filesToStage = templatePaths.map(({ destination }) => destination)
  filesToStage.push('.husky/pre-commit', 'pnpm-lock.yaml')

  await stageFiles(appPath, filesToStage)
}

export interface AppOptions {
  access: 'private' | 'public'
  isNew: boolean
  npmToken?: string
}
