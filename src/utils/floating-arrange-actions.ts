import { 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
  LayoutGrid
} from 'lucide-react';
import { ToolbarAction } from '../types/floatingToolbar';
import { useEditorStore } from '../store/editorStore';
import { arrangeManager } from '../plugins/arrange/ArrangeManager';

// Helper functions for selection validation
const getSubPathSelectionCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedSubPaths.length;
};

const canAlignSubPaths = () => getSubPathSelectionCount() >= 2;
const canDistributeSubPaths = () => getSubPathSelectionCount() >= 3;

// Helper function to setup arrange manager
const setupArrangeManager = () => {
  const store = useEditorStore.getState();
  arrangeManager.setEditorStore(store);
};

// Arrange actions for subpaths
export const createSubPathArrangeActions = (): ToolbarAction[] => [
  {
    id: 'arrange-subpaths',
    icon: LayoutGrid,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: [
        // Alignment options
        {
          id: 'align-subpaths-left',
          icon: AlignLeft,
          label: 'Align Left',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignLeft();
          },
          disabled: () => !canAlignSubPaths()
        },
        {
          id: 'align-subpaths-center',
          icon: AlignCenter,
          label: 'Align Center',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignCenter();
          },
          disabled: () => !canAlignSubPaths()
        },
        {
          id: 'align-subpaths-right',
          icon: AlignRight,
          label: 'Align Right',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignRight();
          },
          disabled: () => !canAlignSubPaths()
        },
        {
          id: 'align-subpaths-top',
          icon: AlignVerticalJustifyStart,
          label: 'Align Top',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignTop();
          },
          disabled: () => !canAlignSubPaths()
        },
        {
          id: 'align-subpaths-middle',
          icon: AlignVerticalJustifyCenter,
          label: 'Align Middle',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignMiddle();
          },
          disabled: () => !canAlignSubPaths()
        },
        {
          id: 'align-subpaths-bottom',
          icon: AlignVerticalJustifyEnd,
          label: 'Align Bottom',
          action: () => {
            if (!canAlignSubPaths()) return;
            setupArrangeManager();
            arrangeManager.alignBottom();
          },
          disabled: () => !canAlignSubPaths()
        },
        // Distribution options (only show for 3+ subpaths)
        {
          id: 'distribute-subpaths-horizontally',
          icon: ArrowLeftRight,
          label: 'Distribute Horizontally',
          action: () => {
            if (!canDistributeSubPaths()) return;
            setupArrangeManager();
            arrangeManager.distributeHorizontally();
          },
          disabled: () => !canDistributeSubPaths()
        },
        {
          id: 'distribute-subpaths-vertically',
          icon: ArrowUpDown,
          label: 'Distribute Vertically',
          action: () => {
            if (!canDistributeSubPaths()) return;
            setupArrangeManager();
            arrangeManager.distributeVertically();
          },
          disabled: () => !canDistributeSubPaths()
        }
      ]
    },
    priority: 750,
    tooltip: 'Align and distribute subpaths',
    visible: () => canAlignSubPaths() || canDistributeSubPaths()
  }
];

// Helper functions for command points
const getSelectedCommandCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedCommands.length;
};

const canAlignCommands = () => getSelectedCommandCount() >= 2;
const canDistributeCommands = () => getSelectedCommandCount() >= 3;

// Arrange actions for command points - using unified ArrangeManager
export const createCommandArrangeActions = (): ToolbarAction[] => [
  {
    id: 'arrange-commands',
    icon: LayoutGrid,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: [
        // Alignment options
        {
          id: 'align-commands-left',
          icon: AlignLeft,
          label: 'Align Left',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignLeft();
          },
          disabled: () => !canAlignCommands()
        },
        {
          id: 'align-commands-center',
          icon: AlignCenter,
          label: 'Align Center',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignCenter();
          },
          disabled: () => !canAlignCommands()
        },
        {
          id: 'align-commands-right',
          icon: AlignRight,
          label: 'Align Right',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignRight();
          },
          disabled: () => !canAlignCommands()
        },
        {
          id: 'align-commands-top',
          icon: AlignVerticalJustifyStart,
          label: 'Align Top',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignTop();
          },
          disabled: () => !canAlignCommands()
        },
        {
          id: 'align-commands-middle',
          icon: AlignVerticalJustifyCenter,
          label: 'Align Middle',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignMiddle();
          },
          disabled: () => !canAlignCommands()
        },
        {
          id: 'align-commands-bottom',
          icon: AlignVerticalJustifyEnd,
          label: 'Align Bottom',
          action: () => {
            if (!canAlignCommands()) return;
            setupArrangeManager();
            arrangeManager.alignBottom();
          },
          disabled: () => !canAlignCommands()
        },
        // Distribution options
        {
          id: 'distribute-commands-horizontally',
          icon: ArrowLeftRight,
          label: 'Distribute Horizontally',
          action: () => {
            if (!canDistributeCommands()) return;
            setupArrangeManager();
            arrangeManager.distributeHorizontally();
          },
          disabled: () => !canDistributeCommands()
        },
        {
          id: 'distribute-commands-vertically',
          icon: ArrowUpDown,
          label: 'Distribute Vertically',
          action: () => {
            if (!canDistributeCommands()) return;
            setupArrangeManager();
            arrangeManager.distributeVertically();
          },
          disabled: () => !canDistributeCommands()
        }
      ]
    },
    priority: 750,
    tooltip: 'Align and distribute command points',
    visible: () => canAlignCommands() || canDistributeCommands()
  }
];

// Generic helper for other element types - can be reused for mixed selections, texts, images, etc.
export const createGenericArrangeActions = (
  elementType: string,
  getSelectionCount: () => number,
  alignActions: {
    alignLeft: () => void;
    alignCenter: () => void;
    alignRight: () => void;
    alignTop: () => void;
    alignMiddle: () => void;
    alignBottom: () => void;
    distributeHorizontally: () => void;
    distributeVertically: () => void;
  }
): ToolbarAction[] => {
  const canAlign = () => getSelectionCount() >= 2;
  const canDistribute = () => getSelectionCount() >= 3;

  return [
    {
      id: `arrange-${elementType}`,
      icon: LayoutGrid,
      label: 'Arrange',
      type: 'dropdown',
      dropdown: {
        options: [
          // Alignment options
          {
            id: `align-${elementType}-left`,
            icon: AlignLeft,
            label: 'Align Left',
            action: alignActions.alignLeft,
            disabled: () => !canAlign()
          },
          {
            id: `align-${elementType}-center`,
            icon: AlignCenter,
            label: 'Align Center',
            action: alignActions.alignCenter,
            disabled: () => !canAlign()
          },
          {
            id: `align-${elementType}-right`,
            icon: AlignRight,
            label: 'Align Right',
            action: alignActions.alignRight,
            disabled: () => !canAlign()
          },
          {
            id: `align-${elementType}-top`,
            icon: AlignVerticalJustifyStart,
            label: 'Align Top',
            action: alignActions.alignTop,
            disabled: () => !canAlign()
          },
          {
            id: `align-${elementType}-middle`,
            icon: AlignVerticalJustifyCenter,
            label: 'Align Middle',
            action: alignActions.alignMiddle,
            disabled: () => !canAlign()
          },
          {
            id: `align-${elementType}-bottom`,
            icon: AlignVerticalJustifyEnd,
            label: 'Align Bottom',
            action: alignActions.alignBottom,
            disabled: () => !canAlign()
          },
          // Distribution options (only show for 3+ elements)
          {
            id: `distribute-${elementType}-horizontally`,
            icon: ArrowLeftRight,
            label: 'Distribute Horizontally',
            action: alignActions.distributeHorizontally,
            disabled: () => !canDistribute()
          },
          {
            id: `distribute-${elementType}-vertically`,
            icon: ArrowUpDown,
            label: 'Distribute Vertically',
            action: alignActions.distributeVertically,
            disabled: () => !canDistribute()
          }
        ]
      },
      priority: 920,
      tooltip: `Align and distribute ${elementType}`,
      visible: () => canAlign() || canDistribute()
    }
  ];
};