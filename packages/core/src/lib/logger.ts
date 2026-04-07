type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI colour codes for development pretty-printing
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LEVEL_PRIORITY) return env as LogLevel;
  return 'info';
}

const isProduction = process.env.NODE_ENV === 'production';

export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };
    if (error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    this.log('error', message, errorMeta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const minLevel = getMinLevel();
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

    const timestamp = new Date().toISOString();

    if (isProduction) {
      // Structured JSON for log aggregators (Datadog, CloudWatch, etc.)
      const entry: Record<string, unknown> = {
        timestamp,
        level,
        context: this.context,
        message,
        ...meta,
      };
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Human-readable coloured output for local development
      const color = LEVEL_COLORS[level];
      const prefix = `${DIM}${timestamp}${RESET} ${color}${level.toUpperCase().padEnd(5)}${RESET} ${DIM}[${this.context}]${RESET}`;
      const metaStr = meta && Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
      process.stdout.write(`${prefix} ${message}${metaStr}\n`);
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
