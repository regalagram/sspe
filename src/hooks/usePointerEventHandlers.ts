import React from 'react';
import { pluginManager } from '../core/PluginSystem';
import { useEditorStore } from '../store/editorStore';

export const usePointerEventHandlers = () => {
  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
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
    try {
      const store = useEditorStore.getState();
      const addToSelection = Boolean(e.shiftKey || e.ctrlKey || e.metaKey);
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
    } catch (err) {
      // ignore errors selecting
    }
    
    pluginManager.handlePointerEvent('pointerDown', e, effectiveCommandId, controlPoint);
  };
  
  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
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
