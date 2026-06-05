import type { ElectronAPI } from '../types/electron';

export type KingApi = ElectronAPI;

export function getKingApi(): KingApi {
  if (!globalThis.window?.api) {
    throw new Error('King API bridge is not available in this runtime');
  }

  return globalThis.window.api;
}

export const kingApi = new Proxy({} as KingApi, {
  get(_target, property: keyof KingApi) {
    return getKingApi()[property];
  },
});
