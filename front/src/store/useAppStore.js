import { create } from 'zustand';

const persistKey = 'borlacam-store';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(persistKey);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch (_) {
    return undefined;
  }
}

function savePersisted(state) {
  try {
    const { history, selectedModel, availableModels, confidenceThreshold } = state;
    localStorage.setItem(
      persistKey,
      JSON.stringify({ history, selectedModel, availableModels, confidenceThreshold })
    );
  } catch (_) {}
}

export const useAppStore = create((set, get) => ({
  // runtime
  modelStatus: 'idle',
  modelError: undefined,
  isRunning: false,
  fps: 0,

  // navigation
  currentPage: 'dashboard', // dashboard | reports | settings

  // model
  selectedModel: 'MX450 Waste Model (Trained)',
  availableModels: ['MX450 Waste Model (Trained)'],

  // predictions
  predictions: [],
  confidenceThreshold: 0.25,


  // history of results
  history: [], // { ts, label, score, snapshotDataUrl }

  setCurrentPage: (page) => set({ currentPage: page }),
  setModelStatus: (status, error) => set({ modelStatus: status, modelError: error }),
  setSelectedModel: (model) => {
    set({ selectedModel: model });
    savePersisted(get());
  },
  setAvailableModels: (models) => {
    set({ availableModels: models });
    savePersisted(get());
  },
  setPredictions: (predictions) => set({ predictions }),
  setFps: (fps) => set({ fps }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setConfidenceThreshold: (confidenceThreshold) => {
    set({ confidenceThreshold });
    savePersisted(get());
  },
  addHistoryItem: (item) => {
    const history = [item, ...get().history].slice(0, 50);
    set({ history });
    savePersisted(get());
  },
  clearHistory: () => {
    set({ history: [] });
    savePersisted(get());
  },
}));

// Clear old cached model data and force correct values
localStorage.removeItem(persistKey);

// Always use correct model values
useAppStore.setState({
  selectedModel: 'MX450 Waste Model (Trained)',
  availableModels: ['MX450 Waste Model (Trained)'],
  confidenceThreshold: 0.25,
  history: [],
}); 