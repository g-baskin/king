import { useThemeMode } from '@/hooks/useThemeMode';

export function ThemeToggle() {
  const [theme, setTheme] = useThemeMode();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
        dark
          ? 'border-[var(--base-color-brand--cinamon)]/40 bg-[rgba(47,124,255,0.12)] text-[var(--base-color-brand--bean)] hover:bg-[rgba(47,124,255,0.2)]'
          : 'border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--umber)] hover:bg-[var(--base-color-brand--champagne)]'
      }`}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to warm mode' : 'Switch to studio mode'}
      title={
        dark ? 'Studio mode is ON — switch to warm mode' : 'Warm mode is ON — switch to studio mode'
      }
      style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-3.5 w-7 rounded-full transition-colors ${
          dark ? 'bg-[var(--base-color-brand--cinamon)]' : 'bg-[var(--base-color-brand--umber)]/40'
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${
            dark ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      <span>{dark ? 'Studio' : 'Warm'}</span>
    </button>
  );
}
