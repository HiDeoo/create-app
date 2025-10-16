import { green, yellow } from 'kolorist'

import { type AppOptions, createApp, updateApp } from './app'
import { cwdContainsPkg } from './libs/pkg'
import { logError, logMessage, logStep, promptForDirectory, promptForName, promptForYesNo } from './libs/prompt'

async function run() {
  const options: AppOptions = { access: 'private', isNew: false }

  const pkgName = await cwdContainsPkg()

  let name: string | undefined
  let path: string | undefined

  if (pkgName) {
    logStep(`Found 'package.json' in the current directory, the app '${pkgName}' will be updated…`)

    name = pkgName
    path = process.cwd()
  } else {
    options.isNew = true

    name = await promptForName()
    path = await promptForDirectory(name)
  }

  options.access = (await promptForYesNo('Public npm package?')) ? 'public' : 'private'

  const builder = pkgName ? updateApp : createApp
  await builder(name, path, options)

  logStep(green('Done!'))

  if (options.access === 'public') {
    logMessage(`\n${yellow('Do not forget to give repository access to the changeset-bot.')}`)
  }
}

run().catch((error: unknown) => {
  logError(error)

  process.exit(1)
})
