import React, { useState } from 'react';
import { Plus, Move, Minus, Pen, X, ChevronDown, MousePointerClick, Spline } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { MobileToolbarSubmenu, MobileSubmenuItem } from '../../components/ToolbarSubmenu';
import { useEditorStore } from '../../store/editorStore';
import { useMobileToolbarStore } from '../../store/toolbarStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { SVGCommandType, EditorCommandType } from '../../types';
import { toolModeManager } from '../../managers/ToolModeManager';
import { creationManager } from './CreationManager';

export const ToolbarCreationTools: React.FC = () => {
  const { mode } = useEditorStore();
  const { isMobile } = useMobileDetection();
  const { 
    isCreationSubmenuOpen, 
    setCreationSubmenuOpen 
  } = useMobileToolbarStore();

  // Match floating toolbar button sizing
  const buttonSize = isMobile ? 28 : 32;
  const iconSize = isMobile ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop
  const chevronSize = isMobile ? 8 : 9; // Fixed chevron sizes: 8px mobile, 9px desktop

  // Always show toolbar creation tools (removed mobile-only restriction)

  const handleSelectTool = (commandType: SVGCommandType | 'NEW_PATH') => {
    if (commandType === 'NEW_PATH') {
      toolModeManager.setMode('creation', { commandType: 'NEW_PATH' as EditorCommandType });
    } else {
      toolModeManager.setMode('creation', { commandType: commandType as EditorCommandType });
    }
  };

  const handleExitCreateMode = () => {
    creationManager.exitCreation();
  };

  const isCreateMode = mode.current === 'create' && mode.createMode?.commandType !== 'PENCIL';
  const createMode = mode.createMode;

  const tools = [
    { 
      command: 'M' as const, 
      icon: <Move size={isMobile ? 12 : 13} />, 
      label: 'M', 
      title: 'Move To (M)',
      description: 'Start new sub-path'
    },
    { 
      command: 'NEW_PATH' as const, 
      icon: <Plus size={isMobile ? 12 : 13} />, 
      label: 'M+', 
      title: 'New Path (Shift+M)',
      description: 'Create new path'
    },
    { 
      command: 'L' as const, 
      icon: <Minus size={isMobile ? 12 : 13} />, 
      label: 'L', 
      title: 'Line To (L)',
      description: 'Draw line'
    },
    { 
      command: 'C' as const, 
      icon: <Spline size={isMobile ? 12 : 13} />, 
      label: 'C', 
      title: 'Cubic Bezier (C)',
      description: 'Draw curve'
    },
    { 
      command: 'Z' as const, 
      icon: <X size={isMobile ? 12 : 13} />, 
      label: 'Z', 
      title: 'Close Path (Z)',
      description: 'Close path'
    },
  ];

  // Get current active tool
  const getActiveTool = () => {
    if (!isCreateMode || createMode?.commandType === 'PENCIL') return null;
    return tools.find(tool => 
      tool.command === 'NEW_PATH' 
        ? createMode?.commandType === 'NEW_PATH'
        : createMode?.commandType === tool.command
    );
  };

  const activeTool = getActiveTool();
  const hasActiveTool = activeTool !== null;

  const handleToolAction = (action: () => void) => {
    action();
    setCreationSubmenuOpen(false);
  };

  return (
    <MobileToolbarSection title="Creation Tools">
      <MobileToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: hasActiveTool ? '#374151' : (isCreationSubmenuOpen ? '#f3f4f6' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: hasActiveTool ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0px',
            gap: '2px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            {hasActiveTool && activeTool ? (
              <span style={{ fontSize: '10px' }}>{activeTool.label}</span>
            ) : (
              <MousePointerClick size={iconSize} />
            )}
          </div>
        }
        isOpen={isCreationSubmenuOpen}
        onToggle={() => setCreationSubmenuOpen(!isCreationSubmenuOpen)}
      >
        {isCreateMode && (
          <>
            <MobileSubmenuItem
              icon={<X size={isMobile ? 12 : 13} />}
              label="Exit Create Mode"
              onClick={() => handleToolAction(handleExitCreateMode)}
              active={true}
            />
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />
          </>
        )}
        {tools.map(tool => (
          <MobileSubmenuItem
            key={tool.command}
            icon={tool.icon}
            label={`${tool.label} - ${tool.description}`}
            onClick={() => handleToolAction(() => handleSelectTool(tool.command))}
            active={isCreateMode && (
              tool.command === 'NEW_PATH' 
                ? createMode?.commandType === 'NEW_PATH' 
                : createMode?.commandType === tool.command
            )}
          />
        ))}
      </MobileToolbarSubmenu>
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileCreationTools = ToolbarCreationTools;