import React, { ReactNode } from 'react';
import { DraggablePanel as OriginalDraggablePanel } from '../../components/DraggablePanel';
import { usePanelModeStore } from './PanelManager';

interface PanelWrapperProps {
  children: ReactNode;
  title: string;
  initialPosition?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const PanelWrapper: React.FC<PanelWrapperProps> = (props) => {
  const { mode } = usePanelModeStore();
  
  // In accordion mode, just render the children without the draggable wrapper
  if (mode === 'accordion') {
    return (
      <div className="accordion-panel-wrapper" style={{ width: '100%' }}>
        {props.children}
      </div>
    );
  }
  
  // In draggable mode, use the original DraggablePanel
  return <OriginalDraggablePanel {...props} />;
};
