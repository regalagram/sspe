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
    paths: [],
    texts: [],
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
      hidePointsInSelect: false
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