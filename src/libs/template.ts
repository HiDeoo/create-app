import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import glob from 'tiny-glob'

import { NODE_VERSION, PACKAGE_MANAGER, USER_MAIL, USER_NAME, USER_SITE } from '../config'

import { getPkgManagerLatestVersion } from './pm'

// A set of templates which will not be automatically processed and requires special handling.
const specialTemplates = new Set(['package.json', 'tsconfig.json', '.eslintrc.json'])

const templateVariableKeys = [
  'APP_NAME',
  'PACKAGE_MANAGER',
  'PACKAGE_MANAGER_VERSION',
  'NODE_VERSION',
  'RELEASE_REGISTRY_URL',
  'RELEASE_STEP',
  'USER_MAIL',
  'USER_NAME',
  'USER_SITE',
  'YEAR',
] as const satisfies readonly TemplateVariableKey[]

const userDefinedTemplateVariableKeys = [
  'APP_NAME',
  'RELEASE_REGISTRY_URL',
  'RELEASE_STEP',
] as const satisfies readonly typeof templateVariableKeys[number][]

let userDefinedTemplateVariables: UserDefinedTemplateVariables | undefined

export async function getTemplatePaths(ignoreSpecialTemplates = true) {
  const templatePath = getTemplatesPath()

  const allTemplatePaths = await glob(path.join(templatePath, '**/*'), { absolute: true, dot: true, filesOnly: true })

  const templates: Template[] = []

  for (const absolutePath of allTemplatePaths) {
    const template = {
      destination: absolutePath.replace(`${templatePath}/`, ''),
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

export function setTemplateVariables(variables: UserDefinedTemplateVariables) {
  userDefinedTemplateVariables = variables
}

export async function compileTemplate(content: string) {
  const templateVariables = await getTemplateVariables()

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
    }
  )

  return compiledContent
}

function getTemplatesPath() {
  const dirName = path.dirname(fileURLToPath(import.meta.url))

  return path.join(dirName, dirName.endsWith('src/libs') ? '../..' : '..', 'templates')
}

function isValidTemplateVariable(variable: string): variable is keyof TemplateVariables {
  return templateVariableKeys.includes(variable as typeof templateVariableKeys[number])
}

async function getTemplateVariables(): Promise<TemplateVariables> {
  if (!userDefinedTemplateVariables) {
    throw new Error(
      'User defined template variables are not defined, you probably forget to call `setTemplateVariables()`.'
    )
  }

  const latestPmVersion = await getPkgManagerLatestVersion()

  if (!latestPmVersion) {
    throw new Error('Unable to get latest package manager version.')
  }

  return {
    APP_NAME: userDefinedTemplateVariables.APP_NAME,
    PACKAGE_MANAGER,
    PACKAGE_MANAGER_VERSION: latestPmVersion,
    NODE_VERSION,
    RELEASE_REGISTRY_URL: userDefinedTemplateVariables.RELEASE_REGISTRY_URL,
    RELEASE_STEP: userDefinedTemplateVariables.RELEASE_STEP,
    USER_NAME,
    USER_MAIL,
    USER_SITE,
    YEAR: new Date().getFullYear(),
  }
}

interface Template {
  destination: string
  source: string
}

export type TemplateVariables = {
  [key in typeof templateVariableKeys[number]]: TemplateVariableValue
}

export type UserDefinedTemplateVariables = {
  [key in typeof userDefinedTemplateVariableKeys[number]]: TemplateVariableValue
}

type TemplateVariableKey = string
type TemplateVariableValue = string | number
