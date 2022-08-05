import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import glob from 'tiny-glob'

export async function getTemplatePaths() {
  const templatePath = getTemplatesPath()

  const templatePaths = await glob(path.join(templatePath, '**/*'), { absolute: true, filesOnly: true })

  return templatePaths.map((absolutePath) => ({
    destination: absolutePath.replace(templatePath, ''),
    source: absolutePath,
  }))
}

export async function compileTemplate(templatePath: string, data: Record<string, string | number>) {
  let content = await fs.readFile(templatePath, 'utf8')

  content = content.replaceAll(/{{(\w+)}}/g, (_match, variable) => {
    return data[variable] ?? variable
  })

  return content
}

function getTemplatesPath() {
  const dirName = path.dirname(fileURLToPath(import.meta.url))

  return path.join(dirName, /src\/libs$/.test(dirName) ? '../..' : '..', 'templates')
}
