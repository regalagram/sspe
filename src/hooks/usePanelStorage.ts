import { useState, useEffect } from 'react';

interface StoredPanelState {
  position: { x: number; y: number };
  isPinned: boolean;
  isCollapsed: boolean;
  zIndex: number;
}

const STORAGE_PREFIX = 'svg-editor-panel-';

export const usePanelStorage = (panelId: string, initialPosition: { x: number; y: number }) => {
  const storageKey = `${STORAGE_PREFIX}${panelId}`;
  
  // Load initial state from localStorage
  const loadStoredState = (): StoredPanelState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          position: parsed.position || initialPosition,
          isPinned: parsed.isPinned || false,
          isCollapsed: parsed.isCollapsed || false,
          zIndex: parsed.zIndex || 100,
        };
      }
    } catch (error) {
      console.warn(`Failed to load panel state for ${panelId}:`, error);
    }
    
    return {
      position: initialPosition,
      isPinned: false,
      isCollapsed: true,
      zIndex: 100,
    };
  };

  const [panelState, setPanelState] = useState<StoredPanelState>(loadStoredState);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(panelState));
    } catch (error) {
      console.warn(`Failed to save panel state for ${panelId}:`, error);
    }
  }, [panelState, storageKey]);

  const updatePosition = (position: { x: number; y: number }) => {
    setPanelState(prev => ({ ...prev, position }));
  };

  const togglePin = () => {
    setPanelState(prev => ({ ...prev, isPinned: !prev.isPinned }));
  };

  const toggleCollapse = () => {
    setPanelState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  };

  const bringToFront = () => {
    const maxZIndex = getMaxZIndex();
    setPanelState(prev => ({ ...prev, zIndex: maxZIndex + 1 }));
  };

  const resetToDefaults = () => {
    setPanelState({
      position: initialPosition,
      isPinned: false,
      isCollapsed: false,
      zIndex: 100,
    });
  };

  return {
    panelState,
    updatePosition,
    togglePin,
    toggleCollapse,
    bringToFront,
    resetToDefaults,
  };
};

// Helper function to get the maximum z-index of all panels
const getMaxZIndex = (): number => {
  let maxZ = 100;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.zIndex && parsed.zIndex > maxZ) {
            maxZ = parsed.zIndex;
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to get max z-index:', error);
  }
  
  return maxZ;
};

// Helper function to reset all panels to default positions
export const resetAllPanelsToDefault = () => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
  } catch (error) {
    console.warn('Failed to reset panel positions:', error);
  }
};
