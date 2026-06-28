import { useEffect, useRef, useState } from 'react';
import type { PageType } from '@/App';
import { ChevronDownIcon, SettingsIcon } from '@/components/icons';
import SettingsModal from '@/components/ui/SettingsModal';
import { DemoToggle } from '@/components/ui/DemoToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useWorkspaceStore } from '@/stores/workspaceStore';

// Baked in at build time from package.json via electron.vite.config.ts.
const APP_VERSION = __APP_VERSION__;

interface HeaderProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const navItems: { page: PageType; label: string }[] = [
  { page: 'image', label: 'Image' },
  { page: 'create-ads', label: 'Create Ads' },
  { page: 'clone', label: 'Clone' },
  { page: 'prompts', label: 'Prompts' },
  { page: 'products', label: 'Products' },
  { page: 'characters', label: 'Characters' },
];

const adsItems: { page: PageType; label: string }[] = [
  { page: 'facebook-ads', label: 'Facebook Ads' },
  { page: 'google-ads', label: 'Google Ads' },
  { page: 'tiktok-shop', label: 'TikTok Shop' },
  { page: 'shopee-ads', label: 'Shopee Ads' },
];

const trailingItems: { page: PageType; label: string }[] = [{ page: 'store', label: 'Your Store' }];

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const [adsOpen, setAdsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const adsRef = useRef<HTMLDivElement>(null);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adsRef.current && !adsRef.current.contains(event.target as Node)) {
        setAdsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adsActive = adsItems.some((item) => item.page === currentPage);
  const activeAdsLabel = adsItems.find((item) => item.page === currentPage)?.label;

  const navButtonClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
      active
        ? 'border-[var(--base-color-brand--cinamon)]/70 bg-[color-mix(in_srgb,var(--base-color-brand--cinamon)_24%,transparent)] text-[var(--base-color-brand--bean)] shadow-[0_0_28px_-14px_var(--base-color-brand--cinamon)]'
        : 'border-[var(--base-color-brand--umber)]/30 bg-[rgba(255,255,255,0.025)] text-[var(--base-color-brand--umber)] hover:border-[var(--base-color-brand--cinamon)]/60 hover:bg-[rgba(47,124,255,0.12)] hover:text-[var(--base-color-brand--bean)]'
    }`;

  return (
    <>
      {/* Draggable title bar area — sits behind the native traffic light buttons */}
      <div className="drag-region h-7 shrink-0 border-b border-white/[0.03] bg-[rgba(8,9,13,0.92)]" />
      {/* Actual header content below the title bar */}
      <header className="flex h-14 shrink-0 items-center border-b border-white/[0.08] bg-[rgba(8,9,13,0.88)] px-4 shadow-[0_18px_48px_-38px_rgba(47,124,255,0.8)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <h1
            className="gradient-shift text-2xl leading-none font-black tracking-tight"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            King
          </h1>
          {/* Version badge next to the wordmark. Version is baked in at build
              time so it renders immediately, with no IPC dependency. */}
          <span
            className="inline-flex items-center rounded-full border border-[var(--base-color-brand--cinamon)]/30 bg-[rgba(47,124,255,0.12)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--base-color-brand--cream)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            title={`King v${APP_VERSION}`}
          >
            v{APP_VERSION}
          </span>
        </div>
        <nav className="ml-6 flex items-center gap-2">
          <select
            value={activeWorkspaceId}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/30 bg-[rgba(255,255,255,0.025)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            title="Active workspace"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setWorkspaceModalOpen(true)}
            className="rounded-full border border-[var(--base-color-brand--umber)]/30 bg-[rgba(255,255,255,0.025)] px-2.5 py-1.5 text-xs font-semibold tracking-wide text-[var(--base-color-brand--bean)] transition hover:border-[var(--base-color-brand--cinamon)]/60 hover:bg-[rgba(47,124,255,0.12)]"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            title="Create workspace"
          >
            + Workspace
          </button>
          {navItems.map(({ page, label }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={navButtonClass(active)}
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                {label}
              </button>
            );
          })}

          <div ref={adsRef} className="relative">
            <button
              onClick={() => setAdsOpen((prev) => !prev)}
              className={`${navButtonClass(adsActive)} flex items-center gap-1.5`}
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              aria-haspopup="menu"
              aria-expanded={adsOpen}
            >
              <span>{activeAdsLabel ?? 'Ads'}</span>
              <ChevronDownIcon />
            </button>
            {adsOpen && (
              <div
                role="menu"
                className="absolute top-full left-0 z-50 mt-2 flex min-w-[180px] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[rgba(16,19,26,0.96)] p-1 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl"
              >
                {adsItems.map(({ page, label }) => {
                  const active = currentPage === page;
                  return (
                    <button
                      key={page}
                      role="menuitem"
                      onClick={() => {
                        onNavigate(page);
                        setAdsOpen(false);
                      }}
                      className={`rounded-xl px-3 py-2 text-left text-xs font-semibold tracking-wide transition-colors ${
                        active
                          ? 'bg-[rgba(47,124,255,0.18)] text-[var(--base-color-brand--bean)]'
                          : 'text-[var(--base-color-brand--umber)] hover:bg-white/[0.05] hover:text-[var(--base-color-brand--bean)]'
                      }`}
                      style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {trailingItems.map(({ page, label }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={navButtonClass(active)}
                style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
              >
                {label}
              </button>
            );
          })}
        </nav>
        <div className="no-drag ml-auto flex items-center gap-2">
          <ThemeToggle />
          {/* Master demo-mode switch. Dev-only — `import.meta.env.DEV` is
              statically replaced at build time, so the entire <DemoToggle/>
              import + component drops out of production bundles via Vite
              tree-shaking. End users in shipped releases never see the toggle,
              and the underlying localStorage default is OFF anyway. */}
          {import.meta.env.DEV && <DemoToggle />}
          <button onClick={() => onNavigate('apis')} className="btn-cinamon btn-sm">
            APIs
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="flex items-center justify-center rounded-full border border-[var(--base-color-brand--umber)]/30 bg-[rgba(255,255,255,0.025)] p-2 text-[var(--base-color-brand--bean)] transition-colors hover:border-[var(--base-color-brand--cinamon)]/60 hover:bg-[rgba(47,124,255,0.12)] hover:text-[var(--base-color-brand--cream)]"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {workspaceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[rgba(16,19,26,0.96)] p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.85)]">
            <h2
              className="text-base font-bold text-[var(--base-color-brand--bean)]"
              style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
            >
              Create workspace
            </h2>
            <input
              autoFocus
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="mt-3 w-full rounded-xl border border-[var(--base-color-brand--umber)]/50 bg-[var(--base-color-brand--shell)] px-3 py-2 text-sm text-[var(--base-color-brand--bean)]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceModalOpen(false);
                  setNewWorkspaceName('');
                }}
                className="rounded-full border border-[var(--base-color-brand--umber)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--base-color-brand--bean)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  createWorkspace(newWorkspaceName);
                  setWorkspaceModalOpen(false);
                  setNewWorkspaceName('');
                }}
                className="rounded-full bg-[var(--base-color-brand--bean)] px-3 py-1.5 text-xs font-semibold text-[var(--base-color-brand--shell)]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
