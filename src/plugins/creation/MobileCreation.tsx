import React from 'react';
import { Plus, Move, Minus, Pen, LogOut } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { SVGCommandType, EditorCommandType } from '../../types';
import { toolModeManager } from '../../managers/ToolModeManager';
import { creationManager } from './CreationManager';

export const MobileCreationTools: React.FC = () => {
  const { mode } = useEditorStore();
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

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

  const isCreateMode = mode.current === 'create';
  const createMode = mode.createMode;

  const tools = [
    { 
      command: 'M' as const, 
      icon: <Move />, 
      label: 'M', 
      title: 'Move To (M)',
      description: 'Start new path'
    },
    { 
      command: 'NEW_PATH' as const, 
      icon: <Plus />, 
      label: 'M+', 
      title: 'New Path (Shift+M)',
      description: 'Create new path'
    },
    { 
      command: 'L' as const, 
      icon: <Minus />, 
      label: 'L', 
      title: 'Line To (L)',
      description: 'Draw line'
    },
    { 
      command: 'C' as const, 
      icon: <Pen />, 
      label: 'C', 
      title: 'Cubic Bezier (C)',
      description: 'Draw curve'
    },
    { 
      command: 'Z' as const, 
      icon: <LogOut />, 
      label: 'Z', 
      title: 'Close Path (Z)',
      description: 'Close path'
    },
  ];

  return (
    <>
      <MobileToolbarSection title="Creation Tools">
        {tools.map(tool => (
          <MobileToolbarButton
            key={tool.command}
            icon={tool.icon}
            label={tool.label}
            onClick={() => handleSelectTool(tool.command)}
            active={isCreateMode && (
              tool.command === 'NEW_PATH' 
                ? createMode?.commandType === 'NEW_PATH' 
                : createMode?.commandType === tool.command
            )}
            color="#007acc"
            title={tool.title}
            size="medium"
          />
        ))}
        {isCreateMode && (
          <MobileToolbarButton
            icon={<LogOut />}
            onClick={handleExitCreateMode}
            color="#dc3545"
            title="Exit Create Mode (Esc)"
            size="medium"
          />
        )}
      </MobileToolbarSection>
    </>
  );
};