export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

export class ConsoleLogger implements Logger {
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] INFO: ${message}${metaStr}`);
  }

  warn(message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.warn(`[${timestamp}] WARN: ${message}${metaStr}`);
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const errorStr = error ? ` ${error.stack || error.message}` : '';
    console.error(`[${timestamp}] ERROR: ${message}${metaStr}${errorStr}`);
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console.debug(`[${timestamp}] DEBUG: ${message}${metaStr}`);
    }
  }
}

export const logger: Logger = new ConsoleLogger();
