import { create } from 'zustand';

export type WorkspaceKind = 'ugc' | 'editorial' | 'video-ads' | 'custom';

export interface Workspace {
  id: string;
  name: string;
  kind: WorkspaceKind;
  createdAt: string;
  updatedAt: string;
}

const WORKSPACE_LIST_KEY = 'king_workspaces_v1';
const ACTIVE_WORKSPACE_KEY = 'king_active_workspace_v1';

const defaultWorkspaces: Workspace[] = [
  {
    id: 'workspace-ugc',
    name: 'UGC',
    kind: 'ugc',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'workspace-editorial',
    name: 'Editorial',
    kind: 'editorial',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'workspace-video-ads',
    name: 'Video Ads',
    kind: 'video-ads',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_LIST_KEY);
    if (!raw) return defaultWorkspaces;
    const parsed = JSON.parse(raw) as Workspace[];
    return parsed.length > 0 ? parsed : defaultWorkspaces;
  } catch {
    return defaultWorkspaces;
  }
}

function loadActiveWorkspaceId(workspaces: Workspace[]): string {
  try {
    const id = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (id && workspaces.some((w) => w.id === id)) return id;
  } catch {
    // ignore
  }
  return workspaces[0]?.id ?? 'workspace-ugc';
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  activeWorkspace: Workspace;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string, kind?: WorkspaceKind) => void;
}

const initialWorkspaces = loadWorkspaces();
const initialActiveWorkspaceId = loadActiveWorkspaceId(initialWorkspaces);

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspaces: initialWorkspaces,
  activeWorkspaceId: initialActiveWorkspaceId,
  activeWorkspace:
    initialWorkspaces.find((w) => w.id === initialActiveWorkspaceId) ?? initialWorkspaces[0]!,

  setActiveWorkspace: (id) => {
    const { workspaces } = get();
    const next = workspaces.find((w) => w.id === id);
    if (!next) return;
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    } catch {
      // ignore
    }
    set({ activeWorkspaceId: id, activeWorkspace: next });
  },

  createWorkspace: (name, kind = 'custom') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      kind,
      createdAt: now,
      updatedAt: now,
    };
    const workspaces = [...get().workspaces, workspace];
    try {
      localStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify(workspaces));
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    } catch {
      // ignore
    }
    set({ workspaces, activeWorkspaceId: workspace.id, activeWorkspace: workspace });
  },
}));
