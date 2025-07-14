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

    if (mode.current === 'select' && !commandId && !controlPoint && e.button === 0 && !e.shiftKey) {
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
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, texts, selectMultiple, clearSelection, selectInBox } = this.editorStore;
      
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
    (selection.selectedTexts?.length || 0);
  
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
        const allCommandIds = store.paths.flatMap(path => 
          path.subPaths.flatMap(subPath => 
            subPath.commands.map(cmd => cmd.id)
          )
        );
        store.selectMultiple(allCommandIds, 'commands');
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
