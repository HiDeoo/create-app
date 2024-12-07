import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import glob from 'tiny-glob'

import { NODE_VERSION, PACKAGE_MANAGER, USER_MAIL, USER_NAME, USER_SITE } from '../config'

import { getPkgManagerLatestVersion } from './pm'

// A set of templates which will not be automatically processed and requires special handling.
const specialTemplates = new Set(['package.json', 'tsconfig.json', 'eslint.config.mjs', '.husky/pre-commit'])

const templateVariableKeys = [
  'APP_NAME',
  'PACKAGE_MANAGER',
  'PACKAGE_MANAGER_VERSION',
  'NODE_VERSION',
  'RELEASE_PERMISSIONS',
  'RELEASE_REGISTRY_URL',
  'RELEASE_STEP',
  'USER_MAIL',
  'USER_NAME',
  'USER_SITE',
  'YEAR',
] as const satisfies readonly TemplateVariableKey[]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const userDefinedTemplateVariableKeys = [
  'APP_NAME',
  'RELEASE_PERMISSIONS',
  'RELEASE_REGISTRY_URL',
  'RELEASE_STEP',
] as const satisfies readonly (typeof templateVariableKeys)[number][]

let templateVariables: TemplateVariables | undefined

export async function getTemplatePaths(ignoreSpecialTemplates = true) {
  const templatePath = getTemplatesPath()

  const allTemplatePaths = await glob('**/*', { cwd: templatePath, absolute: true, dot: true, filesOnly: true })

  const templates: Template[] = []

  for (const absolutePath of allTemplatePaths) {
    const template = {
      destination: absolutePath.replace(`${templatePath}${path.sep}`, ''),
      source: absolutePath,
    }

    if (ignoreSpecialTemplates && specialTemplates.has(template.destination)) {
      continue
    }

    templates.push(template)
  }

  return templates
}

export function getTemplatePath(templateName: string) {
  return path.join(getTemplatesPath(), templateName)
}

export function getTemplateContent(templatePath: string) {
  return fs.readFile(templatePath, { encoding: 'utf8' })
}

export async function setTemplateVariables(variables: UserDefinedTemplateVariables) {
  const latestPmVersion = await getPkgManagerLatestVersion()

  if (!latestPmVersion) {
    throw new Error('Unable to get latest package manager version.')
  }

  templateVariables = {
    APP_NAME: variables.APP_NAME,
    PACKAGE_MANAGER,
    PACKAGE_MANAGER_VERSION: latestPmVersion,
    NODE_VERSION,
    RELEASE_PERMISSIONS: variables.RELEASE_PERMISSIONS,
    RELEASE_REGISTRY_URL: variables.RELEASE_REGISTRY_URL,
    RELEASE_STEP: variables.RELEASE_STEP,
    USER_NAME,
    USER_MAIL,
    USER_SITE,
    YEAR: new Date().getFullYear(),
  }
}

export function compileTemplate(content: string) {
  const templateVariables = getTemplateVariables()

  const compiledContent = content.replaceAll(
    /(?:\[\[(\w+)]])|(?:(\n\s+)\(\((\w+)\)\))/g,
    (_match, variable: string, conditionalSpacing?: string, conditionalVariable?: string) => {
      const isConditional = conditionalSpacing !== undefined && conditionalVariable !== undefined
      const variableName = isConditional ? conditionalVariable : variable

      if (!isValidTemplateVariable(variableName)) {
        throw new Error(`Invalid template variable '${variableName}'`)
      }

      const value = templateVariables[variableName].toString()

      return isConditional ? (value.length === 0 ? '' : `${conditionalSpacing}${value}`) : value
    },
  )

  return compiledContent
}

function getTemplatesPath() {
  const dirName = path.dirname(fileURLToPath(import.meta.url))

  return path.join(dirName, dirName.endsWith(path.join('src', 'libs')) ? '../..' : '..', 'templates')
}

function isValidTemplateVariable(variable: string): variable is keyof TemplateVariables {
  return templateVariableKeys.includes(variable as (typeof templateVariableKeys)[number])
}

function getTemplateVariables(): TemplateVariables {
  if (!templateVariables) {
    throw new Error('Template variables are not defined, you probably forget to call `setTemplateVariables()`.')
  }

  return templateVariables
}

interface Template {
  destination: string
  source: string
}

export type TemplateVariables = Record<(typeof templateVariableKeys)[number], TemplateVariableValue>

export type UserDefinedTemplateVariables = Record<
  (typeof userDefinedTemplateVariableKeys)[number],
  TemplateVariableValue
>

type TemplateVariableKey = string
type TemplateVariableValue = string | number
