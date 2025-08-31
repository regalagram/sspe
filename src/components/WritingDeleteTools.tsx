import React from 'react';
import { Trash2 } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { useEditorStore } from '../store/editorStore';
import { executeDelete } from '../plugins/delete/Delete';
import { useMobileDetection } from '../hooks/useMobileDetection';

export const WritingDeleteTools: React.FC = () => {
  const { selection } = useEditorStore();
  const { isMobile } = useMobileDetection();

  // Match text toolbar button sizing exactly
  const iconSize = isMobile ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop

  const hasSelection = 
    selection.selectedPaths.length > 0 || 
    selection.selectedSubPaths.length > 0 || 
    selection.selectedCommands.length > 0 ||
    (selection.selectedTexts?.length || 0) > 0 ||
    (selection.selectedTextPaths?.length || 0) > 0 ||
    (selection.selectedGroups?.length || 0) > 0 ||
    (selection.selectedImages?.length || 0) > 0 ||
    (selection.selectedUses?.length || 0) > 0;

  const handleDelete = () => {
    executeDelete();
  };

  return (
    <ToolbarSection title="Delete">
      <ToolbarButton
        icon={<Trash2 size={iconSize} />}
        onClick={handleDelete}
        disabled={!hasSelection}
        active={false}
        color="#ff4444"
        title="Delete Selection (Del/Backspace)"
        size="medium"
      />
    </ToolbarSection>
  );
};