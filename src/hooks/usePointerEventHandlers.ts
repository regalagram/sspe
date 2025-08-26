import React from 'react';
import { pluginManager } from '../core/PluginSystem';
import { useEditorStore } from '../store/editorStore';
import { textEditManager } from '../managers/TextEditManager';

export const usePointerEventHandlers = () => {
  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
    // Enhanced gesture prevention for mobile edge touches
    e.preventDefault();
    e.stopPropagation();
    
    // Additional protection for touches in edge areas
    if (e.nativeEvent instanceof TouchEvent || (e as any).pointerType === 'touch') {
      const isLeftEdge = e.clientX < 50;
      const isRightEdge = e.clientX > window.innerWidth - 50;
      const isTopEdge = e.clientY < 50;
      const isBottomEdge = e.clientY > window.innerHeight - 50;
      
      // Force prevention for touches in edge areas
      if (isLeftEdge || isRightEdge || isTopEdge || isBottomEdge) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    
    // Also check for text elements
    const elementType = target.getAttribute('data-element-type');
    const elementId = target.getAttribute('data-element-id');
    
    // For text elements, use elementId as commandId to enable plugin prioritization
    const effectiveCommandId = commandId || (elementType && elementId ? elementId : undefined);

    // If this pointerdown is on a command element (anchor or control point), automatically select it.
    // For x1y1 handles, prefer selecting the previous command (the anchor at the start of the line)
    // if a data-prev-command-id attribute is provided.
    // Respect modifier keys for multi-select/toggle behavior.
    // NOTE: selection is handled centrally by the pointer-interaction plugin.
    // However, for control points we still want to auto-select the underlying
    // command so dragging a handle immediately affects that command.
    try {
      const store = useEditorStore.getState();
      const addToSelection = Boolean(e.shiftKey || e.ctrlKey || e.metaKey);
      if (controlPoint && effectiveCommandId) {
        let commandToSelect: string | undefined = undefined;
        if (controlPoint === 'x1y1') {
          const prevId = target.getAttribute('data-prev-command-id') || undefined;
          commandToSelect = prevId || effectiveCommandId;
        } else {
          commandToSelect = effectiveCommandId;
        }

        if (commandToSelect) {
          store.selectCommand(commandToSelect, addToSelection);
        }
      }
    } catch (err) {
      // ignore errors selecting
    }
    
    // Check if we should terminate text editing when clicking on empty space
    // This is especially useful for mobile devices
    if (textEditManager.isEditing()) {
      const isTextInput = target.classList.contains('text-edit-overlay-input') || 
                         target.classList.contains('text-edit-overlay-textarea');
      const isTextElement = elementType === 'text';
      const isEditingCurrentText = isTextElement && textEditManager.isTextBeingEdited(elementId || '');
      
      // If clicking anywhere other than:
      // 1. The text editing input/textarea
      // 2. A text element 
      // 3. The currently editing text element
      // Then terminate text editing
      if (!isTextInput && !isTextElement && !isEditingCurrentText) {
        // Save the current editing and stop
        textEditManager.stopTextEdit(true);
      }
      // If clicking on a different text element while editing another, also terminate
      else if (isTextElement && !isEditingCurrentText) {
        // Save the current editing and stop
        textEditManager.stopTextEdit(true);
      }
    }
    
    pluginManager.handlePointerEvent('pointerDown', e, effectiveCommandId, controlPoint);
  };
  
  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    // Prevent gesture interference during pointer move
    if (e.nativeEvent instanceof TouchEvent || (e as any).pointerType === 'touch') {
      e.preventDefault();
    }
    
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    
    // Also check for text elements
    const elementType = target.getAttribute('data-element-type');
    const elementId = target.getAttribute('data-element-id');
    
    // For text elements, use elementId as commandId to enable plugin prioritization
    const effectiveCommandId = commandId || (elementType && elementId ? elementId : undefined);
    
    pluginManager.handlePointerEvent('pointerMove', e, effectiveCommandId, controlPoint);
  };
  
  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    
    // Also check for text elements
    const elementType = target.getAttribute('data-element-type');
    const elementId = target.getAttribute('data-element-id');
    
    // For text elements, use elementId as commandId to enable plugin prioritization
    const effectiveCommandId = commandId || (elementType && elementId ? elementId : undefined);
    
    pluginManager.handlePointerEvent('pointerUp', e, effectiveCommandId, controlPoint);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGElement>) => {
    pluginManager.handlePointerEvent('wheel', e);
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  };
};
