import React from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { TextRenderer } from './TextRenderer';
import { useEditorStore } from '../../store/editorStore';
import { getSVGPoint } from '../../utils/transform-utils';
import { getCommandPosition } from '../../utils/path-utils';
import { transformManager } from '../transform/TransformManager';

// Global state for text dragging
let textDragState = {
  isDragging: false,
  textId: null as string | null,
  startPoint: null as { x: number; y: number } | null,
  initialTextPositions: {} as { [id: string]: { x: number; y: number } },
  initialCommandPositions: {} as { [id: string]: { x: number; y: number } },
  initialSubPathCommands: {} as { [subPathId: string]: string[] }, // Track which commands belong to each subpath
  dragStarted: false,
};

const handleTextPointerDown = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
  const target = e.target as SVGElement;
  const elementType = target.getAttribute('data-element-type');
  const textId = target.getAttribute('data-element-id');
  
  if ((elementType === 'text' || elementType === 'multiline-text') && textId) {
    const store = useEditorStore.getState();
    const { selection, texts, paths, addToSelection, selectText } = store;
    
    // Handle selection logic
    if (e.shiftKey) {
      // Shift+click: add to selection
      addToSelection(textId, 'text');
    } else {
      // Check if this text is already selected
      const textAlreadySelected = selection.selectedTexts.includes(textId);
      
      if (textAlreadySelected) {
        // Don't change selection - preserve current selection for dragging
        // (whether it's multiple texts or mixed selection)
      } else {
        // Regular click: select this text (replace current selection)
        selectText(textId);
      }
    }
    
    // Start drag
    const point = getSVGPoint(e, context.svgRef, store.viewport);
    
    // Get updated selection after any changes made above
    const updatedStore = useEditorStore.getState();
    const updatedSelection = updatedStore.selection;
    const updatedTexts = updatedStore.texts;
    const updatedPaths = updatedStore.paths;
    
    // Capture initial positions of all selected texts
    const initialTextPositions: { [id: string]: { x: number; y: number } } = {};
    updatedSelection.selectedTexts.forEach(selectedTextId => {
      const text = updatedTexts.find(t => t.id === selectedTextId);
      if (text) {
        initialTextPositions[selectedTextId] = { x: text.x, y: text.y };
      }
    });
    
    // Capture initial positions of all selected commands
    const initialCommandPositions: { [id: string]: { x: number; y: number } } = {};
    updatedSelection.selectedCommands.forEach(commandId => {
      updatedPaths.forEach(path => {
        path.subPaths.forEach(subPath => {
          const command = subPath.commands.find(cmd => cmd.id === commandId);
          if (command) {
            const pos = getCommandPosition(command);
            if (pos) {
              initialCommandPositions[commandId] = { x: pos.x, y: pos.y };
            }
          }
        });
      });
    });
    
    // Capture initial positions of all commands in selected sub-paths (avoid duplicates)
    const initialSubPathCommands: { [subPathId: string]: string[] } = {};
    updatedSelection.selectedSubPaths.forEach(subPathId => {
      updatedPaths.forEach(path => {
        const subPath = path.subPaths.find(sp => sp.id === subPathId);
        if (subPath) {
          const commandIds: string[] = [];
          subPath.commands.forEach(command => {
            // Only add if not already captured from selectedCommands
            if (!initialCommandPositions[command.id]) {
              const pos = getCommandPosition(command);
              if (pos) {
                initialCommandPositions[command.id] = { x: pos.x, y: pos.y };
                commandIds.push(command.id);
              }
            } else {
              // Still track the command ID for this subpath even if position already captured
              commandIds.push(command.id);
            }
          });
          initialSubPathCommands[subPathId] = commandIds;
        }
      });
    });
    
    textDragState = {
      isDragging: true,
      textId,
      startPoint: point,
      initialTextPositions,
      initialCommandPositions,
      initialSubPathCommands,
      dragStarted: false,
    };
    
    return true;
  }
  
  return false;
};

const handleTextPointerMove = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
  if (!textDragState.isDragging || !textDragState.startPoint) {
    return false;
  }
  
  const store = useEditorStore.getState();
  const { moveText, moveCommand, texts } = store;
  const currentPoint = getSVGPoint(e, context.svgRef, store.viewport);
  
  // Check drag threshold
  if (!textDragState.dragStarted) {
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - textDragState.startPoint.x, 2) + 
      Math.pow(currentPoint.y - textDragState.startPoint.y, 2)
    );
    
    if (distance < 5) return true;
    textDragState.dragStarted = true;
    
    // Hide transform handles during text dragging
    transformManager.setMoving(true);
  }
  
  // Calculate total offset from drag start
  const totalOffset = {
    x: currentPoint.x - textDragState.startPoint.x,
    y: currentPoint.y - textDragState.startPoint.y,
  };
  
  // Move all selected texts
  Object.keys(textDragState.initialTextPositions).forEach(textId => {
    const initialPos = textDragState.initialTextPositions[textId];
    const newPosition = {
      x: initialPos.x + totalOffset.x,
      y: initialPos.y + totalOffset.y,
    };
    
    const currentText = texts.find(t => t.id === textId);
    if (currentText) {
      const deltaFromCurrent = {
        x: newPosition.x - currentText.x,
        y: newPosition.y - currentText.y,
      };
      if (Math.abs(deltaFromCurrent.x) > 0.001 || Math.abs(deltaFromCurrent.y) > 0.001) {
        moveText(textId, deltaFromCurrent);
      }
    }
  });
  
  // Move all selected commands
  Object.keys(textDragState.initialCommandPositions).forEach(commandId => {
    const initialPos = textDragState.initialCommandPositions[commandId];
    const newPosition = {
      x: initialPos.x + totalOffset.x,
      y: initialPos.y + totalOffset.y,
    };
    moveCommand(commandId, newPosition);
  });
  
  return true;
};

const handleTextPointerUp = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
  if (!textDragState.isDragging) return false;
  
  // Show transform handles again when text dragging ends
  if (textDragState.dragStarted) {
    transformManager.setMoving(false);
  }
  
  textDragState = {
    isDragging: false,
    textId: null,
    startPoint: null,
    initialTextPositions: {},
    initialCommandPositions: {},
    initialSubPathCommands: {},
    dragStarted: false,
  };
  
  return true;
};

export const TextRendererPlugin: Plugin = {
  id: 'text-renderer',
  name: 'Text Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'text-renderer',
      component: TextRenderer,
      position: 'svg-content',
      order: 15, // Render after paths
    },
  ],
  pointerHandlers: {
    onPointerDown: handleTextPointerDown,
    onPointerMove: handleTextPointerMove,
    onPointerUp: handleTextPointerUp,
  },
};