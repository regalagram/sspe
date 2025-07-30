import React from 'react';
import { Trash2 } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { executeDelete } from './Delete';

export const MobileDeleteControl: React.FC = () => {
  const { selection } = useEditorStore();
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

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
    <MobileToolbarSection title="Delete">
      <MobileToolbarButton
        icon={<Trash2 />}
        onClick={handleDelete}
        disabled={!hasSelection}
        active={hasSelection}
        color="#ff4444"
        title="Delete Selection (Del/Backspace)"
        size="medium"
      />
    </MobileToolbarSection>
  );
};