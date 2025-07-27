import React, { useState, PointerEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Copy } from 'lucide-react';
import { Pointer, XCircle } from 'lucide-react';
import { getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { toolModeManager } from '../../managers/ToolModeManager';

// Rectangle Selection Manager
interface RectSelectionState {
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
}

class RectSelectionManager {
  private state: RectSelectionState = {
    isSelecting: false,
    selectionStart: null,
    selectionRect: null,
  };

  private editorStore: any;
  private listeners: (() => void)[] = [];

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const { mode } = this.editorStore;

    // Check if clicking on a transform handle - if so, don't start rectangle selection
    const target = e.target as SVGElement;
    const handleType = target.getAttribute('data-handle-type');
    const handleId = target.getAttribute('data-handle-id');
    
    if (handleType === 'transform' || handleType === 'rotation' || handleId) {
      return false; // Let transform plugin handle this
    }

    // Don't start rectangle selection if something is already being moved/transformed
    if (transformManager.isMoving() || transformManager.isTransforming()) {
      return false;
    }

    // Check if we're clicking on an element that should be handled by other plugins
    const elementType = target.getAttribute('data-element-type');
    const elementId = target.getAttribute('data-element-id');
    const isSpecificElement = elementType && (
      elementType === 'image' || 
      elementType === 'use' || 
      elementType === 'text' || 
      elementType === 'multiline-text' || 
      elementType === 'textPath'
    );
    
    // Handle individual element selection first
    if (mode.current === 'select' && e.button === 0 && elementId && isSpecificElement) {
      // Let the element-specific selection logic handle this
      // (pointer-interaction plugin will handle the actual selection)
      return false;
    }
    
    // Allow rectangle selection to start if:
    // - We're in select mode
    // - No control point interaction
    // - Left mouse button
    // - No shift key (shift is for adding to selection)
    // - No specific element interaction (commandId only exists for paths/commands, not for empty space)
    // - AND clicking on empty space (no commandId and no specific element type)
    const shouldStartRectSelection = mode.current === 'select' && 
                                   !controlPoint && 
                                   e.button === 0 && 
                                   !e.shiftKey && 
                                   (!commandId && !isSpecificElement);

    if (shouldStartRectSelection) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      this.state.isSelecting = true;
      this.state.selectionStart = svgPoint;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionStart) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      const x = Math.min(this.state.selectionStart.x, svgPoint.x);
      const y = Math.min(this.state.selectionStart.y, svgPoint.y);
      const width = Math.abs(this.state.selectionStart.x - svgPoint.x);
      const height = Math.abs(this.state.selectionStart.y - svgPoint.y);
      this.state.selectionRect = { x, y, width, height };
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { clearSelection } = this.editorStore;
    
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, texts, selectMultiple, selectInBox } = this.editorStore;
      
      const hasSignificantArea = this.state.selectionRect.width > 5 || this.state.selectionRect.height > 5;
      
      if (hasSignificantArea) {
        // Use the centralized selectInBox function for mixed selections
        selectInBox(this.state.selectionRect);
      }

      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return hasSignificantArea;
    }

    if (this.state.isSelecting) {
      // Single click on empty space - clear selection
      const target = e.target as SVGElement;
      const elementType = target.getAttribute('data-element-type');
      const isEmptySpaceClick = !context.commandId && !context.controlPoint && !elementType && !e.shiftKey;
      
      if (isEmptySpaceClick) {
        clearSelection();
      }
      
      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  getCursor(): string {
    return this.state.isSelecting ? 'crosshair' : 'default';
  }

  getSelectionRect() {
    return this.state.selectionRect;
  }

  isSelecting() {
    return this.state.isSelecting;
  }
}

const rectSelectionManager = new RectSelectionManager();

// Hook to access rect selection state
export const useRectSelection = () => {
  return {
    getCursor: () => rectSelectionManager.getCursor(),
    getSelectionRect: () => rectSelectionManager.getSelectionRect(),
    isSelecting: () => rectSelectionManager.isSelecting(),
  };
};

// Selection Rectangle Renderer
export const SelectionRectRenderer: React.FC = () => {
  const { viewport } = useEditorStore();
  const [, forceUpdate] = useState({});

  React.useEffect(() => {
    const unsubscribe = rectSelectionManager.addListener(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const selectionRect = rectSelectionManager.getSelectionRect();
  const isSelecting = rectSelectionManager.isSelecting();

  if (!isSelecting || !selectionRect) return null;

  return (
    <rect
      x={selectionRect.x}
      y={selectionRect.y}
      width={selectionRect.width}
      height={selectionRect.height}
      fill="rgba(0, 120, 204, 0.15)"
      stroke="#007acc"
      strokeWidth={1 / viewport.zoom}
      style={{ pointerEvents: 'none' }}
    />
  );
};

// Selection Tools UI Components
interface SelectionToolsProps {
  currentMode: string;
  onSetSelectionMode: () => void;
  onClearSelection: () => void;
  selectedCount: number;
}

export const SelectionTools: React.FC<SelectionToolsProps> = ({
  currentMode,
  onSetSelectionMode,
  onClearSelection,
  selectedCount,
}) => {
  const duplicateSelection = useEditorStore(s => s.duplicateSelection);
  return (
    <div className="selection-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PluginButton
        icon={<Pointer size={16} />}
        text="Selection Mode"
        color="#007acc"
        active={currentMode === 'select'}
        disabled={false}
        onPointerDown={onSetSelectionMode}
      />
      <PluginButton
        icon={<XCircle size={16} />}
        text="Clear Selection"
        color="#dc3545"
        active={false}
        disabled={selectedCount === 0}
        onPointerDown={onClearSelection}
      />
      <PluginButton
        icon={<Copy size={16} />}
        text="Duplicar selección"
        color="#28a745"
        active={false}
        disabled={selectedCount === 0}
        onPointerDown={duplicateSelection}
      />
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        textAlign: 'center',
        padding: '8px',
        background: '#f0f0f0',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
};

export const SelectionToolsComponent: React.FC = () => {
  const { mode, selection, clearSelection } = useEditorStore();
  // Usar toolModeManager para cambiar el modo global
  
  const selectedCount = 
    selection.selectedPaths.length + 
    selection.selectedSubPaths.length + 
    selection.selectedCommands.length +
    (selection.selectedTexts?.length || 0) +
    (selection.selectedImages?.length || 0) +
    (selection.selectedUses?.length || 0) +
    (selection.selectedGroups?.length || 0);
  
  return (
    <div>
      <SelectionTools
        currentMode={mode.current}
        onSetSelectionMode={() => toolModeManager.setMode('select')}
        onClearSelection={clearSelection}
        selectedCount={selectedCount}
      />
    </div>
  );
};

// Combined Selection Plugin
export const SelectionPlugin: Plugin = {
  id: 'selection',
  name: 'Selection',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],

  initialize: (editor) => {
    rectSelectionManager.setEditorStore(editor);
  },

  pointerHandlers: {
    onPointerDown: rectSelectionManager.handlePointerDown,
    onPointerMove: rectSelectionManager.handlePointerMove,
    onPointerUp: rectSelectionManager.handlePointerUp,
  },

  shortcuts: [
    {
      key: 'v',
      description: 'Selection Tool',
      action: () => {
        toolModeManager.setMode('select');
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select All',
      action: () => {
        const store = useEditorStore.getState();
        
        // Get all element IDs that are children of groups (we want to select these instead of the groups)
        const groupChildrenIds = new Set<string>();
        store.groups.forEach(group => {
          if (!group.locked) {
            group.children.forEach(child => {
              groupChildrenIds.add(child.id);
            });
          }
        });
        
        // Collect all element IDs, filtering out locked elements
        // Include group children but exclude the groups themselves
        const allPaths = store.paths
          .filter(p => !p.style?.filter?.includes('locked'))
          .map(p => p.id);
        
        // For sub-paths, include all from all paths (including those in groups)
        const allSubPaths = store.paths
          .flatMap(path => 
            path.subPaths
              .filter(subPath => !subPath.locked)
              .map(subPath => subPath.id)
          );
        
        const allTexts = store.texts
          .filter(t => !t.locked)
          .map(t => t.id);
        const allTextPaths = store.textPaths
          .filter(tp => !tp.locked)
          .map(tp => tp.id);
        const allImages = store.images
          .filter(i => !i.locked)
          .map(i => i.id);
        const allClipPaths = store.clipPaths
          .filter(cp => !cp.locked)
          .map(cp => cp.id);
        const allMasks = store.masks
          .filter(m => !m.locked)
          .map(m => m.id);
        const allFilters = store.filters
          .filter(f => !f.locked)
          .map(f => f.id);
        const allMarkers = store.markers
          .filter(m => !m.locked)
          .map(m => m.id);
        const allSymbols = store.symbols
          .filter(s => !s.locked)
          .map(s => s.id);
        const allUses = store.uses
          .filter(u => !u.locked)
          .map(u => u.id);
        
        // Build complete selection state with all individual elements, NO groups
        useEditorStore.setState({
          selection: {
            ...store.selection,
            selectedPaths: allPaths,
            selectedSubPaths: allSubPaths,
            selectedCommands: [],
            selectedControlPoints: [],
            selectedTexts: allTexts,
            selectedTextSpans: [],
            selectedTextPaths: allTextPaths,
            selectedGroups: [], // Empty - we don't select groups, only their contents
            selectedImages: allImages,
            selectedClipPaths: allClipPaths,
            selectedMasks: allMasks,
            selectedFilters: allFilters,
            selectedMarkers: allMarkers,
            selectedSymbols: allSymbols,
            selectedUses: allUses,
          }
        });
      }
    },
    {
      key: 'Escape',
      modifiers: ['shift'],
      description: 'Deselect All',
      action: () => {
        const store = useEditorStore.getState();
        store.clearSelection();
      }
    }
  ],

  ui: [
    {
      id: 'selection-tools',
      component: SelectionToolsComponent,
      position: 'sidebar',
      order: 0
    },
    {
      id: 'selection-rect-renderer',
      component: SelectionRectRenderer,
      position: 'svg-content',
      order: 100,
    },
  ]
};
