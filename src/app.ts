import fs from 'node:fs/promises'
import path from 'node:path'

import { USER_NAME } from './config'
import { deleteUnsupportedEslintConfigs } from './libs/eslint'
import { initGitRepository, isGitRepository, stageFiles } from './libs/git'
import {
  isGitHubRepository,
  type RepositoryIdentifier,
  updateRepositoryActionPermissions,
  updateRepositorySettings,
  updateRepositoryWorkflowPermissions,
} from './libs/github'
import { mergePkgs, parsePkg, setPkgDependenciesToLatest, setPkgAccess, sortPkg } from './libs/pkg'
import { installDependencies, runPackageManagerCommand } from './libs/pm'
import { logStepWithProgress, promptForConfirmation } from './libs/prompt'
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

  await copyTemplates(appName, appPath)
  await copyPkg(appPath, options.access)
  await copyTsConfig(appPath)
  await copyEslintConfig(appPath)
  await copyReleaseWorkflow(appPath, options.access)
  await copyChangesetsDirectory(appPath, options.access)

  await install(appPath)

  await prettify(appPath, options.isNew)

  await updateGitHubRepositorySettings(appName, options.access)

  await stageBootstrapFiles(appPath, options.access)
}

async function setupGitRepository(appPath: string) {
  const isGitRepo = await isGitRepository(appPath)

  if (!isGitRepo) {
    logStepWithProgress('Baking Git repository…')

    await initGitRepository(appPath)
  }
}

async function copyTemplates(appName: string, appPath: string) {
  logStepWithProgress('Copying templates…')

  await setTemplateVariables(getUserDefinedTemplateVariables(appName))

  const templatePaths = await getTemplatePaths()

  return Promise.all(
    templatePaths.map(async ({ destination, source }) => {
      const templateContent = await getTemplateContent(source)
      const compiledTemplate = compileTemplate(templateContent)

      return writeAppFile(appPath, destination, compiledTemplate)
    }),
  )
}

async function copyPkg(appPath: string, access: AppOptions['access']) {
  const fileName = 'package.json'

  const { addDetails, removeDetails } = logStepWithProgress(`Brewing ${fileName}…`)

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templatePkg = parsePkg(template)
  const existingPkg = parsePkg(existing)

  let pkg = mergePkgs(existingPkg, templatePkg)
  pkg = await setPkgDependenciesToLatest(pkg, (name) => {
    addDetails(name)
  })
  pkg = setPkgAccess(pkg, access)
  pkg = sortPkg(pkg)

  const compiledPkg = compileTemplate(JSON.stringify(pkg, null, 2))

  await writeAppFile(appPath, fileName, compiledPkg)

  removeDetails()
}

async function copyTsConfig(appPath: string) {
  logStepWithProgress('Configuring TypeScript…')

  const fileName = 'tsconfig.json'

  const template = await getTemplateContent(getTemplatePath(fileName))
  const existing = (await readAppFile(appPath, fileName)) ?? '{}'

  const templateTsConfig = parseTsConfig(template)
  const existingTsConfig = parseTsConfig(existing)

  let tsConfig = await mergeTsConfigs(existingTsConfig, templateTsConfig)
  tsConfig = sortTsConfig(tsConfig)

  return writeAppJsonFile(appPath, fileName, tsConfig)
}

async function copyEslintConfig(appPath: string) {
  logStepWithProgress('Setting up ESLint…')

  await deleteUnsupportedEslintConfigs(appPath)

  const fileName = 'eslint.config.mjs'
  const template = await getTemplateContent(getTemplatePath(fileName))

  return writeAppFile(appPath, fileName, template)
}

async function copyReleaseWorkflow(appPath: string, access: AppOptions['access']) {
  logStepWithProgress('Setting up release workflow…')

  const filePath = '.github/workflows/release.yml'
  const templateFilePath = `.github/workflows/release-${access === 'public' ? 'changesets' : 'custom'}.yml`
  const template = await getTemplateContent(getTemplatePath(templateFilePath))
  const compiledTemplate = compileTemplate(template)

  return writeAppFile(appPath, filePath, compiledTemplate)
}

async function copyChangesetsDirectory(appPath: string, access: AppOptions['access']) {
  if (access !== 'public') return

  logStepWithProgress('Setting up Changesets…')

  let filePath = '.changeset/config.json'
  let template = await getTemplateContent(getTemplatePath(filePath))
  const compiledTemplate = compileTemplate(template)

  await writeAppFile(appPath, filePath, compiledTemplate)

  filePath = '.changeset/README.md'
  template = await getTemplateContent(getTemplatePath(filePath))

  return writeAppFile(appPath, filePath, template)
}

async function install(appPath: string) {
  const { addDetails, removeDetails } = logStepWithProgress('Installing dependencies…')

  await installDependencies(appPath, (data) => {
    addDetails(data)
  })

  removeDetails()
}

async function prettify(appPath: string, isNew: boolean) {
  logStepWithProgress('Prettifying application…')

  if (!isNew) {
    await runPackageManagerCommand(appPath, ['eslint', '.', '--fix'])
  }

  return runPackageManagerCommand(appPath, ['prettier', '-w', '--log-level', 'silent', '.'])
}

async function updateGitHubRepositorySettings(appName: string, access: AppOptions['access']) {
  const repoIdentifier = `${USER_NAME}/${appName}` satisfies RepositoryIdentifier

  const shouldUpdateSettings = await isGitHubRepository(repoIdentifier)

  if (!shouldUpdateSettings) {
    return
  }

  logStepWithProgress('Updating GitHub repository settings…')

  await updateRepositorySettings(repoIdentifier, [
    ['delete_branch_on_merge', true],
    ['allow_update_branch', true],
  ])

  if (access === 'public') {
    await updateRepositorySettings(repoIdentifier, [
      ['allow_merge_commit', false],
      ['allow_rebase_merge', false],
    ])
    await updateRepositoryWorkflowPermissions(repoIdentifier, [['can_approve_pull_request_reviews', true]])
    await updateRepositoryActionPermissions(repoIdentifier, [
      ['enabled', true],
      ['allowed_actions', 'all'],
      ['sha_pinning_required', true],
    ])
  }
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

function getUserDefinedTemplateVariables(appName: string): UserDefinedTemplateVariables {
  return {
    APP_NAME: appName,
  }
}

async function stageBootstrapFiles(appPath: string, access: AppOptions['access']) {
  logStepWithProgress('Tying up a few loose ends…')

  const templatePaths = await getTemplatePaths(false)

  const filesToStage = templatePaths
    .filter(({ destination }) => {
      if (destination === '.github/workflows/release-changesets.yml') return false
      if (access !== 'public' && destination.startsWith('.changeset/')) return false

      return true
    })
    .map(({ destination }) => {
      if (destination === '.github/workflows/release-custom.yml') return destination.replace('-custom.yml', '.yml')

      return destination
    })
  filesToStage.push('pnpm-lock.yaml')

  await stageFiles(appPath, filesToStage)
}

export interface AppOptions {
  access: 'private' | 'public'
  isNew: boolean
}
