import { PointerEvent } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultUse } from '../../utils/svg-elements-utils';
import { PointerEventContext } from '../../core/PluginSystem';

class SymbolManager {
  private editorStore: any = null;
  private selectedSymbolId: string | null = null;
  private isPlacementMode: boolean = false;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  setSelectedSymbolForPlacement(symbolId: string) {
    this.selectedSymbolId = symbolId;
    this.isPlacementMode = true;
  }

  isInInstancePlacementMode(): boolean {
    return this.isPlacementMode && this.selectedSymbolId !== null;
  }

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInInstancePlacementMode() || !this.selectedSymbolId || !this.editorStore) {
      return false;
    }

    // Place the symbol instance at the clicked position
    const { addUse } = this.editorStore;

    const instanceData = createDefaultUse(
      `#${this.selectedSymbolId}`, 
      context.svgPoint.x - 50, // Offset by half the default width for centering
      context.svgPoint.y - 50  // Offset by half the default height for centering
    );
    
    addUse(instanceData);

    // Clear the placement mode and selected symbol
    this.selectedSymbolId = null;
    this.isPlacementMode = false;

    return true; // Consume the event
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInInstancePlacementMode()) {
      return false;
    }
    
    // Could add preview functionality here in the future
    return false; // Don't consume move events for now
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    // Symbol placement is handled in pointerDown for single-click placement
    return false;
  };
}

export const symbolManager = new SymbolManager();
