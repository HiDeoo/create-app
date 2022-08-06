import { createApp, updateApp } from './app'
import { cwdContainsPkg } from './libs/npm'
import { logError, logStep, logStepWithProgress, promptForDirectory, promptForName } from './libs/prompt'

async function run() {
  try {
    const pkgName = await cwdContainsPkg()

    if (pkgName) {
      logStep(`Found 'package.json' in the current directory, the app '${pkgName}' will be updated…`)

      await updateApp(pkgName)
    } else {
      const name = await promptForName()
      const path = await promptForDirectory(name)

      await createApp(name, path)
    }

    logStepWithProgress('// TODO done').succeed()
  } catch (error) {
    logError(error)

    process.exit(1)
  }
}

run()
