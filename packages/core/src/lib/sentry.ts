/**
 * Sentry integration wrapper.
 *
 * All functions are safe no-ops when SENTRY_DSN is not configured, so this
 * module can be imported unconditionally without crashing in local dev.
 *
 * Requires @sentry/node to be installed (declared in package.json dependencies).
 * Run `pnpm install` to pick it up after updating package.json.
 */

// We use a dynamic require so the module still loads gracefully if @sentry/node
// hasn't been installed yet (e.g., in a fresh checkout before `pnpm install`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentrySDK: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SentrySDK = require('@sentry/node');
} catch {
  // @sentry/node not installed — all functions will be no-ops
}

let _initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || !SentrySDK) return;

  SentrySDK.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  _initialized = true;
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!_initialized || !SentrySDK) return;

  if (context) {
    SentrySDK.withScope((scope: { setExtras: (e: Record<string, unknown>) => void }) => {
      scope.setExtras(context);
      SentrySDK.captureException(error);
    });
  } else {
    SentrySDK.captureException(error);
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!_initialized || !SentrySDK) return;
  SentrySDK.captureMessage(message, level);
}

export function setUser(user: { id: string; email?: string }): void {
  if (!_initialized || !SentrySDK) return;
  SentrySDK.setUser(user);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withScope(callback: (scope: any) => void): void {
  if (!SentrySDK) {
    // Call with a stub scope so callers don't need to null-check
    callback({
      setExtras: () => {},
      setTag: (_key: string, _value: string) => {},
      setUser: (_user: unknown) => {},
    });
    return;
  }
  if (!_initialized) {
    callback(new SentrySDK.Scope());
    return;
  }
  SentrySDK.withScope(callback);
}
