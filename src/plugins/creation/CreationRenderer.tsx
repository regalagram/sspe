import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const CreationRenderer: React.FC = () => {
  const { mode, viewport } = useEditorStore();

  if (mode.current !== 'create' || !mode.createMode?.previewCommand) return null;

  return (
    <circle
      cx={mode.createMode.previewCommand.x}
      cy={mode.createMode.previewCommand.y}
      r={4 / viewport.zoom}
      fill="rgba(0, 122, 204, 0.5)"
      stroke="#007acc"
      strokeWidth={1 / viewport.zoom}
      style={{ pointerEvents: 'none' }}
    />
  );
};
