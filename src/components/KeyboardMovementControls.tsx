import React, { useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { Point } from '../types';

export const KeyboardMovementControls: React.FC = () => {
  const { 
    selection,
    grid,
    translateSubPath,
    updateText,
    updateTextPath,
    updateImage,
    updateGroup,
    texts,
    textPaths,
    images,
    groups,
    paths
  } = useEditorStore();

  const getMovementStep = useCallback((isShiftPressed: boolean): number => {
    if (isShiftPressed) {
      // Fast movement: 10 pixels or 2x grid size
      return grid.snapToGrid && grid.enabled ? grid.size * 2 : 10;
    } else {
      // Normal movement: 1 pixel or grid size
      return grid.snapToGrid && grid.enabled ? grid.size : 1;
    }
  }, [grid.snapToGrid, grid.enabled, grid.size]);

  const moveSelectedElements = useCallback((direction: 'up' | 'down' | 'left' | 'right', step: number) => {
    const delta: Point = {
      x: direction === 'left' ? -step : direction === 'right' ? step : 0,
      y: direction === 'up' ? -step : direction === 'down' ? step : 0
    };

    // Move selected paths (subpaths)
    selection.selectedSubPaths.forEach(subPathId => {
      translateSubPath(subPathId, delta);
    });

    // Move selected texts
    selection.selectedTexts.forEach(textId => {
      const text = texts.find(t => t.id === textId);
      if (text) {
        updateText(textId, {
          x: text.x + delta.x,
          y: text.y + delta.y
        });
      }
    });

    // Move selected text paths
    selection.selectedTextPaths.forEach(textPathId => {
      const textPath = textPaths.find(tp => tp.id === textPathId);
      if (textPath) {
        // For text paths, we might need to update the transform or adjust positioning
        // This is more complex since text follows a path
        const currentTransform = textPath.transform || '';
        const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);
        
        let newTransform: string;
        if (translateMatch) {
          const [, coords] = translateMatch;
          const [currentX = 0, currentY = 0] = coords.split(/[,\s]+/).map(Number);
          newTransform = currentTransform.replace(
            /translate\([^)]+\)/,
            `translate(${currentX + delta.x}, ${currentY + delta.y})`
          );
        } else {
          newTransform = currentTransform + ` translate(${delta.x}, ${delta.y})`;
        }
        
        updateTextPath(textPathId, { transform: newTransform.trim() });
      }
    });

    // Move selected images
    selection.selectedImages.forEach(imageId => {
      const image = images.find(img => img.id === imageId);
      if (image) {
        updateImage(imageId, {
          x: image.x + delta.x,
          y: image.y + delta.y
        });
      }
    });

    // Move selected groups
    selection.selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const currentTransform = group.transform || '';
        const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);
        
        let newTransform: string;
        if (translateMatch) {
          const [, coords] = translateMatch;
          const [currentX = 0, currentY = 0] = coords.split(/[,\s]+/).map(Number);
          newTransform = currentTransform.replace(
            /translate\([^)]+\)/,
            `translate(${currentX + delta.x}, ${currentY + delta.y})`
          );
        } else {
          newTransform = currentTransform + ` translate(${delta.x}, ${delta.y})`;
        }
        
        updateGroup(groupId, { transform: newTransform.trim() });
      }
    });
  }, [
    selection,
    translateSubPath,
    updateText,
    updateTextPath,
    updateImage,
    updateGroup,
    texts,
    textPaths,
    images,
    groups
  ]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    // Check if any elements are selected
    const hasSelection = 
      selection.selectedSubPaths.length > 0 ||
      selection.selectedTexts.length > 0 ||
      selection.selectedTextPaths.length > 0 ||
      selection.selectedImages.length > 0 ||
      selection.selectedGroups.length > 0;

    if (!hasSelection) {
      return;
    }

    // Prevent default scrolling behavior
    e.preventDefault();
    e.stopPropagation();

    const step = getMovementStep(e.shiftKey);
    
    switch (e.key) {
      case 'ArrowUp':
        moveSelectedElements('up', step);
        break;
      case 'ArrowDown':
        moveSelectedElements('down', step);
        break;
      case 'ArrowLeft':
        moveSelectedElements('left', step);
        break;
      case 'ArrowRight':
        moveSelectedElements('right', step);
        break;
    }
  }, [selection, getMovementStep, moveSelectedElements]);

  useEffect(() => {
    // Add global keydown listener
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const selectedCount = 
    selection.selectedSubPaths.length +
    selection.selectedTexts.length +
    selection.selectedTextPaths.length +
    selection.selectedImages.length +
    selection.selectedGroups.length;

  return (
    <div className="control-panel">
      <h3>Keyboard Movement</h3>
      <div className="control-group">
        <div className="status-display">
          {selectedCount > 0 ? (
            <>
              <div>Selected: {selectedCount} element{selectedCount !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                Use arrow keys to move
                <br />
                Hold Shift for faster movement
              </div>
            </>
          ) : (
            <div style={{ color: '#999' }}>No elements selected</div>
          )}
        </div>
        
        {grid.snapToGrid && grid.enabled && (
          <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
            Movement step: {grid.size}px (Shift: {grid.size * 2}px)
          </div>
        )}
        
        {(!grid.snapToGrid || !grid.enabled) && (
          <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
            Movement step: 1px (Shift: 10px)
          </div>
        )}
      </div>
    </div>
  );
};