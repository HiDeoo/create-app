export function errorWithCause(message: string, cause: unknown) {
  const error = new Error(message)

  if (cause instanceof Error) {
    error.cause = cause
  }

  return error
}
