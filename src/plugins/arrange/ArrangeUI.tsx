import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
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
  const hasSelection = selection.selectedSubPaths.length > 0;
  const hasMultipleSelection = selection.selectedSubPaths.length > 1;
  const hasThreeOrMore = selection.selectedSubPaths.length >= 3;

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
    onClick: () => void;
    disabled: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, disabled, title, children }) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={disabled ? disabledStyle : buttonStyle}
    >
      {children}
    </button>
  );

  return (
    <DraggablePanel
      id="arrange-panel"
      title="Arrange"
      initialPosition={{ x: 100, y: 100 }}
    >
      <div style={containerStyle}>
        
        {/* Alignment Section */}
        <div style={sectionStyle}>
          <div style={titleStyle}>Align</div>
          <div style={gridStyle}>
            <Button
              onClick={() => handleAlign('left')}
              disabled={!hasMultipleSelection}
              title="Align Left"
            >
              <AlignLeft size={12} />
            </Button>
            <Button
              onClick={() => handleAlign('center')}
              disabled={!hasMultipleSelection}
              title="Align Center"
            >
              <AlignCenter size={12} />
            </Button>
            <Button
              onClick={() => handleAlign('right')}
              disabled={!hasMultipleSelection}
              title="Align Right"
            >
              <AlignRight size={12} />
            </Button>
            <Button
              onClick={() => handleAlign('top')}
              disabled={!hasMultipleSelection}
              title="Align Top"
            >
              <ArrowUp size={12} />
            </Button>
          </div>
          <div style={gridWithMarginStyle}>
            <Button
              onClick={() => handleAlign('middle')}
              disabled={!hasMultipleSelection}
              title="Align Middle"
            >
              <Circle size={12} />
            </Button>
            <Button
              onClick={() => handleAlign('bottom')}
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
              onClick={() => handleDistribute('horizontal')}
              disabled={!hasThreeOrMore}
              title="Distribute Horizontally"
            >
              <ArrowLeftRight size={12} />
            </Button>
            <Button
              onClick={() => handleDistribute('vertical')}
              disabled={!hasThreeOrMore}
              title="Distribute Vertically"
            >
              <ArrowUpDown size={12} />
            </Button>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Stretch Section */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>Stretch</h3>
          <div style={gridStyle}>
            <Button
              onClick={() => handleStretch('horizontal')}
              disabled={!hasMultipleSelection}
              title="Stretch Horizontally"
            >
              <ArrowLeftRight size={12} />
            </Button>
            <Button
              onClick={() => handleStretch('vertical')}
              disabled={!hasMultipleSelection}
              title="Stretch Vertically"
            >
              <ArrowUpDown size={12} />
            </Button>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Flip Section */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>Flip</h3>
          <div style={gridStyle}>
            <Button
              onClick={() => handleFlip('horizontal')}
              disabled={!hasSelection}
              title="Flip Horizontally"
            >
              <FlipHorizontal size={12} />
            </Button>
            <Button
              onClick={() => handleFlip('vertical')}
              disabled={!hasSelection}
              title="Flip Vertically"
            >
              <FlipVertical size={12} />
            </Button>
            <div></div>
            <div></div>
          </div>
        </div>

        {/* Stack Section */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>Stack</h3>
          <div style={gridStyle}>
            <Button
              onClick={() => handleStack('pack')}
              disabled={!hasMultipleSelection}
              title="Pack Elements"
            >
              <Package size={12} />
            </Button>
            <Button
              onClick={() => handleStack('horizontal')}
              disabled={!hasMultipleSelection}
              title="Stack Horizontally"
            >
              <Columns3 size={12} />
            </Button>
            <Button
              onClick={() => handleStack('vertical')}
              disabled={!hasMultipleSelection}
              title="Stack Vertically"
            >
              <Rows3 size={12} />
            </Button>
            <div></div>
          </div>
        </div>

        {/* Selection Info */}
        <div style={infoStyle}>
          {!hasSelection && "Select elements"}
          {hasSelection && !hasMultipleSelection && "Select multiple"}
          {hasMultipleSelection && !hasThreeOrMore && "Select 3+ for distribute"}
          {hasThreeOrMore && `${selection.selectedSubPaths.length} selected`}
        </div>
      </div>
    </DraggablePanel>
  );
};
