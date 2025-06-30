import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const PencilDebug: React.FC = () => {
  const { mode } = useEditorStore();
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 10000
    }}>
      <div>Mode: {mode.current}</div>
      <div>Create Type: {mode.createMode?.commandType || 'none'}</div>
      <div>Is Drawing: {mode.createMode?.isDrawing ? 'yes' : 'no'}</div>
    </div>
  );
};
