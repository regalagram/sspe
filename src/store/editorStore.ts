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
import { GradientActions, createGradientActions } from './gradientActions';
import { GroupActions, createGroupActions } from './groupActions';
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
  GradientActions,
  GroupActions {}

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
          fill: '#000000'
        }
      }
    ],
    groups: [],
    gradients: [],
    selection: {
      selectedPaths: [],
      selectedSubPaths: [],
      selectedCommands: [],
      selectedControlPoints: [],
      selectedTexts: [],
      selectedTextSpans: [],
      selectedGroups: [],
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
      snapToGrid: true,
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
    enabledFeatures: {
      commandPointsEnabled: false, 
      controlPointsEnabled: false, 
      wireframeEnabled: false,
      hidePointsInSelect: false,
      showGroupsFrame: false,
      guidelinesEnabled: true
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
    ...createGradientActions(set, get, api),
    ...createGroupActions(set, get, api),
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
  }, 0);
}