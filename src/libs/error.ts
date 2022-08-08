export function errorWithCause(message: string, cause: unknown) {
  const error = new Error(message)

  if (cause instanceof Error) {
    error.cause = cause
  }

  return error
}

export class UserAbortError extends Error {
  constructor() {
    super()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
