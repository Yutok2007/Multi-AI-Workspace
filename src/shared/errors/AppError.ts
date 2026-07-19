export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export class CapabilityUnavailableError extends AppError {
  constructor(capability: string) {
    super(
      'CAPABILITY_UNAVAILABLE',
      `The ${capability} capability is unavailable because this platform DOM has not been validated.`,
    );
    this.name = 'CapabilityUnavailableError';
  }
}
