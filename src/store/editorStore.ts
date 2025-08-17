import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState } from '../types';
import { saveEditorState, loadEditorState, debounce } from '../utils/persistence';

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
  AnimationActions {}

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
          }
        ],
        style: {
          fill: 'none',
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
          fill: '#4f46e5',
          stroke: 'none'
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
      }
    ],
    textPaths: [],
    groups: [
      {
        id: 'test-group-1',
        name: 'Sample Group',
        children: [
          { type: 'path', id: 'test-path-1' }
        ],
        transform: 'translate(50, 50)',
        style: {},
        locked: false,
        visible: true
      }
    ],
    gradients: [],
    images: [
      {
        id: 'test-image-1',
        type: 'image',
        x: 500,
        y: 50,
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
        x: 600,
        y: 200,
        href: '#test-symbol-1',
        style: {},
        transform: 'scale(2)',
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
      enabled: true,
      size: 10,
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
      hidePointsInSelect: false,
      showGroupsFrame: false,
      stickyGuidelinesEnabled: false
    },
    renderVersion: 0,
    precision: 2,
    shapeSize: 50,
    visualDebugSizes: {
      globalFactor: 1.0,
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
    // Floating toolbar state
    isFloatingToolbarHidden: false,
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
  }))
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
          previousSelection = selection;
          handleManager.onSelectionChanged();
        }
      }
    );
  }, 0);
}