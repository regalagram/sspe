import { PointerEvent } from 'react';
import { PointerEventHandler, PointerEventContext, pluginManager } from '../core/PluginSystem';
import { useEditorStore } from '../store/editorStore';
import { snapToGrid } from '../utils/path-utils';
import { toolModeManager } from './ToolModeManager';

interface TextCreationState {
  isCreating: boolean;
  textType: 'single' | 'multiline' | null;
}

export class TextManager {
  private state: TextCreationState = {
    isCreating: false,
    textType: null
  };

  private editorStore: any = null;

  constructor() {
    // Registrar este manager con ToolModeManager
    toolModeManager.setTextManager(this);
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  startTextCreation(textType: 'single' | 'multiline') {
    // Solo verificar si ya tenemos el mismo textType activo
    if (this.state.isCreating && this.state.textType === textType) {
      return;
    }
    
    this.state.isCreating = true;
    this.state.textType = textType;
    
    // Notify the plugin manager about text creation mode
    pluginManager.setTextCreationMode(true);
  }

  stopTextCreation() {
    this.state.isCreating = false;
    this.state.textType = null;
    
    // Notify the plugin manager that text creation mode is off
    pluginManager.setTextCreationMode(false);
  }

  isInTextCreationMode(): boolean {
    return this.state.isCreating && this.state.textType !== null;
  }

  getCurrentTextType(): 'single' | 'multiline' | null {
    return this.state.textType;
  }

  getCursor(): string {
    if (this.isInTextCreationMode()) {
      return 'text';
    }
    return 'default';
  }

  /**
   * Método para desactivación externa por ToolModeManager
   * No notifica de vuelta para evitar loops
   */
  deactivateExternally = () => {
    this.state.isCreating = false;
    this.state.textType = null;
    
    // Notify the plugin manager that text creation mode is off
    pluginManager.setTextCreationMode(false);
  };

  // Pointer event handlers
  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInTextCreationMode() || !this.state.textType) {
      return false;
    }

    // Don't handle if clicking on an existing command or text element
    if (context.commandId) {
      return false;
    }

    const point = context.svgPoint;
    const store = this.editorStore || useEditorStore.getState();
    const { grid } = store;

    // Apply grid snapping if enabled
    let finalPoint = point;
    if (grid.snapToGrid) {
      finalPoint = snapToGrid(point, grid.size);
    }

    this.insertText(finalPoint);
    
    // Stop text creation after placing text (unlike shapes that continue)
    this.stopTextCreation();
    toolModeManager.setMode('select');
    
    return true;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInTextCreationMode()) {
      return false;
    }
    // Update preview or cursor behavior if needed
    return false; // Don't consume the event
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    // Text insertion is handled in pointerDown for single-click text placement
    return false;
  };

  private insertText(point: { x: number; y: number }) {
    if (!this.state.textType) {
      return;
    }

    const store = this.editorStore || useEditorStore.getState();
    const { addText, addMultilineText, pushToHistory } = store;

    // Save current state to history before making changes
    pushToHistory();

    try {
      if (this.state.textType === 'single') {
        addText(point.x, point.y, 'Text');
      } else if (this.state.textType === 'multiline') {
        addMultilineText(point.x, point.y, ['Line 1', 'Line 2']);
      }
    } catch (error) {
      console.error('📝 TextManager: Error inserting text:', error);
    }
  }
}

export const textManager = new TextManager();

// Pointer event handlers for the plugin system
export const textPointerHandlers: PointerEventHandler = {
  onPointerDown: textManager.handlePointerDown,
  onPointerMove: textManager.handlePointerMove,
  onPointerUp: textManager.handlePointerUp,
};