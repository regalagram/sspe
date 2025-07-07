import React, { ReactNode } from 'react';

interface PanelWrapperProps {
  children: ReactNode;
  title: string;
  initialPosition?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const PanelWrapper: React.FC<PanelWrapperProps> = (props) => {
  // Always use accordion mode - just render the children without the draggable wrapper
  return (
    <div className="accordion-panel-wrapper" style={{ width: '100%' }}>
      {props.children}
    </div>
  );
};
