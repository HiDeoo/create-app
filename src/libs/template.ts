import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import glob from 'tiny-glob'

// A set of templates which will not be automatically processed and requires special handling.
const specialTemplates = new Set(['package.json'])

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

export async function compileTemplate(content: string, data: Record<string, string | number>) {
  const compiledContent = content.replaceAll(/{{(\w+)}}/g, (_match, variable) => {
    return data[variable] ?? variable
  })

  return compiledContent
}

function getTemplatesPath() {
  const dirName = path.dirname(fileURLToPath(import.meta.url))

  return path.join(dirName, /src\/libs$/.test(dirName) ? '../..' : '..', 'templates')
}

interface Template {
  destination: string
  source: string
}
