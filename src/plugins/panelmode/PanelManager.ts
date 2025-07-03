import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PanelMode = 'draggable' | 'accordion';

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
  toggleMode: () => void;
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
const loadSavedMode = (): PanelMode => {
  try {
    const saved = localStorage.getItem('sspe-panel-mode');
    return saved === 'accordion' ? 'accordion' : 'draggable';
  } catch {
    return 'draggable';
  }
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
    accordionExpandedPanel: null,
    accordionVisible: true, // Default to visible

    setMode: (mode: PanelMode) => {
      set({ mode });
      try {
        localStorage.setItem('sspe-panel-mode', mode);
      } catch {
        // Ignore storage errors
      }
    },

    toggleMode: () => {
      const currentMode = get().mode;
      const newMode = currentMode === 'draggable' ? 'accordion' : 'draggable';
      get().setMode(newMode);
    },

    registerPanel: (config: PanelConfig) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const existingPanel = newPanels.get(config.id);
        
        // If panel exists, preserve its enabled state and only update other properties
        if (existingPanel) {
          newPanels.set(config.id, {
            ...config,
            enabled: existingPanel.enabled, // Preserve enabled state
          });
        } else {
          // New panel, use the provided config
          newPanels.set(config.id, config);
        }
        
        // Save to localStorage
        try {
          const configsObj = Object.fromEntries(newPanels.entries());
          localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
        } catch {
          // Ignore storage errors
        }
        
        return { panels: newPanels };
      });
    },

    enablePanel: (panelId: string) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, enabled: true });
          
          // Save to localStorage
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {
            // Ignore storage errors
          }
        }
        return { panels: newPanels };
      });
    },

    disablePanel: (panelId: string) => {
      // Prevent disabling the Panel Mode panel itself
      if (panelId === 'panel-mode-ui') {
        return;
      }
      
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, enabled: false });
          
          // If this panel is currently expanded in accordion, close it
          const newState: any = { panels: newPanels };
          if (state.accordionExpandedPanel === panelId) {
            newState.accordionExpandedPanel = null;
          }
          
          // Save to localStorage
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {
            // Ignore storage errors
          }
          
          return newState;
        }
        return { panels: newPanels };
      });
    },

    togglePanel: (panelId: string) => {
      // Prevent toggling the Panel Mode panel itself
      if (panelId === 'panel-mode-ui') {
        return;
      }
      
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
    },

    setAccordionVisible: (visible: boolean) => {
      set({ accordionVisible: visible });
    },

    toggleAccordionVisible: () => {
      set((state) => ({ accordionVisible: !state.accordionVisible }));
    },

    reorderPanel: (panelId: string, newOrder: number) => {
      set((state) => {
        const newPanels = new Map(state.panels);
        const panel = newPanels.get(panelId);
        if (panel) {
          newPanels.set(panelId, { ...panel, order: newOrder });
          
          // Save to localStorage
          try {
            const configsObj = Object.fromEntries(newPanels.entries());
            localStorage.setItem('sspe-panel-configs', JSON.stringify(configsObj));
          } catch {
            // Ignore storage errors
          }
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
