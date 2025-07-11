import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { 
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown
} from 'lucide-react';
import { reorderManager } from './ReorderManager';

interface ReorderUIProps {
  onClose?: () => void;
}

export const ReorderUI: React.FC<ReorderUIProps> = ({ onClose }) => {
  const selection = useEditorStore((state) => state.selection);
  const hasSelection = selection.selectedSubPaths.length > 0;

  const handleReorder = (type: string) => {
    if (!hasSelection) return;
    
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
  };

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

  const Button: React.FC<{
    onPointerDown: () => void;
    disabled: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onPointerDown, disabled, title, children }) => (
    <button
      onPointerDown={disabled ? undefined : onPointerDown}
      disabled={disabled}
      title={title}
      style={disabled ? disabledStyle : buttonStyle}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div style={containerStyle}>
        
        {/* Reorder Section */}
        <div style={sectionStyle}>
          <div style={titleStyle}>Z-Order</div>
          <div style={gridStyle}>
            <Button
              onPointerDown={() => handleReorder('toFront')}
              disabled={!hasSelection}
              title="Bring to Front"
            >
              <ChevronsUp size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('forward')}
              disabled={!hasSelection}
              title="Bring Forward"
            >
              <ChevronUp size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('backward')}
              disabled={!hasSelection}
              title="Send Backward"
            >
              <ChevronDown size={12} />
            </Button>
            <Button
              onPointerDown={() => handleReorder('toBack')}
              disabled={!hasSelection}
              title="Send to Back"
            >
              <ChevronsDown size={12} />
            </Button>
          </div>
        </div>

        {/* Selection Info */}
        <div style={infoStyle}>
          {!hasSelection && "Select elements to reorder"}
          {hasSelection && `${selection.selectedSubPaths.length} selected`}
        </div>
      </div>
    </div>
  );
};
