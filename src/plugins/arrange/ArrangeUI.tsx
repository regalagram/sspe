import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ArrowUp,
  Circle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUpDown,
  FlipHorizontal,
  FlipVertical,
  Package,
  Columns3,
  Rows3
} from 'lucide-react';
import { arrangeManager } from './ArrangeManager';

interface ArrangeUIProps {
  onClose?: () => void;
}

export const ArrangeUI: React.FC<ArrangeUIProps> = ({ onClose }) => {
  const selection = useEditorStore((state) => state.selection);
  const hasSelection = (
    selection.selectedCommands.length > 0 ||
    selection.selectedSubPaths.length > 0 ||
    selection.selectedTexts.length > 0 ||
    selection.selectedImages.length > 0 ||
    selection.selectedUses.length > 0 ||
    selection.selectedGroups.length > 0
  );
  const totalSelected = (
    selection.selectedCommands.length +
    selection.selectedSubPaths.length +
    selection.selectedTexts.length +
    selection.selectedImages.length +
    selection.selectedUses.length +
    selection.selectedGroups.length
  );
  const hasMultipleSelection = totalSelected > 1;
  const hasThreeOrMore = totalSelected >= 3;

  const handleAlign = (type: string) => {
    if (!hasMultipleSelection) return;
    
    switch (type) {
      case 'left':
        arrangeManager.alignLeft();
        break;
      case 'center':
        arrangeManager.alignCenter();
        break;
      case 'right':
        arrangeManager.alignRight();
        break;
      case 'top':
        arrangeManager.alignTop();
        break;
      case 'middle':
        arrangeManager.alignMiddle();
        break;
      case 'bottom':
        arrangeManager.alignBottom();
        break;
    }
  };

  const handleDistribute = (type: string) => {
    if (!hasThreeOrMore) return;
    
    switch (type) {
      case 'horizontal':
        arrangeManager.distributeHorizontally();
        break;
      case 'vertical':
        arrangeManager.distributeVertically();
        break;
    }
  };

  const handleStretch = (type: string) => {
    if (!hasMultipleSelection) return;
    
    switch (type) {
      case 'horizontal':
        arrangeManager.stretchHorizontally();
        break;
      case 'vertical':
        arrangeManager.stretchVertically();
        break;
    }
  };

  const handleFlip = (type: string) => {
    if (!hasSelection) return;
    
    switch (type) {
      case 'horizontal':
        arrangeManager.flipHorizontally();
        break;
      case 'vertical':
        arrangeManager.flipVertically();
        break;
    }
  };

  const handleStack = (type: string) => {
    if (!hasMultipleSelection) return;
    
    switch (type) {
      case 'horizontal':
        arrangeManager.stackHorizontally();
        break;
      case 'vertical':
        arrangeManager.stackVertically();
        break;
      case 'pack':
        arrangeManager.pack();
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

  const containerStyle = {};

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
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
  };

  const gridWithMarginStyle = {
    ...gridStyle,
    marginTop: '4px',
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
        
        {/* Alignment Section */}
        <div style={sectionStyle}>
          <div style={titleStyle}>Align</div>
          <div style={gridStyle}>
            <Button
              onPointerDown={() => handleAlign('left')}
              disabled={!hasMultipleSelection}
              title="Align Left"
            >
              <AlignLeft size={12} />
            </Button>
            <Button
              onPointerDown={() => handleAlign('center')}
              disabled={!hasMultipleSelection}
              title="Align Center"
            >
              <AlignCenter size={12} />
            </Button>
            <Button
              onPointerDown={() => handleAlign('right')}
              disabled={!hasMultipleSelection}
              title="Align Right"
            >
              <AlignRight size={12} />
            </Button>
            <Button
              onPointerDown={() => handleAlign('top')}
              disabled={!hasMultipleSelection}
              title="Align Top"
            >
              <ArrowUp size={12} />
            </Button>
          </div>
          <div style={gridWithMarginStyle}>
            <Button
              onPointerDown={() => handleAlign('middle')}
              disabled={!hasMultipleSelection}
              title="Align Middle"
            >
              <Circle size={12} />
            </Button>
            <Button
              onPointerDown={() => handleAlign('bottom')}
              disabled={!hasMultipleSelection}
              title="Align Bottom"
            >
              <ArrowDown size={12} />
            </Button>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Distribution Section */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>Distribute</h3>
          <div style={gridStyle}>
            <Button
              onPointerDown={() => handleDistribute('horizontal')}
              disabled={!hasThreeOrMore}
              title="Distribute Horizontally"
            >
              <ArrowLeftRight size={12} />
            </Button>
            <Button
              onPointerDown={() => handleDistribute('vertical')}
              disabled={!hasThreeOrMore}
              title="Distribute Vertically"
            >
              <ArrowUpDown size={12} />
            </Button>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Stretch Section - Only for SubPaths (not command points) */}
        {selection.selectedSubPaths.length > 1 && selection.selectedCommands.length === 0 && (
          <div style={sectionStyle}>
            <h3 style={titleStyle}>Stretch</h3>
            <div style={gridStyle}>
              <Button
                onPointerDown={() => handleStretch('horizontal')}
                disabled={!hasMultipleSelection}
                title="Stretch Horizontally"
              >
                <ArrowLeftRight size={12} />
              </Button>
              <Button
                onPointerDown={() => handleStretch('vertical')}
                disabled={!hasMultipleSelection}
                title="Stretch Vertically"
              >
                <ArrowUpDown size={12} />
              </Button>
              <div></div>
              <div></div>
            </div>
          </div>
        )}

        {/* Flip Section - Only for SubPaths (not command points) */}
        {selection.selectedSubPaths.length > 0 && selection.selectedCommands.length === 0 && (
          <div style={sectionStyle}>
            <h3 style={titleStyle}>Flip</h3>
            <div style={gridStyle}>
              <Button
                onPointerDown={() => handleFlip('horizontal')}
                disabled={!hasSelection}
                title="Flip Horizontally"
              >
                <FlipHorizontal size={12} />
              </Button>
              <Button
                onPointerDown={() => handleFlip('vertical')}
                disabled={!hasSelection}
                title="Flip Vertically"
              >
                <FlipVertical size={12} />
              </Button>
              <div></div>
              <div></div>
            </div>
          </div>
        )}

        {/* Stack Section - Only for elements with area (not command points) */}
        {selection.selectedCommands.length === 0 && (
          <div style={sectionStyle}>
            <h3 style={titleStyle}>Stack</h3>
            <div style={gridStyle}>
              <Button
                onPointerDown={() => handleStack('pack')}
                disabled={!hasMultipleSelection}
                title="Pack Elements"
              >
                <Package size={12} />
              </Button>
              <Button
                onPointerDown={() => handleStack('horizontal')}
                disabled={!hasMultipleSelection}
                title="Stack Horizontally"
              >
                <Columns3 size={12} />
              </Button>
              <Button
                onPointerDown={() => handleStack('vertical')}
                disabled={!hasMultipleSelection}
                title="Stack Vertically"
              >
                <Rows3 size={12} />
              </Button>
              <div></div>
            </div>
          </div>
        )}

        {/* Selection Info */}
        <div style={infoStyle}>
          {!hasSelection && "Select elements or command points"}
          {hasSelection && !hasMultipleSelection && "Select multiple"}
          {hasMultipleSelection && !hasThreeOrMore && "Select 3+ for distribute"}
          {hasThreeOrMore && selection.selectedCommands.length > 0 && `${selection.selectedCommands.length} command points selected`}
          {hasThreeOrMore && selection.selectedCommands.length === 0 && `${totalSelected} elements selected`}
        </div>
      </div>
    </div>
  );
};
