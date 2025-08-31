import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Spline, Move, Minus, X, CornerUpRight, LogOut, MousePointerClick } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useToolbarStore } from '../store/toolbarStore';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';
import { curvesManager } from '../plugins/curves/CurvesManager';
import { creationManager } from '../plugins/creation/CreationManager';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { SVGCommandType, EditorCommandType } from '../types';

export const WritingConsolidatedTools: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());
  const { mode, selection } = useEditorStore();

  // Match text toolbar button sizing exactly
  const buttonSize = isMobile ? 28 : 32;
  const iconSize = isMobile ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop
  const chevronSize = isMobile ? 8 : 9; // Fixed chevron sizes: 8px mobile, 9px desktop

  // Subscribe to tool mode changes
  useEffect(() => {
    const unsubscribe = toolModeManager.addListener(setToolModeState);
    return unsubscribe;
  }, []);

  // Determine current active tool and icon
  const isPencilActive = toolModeState.activeMode === 'pencil' || 
                        (mode.current === 'create' && mode.createMode?.commandType === 'PENCIL');
  const isCurveActive = mode.current === 'curves';
  const isCreateMode = mode.current === 'create' && mode.createMode?.commandType !== 'PENCIL';

  // Dynamic icon based on active tool
  const getCurrentIcon = () => {
  // If subpath-edit mode is active, show the mouse-pointer icon to indicate mode
  if (isSubpathEditMode) return <MousePointerClick size={iconSize} />;
    if (isPencilActive) return <Edit3 size={iconSize} />;
    if (isCurveActive) return <Spline size={iconSize} />;
    if (isCreateMode) {
      // Show the letter of the active creation command
      const activeTool = creationTools.find(tool => 
        tool.command === 'NEW_PATH' 
          ? mode.createMode?.commandType === 'NEW_PATH'
          : mode.createMode?.commandType === tool.command
      );
      if (activeTool) {
        return (
          <span style={{ 
            fontSize: isMobile ? '10px' : '11px', 
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}>
            {activeTool.letter}
          </span>
        );
      }
    }
    return <Plus size={iconSize} strokeWidth={2.5} />; // Default creation tools icon with thicker stroke
  };

  const isAnyToolActive = isPencilActive || isCurveActive || isCreateMode;

  // Subpath-edit mode state
  const isSubpathEditMode = mode.current === 'subpath-edit';

  const { enabledFeatures, toggleFeature } = useEditorStore();

  const toggleSubpathEditMode = () => {
    if (isSubpathEditMode) {
      // exit to select
      toolModeManager.setMode('select');
    } else {
      // Clear existing selections before entering subpath-edit mode
      const store = useEditorStore.getState();
      store.clearSelection();
      toolModeManager.setMode('subpath-edit');
    }
  };

  // Creation tools definition with letters
  const creationTools = [
    { 
      command: 'M' as const, 
      letter: 'M',
      label: 'M - Move To', 
      description: 'Start new sub-path'
    },
    { 
      command: 'NEW_PATH' as const, 
      letter: 'M+',
      label: 'M+ - New Path', 
      description: 'Create new path'
    },
    { 
      command: 'L' as const, 
      letter: 'L',
      label: 'L - Line To', 
      description: 'Draw line'
    },
    { 
      command: 'C' as const, 
      letter: 'C',
      label: 'C - Cubic Bezier', 
      description: 'Draw curve'
    },
    { 
      command: 'Z' as const, 
      letter: 'Z',
      label: 'Z - Close Path', 
      description: 'Close path'
    },
  ];

  // Tool activation handlers
  const handleSelectCreationTool = (commandType: SVGCommandType | 'NEW_PATH') => {
    if (commandType === 'NEW_PATH') {
      toolModeManager.setMode('creation', { commandType: 'NEW_PATH' as EditorCommandType });
    } else {
      toolModeManager.setMode('creation', { commandType: commandType as EditorCommandType });
    }
  };

  const handleExitCreateMode = () => {
    creationManager.exitCreation();
  };

  const handlePencilToggle = () => {
    if (isPencilActive) {
      toolModeManager.setMode('select');
    } else {
      toolModeManager.setMode('pencil');
    }
  };

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

  // Check if a specific creation tool is active
  const isCreationToolActive = (command: SVGCommandType | 'NEW_PATH') => {
    if (!isCreateMode) return false;
    return command === 'NEW_PATH' 
      ? mode.createMode?.commandType === 'NEW_PATH'
      : mode.createMode?.commandType === command;
  };

  return (
    <ToolbarSection title="Drawing Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: isAnyToolActive ? '#374151' : (isSubmenuOpen ? '#f3f4f6' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isAnyToolActive ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0px',
            gap: '2px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            {getCurrentIcon()}
          </div>
        }
        isOpen={isSubmenuOpen}
        onToggle={() => setIsSubmenuOpen(!isSubmenuOpen)}
      >
        {/* Exit Creation Mode - Show at top when any creation tool is active */}
        {isCreateMode && (
          <>
            <SubmenuItem
              icon={<X size={isMobile ? 12 : 13} />}
              label="Exit Creation Mode"
              onClick={() => {
                handleExitCreateMode();
                setIsSubmenuOpen(false);
              }}
              active={true}
            />
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />
          </>
        )}
        
        {/* Creation Tools - Always show all commands */}
        {creationTools.map(tool => (
          <SubmenuItem
            key={tool.command}
            label={tool.label}
            onClick={() => {
              handleSelectCreationTool(tool.command);
              setIsSubmenuOpen(false);
            }}
            active={isCreationToolActive(tool.command)}
          />
        ))}
        
        {/* Add separator after creation tools */}
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        {/* Pencil Tool - Simplified */}
        <SubmenuItem
          icon={<Edit3 size={isMobile ? 12 : 13} />}
          label={isPencilActive ? "Exit Pencil Mode" : "Pencil Tool"}
          onClick={() => {
            handlePencilToggle();
            setIsSubmenuOpen(false);
          }}
          active={isPencilActive}
        />
        
        {/* Curve Tool */}
        <SubmenuItem
          icon={<Spline size={isMobile ? 12 : 13} />}
          label={isCurveActive ? "Exit Curve Mode" : "Curve Tool"}
          onClick={() => {
            handleCurveToggle();
            setIsSubmenuOpen(false);
          }}
          active={isCurveActive}
        />
        
        {/* Curve-specific actions when curves are active */}
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
              icon={<LogOut size={isMobile ? 12 : 13} />}
              label="Delete Selected Point"
              onClick={() => {
                handleDeletePoint();
                setIsSubmenuOpen(false);
              }}
            />
            <SubmenuItem
              icon={<CornerUpRight size={isMobile ? 12 : 13} />}
              label="Finish Path"
              onClick={() => {
                handleFinishPath();
                setIsSubmenuOpen(false);
              }}
            />
          </>
        )}
        {/* Subpath-edit option inside the Drawing Tools submenu */}
        <div style={{ height: '1px', background: '#e5e7eb', margin: '6px 0' }} />
        {!isSubpathEditMode ? (
          <SubmenuItem
            icon={<MousePointerClick size={isMobile ? 12 : 13} />}
            label="Subpath Edit"
            onClick={() => {
              toggleSubpathEditMode();
              setIsSubmenuOpen(false);
            }}
            active={false}
          />
        ) : (
          <>
            <SubmenuItem
              icon={<MousePointerClick size={isMobile ? 12 : 13} />}
              label="Exit Subpath Edit"
              onClick={() => {
                toggleSubpathEditMode();
                setIsSubmenuOpen(false);
              }}
              active={true}
            />

            <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }} />

            <SubmenuItem
              icon={<Minus size={isMobile ? 12 : 13} />}
              label={enabledFeatures.subpathShowCommandPoints ? 'Hide Command Points' : 'Show Command Points'}
              onClick={() => toggleFeature('subpathShowCommandPoints')}
              active={!!enabledFeatures.subpathShowCommandPoints}
            />

            <SubmenuItem
              icon={<Plus size={isMobile ? 12 : 13} />}
              label={enabledFeatures.subpathShowControlPoints ? 'Hide Control Points' : 'Show Control Points'}
              onClick={() => toggleFeature('subpathShowControlPoints')}
              active={!!enabledFeatures.subpathShowControlPoints}
            />
          </>
        )}
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};