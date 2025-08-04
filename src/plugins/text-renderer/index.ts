import React from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { TextRenderer } from './TextRenderer';
import { useEditorStore } from '../../store/editorStore';
import { getSVGPoint } from '../../utils/transform-utils';
import { getCommandPosition } from '../../utils/path-utils';
import { transformManager } from '../transform/TransformManager';
import { captureAllSelectedElementsPositions, moveAllCapturedElementsByDelta, DraggedElementsData } from '../../utils/drag-utils';

// Global state for text dragging
let textDragState = {
  isDragging: false,
  textId: null as string | null,
  startPoint: null as { x: number; y: number } | null,
  lastPoint: null as { x: number; y: number } | null,
  capturedElements: null as DraggedElementsData | null,
  dragStarted: false,
};

const handleTextPointerDown = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
  const target = e.target as SVGElement;
  const elementType = target.getAttribute('data-element-type');
  const textId = target.getAttribute('data-element-id');
  
  if ((elementType === 'text' || elementType === 'multiline-text') && textId) {
    const store = useEditorStore.getState();
    const { selection, addToSelection, selectText } = store;
    
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
    
    // Capture initial positions of all selected elements using the centralized utility
    const capturedElements = captureAllSelectedElementsPositions();
    
    textDragState = {
      isDragging: true,
      textId,
      startPoint: point,
      lastPoint: point,
      capturedElements,
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
  const currentPoint = getSVGPoint(e, context.svgRef, store.viewport);
  
  // Check drag threshold
  if (!textDragState.dragStarted) {
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - textDragState.startPoint.x, 2) + 
      Math.pow(currentPoint.y - textDragState.startPoint.y, 2)
    );
    if (distance < 5) return true;
    textDragState.dragStarted = true;
    transformManager.setMoving(true);
  }

  // Calcular delta relativo
  const lastPoint = textDragState.lastPoint || textDragState.startPoint;
  const delta = {
    x: currentPoint.x - lastPoint.x,
    y: currentPoint.y - lastPoint.y,
  };

  // Mover todos los elementos capturados usando delta
  if (textDragState.capturedElements) {
    moveAllCapturedElementsByDelta(
      textDragState.capturedElements,
      delta,
      store.grid.snapToGrid,
      store.grid.size
    );
  }

  // Actualizar lastPoint
  textDragState.lastPoint = currentPoint;
  return true;
};

const handleTextPointerUp = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
  if (!textDragState.isDragging) return false;
  
  // Show transform handles again
  if (textDragState.dragStarted) {
    transformManager.setMoving(false);
  }
  
  textDragState = {
    isDragging: false,
    textId: null,
    startPoint: null,
    lastPoint: null,
    capturedElements: null,
    dragStarted: false,
  };
  
  return true;
};

const textRendererPlugin: Plugin = {
  id: 'text-renderer',
  name: 'Text Renderer',
  version: '1.0.0',
  enabled: true,
  // Note: Pointer handling is now done by pointer-interaction plugin to avoid conflicts
  // pointerHandlers: {
  //   onPointerDown: handleTextPointerDown,
  //   onPointerMove: handleTextPointerMove,
  //   onPointerUp: handleTextPointerUp,
  // },
  ui: [
    {
      id: 'text-renderer-ui',
      component: TextRenderer,
      position: 'svg-content',
      order: 10
    }
  ]
};

export const TextRendererPlugin = textRendererPlugin;
export default textRendererPlugin;