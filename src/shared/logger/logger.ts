import type { DiagnosticError } from '../types/diagnostics';
import type { LogLevel } from '../types/settings';
import { redact } from './redaction';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class DiagnosticBuffer {
  private readonly errors: DiagnosticError[] = [];

  constructor(private readonly maxEntries = 50) {}

  add(error: DiagnosticError): void {
    this.errors.push(error);
    if (this.errors.length > this.maxEntries) {
      this.errors.splice(0, this.errors.length - this.maxEntries);
    }
  }

  list(): DiagnosticError[] {
    return structuredClone(this.errors);
  }
}

export class Logger {
  constructor(
    private level: LogLevel = 'warn',
    private readonly diagnostics = new DiagnosticBuffer(),
  ) {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(code: string, message: string, context?: unknown): void {
    const safeMessage = String(redact(message));
    this.diagnostics.add({ code, message: safeMessage, timestamp: Date.now() });
    this.write('error', code, safeMessage, context);
  }

  warn(code: string, message: string, context?: unknown): void {
    this.write('warn', code, message, context);
  }

  info(code: string, message: string, context?: unknown): void {
    this.write('info', code, message, context);
  }

  debug(code: string, message: string, context?: unknown): void {
    this.write('debug', code, message, context);
  }

  getErrors(): DiagnosticError[] {
    return this.diagnostics.list();
  }

  private write(level: LogLevel, code: string, message: string, context?: unknown): void {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) {
      return;
    }

    const payload = context === undefined ? undefined : redact(context);
    const method = level === 'debug' ? 'debug' : level;
    console[method](`[Multi-AI Workspace] ${code}: ${String(redact(message))}`, payload ?? '');
  }
}

export const logger = new Logger('warn');
