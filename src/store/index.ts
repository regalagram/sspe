// Export all action types for easier importing
export type { ViewportActions } from './viewportActions';
export type { SelectionActions } from './selectionActions';
export type { PathActions } from './pathActions';
export type { CommandActions } from './commandActions';
export type { UIStateActions } from './uiStateActions';
export type { HistoryActions } from './historyActions';
export type { TransformActions } from './transformActions';

// Export the main store
export { useEditorStore } from './editorStore';

// Combined actions type for convenience
import type { ViewportActions } from './viewportActions';
import type { SelectionActions } from './selectionActions';
import type { PathActions } from './pathActions';
import type { CommandActions } from './commandActions';
import type { UIStateActions } from './uiStateActions';
import type { HistoryActions } from './historyActions';
import type { TransformActions } from './transformActions';

export interface AllEditorActions extends 
  ViewportActions, 
  SelectionActions, 
  PathActions, 
  CommandActions, 
  UIStateActions, 
  HistoryActions, 
  TransformActions {}