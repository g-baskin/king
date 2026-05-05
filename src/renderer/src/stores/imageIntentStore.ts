import { create } from 'zustand';

export interface CharacterConsistencyIntent {
  type: 'character-consistency-sheet';
  characterEntity: string;
  prompt: string;
  templateImageUrl?: string;
  ts: number;
}

interface ImageIntentStore {
  intent: CharacterConsistencyIntent | null;
  setIntent: (intent: CharacterConsistencyIntent) => void;
  consumeIntent: () => CharacterConsistencyIntent | null;
}

export const useImageIntentStore = create<ImageIntentStore>()((set, get) => ({
  intent: null,
  setIntent: (intent) => {
    console.info('[intent] set', intent);
    set({ intent });
  },
  consumeIntent: () => {
    const intent = get().intent;
    console.info('[intent] consume', intent);
    set({ intent: null });
    return intent;
  },
}));
