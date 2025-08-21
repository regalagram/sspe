import { Plugin } from '../../core/PluginSystem';
import { 
  FloatingActionDefinition, 
  ToolbarAction 
} from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { 
  hasExactlyOneSpecialPointSelected,
  getSpecialPointFromSelection,
  selectInitialPoint,
  selectFinalPoint,
  separateSpecialPoints
} from '../../utils/special-point-utils';
import { 
  ArrowRightFromLine,
  ArrowLeftFromLine,
  Split
} from 'lucide-react';

// Special point actions
const getSpecialPointActions = (): ToolbarAction[] => [
  {
    id: 'select-initial-point',
    icon: ArrowRightFromLine,
    label: 'Select Initial',
    type: 'button',
    action: selectInitialPoint,
    priority: 100,
    tooltip: 'Select initial point (green semicircle)',
    visible: () => hasExactlyOneSpecialPointSelected()
  },
  {
    id: 'select-final-point',
    icon: ArrowLeftFromLine,
    label: 'Select Final',
    type: 'button',
    action: selectFinalPoint,
    priority: 95,
    tooltip: 'Select final point (red semicircle)',
    visible: () => hasExactlyOneSpecialPointSelected()
  },
  {
    id: 'separate-points',
    icon: Split,
    label: 'Separate',
    type: 'button',
    action: separateSpecialPoints,
    priority: 90,
    tooltip: 'Separate initial and final points',
    visible: () => {
      if (!hasExactlyOneSpecialPointSelected()) return false;
      
      // Don't show separate button for Z commands
      const specialInfo = getSpecialPointFromSelection();
      if (!specialInfo) return false;
      
      return specialInfo.finalCommand.command !== 'Z';
    }
  }
];

// Define floating actions specifically for special points
const specialPointFloatingActions: FloatingActionDefinition[] = [
  {
    elementTypes: ['command'],
    selectionTypes: ['single', 'multiple'], // Allow single point or point pair
    actions: getSpecialPointActions(),
    priority: 120 // Higher than regular command actions (100)
  }
];

export const SpecialPointFloatingActionsPlugin: Plugin = {
  id: 'special-point-floating-actions',
  name: 'Special Point Floating Actions',
  version: '1.0.0',
  enabled: true,
  
  floatingActions: specialPointFloatingActions,
  
  initialize: () => {
    // Plugin initialization if needed
  }
};