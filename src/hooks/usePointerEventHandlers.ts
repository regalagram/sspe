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
  // NOTE: selection is handled centrally by the pointer-interaction plugin.
  // Avoid selecting here to prevent prematurely replacing multi-selection
  // when the user intends to drag multiple selected elements.
    
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
