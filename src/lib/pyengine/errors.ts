/**
 * MathXplore Python Engine - the runtime error type.
 *
 * Lives in its own module so the builtin libraries (geometry, turtle) can throw
 * it without importing the interpreter that imports them.
 */
export class PyRuntimeError extends Error {
  constructor(
    message: string,
    readonly line: number,
    /** Python's own name for this error, shown as a secondary label. */
    readonly errorType = 'Error',
  ) {
    super(message);
    this.name = 'PyRuntimeError';
  }
}
