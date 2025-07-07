import React from 'react';
import { pluginManager } from '../core/PluginSystem';

export const useMouseEventHandlers = () => {
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseDown', e, commandId, controlPoint);
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseMove', e, commandId, controlPoint);
  };
  
  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseUp', e, commandId, controlPoint);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('wheel', e);
  };

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
};
