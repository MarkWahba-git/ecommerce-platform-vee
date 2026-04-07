/**
 * Sentry integration wrapper.
 *
 * All functions are safe no-ops when SENTRY_DSN is not configured, so this
 * module can be imported unconditionally without crashing in local dev.
 *
 * Requires @sentry/node to be installed (declared in package.json dependencies).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SentrySDK: typeof import('@sentry/node') | null = (() => {
  try {
    // Dynamic require allows graceful fallback if package isn't installed yet
    return require('@sentry/node') as typeof import('@sentry/node');
  } catch {
    return null;
  }
})();

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
    SentrySDK.withScope((scope) => {
      scope.setExtras(context as Record<string, unknown>);
      SentrySDK!.captureException(error);
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

export function withScope(
  callback: (scope: import('@sentry/node').Scope) => void,
): void {
  if (!SentrySDK) {
    // Call with a stub scope so callers don't need to null-check
    callback({ setExtras: () => {}, setTag: () => {}, setUser: () => {} } as unknown as import('@sentry/node').Scope);
    return;
  }
  if (!_initialized) {
    callback(new SentrySDK.Scope());
    return;
  }
  SentrySDK.withScope(callback);
}
