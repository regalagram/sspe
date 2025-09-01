import React from 'react';
import { Undo2, Redo2, Bug } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorHistory } from '../../store/useEditorHistory';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { toggleZundoDebugPanel } from '../../store/useZundoDebugVisibility';
import { UI_CONSTANTS } from '../../config/constants';

export const ToolbarUndoRedoControls: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;
  
  const { canUndo, canRedo, undo, redo } = useEditorHistory();

  // Always show toolbar undo/redo controls (removed mobile-only restriction)

  return (
    <MobileToolbarSection title="Undo/Redo">
      <MobileToolbarButton
        icon={<Undo2 size={iconSize} strokeWidth={strokeWidth} />}
        onClick={undo}
        disabled={!canUndo}
        color="#374151"
        title="Undo (Ctrl+Z)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<Redo2 size={iconSize} strokeWidth={strokeWidth} />}
        onClick={redo}
        disabled={!canRedo}
        color="#374151"
        title="Redo (Ctrl+Y)"
        size="medium"
      />
      {process.env.NODE_ENV === 'development' && (
        <MobileToolbarButton
          icon={<Bug size={iconSize} strokeWidth={strokeWidth} />}
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