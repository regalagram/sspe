import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const MobileUndoRedoControls: React.FC = () => {
  const { history, undo, redo } = useEditorStore();
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

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