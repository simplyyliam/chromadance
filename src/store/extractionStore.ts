import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDbStorage } from './indexedDbStorage';

type ExtractionStore = {
  image: string | null;
  isExtracting: boolean;
  countdown: number;
  isHydrated: boolean;

  // Actions
  resetImage: () => void;
  start: () => void;
  setImage: (image: string | null) => void;
  setCountdown: (countdown: number) => void;
};

export const useExtractionStore = create<ExtractionStore>()(
  persist(
    (set) => ({
      image: null,
      isExtracting: false,
      countdown: 0,
      isHydrated: false,

      resetImage: () => set({ image: null }),

      start: () => set({ isExtracting: true }),

      setImage: (image) => set({ image }),

      setCountdown: (countdown) => set({ countdown }),
    }),
    {
      name: 'extraction-store',
      storage: createJSONStorage(() => indexedDbStorage),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.isHydrated = true;
          }
        };
      },
    }
  )
);