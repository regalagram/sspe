import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const ToolbarUndoRedoControls: React.FC = () => {
  const { history, undo, redo } = useEditorStore();
  const { isMobile } = useMobileDetection();

  // Always show toolbar undo/redo controls (removed mobile-only restriction)

  return (
    <MobileToolbarSection title="Undo/Redo">
      <MobileToolbarButton
        icon={<Undo2 />}
        onClick={undo}
        disabled={!history.canUndo}
        color="#007acc"
        title="Undo (Ctrl+Z)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<Redo2 />}
        onClick={redo}
        disabled={!history.canRedo}
        color="#007acc"
        title="Redo (Ctrl+Y)"
        size="medium"
      />
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileUndoRedoControls = ToolbarUndoRedoControls;