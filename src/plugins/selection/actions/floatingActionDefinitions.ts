import { FloatingActionDefinition } from '../../../types/floatingToolbar';
import { singleElementActions } from './singleElementActions';
import { multipleSelectionActions } from './multipleSelectionActions';
import { groupActions } from './groupActions';
import { subPathActions } from './subPathActions';
import { imageActions } from './imageActions';
import { useActions, symbolActions } from './useActions';
import { textActions } from './textActions';
import { mixedSelectionActions } from './mixedSelectionActions';

// Single element selection
export const singleElementFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path', 'text', 'image', 'use'],
  selectionTypes: ['single'],
  actions: singleElementActions,
  priority: 80
};

// Multiple element selection of same type
export const multipleSelectionFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path', 'text', 'image', 'use'],
  selectionTypes: ['multiple'],
  actions: multipleSelectionActions,
  priority: 75
};

// Group selection
export const groupFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['group'],
  selectionTypes: ['single', 'multiple'],
  actions: groupActions,
  priority: 90
};

// SubPath selection
export const subPathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['subpath'],
  selectionTypes: ['single', 'multiple'],
  actions: subPathActions,
  priority: 85
};

// Path selection
export const pathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path'],
  selectionTypes: ['single', 'multiple'],
  actions: subPathActions, // Paths use similar actions to subpaths
  priority: 85
};

// Image selection
export const imageFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['image'],
  selectionTypes: ['single', 'multiple'],
  actions: imageActions,
  priority: 80
};

// Use element (symbol) selection
export const symbolFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['use'],
  selectionTypes: ['single', 'multiple'],
  actions: symbolActions,
  priority: 80
};

// Text selection
export const textFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['text'],
  selectionTypes: ['single', 'multiple'],
  actions: textActions,
  priority: 80
};

// Mixed selection (different element types)
export const mixedSelectionFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['mixed'],
  selectionTypes: ['multiple'],
  actions: mixedSelectionActions,
  priority: 95 // Higher priority than individual element types to ensure mixed selection takes precedence
};

// Export all definitions as an array for easy registration
export const allFloatingActionDefinitions: FloatingActionDefinition[] = [
  groupFloatingActionDefinition,
  subPathFloatingActionDefinition,
  pathFloatingActionDefinition,
  imageFloatingActionDefinition,
  symbolFloatingActionDefinition,
  textFloatingActionDefinition,
  singleElementFloatingActionDefinition,
  multipleSelectionFloatingActionDefinition,
  mixedSelectionFloatingActionDefinition
];