import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import glob from 'tiny-glob'

// A set of templates which will not be automatically processed and requires special handling.
const specialTemplates = new Set(['package.json'])

const templateVariables = ['APP_NAME', 'YEAR'] as const

export async function getTemplatePaths() {
  const templatePath = getTemplatesPath()

  const allTemplatePaths = await glob(path.join(templatePath, '**/*'), { absolute: true, filesOnly: true })

  const templates: Template[] = []

  for (const absolutePath of allTemplatePaths) {
    const template = {
      destination: absolutePath.replace(`${templatePath}/`, ''),
      source: absolutePath,
    }

    if (specialTemplates.has(template.destination)) {
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

export async function compileTemplate(appName: string, content: string) {
  const templateVariables = getTemplateVariables(appName)

  const compiledContent = content.replaceAll(/{{(\w+)}}/g, (_match, variable) => {
    if (!isValidTemplateVariable(variable)) {
      throw new Error(`Invalid template variable '${variable}'`)
    }

    return templateVariables[variable].toString()
  })

  return compiledContent
}

function getTemplatesPath() {
  const dirName = path.dirname(fileURLToPath(import.meta.url))

  return path.join(dirName, /src\/libs$/.test(dirName) ? '../..' : '..', 'templates')
}

function isValidTemplateVariable(variable: string): variable is keyof TemplateVariables {
  return templateVariables.includes(variable as typeof templateVariables[number])
}

function getTemplateVariables(appName: string): TemplateVariables {
  return {
    APP_NAME: appName,
    YEAR: new Date().getFullYear(),
  }
}

interface Template {
  destination: string
  source: string
}

export type TemplateVariables = {
  [key in typeof templateVariables[number]]: string | number
}
