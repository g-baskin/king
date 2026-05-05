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
          ? 'border-[#2f7ea3] bg-[#0b1d2a] text-white hover:bg-[#123247]'
          : 'border-[var(--base-color-brand--umber)]/30 bg-[var(--base-color-brand--shell)] text-[var(--base-color-brand--umber)] hover:bg-[var(--base-color-brand--champagne)]'
      }`}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Dark mode is ON — switch to light mode' : 'Light mode is ON — switch to dark mode'}
      style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-3.5 w-7 rounded-full transition-colors ${
          dark ? 'bg-[#2f7ea3]' : 'bg-[var(--base-color-brand--umber)]/40'
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${
            dark ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      <span>{dark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
