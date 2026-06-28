import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { kingApi } from './lib/kingApi';
import './globals.css';

try {
  const theme = window.localStorage.getItem('king:themeMode:v2') === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Route renderer errors through electron-log in main so they land in the same
// log file as IPC / updater / uncaughtException errors. Swallow IPC failures
// — we don't want a broken log channel to mask the underlying React error.
function logToMain(level: 'caught' | 'uncaught' | 'recoverable', error: unknown, info: unknown) {
  try {
    const e = error as Error;
    const stack =
      typeof (info as { componentStack?: string })?.componentStack === 'string'
        ? (info as { componentStack?: string }).componentStack
        : undefined;
    void kingApi.log
      .error(level, e?.message ?? String(error), (e?.stack ?? '') + (stack ? '\n' + stack : ''))
      .catch(() => undefined);
  } catch {
    /* ignore — error logging must never throw */
  }
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, info) => {
    console.error('[caught]', error, info.componentStack);
    logToMain('caught', error, info);
  },
  onUncaughtError: (error, info) => {
    console.error('[uncaught]', error, info.componentStack);
    logToMain('uncaught', error, info);
  },
  onRecoverableError: (error, info) => {
    console.warn('[recoverable]', error, info.componentStack);
    logToMain('recoverable', error, info);
  },
}).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      theme="dark"
      toastOptions={{
        style: {
          background: 'rgba(16, 19, 26, 0.94)',
          border: '1px solid rgba(117, 225, 255, 0.22)',
          color: '#f7f8ff',
          fontFamily: 'Inter, Helveticaneue, "Helvetica Neue", Helvetica, Arial, sans-serif',
          borderRadius: '9999px',
          boxShadow: '0 18px 48px -24px rgba(47, 124, 255, 0.45)',
        },
      }}
    />
  </StrictMode>,
);
