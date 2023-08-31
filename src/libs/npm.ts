import open from 'open'

import { USER_NAME } from '../config'

export function openNewNpmTokenPage() {
  open(`https://www.npmjs.com/settings/${USER_NAME.toLowerCase()}/tokens/new`).catch((error) => {
    throw error
  })
}
