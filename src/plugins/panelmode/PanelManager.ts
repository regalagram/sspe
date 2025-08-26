import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PanelMode = 'accordion';

export interface PanelConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  pluginId: string;
  originalPosition?: 'sidebar' | 'toolbar'; // Track original position
}

interface PanelModeState {
  mode: PanelMode;
  panels: Map<string, PanelConfig>;
  accordionExpandedPanel: string | null;
  accordionVisible: boolean;
}

interface PanelModeActions {
  setMode: (mode: PanelMode) => void;
  registerPanel: (config: PanelConfig) => void;
  enablePanel: (panelId: string) => void;
  disablePanel: (panelId: string) => void;
  togglePanel: (panelId: string) => void;
  setAccordionExpanded: (panelId: string | null) => void;
  setAccordionVisible: (visible: boolean) => void;
  toggleAccordionVisible: () => void;
  reorderPanel: (panelId: string, newOrder: number) => void;
  getPanelsList: () => PanelConfig[];
  getVisiblePanels: () => PanelConfig[];
}

type PanelModeStore = PanelModeState & PanelModeActions;

// Load saved mode from localStorage

// Load saved mode from localStorage
const loadSavedMode = (): PanelMode => {
  try {
    const saved = localStorage.getItem('sspe-panel-mode');
    if (saved) return saved as PanelMode;
  } catch {}
  return 'accordion';
};

// Load saved accordionExpandedPanel from localStorage
const loadSavedAccordionExpandedPanel = (): string | null => {
  try {
    const saved = localStorage.getItem('sspe-accordion-expanded-panel');
    if (saved === null || saved === 'null') return null;
    return saved;
  } catch {}
  return null;
};

// Load saved accordionVisible from localStorage
const loadSavedAccordionVisible = (): boolean => {
  try {
    const saved = localStorage.getItem('sspe-accordion-visible');
    if (saved !== null) return saved === 'true';
  } catch {}
  return false;
};

// Load saved panel configurations
const loadSavedPanels = (): Map<string, PanelConfig> => {
  try {
    const saved = localStorage.getItem('sspe-panel-configs');
    if (saved) {
      const configs = JSON.parse(saved);
      return new Map(Object.entries(configs));
    }
  } catch {
    // Ignore errors
  }
  return new Map();
};


export const usePanelModeStore = create<PanelModeStore>()(
  subscribeWithSelector((set, get) => ({
    mode: loadSavedMode(),
    panels: loadSavedPanels(),
    accordionExpandedPanel: loadSavedAccordionExpandedPanel(),
    accordionVisible: loadSavedAccordionVisible(),

    setMode: (mode: PanelMode) => {
      set({ mode });
      try {
        localStorage.setItem('sspe-panel-mode', mode);
      } catch {}
    },

    registerPanel: (config: PanelConfig) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const existingPanel = newPanels.get(config.id);
        if (existingPanel) {
          newPanels.set(config.id, {
            ...config,
            enabled: existingPanel.enabled,
          });
        } else {
          newPanels.set(config.id, config);
        }
        try {
          const configsObj = Object.fromEntries(newPanels.entries());
          localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
        } catch {}
        return { panels: newPanels };
      });
    },

    enablePanel: (panelId: string) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, enabled: true });
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {}
        }
        return { panels: newPanels };
      });
    },

    disablePanel: (panelId: string) => {
      if (panelId === 'panel-mode-ui') return;
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, enabled: false });
          const newState: any = { panels: newPanels };
          if (state.accordionExpandedPanel === panelId) {
            newState.accordionExpandedPanel = null;
            try {
              localStorage.setItem('sspe-accordion-expanded-panel', 'null');
            } catch {}
          }
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {}
          return newState;
        }
        return { panels: newPanels };
      });
    },

    togglePanel: (panelId: string) => {
      if (panelId === 'panel-mode-ui') return;
      const panel = get().panels.get(panelId);
      if (panel) {
        if (panel.enabled) {
          get().disablePanel(panelId);
        } else {
          get().enablePanel(panelId);
        }
      }
    },

    setAccordionExpanded: (panelId: string | null) => {
      set({ accordionExpandedPanel: panelId });
      try {
        localStorage.setItem('sspe-accordion-expanded-panel', panelId === null ? 'null' : panelId);
      } catch {}
    },

    setAccordionVisible: (visible: boolean) => {
      set({ accordionVisible: visible });
      try {
        localStorage.setItem('sspe-accordion-visible', visible ? 'true' : 'false');
      } catch {}
    },

    toggleAccordionVisible: () => {
      set((state) => {
        const newVisible = !state.accordionVisible;
        try {
          localStorage.setItem('sspe-accordion-visible', newVisible ? 'true' : 'false');
        } catch {}
        return { accordionVisible: newVisible };
      });
    },

    reorderPanel: (panelId: string, newOrder: number) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, order: newOrder });
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {}
        }
        return { panels: newPanels };
      });
    },

    getPanelsList: () => {
      return Array.from(get().panels.values()).sort((a, b) => a.order - b.order);
    },

    getVisiblePanels: () => {
      return Array.from(get().panels.values())
        .filter(panel => panel.enabled)
        .sort((a, b) => a.order - b.order);
    },
  }))
);

export const panelModeManager = {
  getStore: () => usePanelModeStore.getState(),
  subscribe: usePanelModeStore.subscribe,
};
