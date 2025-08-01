import { create } from 'zustand';

export interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  type: 'selection' | 'canvas';
  selectedItems: {
    paths: string[];
    subPaths: string[];
    commands: string[];
    texts: string[];
    groups: string[];
    images: string[];
    animations: string[];
  };
}

interface ContextMenuActions {
  showContextMenu: (position: { x: number; y: number }, type: 'selection' | 'canvas', selectedItems?: ContextMenuState['selectedItems']) => void;
  hideContextMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState & ContextMenuActions>((set, get) => ({
  isVisible: false,
  position: { x: 0, y: 0 },
  type: 'canvas',
  selectedItems: {
    paths: [],
    subPaths: [],
    commands: [],
    texts: [],
    groups: [],
    images: [],
    animations: []
  },
  
  showContextMenu: (position, type, selectedItems) => {
    set({
      isVisible: true,
      position,
      type,
      selectedItems: selectedItems || {
        paths: [],
        subPaths: [],
        commands: [],
        texts: [],
        groups: [],
        images: [],
        animations: []
      }
    });
  },
  
  hideContextMenu: () => {
    set({ isVisible: false });
  }
}));