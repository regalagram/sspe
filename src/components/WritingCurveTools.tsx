import React, { useState } from 'react';
import { Spline, Move, CornerUpRight, ChevronDown, LogOut } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';
import { curvesManager } from '../plugins/curves/CurvesManager';
import { useMobileDetection } from '../hooks/useMobileDetection';

export const WritingCurveTools: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const { mode, selection } = useEditorStore();
  const [isCurveSubmenuOpen, setIsCurveSubmenuOpen] = useState(false);

  // Match floating toolbar button sizing
  const buttonSize = isMobile ? 28 : 32;
  const iconSize = isMobile ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop
  const chevronSize = isMobile ? 8 : 9; // Fixed chevron sizes: 8px mobile, 9px desktop

  const isCurveActive = mode.current === 'curves';
  const hasSelection = selection.selectedCommands.length > 0;

  const handleCurveToggle = () => {
    if (isCurveActive) {
      curvesManager.exitCurveTool();
    } else {
      curvesManager.activateCurveTool();
    }
  };

  const handleDeletePoint = () => {
    curvesManager.deleteSelectedPoint();
  };

  const handleFinishPath = () => {
    curvesManager.finishPath();
  };

  return (
    <ToolbarSection title="Curve Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: isCurveActive ? '#374151' : (isCurveSubmenuOpen ? '#f3f4f6' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isCurveActive ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0px',
            gap: '2px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            <Spline size={iconSize} />
          </div>
        }
        isOpen={isCurveSubmenuOpen}
        onToggle={() => setIsCurveSubmenuOpen(!isCurveSubmenuOpen)}
      >
        <SubmenuItem
          icon={<Spline size={16} />}
          label={isCurveActive ? "Exit Curve Mode" : "Activate Curve Editing"}
          onClick={() => {
            handleCurveToggle();
            setIsCurveSubmenuOpen(false);
          }}
          active={isCurveActive}
        />
        
        {isCurveActive && (
          <>
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />
            
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Curve Actions
            </div>
            <SubmenuItem
              icon={<LogOut size={16} />}
              label="Delete Selected Point"
              onClick={() => {
                handleDeletePoint();
                setIsCurveSubmenuOpen(false);
              }}
            />
            <SubmenuItem
              icon={<CornerUpRight size={16} />}
              label="Finish Path"
              onClick={() => {
                handleFinishPath();
                setIsCurveSubmenuOpen(false);
              }}
            />
          </>
        )}
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};