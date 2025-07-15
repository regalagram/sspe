import React from 'react';
import { pluginManager } from '../core/PluginSystem';

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
