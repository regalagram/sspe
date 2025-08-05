import React, { useState, useEffect } from 'react';
import { Type, ChevronDown, FileText, AlignJustify, Spline } from 'lucide-react';
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

  // Note: There's no 'text' mode in ToolMode, so we'll just track submenu state
  const isTextActive = false;

  // Check if there's a selected subpath for TextPath option
  const hasSelectedSubpath = selection.selectedSubPaths.length > 0;

  const handleAddText = () => {
    const centerX = viewport.viewBox.x + viewport.viewBox.width / 2;
    const centerY = viewport.viewBox.y + viewport.viewBox.height / 2;
    addText(centerX, centerY, 'Text');
    setIsTextSubmenuOpen(false);
    toolModeManager.setMode('select');
  };

  const handleAddMultilineText = () => {
    const centerX = viewport.viewBox.x + viewport.viewBox.width / 2;
    const centerY = viewport.viewBox.y + viewport.viewBox.height / 2;
    addMultilineText(centerX, centerY, ['Line 1', 'Line 2']);
    setIsTextSubmenuOpen(false);
    toolModeManager.setMode('select');
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
            background: isTextActive ? '#007acc' : (isTextSubmenuOpen ? '#e5e7eb' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isTextActive ? 'white' : '#007acc',
            border: 'none',
            gap: '4px',
            padding: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            <Type size={16} />
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
        <SubmenuItem
          icon={<Type size={16} />}
          label="Add Text"
          onClick={handleAddText}
          active={false}
        />
        
        <SubmenuItem
          icon={<AlignJustify size={16} />}
          label="Add Multiline Text"
          onClick={handleAddMultilineText}
          active={false}
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
