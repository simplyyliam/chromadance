import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { indexedDbStorage } from './indexedDbStorage';

// Phase system for the extraction workflow
export type ExtractionPhase =
  | 'idle'           // No image or waiting to start
  | 'countdown'      // Dramatic countdown before extraction
  | 'extracting'     // Probes are sampling colors
  | 'clustering'     // Colors competing (Battle Royal)
  | 'palette'        // Generating final palette
  | 'complete';      // Palette ready

export type ExtractedColor = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rgb: { r: number; g: number; b: number };
  clusterId?: string;
  isKing?: boolean;       // Won its cluster (KOTC)
};

export type ColorCluster = {
  id: string;
  seedColor: ExtractedColor;
  members: string[];      // Color IDs in this cluster
  winner?: string;        // The KOTC
};

export type ExtractionStore = {
  // Core state
  image: string | null;
  phase: ExtractionPhase;
  isHydrated: boolean;

  // Countdown
  countdown: number;
  countdownDuration: number;  // How long countdown lasts (ms)

  // Extraction grid
  gridCols: number;
  gridRows: number;
  probeSize: number;

  // Collected data
  extractedColors: ExtractedColor[];
  clusters: ColorCluster[];
  palette: string[];          // Final generated palette

  // Animation states
  isCountingDown: boolean;
  areProbesVisible: boolean;
  isExtracting: boolean;
  isClustering: boolean;
  isPaletteGenerating: boolean;
  isImageExpanded: boolean;   // For the click-to-expand animation

  // Actions - Core
  setImage: (image: string | null) => void;
  setPhase: (phase: ExtractionPhase) => void;
  reset: () => void;

  // Actions - Countdown
  startCountdown: (duration?: number) => void;
  decrementCountdown: () => void;
  setCountdown: (count: number) => void;

  // Actions - Extraction
  setExtractedColors: (colors: ExtractedColor[]) => void;
  addExtractedColor: (color: ExtractedColor) => void;
  updateExtractedColor: (id: string, updates: Partial<ExtractedColor>) => void;
  clearExtractedColors: () => void;

  // Actions - Clustering
  setClusters: (clusters: ColorCluster[]) => void;
  setClusterWinner: (clusterId: string, winnerId: string) => void;
  clearClusters: () => void;

  // Actions - Palette
  setPalette: (palette: string[]) => void;
  clearPalette: () => void;

  // Actions - Animation
  setProbesVisible: (visible: boolean) => void;
  setExtracting: (extracting: boolean) => void;
  setClustering: (clustering: boolean) => void;
  setPaletteGenerating: (generating: boolean) => void;
  toggleImageExpanded: () => void;
  setExiting: (exiting: boolean) => void;
};

export const useExtractionStore = create<ExtractionStore>()(
  persist(
    (set) => ({
      // Core state
      image: null,
      phase: 'idle',
      isHydrated: false,

      // Countdown
      countdown: 0,
      countdownDuration: 3000,

      // Extraction grid
      gridCols: 12,
      gridRows: 8,
      probeSize: 40,

      // Collected data
      extractedColors: [],
      clusters: [],
      palette: [],

      // Animation states
      isCountingDown: false,
      areProbesVisible: false,
      isExtracting: false,
      isClustering: false,
      isPaletteGenerating: false,
      isImageExpanded: false,
      isExiting: false,

      // Actions - Core
      setImage: (image) => set({ image, phase: image ? 'idle' : 'idle' }),

      setPhase: (phase) => set({ phase }),

      reset: () => set({
        image: null,
        phase: 'idle',
        countdown: 0,
        extractedColors: [],
        clusters: [],
        palette: [],
        areProbesVisible: false,
        isExtracting: false,
        isClustering: false,
        isPaletteGenerating: false,
        isImageExpanded: false,
      }),

      // Actions - Countdown
      startCountdown: (duration) => set((state) => ({
        phase: 'countdown',
        countdown: Math.ceil((duration ?? state.countdownDuration) / 1000),
        isCountingDown: true,
      })),

      decrementCountdown: () => set((state) => {
        const newCount = state.countdown - 1;
        return {
          countdown: Math.max(0, newCount),
          isCountingDown: newCount > 0,
          phase: newCount === 0 ? 'extracting' : 'countdown',
        };
      }),

      setCountdown: (count) => set({ countdown: count }),

      // Actions - Extraction
      setExtractedColors: (colors) => set({ extractedColors: colors }),

      addExtractedColor: (color) => set((state) => ({
        extractedColors: [...state.extractedColors, color],
      })),

      updateExtractedColor: (id, updates) => set((state) => ({
        extractedColors: state.extractedColors.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),

      clearExtractedColors: () => set({ extractedColors: [] }),

      // Actions - Clustering
      setClusters: (clusters) => set({ clusters }),

      setClusterWinner: (clusterId, winnerId) => set((state) => ({
        clusters: state.clusters.map((c) =>
          c.id === clusterId ? { ...c, winner: winnerId } : c
        ),
        extractedColors: state.extractedColors.map((color) =>
          color.id === winnerId ? { ...color, isKing: true } : color
        ),
      })),

      clearClusters: () => set({ clusters: [] }),

      // Actions - Palette
      setPalette: (palette) => set({ palette, phase: 'complete' }),

      clearPalette: () => set({ palette: [] }),

      // Actions - Animation
      setProbesVisible: (visible) => set({ areProbesVisible: visible }),

      setExtracting: (extracting) => set({ isExtracting: extracting }),

      setClustering: (clustering) => set({ isClustering: clustering }),

      setPaletteGenerating: (generating) => set({ isPaletteGenerating: generating }),

      toggleImageExpanded: () => set((state) => ({ isImageExpanded: !state.isImageExpanded })),

      setExiting: (exiting) => set({ isExiting: exiting }),
    }),
    {
      name: 'extraction-store',
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        image: state.image,
        phase: state.phase,
        extractedColors: state.extractedColors,
        clusters: state.clusters,
        palette: state.palette,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.isHydrated = true;
            // Reset phase on page refresh, keep the image
            if (state.phase !== 'idle') {
              state.phase = 'idle';
              state.countdown = 0;
              state.extractedColors = [];
              state.clusters = [];
              state.palette = [];
            }
          }
        };
      },
    }
  )
);