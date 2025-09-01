import React from 'react';
import { Undo2, Redo2, Bug } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorHistory } from '../../store/useEditorHistory';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { toggleZundoDebugPanel } from '../../store/useZundoDebugVisibility';

export const ToolbarUndoRedoControls: React.FC = () => {
  const { canUndo, canRedo, undo, redo } = useEditorHistory();
  const { isMobile } = useMobileDetection();

  // Always show toolbar undo/redo controls (removed mobile-only restriction)

  return (
    <MobileToolbarSection title="Undo/Redo">
      <MobileToolbarButton
        icon={<Undo2 />}
        onClick={undo}
        disabled={!canUndo}
        color="#374151"
        title="Undo (Ctrl+Z)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<Redo2 />}
        onClick={redo}
        disabled={!canRedo}
        color="#374151"
        title="Redo (Ctrl+Y)"
        size="medium"
      />
      {process.env.NODE_ENV === 'development' && (
        <MobileToolbarButton
          icon={<Bug />}
          onClick={toggleZundoDebugPanel}
          color="#10b981"
          title="Toggle Zundo Debug Panel"
          size="medium"
        />
      )}
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileUndoRedoControls = ToolbarUndoRedoControls;