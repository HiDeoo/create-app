import { green } from 'kolorist'

import { type AppOptions, createApp, updateApp } from './app'
import { openNewNpmTokenPage } from './libs/npm'
import { cwdContainsPkg } from './libs/pkg'
import { logError, logStep, promptForDirectory, promptForName, promptForToken, promptForYesNo } from './libs/prompt'

async function run() {
  try {
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

    options.access = (await promptForYesNo(
      'Public app? (if public, a page to create an automation access token will automatically be opened)'
    ))
      ? 'public'
      : 'private'

    if (options.access === 'public') {
      openNewNpmTokenPage()

      const npmToken = await promptForToken('Npm automation access token: (Enter nothing to skip)')

      if (npmToken.length > 0) {
        options.npmToken = npmToken
      }
    }

    const builder = pkgName ? updateApp : createApp
    await builder(name, path, options)

    logStep(green('Done!'))
  } catch (error) {
    logError(error)

    process.exit(1)
  }
}

run()
