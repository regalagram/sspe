import React, { useState, useEffect } from 'react';
import { Type, ChevronDown, FileText, AlignJustify, Spline, X } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';

export const WritingTextTools: React.FC = () => {
  const [isTextSubmenuOpen, setIsTextSubmenuOpen] = useState(false);
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());
  
  const { 
    addText, 
    addMultilineText, 
    addTextPath,
    viewport, 
    selection,
    paths
  } = useEditorStore();

  // Subscribe to tool mode changes
  useEffect(() => {
    const unsubscribe = toolModeManager.addListener(setToolModeState);
    return unsubscribe;
  }, []);

  const isTextActive = toolModeState.activeMode === 'text';
  const activeTextType = toolModeState.textType;

  // Check if there's a selected subpath for TextPath option
  const hasSelectedSubpath = selection.selectedSubPaths.length > 0;

  const handleAddText = () => {
    toolModeManager.setMode('text', { textType: 'single' });
    setIsTextSubmenuOpen(false);
  };

  const handleAddMultilineText = () => {
    toolModeManager.setMode('text', { textType: 'multiline' });
    setIsTextSubmenuOpen(false);
  };

  const handleAddTextPath = () => {
    if (hasSelectedSubpath && selection.selectedSubPaths.length > 0) {
      // Get the first selected subpath
      const selectedSubpathId = selection.selectedSubPaths[0];
      // Find the path that contains this subpath
      const pathWithSubpath = paths.find(path => 
        path.subPaths.some(sp => sp.id === selectedSubpathId)
      );
      
      if (pathWithSubpath) {
        // Use the addTextPath action from the store
        addTextPath(pathWithSubpath.id, 'Text on path', 0);
        setIsTextSubmenuOpen(false);
        toolModeManager.setMode('select');
      }
    }
  };

  const handleExitTextMode = () => {
    toolModeManager.setMode('select');
  };

  return (
    <ToolbarSection title="Text Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '40px',
            background: isTextActive ? '#374151' : (isTextSubmenuOpen ? '#e5e7eb' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isTextActive ? 'white' : '#374151',
            border: 'none',
            gap: '4px',
            padding: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            {isTextActive && activeTextType ? (
              activeTextType === 'multiline' ? <AlignJustify size={16} /> : <Type size={16} />
            ) : (
              <Type size={16} />
            )}
            <ChevronDown size={12} style={{ 
              marginLeft: '2px',
              transform: isTextSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </div>
        }
        isOpen={isTextSubmenuOpen}
        onToggle={() => setIsTextSubmenuOpen(!isTextSubmenuOpen)}
      >
        {isTextActive && (
          <>
            <SubmenuItem
              icon={<X size={16} />}
              label="Exit Text Mode"
              onClick={() => {
                handleExitTextMode();
                setIsTextSubmenuOpen(false);
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

        <SubmenuItem
          icon={<Type size={16} />}
          label="Add Text"
          onClick={handleAddText}
          active={activeTextType === 'single'}
        />
        
        <SubmenuItem
          icon={<AlignJustify size={16} />}
          label="Add Multiline Text"
          onClick={handleAddMultilineText}
          active={activeTextType === 'multiline'}
        />
        
        <SubmenuItem
          icon={<Spline size={16} />}
          label="Add TextPath"
          onClick={handleAddTextPath}
          active={false}
          disabled={!hasSelectedSubpath}
        />
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};
