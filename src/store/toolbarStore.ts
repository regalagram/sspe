import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Interface for persisted toolbar states
interface ToolbarState {
  // Creation tool states
  activeCreationTool: string | null;
  isCreationSubmenuOpen: boolean;
  
  // Zoom states
  isZoomSubmenuOpen: boolean;
  
  // File actions states
  isFileActionsSubmenuOpen: boolean;
  
  // General toolbar states
  lastActiveTools: Record<string, any>;
}

interface ToolbarActions {
  // Creation tool actions
  setActiveCreationTool: (tool: string | null) => void;
  setCreationSubmenuOpen: (isOpen: boolean) => void;
  
  // Zoom actions
  setZoomSubmenuOpen: (isOpen: boolean) => void;
  
  // File actions
  setFileActionsSubmenuOpen: (isOpen: boolean) => void;
  
  // General actions
  setLastActiveTool: (toolType: string, state: any) => void;
  getLastActiveTool: (toolType: string) => any;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

type ToolbarStore = ToolbarState & ToolbarActions;

// Load saved toolbar state from localStorage
const loadSavedToolbarState = (): Partial<ToolbarState> => {
  try {
    const saved = localStorage.getItem('sspe-toolbar-state');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return {};
};

// Save toolbar state to localStorage
const saveToolbarState = (state: ToolbarState) => {
  try {
    const stateToSave = {
      activeCreationTool: state.activeCreationTool,
      isCreationSubmenuOpen: state.isCreationSubmenuOpen,
      isZoomSubmenuOpen: state.isZoomSubmenuOpen,
      lastActiveTools: state.lastActiveTools,
    };
    localStorage.setItem('sspe-toolbar-state', JSON.stringify(stateToSave));
  } catch {}
};

export const useToolbarStore = create<ToolbarStore>()(
  subscribeWithSelector((set, get) => {
    // Load initial state
    const savedState = loadSavedToolbarState();
    
    return {
      // Initial state
      activeCreationTool: savedState.activeCreationTool || null,
      isCreationSubmenuOpen: false, // Don't persist open menus
      isZoomSubmenuOpen: false, // Don't persist open menus
      isFileActionsSubmenuOpen: false, // Don't persist open menus
      lastActiveTools: savedState.lastActiveTools || {},
      
      // Creation tool actions
      setActiveCreationTool: (tool) => {
        set({ activeCreationTool: tool });
        saveToolbarState(get());
      },
      
      setCreationSubmenuOpen: (isOpen) => {
        set({ isCreationSubmenuOpen: isOpen });
        // Don't persist submenu open states
      },
      
      // Zoom actions
      setZoomSubmenuOpen: (isOpen) => {
        set({ isZoomSubmenuOpen: isOpen });
        // Don't persist submenu open states
      },
      
      // File actions
      setFileActionsSubmenuOpen: (isOpen) => {
        set({ isFileActionsSubmenuOpen: isOpen });
        // Don't persist submenu open states
      },
      
      // General actions
      setLastActiveTool: (toolType, state) => {
        set((current) => ({
          lastActiveTools: {
            ...current.lastActiveTools,
            [toolType]: state
          }
        }));
        saveToolbarState(get());
      },
      
      getLastActiveTool: (toolType) => {
        return get().lastActiveTools[toolType];
      },
      
      // Persistence
      loadFromStorage: () => {
        const savedState = loadSavedToolbarState();
        set(savedState);
      },
      
      saveToStorage: () => {
        saveToolbarState(get());
      }
    };
  })
);

// Subscribe to state changes to auto-save important changes
useToolbarStore.subscribe(
  (state) => state.activeCreationTool,
  () => {
    // Auto-save when active creation tool changes
    const state = useToolbarStore.getState();
    saveToolbarState(state);
  }
);

// Backward compatibility export
export const useMobileToolbarStore = useToolbarStore;