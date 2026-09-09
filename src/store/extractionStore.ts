import { create } from 'zustand';

type ExtractionStore = {
  image: string | null;
  isExtracting: boolean;
  countdown: number;

  // Actions
  resetImage: () => void;
  start: () => void;
  setImage: (image: string | null) => void;
  setCountdown: (countdown: number) => void;
};

export const useExtractionStore = create<ExtractionStore>((set) => ({
  image: null,
  isExtracting: false,
  countdown: 0,

  resetImage: () => set({ image: null }),

  start: () => set({ isExtracting: true }),

  setImage: (image) => set({ image }),

  setCountdown: (countdown) => set({ countdown }),
}));
