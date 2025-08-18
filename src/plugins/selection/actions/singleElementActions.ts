import { ToolbarAction } from '../../../types/floatingToolbar';
import { createDuplicateAction, createDeleteAction } from './commonActions';

export const singleElementActions: ToolbarAction[] = [
  createDuplicateAction(20),
  createDeleteAction(10)
];