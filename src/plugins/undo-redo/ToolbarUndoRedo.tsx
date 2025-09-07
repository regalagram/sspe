import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { CONFIG } from '../../config/constants';

export const ToolbarUndoRedoControls: React.FC = () => {
  const { history, undo, redo } = useEditorStore();
  const { isMobile } = useMobileDetection();

  // Use CONFIG constants for consistent sizing
  const iconSize = isMobile ? CONFIG.UI.ICONS.MOBILE_SIZE : CONFIG.UI.ICONS.DESKTOP_SIZE;
  const strokeWidth = isMobile ? CONFIG.UI.ICONS.MOBILE_STROKE_WIDTH : CONFIG.UI.ICONS.DESKTOP_STROKE_WIDTH;

  return (
    <MobileToolbarSection title="Undo/Redo">
      <MobileToolbarButton
        icon={<Undo2 size={iconSize} strokeWidth={strokeWidth} />}
        onClick={undo}
        disabled={!history.canUndo}
        color="#374151"
        title="Undo (Ctrl+Z)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<Redo2 size={iconSize} strokeWidth={strokeWidth} />}
        onClick={redo}
        disabled={!history.canRedo}
        color="#374151"
        title="Redo (Ctrl+Y)"
        size="medium"
      />
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileUndoRedoControls = ToolbarUndoRedoControls;