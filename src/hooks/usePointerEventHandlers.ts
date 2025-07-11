import React from 'react';
import { pluginManager } from '../core/PluginSystem';

export const usePointerEventHandlers = () => {
  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handlePointerEvent('pointerDown', e, commandId, controlPoint);
  };
  
  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handlePointerEvent('pointerMove', e, commandId, controlPoint);
  };
  
  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handlePointerEvent('pointerUp', e, commandId, controlPoint);
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
