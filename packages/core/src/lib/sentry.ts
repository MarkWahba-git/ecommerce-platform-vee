/**
 * Sentry integration wrapper.
 *
 * All functions are safe no-ops when SENTRY_DSN is not configured, so this
 * module can be imported unconditionally without crashing in local dev.
 */
import * as SentrySDK from '@sentry/node';

let _initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

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
  if (!_initialized) return;

  if (context) {
    SentrySDK.withScope((scope) => {
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
  if (!_initialized) return;
  SentrySDK.captureMessage(message, level);
}

export function setUser(user: { id: string; email?: string }): void {
  if (!_initialized) return;
  SentrySDK.setUser(user);
}

export function withScope(
  callback: (scope: SentrySDK.Scope) => void,
): void {
  if (!_initialized) {
    callback(new SentrySDK.Scope());
    return;
  }
  SentrySDK.withScope(callback);
}
