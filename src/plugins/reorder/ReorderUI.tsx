import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { reorderManager } from './ReorderManager';
import { globalBringToFront, globalSendToBack, globalSendForward, globalSendBackward, initializeZIndexes } from '../../utils/z-index-manager';
import { bringGroupsToFront, sendGroupsToBack, sendGroupsForward, sendGroupsBackward } from '../../utils/group-reorder-manager';
import { handleMixedSelectionReorder } from '../../utils/mixed-selection-reorder';

interface ReorderUIProps {
  onClose?: () => void;
}

interface ButtonProps {
  onPointerDown: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onPointerDown, disabled, title, children }) => {
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    border: '1px solid #e5e7eb',
    borderRadius: '3px',
    background: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '24px',
    minWidth: '24px',
  };

  const disabledStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <button
      onPointerDown={disabled ? undefined : onPointerDown}
      disabled={disabled}
      title={title}
      style={disabled ? disabledStyle : buttonStyle}
    >
      {children}
    </button>
  );
};

export const ReorderUI: React.FC<ReorderUIProps> = ({ onClose }) => {
  const selection = useEditorStore((state) => state.selection);
  
  // Check if we have any element selection (not just subpaths)
  const hasSubPathSelection = selection.selectedSubPaths.length > 0;
  const hasElementSelection = selection.selectedPaths.length > 0 || 
                             selection.selectedTexts.length > 0 || 
                             selection.selectedImages.length > 0 || 
                             selection.selectedUses.length > 0;
  const hasGroupSelection = selection.selectedGroups.length > 0;
  const hasAnySelection = hasSubPathSelection || hasElementSelection || hasGroupSelection;

  const handleReorder = (type: string) => {
    if (!hasAnySelection) return;
    
    // Initialize z-indexes if needed for global operations
    initializeZIndexes();
    
    if (hasGroupSelection && !hasElementSelection && !hasSubPathSelection) {
      // Only groups selected - use group reorder system
      switch (type) {
        case 'toFront':
          bringGroupsToFront();
          break;
        case 'forward':
          sendGroupsForward();
          break;
        case 'backward':
          sendGroupsBackward();
          break;
        case 'toBack':
          sendGroupsToBack();
          break;
      }
    } else if (hasSubPathSelection && !hasElementSelection && !hasGroupSelection) {
      // Only subpaths selected - use existing ReorderManager
      switch (type) {
        case 'toFront':
          reorderManager.bringToFront();
          break;
        case 'forward':
          reorderManager.bringForward();
          break;
        case 'backward':
          reorderManager.sendBackward();
          break;
        case 'toBack':
          reorderManager.sendToBack();
          break;
      }
    } else if ((hasSubPathSelection || hasGroupSelection) && hasElementSelection) {
      // Mixed selection including subpaths or groups with other elements
      // Use the mixed selection reorder system
      handleMixedSelectionReorder(type as 'toFront' | 'forward' | 'backward' | 'toBack');
    } else {
      // Only regular elements selected - use global z-index system
      switch (type) {
        case 'toFront':
          globalBringToFront();
          break;
        case 'forward':
          globalSendForward();
          break;
        case 'backward':
          globalSendBackward();
          break;
        case 'toBack':
          globalSendToBack();
          break;
      }
    }
  };

  const getSelectionInfo = () => {
    if (!hasAnySelection) return "Select elements to reorder";
    
    const countInfo = [
      { count: selection.selectedGroups.length, type: 'group' },
      { count: selection.selectedPaths.length, type: 'path' },
      { count: selection.selectedTexts.length, type: 'text' },
      { count: selection.selectedImages.length, type: 'image' },
      { count: selection.selectedUses.length, type: 'use' },
      { count: selection.selectedSubPaths.length, type: 'subpath' }
    ];
    
    const counts = countInfo
      .filter(info => info.count > 0)
      .map(info => `${info.count} ${info.type}${info.count !== 1 ? 's' : ''}`);
    
    return counts.join(', ') + ' selected';
  };

  const containerStyle = {
    width: '100%', // Use full width available in accordion mode
  };

  const sectionStyle = {
    marginBottom: '8px',
  };

  const titleStyle = {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '4px',
    letterSpacing: '0.05em',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
  };

  const infoStyle = {
    fontSize: '9px',
    color: '#6b7280',
    marginTop: '8px',
    padding: '4px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    textAlign: 'center' as const,
  };

  return (
    <div>
      <div style={containerStyle}>
        
        {/* Reorder Section */}
        <div style={sectionStyle}>
          <div style={titleStyle}>Z-Order</div>
          <div style={gridStyle}>
            <Button
              onPointerDown={() => handleReorder('toFront')}
              disabled={!hasAnySelection}
              title="Bring to Front"
            >
              <ChevronsUp size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('forward')}
              disabled={!hasAnySelection}
              title="Bring Forward"
            >
              <ChevronUp size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('backward')}
              disabled={!hasAnySelection}
              title="Send Backward"
            >
              <ChevronDown size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('toBack')}
              disabled={!hasAnySelection}
              title="Send to Back"
            >
              <ChevronsDown size={12} />
            </Button>
          </div>
        </div>

        {/* Selection Info */}
        <div style={infoStyle}>
          {!hasAnySelection ? "Select elements to reorder" : getSelectionInfo()}
        </div>
      </div>
    </div>
  );
};
