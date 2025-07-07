import React from 'react';
import { pluginManager } from '../core/PluginSystem';

/**
 * Hook for handling mouse events in the SVG editor
 * Following the principle: "Separation of logic and presentation"
 */
export const useMouseEventHandlers = () => {
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    // console.log('📱 Mouse: handleMouseDown called');
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    // console.log('📱 Mouse: handleMouseDown context:', { commandId, controlPoint, targetTag: target.tagName });
    pluginManager.handleMouseEvent('mouseDown', e, commandId, controlPoint);
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    // console.log('📱 Mouse: handleMouseMove called');
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseMove', e, commandId, controlPoint);
  };
  
  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    // console.log('📱 Mouse: handleMouseUp called');
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    // console.log('📱 Mouse: handleMouseUp context:', { commandId, controlPoint, targetTag: target.tagName });
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
