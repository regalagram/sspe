import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { temporal } from 'zundo';
import { EditorState } from '../types';
import { saveEditorState, loadEditorState, debounce } from '../utils/persistence';
import { calculateStateDiff, getCurrentDiffConfig } from './diffConfig';

// Import action creators
import { ViewportActions, createViewportActions } from './viewportActions';
import { SelectionActions, createSelectionActions } from './selectionActions';
import { PathActions, createPathActions } from './pathActions';
import { CommandActions, createCommandActions } from './commandActions';
import { UIStateActions, createUIStateActions } from './uiStateActions';
import { HistoryActions, createHistoryActions } from './historyActions';
import { TransformActions, createTransformActions } from './transformActions';
import { TextActions, createTextActions } from './textActions';
import { TextPathActions, createTextPathActions } from './textPathActions';
import { GradientActions, createGradientActions } from './gradientActions';
import { GroupActions, createGroupActions } from './groupActions';
import { SVGElementActions, createSVGElementActions } from './svgElementActions';
import { AnimationActions, createAnimationActions } from './animationActions';
import { FormatCopyActions, createFormatCopyActions } from './formatCopyActions';
import { TextFormatCopyActions, createTextFormatCopyActions } from './textFormatCopyActions';
import { ImageFormatCopyActions, createImageFormatCopyActions } from './imageFormatCopyActions';
import { UseFormatCopyActions, createUseFormatCopyActions } from './useFormatCopyActions';
import { DeepSelectionActions, createDeepSelectionActions } from './deepSelectionActions';
import { ToolSettingsActions, createToolSettingsActions } from './toolSettingsActions';
import { handleManager } from '../plugins/handles/HandleManager';

// Combined actions interface
interface EditorActions extends 
  ViewportActions, 
  SelectionActions, 
  PathActions, 
  CommandActions, 
  UIStateActions, 
  HistoryActions, 
  TransformActions,
  TextActions,
  TextPathActions,
  GradientActions,
  GroupActions,
  SVGElementActions,
  AnimationActions,
  FormatCopyActions,
  TextFormatCopyActions,
  ImageFormatCopyActions,
  UseFormatCopyActions,
  DeepSelectionActions,
  ToolSettingsActions {}

const loadInitialState = (): EditorState => {
  const savedState = loadEditorState();
  
  const baseState: EditorState = {
    paths: [
      {
        id: 'test-path-1',
        subPaths: [
          {
            id: 'test-subpath-1',
            commands: [
              { id: 'cmd-1', command: 'M', x: 100, y: 100 },
              { id: 'cmd-2', command: 'L', x: 200, y: 100 },
              { id: 'cmd-3', command: 'L', x: 200, y: 200 },
              { id: 'cmd-4', command: 'L', x: 100, y: 200 },
              { id: 'cmd-5', command: 'Z' }
            ]
          },
          {
            id: 'test-subpath-inner',
            commands: [
              { id: 'cmd-inner-1', command: 'M', x: 125, y: 125 },
              { id: 'cmd-inner-2', command: 'L', x: 175, y: 125 },
              { id: 'cmd-inner-3', command: 'L', x: 175, y: 175 },
              { id: 'cmd-inner-4', command: 'L', x: 125, y: 175 },
              { id: 'cmd-inner-5', command: 'Z' }
            ]
          },
          {
            id: 'test-subpath-smallest',
            commands: [
              { id: 'cmd-small-1', command: 'M', x: 140, y: 140 },
              { id: 'cmd-small-2', command: 'L', x: 160, y: 140 },
              { id: 'cmd-small-3', command: 'L', x: 160, y: 160 },
              { id: 'cmd-small-4', command: 'L', x: 140, y: 160 },
              { id: 'cmd-small-5', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: 'rgba(0,0,255,0.3)',
          stroke: '#0000ff',
          strokeWidth: 2
        }
      },
      {
        id: 'test-path-2',
        subPaths: [
          {
            id: 'test-subpath-2',
            commands: [
              { id: 'cmd-6', command: 'M', x: 300, y: 150 },
              { id: 'cmd-7', command: 'L', x: 400, y: 150 },
              { id: 'cmd-8', command: 'L', x: 350, y: 250 },
              { id: 'cmd-9', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: 'none',
          stroke: '#ff0000',
          strokeWidth: 2
        }
      },
      {
        id: 'symbol-path-1',
        subPaths: [
          {
            id: 'symbol-subpath-1',
            commands: [
              { id: 'symbol-cmd-1', command: 'M', x: 10, y: 10 },
              { id: 'symbol-cmd-2', command: 'L', x: 40, y: 10 },
              { id: 'symbol-cmd-3', command: 'L', x: 25, y: 40 },
              { id: 'symbol-cmd-4', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: '#4f46e5'
        }
      },
      {
        id: '1755464720882-1',
        subPaths: [
          {
            id: 'rect-subpath-1',
            commands: [
              { id: 'rect-cmd-1', command: 'M', x: 130, y: 330 },
              { id: 'rect-cmd-2', command: 'L', x: 208, y: 330 },
              { id: 'rect-cmd-3', command: 'L', x: 208, y: 385 },
              { id: 'rect-cmd-4', command: 'L', x: 130, y: 385 },
              { id: 'rect-cmd-5', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: '#94a3b8',
          stroke: '#000000',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }
      },
      {
        id: '1755464724932-9',
        subPaths: [
          {
            id: 'triangle-subpath-1',
            commands: [
              { id: 'triangle-cmd-1', command: 'M', x: 350, y: 315 },
              { id: 'triangle-cmd-2', command: 'L', x: 390, y: 380 },
              { id: 'triangle-cmd-3', command: 'L', x: 310, y: 380 },
              { id: 'triangle-cmd-4', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: 'url(#gradient-1755464778642-nv8m10iby)',
          stroke: '#000000',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }
      },
      {
        id: '1755464728680-16',
        subPaths: [
          {
            id: 'star-subpath-1',
            commands: [
              { id: 'star-cmd-1', command: 'M', x: 165, y: 427 },
              { id: 'star-cmd-2', command: 'L', x: 174, y: 453 },
              { id: 'star-cmd-3', command: 'L', x: 202, y: 454 },
              { id: 'star-cmd-4', command: 'L', x: 179, y: 471 },
              { id: 'star-cmd-5', command: 'L', x: 188, y: 498 },
              { id: 'star-cmd-6', command: 'L', x: 165, y: 482 },
              { id: 'star-cmd-7', command: 'L', x: 142, y: 498 },
              { id: 'star-cmd-8', command: 'L', x: 150, y: 471 },
              { id: 'star-cmd-9', command: 'L', x: 127, y: 454 },
              { id: 'star-cmd-10', command: 'L', x: 155, y: 453 },
              { id: 'star-cmd-11', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: 'url(#gradient-1755464783148-cnj6g98uk)',
          stroke: '#000000',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }
      },
      {
        id: '1755464732383-30',
        subPaths: [
          {
            id: 'circle-subpath-1',
            commands: [
              { id: 'circle-cmd-1', command: 'M', x: 313.25875, y: 467.96921875 },
              { id: 'circle-cmd-2', command: 'C', x1: 313.25875, y1: 446.29921875, x2: 330.82875, y2: 428.73921874999996, x: 352.48875, y: 428.73921874999996 },
              { id: 'circle-cmd-3', command: 'C', x1: 374.15875000000005, y1: 428.73921874999996, x2: 391.71875, y2: 446.29921875, x: 391.71875, y: 467.96921875 },
              { id: 'circle-cmd-4', command: 'C', x1: 391.71875, y1: 489.61921874999996, x2: 374.15875000000005, y2: 507.19921875, x: 352.48875, y: 507.19921875 },
              { id: 'circle-cmd-5', command: 'C', x1: 330.82875, y1: 507.19921875, x2: 313.25875, y2: 489.61921874999996, x: 313.25875, y: 467.96921875 },
              { id: 'circle-cmd-6', command: 'Z' }
            ]
          }
        ],
        style: {
          fill: 'url(#pattern-diagonal)',
          stroke: '#000000',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }
      }
    ],
    texts: [
      {
        id: 'test-text-1',
        type: 'text',
        x: 100,
        y: 50,
        content: 'Test Text',
        style: {
          fontSize: 16,
          fontFamily: 'Verdana',
          fill: '#000000'
        }
      },
      {
        id: 'test-multiline-text-1',
        type: 'multiline-text',
        x: 200,
        y: 250,
        spans: [
          { id: 'span-1', content: 'First Line' },
          { id: 'span-2', content: 'Second Line' },
          { id: 'span-3', content: 'Third Line' }
        ],
        style: {
          fontSize: 18,
          fontFamily: 'Verdana',
          fill: '#ff0000',
          lineHeight: 1.2
        }
      },
      {
        id: '1755464812549-39',
        type: 'text',
        x: 202,
        y: 434,
        content: 'Text',
        style: {
          fontSize: 42,
          fontFamily: 'Verdana',
          fontWeight: 'bold',
          fill: '#000000'
        }
      }
    ],
    textPaths: [],
    groups: [
      {
        id: 'shapes-group-1',
        name: 'Shapes Group',
        children: [
          { type: 'path', id: '1755464720882-1' },
          { type: 'path', id: '1755464724932-9' },
          { type: 'path', id: '1755464728680-16' },
          { type: 'path', id: '1755464732383-30' },
          { type: 'text', id: '1755464812549-39' }
        ],
        transform: '',
        style: {},
        locked: false,
        visible: true
      }
    ],
    gradients: [
      {
        id: 'gradient-1755464778642-nv8m10iby',
        type: 'radial',
        cx: 0.5,
        cy: 0.5,
        r: 0.5,
        gradientUnits: 'objectBoundingBox',
        stops: [
          { id: 'stop-1755464778642-cokxq2pva', offset: 0, color: '#ffeaa7' },
          { id: 'stop-1755464778642-ps5kh2tjp', offset: 100, color: '#fab1a0' }
        ]
      },
      {
        id: 'gradient-1755464783148-cnj6g98uk',
        type: 'linear',
        x1: 1,
        y1: 0.5,
        x2: 0,
        y2: 0.5,
        gradientUnits: 'objectBoundingBox',
        stops: [
          { id: 'stop-1755464783148-gk2t8b5lh', offset: 0, color: '#c471ed' },
          { id: 'stop-1755464783148-ref46psi9', offset: 100, color: '#f64f59' }
        ]
      },
      {
        id: 'pattern-diagonal',
        type: 'pattern',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        patternUnits: 'userSpaceOnUse',
        content: '<path d="M0,10 L10,0" stroke="#374151" stroke-width="2"/>'
      }
    ],
    images: [
      {
        id: 'test-image-1',
        type: 'image',
        x: 300,
        y: 30,
        width: 100,
        height: 100,
        href: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRmNDZlNSIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=',
        style: {},
        transform: '',
        locked: false
      }
    ],
    clipPaths: [],
    masks: [],
    filters: [],
    markers: [],
    symbols: [
      {
        id: 'test-symbol-1',
        type: 'symbol',
        viewBox: '0 0 50 50',
        children: [
          { type: 'path', id: 'symbol-path-1' }
        ],
        locked: false
      }
    ],
    uses: [
      {
        id: 'test-use-1',
        type: 'use',
        x: 220,
        y: 120,
        width: 50,
        height: 50,
        href: '#test-symbol-1',
        style: {
          fill: '#4f46e5'
        },
        transform: '',
        locked: false
      }
    ],
    animations: [],
    animationState: {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1.0,
      loop: false,
      startTime: undefined,
      // Advanced animation state
      activeAnimations: [],
      pausedAnimations: [],
      completedAnimations: [],
      // Event system
      pendingEvents: [],
      eventListeners: new Map(),
      // Synchronization
      syncGroups: new Map(),
      timeline: [],
      chainDelays: new Map(),
    },
    selection: {
      selectedPaths: [],
      selectedSubPaths: [],
      selectedCommands: [],
      selectedControlPoints: [],
      selectedTexts: [],
      selectedTextSpans: [],
      selectedTextPaths: [],
      selectedGroups: [],
      selectedImages: [],
      selectedClipPaths: [],
      selectedMasks: [],
      selectedFilters: [],
      selectedFilterPrimitives: [],
      selectedMarkers: [],
      selectedSymbols: [],
      selectedUses: [],
      selectedAnimations: [],
      selectedGradients: [],
      selectedGradientStops: [],
    },
    viewport: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
    },
    grid: {
      enabled: false,
      size: 50,
      color: '#e0e0e0',
      opacity: 0.5,
      snapToGrid: false,
      showLabels: true,
    },
    mode: {
      current: 'select' as const,
    },
    history: {
      past: [],
      present: {} as EditorState,
      future: [],
      canUndo: false,
      canRedo: false,
    },
    isFullscreen: false,
    textEditState: {
      editingTextId: null
    },
    enabledFeatures: {
      commandPointsEnabled: false, 
      controlPointsEnabled: false, 
      wireframeEnabled: false,
  // Subpath-edit specific visibility flags
  subpathShowCommandPoints: true,
  subpathShowControlPoints: true,
      hidePointsInSelect: false,
      showGroupsFrame: false,
      stickyGuidelinesEnabled: false
    },
    renderVersion: 0,
    precision: 2,
    shapeSize: 50,
    toolSettings: {
      shared: {
        unifiedColor: '#6b7280', // Single color used by all tools
        strokeColor: '#6b7280', // Keep in sync with unified
        strokeWidth: 3,
        strokeOpacity: 1.0,
        strokeDasharray: 'none',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: '#6b7280', // Keep in sync with unified
        fillOpacity: 1,
        fillRule: 'nonzero',
        fontFamily: 'Arial, sans-serif',
        fontSize: 16
      }
    },
    visualDebugSizes: {
      globalFactor: 0.5,
      commandPointsFactor: 1.0,
      controlPointsFactor: 1.0,
      transformResizeFactor: 1.0,
      transformRotateFactor: 1.0,
    },
    // Animation synchronization support
    animationSync: {
      chains: [],
      events: [],
    },
    // UI visibility state
    ui: {
      selectionVisible: true,
    },
    // Floating toolbar state
    isFloatingToolbarHidden: false,
    // Format copy state
    formatCopyState: {
      isActive: false,
      copiedStyle: null,
      sourcePathId: null,
    },
    // Text format copy state
    textFormatCopyState: {
      isActive: false,
      copiedStyle: null,
      sourceTextId: null,
      sourceTextType: null,
    },
    // Use format copy state
    useFormatCopyState: {
      isActive: false,
      copiedStyle: null,
      sourceUseId: null,
    },
  };
  
  if (savedState && typeof savedState === 'object') {
    return {
      ...baseState,
      ...savedState,
      mode: { current: 'select' as const }
    };
  }
  
  return baseState;
};

const initialState = loadInitialState();

export const useEditorStore = create<EditorState & EditorActions>()(
  temporal(
    subscribeWithSelector((set, get, api) => ({
      ...initialState,
      ...createViewportActions(set, get, api),
      ...createSelectionActions(set, get, api),
      ...createPathActions(set, get, api),
      ...createCommandActions(set, get, api),
      ...createUIStateActions(set, get, api),
      ...createHistoryActions(set, get, api),
      ...createTransformActions(set, get, api),
      ...createTextActions(set, get, api),
      ...createTextPathActions(set, get, api),
      ...createGradientActions(set, get, api),
      ...createGroupActions(set, get, api),
      ...createSVGElementActions(set, get, api),
      ...createAnimationActions(set, get),
      ...createFormatCopyActions(set, get, api),
      ...createTextFormatCopyActions(set, get, api),
      ...createImageFormatCopyActions(set, get, api),
      ...createUseFormatCopyActions(set, get, api),
      ...createDeepSelectionActions(set, get, api),
      ...createToolSettingsActions(set, get, api),
    })),
    {
      // Zundo configuration
      limit: 50, // Maintain current limit
      
      // Exclude non-essential fields from history tracking
      partialize: (state) => {
        const { 
          history, 
          renderVersion, 
          floatingToolbarUpdateTimestamp,
          deepSelection,
          isSpecialPointSeparationAnimating,
          ...historicalState 
        } = state;
        return historicalState;
      },
      
      // Para optimización real de memoria, usaremos la estrategia 'partialize' 
      // en lugar de 'diff' para excluir campos innecesarios
      // La función diff de Zundo no está diseñada para almacenar estados parciales
      // diff: undefined, // Removemos la función diff problemática
      
      // Cool-off period to prevent excessive history entries during rapid changes
      handleSet: (handleSet) => {
        // Debounce with 300ms delay for smooth interactions
        let timeoutId: NodeJS.Timeout | null = null;
        return (partial, replace) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            handleSet(partial, replace);
            timeoutId = null;
          }, 300);
        };
      },
      
      // Prevent unchanged states from being stored
      equality: (pastState, currentState) => {
        // Simple deep comparison for most cases
        return JSON.stringify(pastState) === JSON.stringify(currentState);
      },
      
      // Callback for debugging/monitoring
      onSave: (pastState, currentState) => {
        if (process.env.NODE_ENV === 'development') {
          const diffConfig = getCurrentDiffConfig();
          console.log(`💾 Zundo State Saved (${diffConfig.mode} mode)`, { 
            mode: diffConfig.mode,
            pastState, 
            currentState 
          });
        }
      }
    }
  )
);

// Auto-save functionality
const debouncedSave = debounce('editor-autosave', (state: EditorState) => {
  const { history, ...rest } = state;
  saveEditorState({ ...rest });
}, 500);

if (typeof window !== 'undefined') {
  setTimeout(() => {
    useEditorStore.subscribe(
      state => state,
      debouncedSave
    );

    // Subscribe to selection changes to notify handle manager
    let previousSelection: EditorState['selection'] | null = null;
    useEditorStore.subscribe(
      state => state.selection,
      (selection) => {
        // Only notify if selection actually changed
        if (previousSelection !== selection) {
          // Debug: log previous vs new selection (stringified)
          // selection changed; notify handle manager (logs removed)
          previousSelection = selection;
          handleManager.onSelectionChanged();
        }
      }
    );
  }, 0);
}