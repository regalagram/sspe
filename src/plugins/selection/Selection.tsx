import React, { useState, MouseEvent } from 'react';
import { Plugin, MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { MousePointer2, XCircle } from 'lucide-react';
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

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
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

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
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

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, selectMultiple, clearSelection } = this.editorStore;
      
      const hasSignificantArea = this.state.selectionRect.width > 5 || this.state.selectionRect.height > 5;
      
      if (hasSignificantArea) {
        const commandsInRect: { commandId: string; subPathId: string; pathId: string }[] = [];
        const subPathsWithCommands = new Set<string>();
        
        paths.forEach((path: any) => {
          path.subPaths.forEach((subPath: any) => {
            subPath.commands.forEach((command: any) => {
              const pos = getCommandPosition(command);
              if (pos && 
                pos.x >= this.state.selectionRect!.x &&
                pos.x <= this.state.selectionRect!.x + this.state.selectionRect!.width &&
                pos.y >= this.state.selectionRect!.y &&
                pos.y <= this.state.selectionRect!.y + this.state.selectionRect!.height
              ) {
                commandsInRect.push({
                  commandId: command.id,
                  subPathId: subPath.id,
                  pathId: path.id
                });
                subPathsWithCommands.add(subPath.id);
              }
            });
          });
        });

        // Add Z commands from sub-paths that have other commands selected
        paths.forEach((path: any) => {
          path.subPaths.forEach((subPath: any) => {
            if (subPathsWithCommands.has(subPath.id)) {
              subPath.commands.forEach((command: any) => {
                const pos = getCommandPosition(command);
                if (!pos && !commandsInRect.some(item => item.commandId === command.id)) {
                  commandsInRect.push({
                    commandId: command.id,
                    subPathId: subPath.id,
                    pathId: path.id
                  });
                }
              });
            }
          });
        });

        if (commandsInRect.length > 0) {
          const subPathGroups = new Map<string, { commandIds: string[]; totalCommands: number }>();
          
          commandsInRect.forEach(({ commandId, subPathId }) => {
            if (!subPathGroups.has(subPathId)) {
              subPathGroups.set(subPathId, { commandIds: [], totalCommands: 0 });
            }
            subPathGroups.get(subPathId)!.commandIds.push(commandId);
          });
          
          paths.forEach((path: any) => {
            path.subPaths.forEach((subPath: any) => {
              if (subPathGroups.has(subPath.id)) {
                subPathGroups.get(subPath.id)!.totalCommands = subPath.commands.length;
              }
            });
          });
          
          let allCommandsBelongToCompleteSubPaths = true;
          const completeSubPathIds: string[] = [];
          
          subPathGroups.forEach((group, subPathId) => {
            if (group.commandIds.length === group.totalCommands) {
              completeSubPathIds.push(subPathId);
            } else {
              allCommandsBelongToCompleteSubPaths = false;
            }
          });
          
          if (allCommandsBelongToCompleteSubPaths && completeSubPathIds.length > 0) {
            const { selectSubPathMultiple } = this.editorStore;
            selectSubPathMultiple(completeSubPathIds[0], false);
            for (let i = 1; i < completeSubPathIds.length; i++) {
              selectSubPathMultiple(completeSubPathIds[i], true);
            }
          } else {
            const selectedCommandIds = commandsInRect
              .filter(item => {
                for (const path of paths) {
                  for (const subPath of path.subPaths) {
                    const command = subPath.commands.find((cmd: any) => cmd.id === item.commandId);
                    if (command) {
                      return getCommandPosition(command) !== null;
                    }
                  }
                }
                return false;
              })
              .map(item => item.commandId);
            selectMultiple(selectedCommandIds, 'commands');
          }
        } else {
          clearSelection();
        }
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
  return (
    <div className="selection-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PluginButton
        icon={<MousePointer2 size={16} />}
        text="Selection Mode"
        color="#007acc"
        active={currentMode === 'select'}
        disabled={false}
        onClick={onSetSelectionMode}
      />
      <PluginButton
        icon={<XCircle size={16} />}
        text="Clear Selection"
        color="#dc3545"
        active={false}
        disabled={selectedCount === 0}
        onClick={onClearSelection}
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
  const { mode, selection, setMode, clearSelection } = useEditorStore();
  
  const selectedCount = 
    selection.selectedPaths.length + 
    selection.selectedSubPaths.length + 
    selection.selectedCommands.length;
  
  return (
    <div>
      <SelectionTools
        currentMode={mode.current}
        onSetSelectionMode={() => setMode('select')}
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
  dependencies: ['mouse-interaction'],
  
  initialize: (editor) => {
    rectSelectionManager.setEditorStore(editor);
  },
  
  mouseHandlers: {
    onMouseDown: rectSelectionManager.handleMouseDown,
    onMouseMove: rectSelectionManager.handleMouseMove,
    onMouseUp: rectSelectionManager.handleMouseUp,
  },
  
  shortcuts: [
    {
      key: 'v',
      description: 'Selection Tool',
      plugin: 'selection',
      action: () => {
        toolModeManager.setMode('select');
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select All',
      plugin: 'selection',
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
      description: 'Deselect All',
      plugin: 'selection',
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
