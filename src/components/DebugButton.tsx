import React, { useState } from 'react';
import { Bug, RotateCcw, Eye, Settings } from 'lucide-react';
import { ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../config/constants';

interface DebugButtonProps {
  onOpenVisualDebugPanel?: () => void;
}

export const DebugButton: React.FC<DebugButtonProps> = ({ onOpenVisualDebugPanel }) => {
  const { isMobile } = useMobileDetection();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const { enabledFeatures, toggleFeature } = useEditorStore();

  const buttonSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE;
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;

  const handleClearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleToggleCommandPoints = () => {
    toggleFeature('commandPointsEnabled');
    setIsSubmenuOpen(false);
  };

  const handleToggleControlPoints = () => {
    toggleFeature('controlPointsEnabled');
    setIsSubmenuOpen(false);
  };

  const handleToggleWireframe = () => {
    toggleFeature('wireframeEnabled');
    setIsSubmenuOpen(false);
  };

  const handleToggleHidePointsInSelect = () => {
    toggleFeature('hidePointsInSelect');
    setIsSubmenuOpen(false);
  };

  const handleToggleShowGroupsFrame = () => {
    toggleFeature('showGroupsFrame');
    setIsSubmenuOpen(false);
  };

  const handleOpenConfig = () => {
    if (onOpenVisualDebugPanel) {
      onOpenVisualDebugPanel();
    }
    setIsSubmenuOpen(false);
  };

  return (
    <ToolbarSection title="Debug Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: isSubmenuOpen ? '#f3f4f6' : 'white',
            border: 'none',
            borderRadius: '0px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            <Bug size={isMobile ? 14 : 16} strokeWidth={strokeWidth} color="#374151" />
          </div>
        }
        isOpen={isSubmenuOpen}
        onToggle={() => setIsSubmenuOpen(!isSubmenuOpen)}
      >
        {/* Visual Debug Actions */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Visual Debug
        </div>
        
        <SubmenuItem
          icon={<Eye size={iconSize} strokeWidth={strokeWidth} />}
          label={enabledFeatures.commandPointsEnabled ? "Hide Command Points" : "Show Command Points"}
          onClick={handleToggleCommandPoints}
          active={enabledFeatures.commandPointsEnabled}
        />
        
        <SubmenuItem
          icon={<Eye size={iconSize} strokeWidth={strokeWidth} />}
          label={enabledFeatures.controlPointsEnabled ? "Hide Control Points" : "Show Control Points"}
          onClick={handleToggleControlPoints}
          active={enabledFeatures.controlPointsEnabled}
        />
        
        <SubmenuItem
          icon={<Eye size={iconSize} strokeWidth={strokeWidth} />}
          label={enabledFeatures.wireframeEnabled ? "Hide Wireframe" : "Show Wireframe"}
          onClick={handleToggleWireframe}
          active={enabledFeatures.wireframeEnabled}
        />
        
        <SubmenuItem
          icon={<Eye size={iconSize} strokeWidth={strokeWidth} />}
          label={enabledFeatures.hidePointsInSelect ? "Show Points In Select" : "Hide Points In Select"}
          onClick={handleToggleHidePointsInSelect}
          active={enabledFeatures.hidePointsInSelect}
        />
        
        <SubmenuItem
          icon={<Eye size={iconSize} strokeWidth={strokeWidth} />}
          label={enabledFeatures.showGroupsFrame ? "Hide Groups Frame" : "Show Groups Frame"}
          onClick={handleToggleShowGroupsFrame}
          active={enabledFeatures.showGroupsFrame}
        />
        
        <SubmenuItem
          icon={<Settings size={iconSize} strokeWidth={strokeWidth} />}
          label="Configuration"
          onClick={handleOpenConfig}
        />
        
        <SubmenuItem
          icon={<RotateCcw size={iconSize} strokeWidth={strokeWidth} />}
          label="Delete LocalStorage"
          onClick={handleClearLocalStorage}
        />
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};