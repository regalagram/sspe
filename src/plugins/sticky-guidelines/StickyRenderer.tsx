import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { stickyManager, AlignmentGuide, DebugProjection } from './StickyManager';

export const StickyRenderer: React.FC = () => {
    const { enabledFeatures, viewport } = useEditorStore();
  const [guidelines, setGuidelines] = useState<AlignmentGuide[]>([]);
  const [debugProjections, setDebugProjections] = useState<DebugProjection[]>([]);
  
  console.log('StickyRenderer render:', {
    enabled: enabledFeatures.stickyGuidelinesEnabled,
    showGuidelines: stickyManager.getConfig().showGuidelines,
    debugMode: stickyManager.getConfig().debugMode,
    guidelinesCount: guidelines.length,
    debugProjectionsCount: debugProjections.length
  });
  
  useEffect(() => {
    console.log('StickyRenderer subscribing to stickyManager');
    const unsubscribe = stickyManager.subscribe((newGuidelines, newDebugProjections) => {
      console.log('StickyRenderer received update:', {
        guidelines: newGuidelines.length,
        debugProjections: newDebugProjections.length,
        debugMode: stickyManager.getConfig().debugMode,
        hasDebugProjections: newDebugProjections.length > 0,
        firstDebugProjection: newDebugProjections.length > 0 ? newDebugProjections[0] : null
      });
      setGuidelines(newGuidelines);
      setDebugProjections(newDebugProjections);
    });

    return unsubscribe;
  }, []);


    
  // Don't render if disabled
  if (!enabledFeatures.stickyGuidelinesEnabled || !stickyManager.getConfig().showGuidelines) {
        return null;
  }

  // Show debug projections if debug mode is enabled (even without guidelines)
  const debugMode = stickyManager.getConfig().debugMode;
  const debugProjectionsLength = debugProjections.length;
  const showDebugProjections = debugMode && debugProjectionsLength > 0;
  
  console.log('StickyRenderer render decisions - DETAILED:', {
    enabled: enabledFeatures.stickyGuidelinesEnabled,
    showGuidelines: stickyManager.getConfig().showGuidelines,
    debugMode,
    guidelinesCount: guidelines.length,
    debugProjectionsLength,
    debugProjectionsState: debugProjections,
    'debugMode && debugProjectionsLength > 0': debugMode && debugProjectionsLength > 0,
    showDebugProjections,
    willRender: (guidelines.length > 0 || showDebugProjections),
    'first 2 projections': debugProjections.slice(0, 2)
  });
  
  // Don't render if no guidelines and no debug projections
  if (guidelines.length === 0 && !showDebugProjections) {
    console.log('StickyRenderer: Not rendering - no guidelines and no debug projections');
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;

  
  return (
    <>
      {guidelines.map((guideline) => {
                
        // Different visual styles based on alignment type
        const getGuidelineStyle = (alignmentType: string) => {
          switch (alignmentType) {
            case 'center':
              return {
                color: '#ff5f5f',
                opacity: 0.9,
                strokeWidth: strokeWidth * 1.5,
                dashArray
              };
            case 'edge':
              return {
                color: '#2196f3',
                opacity: 0.8,
                strokeWidth,
                dashArray
              };
            case 'midpoint':
              return {
                color: '#4CAF50',
                opacity: 0.7,
                strokeWidth: strokeWidth * 0.8,
                dashArray: `${2 / viewport.zoom} ${6 / viewport.zoom}`
              };
            default:
              return {
                color: guideline.color,
                opacity: 0.8,
                strokeWidth,
                dashArray
              };
          }
        };

        const style = getGuidelineStyle(guideline.alignmentType);
        
        if (guideline.type === 'horizontal') {
          // Horizontal guideline extends across the visible viewport
          const viewportLeft = viewport.viewBox.x;
          const viewportRight = viewport.viewBox.x + viewport.viewBox.width;
          
          return (
            <line
              key={guideline.id}
              x1={viewportLeft}
              y1={guideline.position}
              x2={viewportRight}
              y2={guideline.position}
              stroke={style.color}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              style={{
                pointerEvents: 'none',
                opacity: style.opacity
              }}
              data-sticky-guideline="horizontal"
              data-alignment-type={guideline.alignmentType}
            />
          );
        } else if (guideline.type === 'vertical') {
          // Vertical guideline extends across the visible viewport
          const viewportTop = viewport.viewBox.y;
          const viewportBottom = viewport.viewBox.y + viewport.viewBox.height;
          
          return (
            <line
              key={guideline.id}
              x1={guideline.position}
              y1={viewportTop}
              x2={guideline.position}
              y2={viewportBottom}
              stroke={style.color}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              style={{
                pointerEvents: 'none',
                opacity: style.opacity
              }}
              data-sticky-guideline="vertical"
              data-alignment-type={guideline.alignmentType}
            />
          );
        }

        return null;
      })}

      {/* Debug projections - show all bbox, center and midpoint projections */}
      {showDebugProjections && debugProjections.map((projection) => {
        // Different styles for moving vs static elements for better visual feedback
        const isMoving = projection.isMovingElement;
        const opacity = isMoving ? 0.9 : 0.5; // Moving elements more opaque
        const strokeWidth = isMoving ? 1.5 / viewport.zoom : 1 / viewport.zoom; // Moving elements thicker
        const color = '#00ff00'; // Solid green for all projections
        // No dash array - solid lines as requested
        
        if (projection.type === 'horizontal') {
          // Horizontal debug projection extends across viewport
          const viewportLeft = viewport.viewBox.x;
          const viewportRight = viewport.viewBox.x + viewport.viewBox.width;
          
          return (
            <line
              key={projection.id}
              x1={viewportLeft}
              y1={projection.position}
              x2={viewportRight}
              y2={projection.position}
              stroke={color}
              strokeWidth={strokeWidth}
              style={{
                pointerEvents: 'none',
                opacity: opacity
              }}
              data-debug-projection="horizontal"
              data-projection-type={projection.projectionType}
              data-is-moving={projection.isMovingElement}
            />
          );
        } else if (projection.type === 'vertical') {
          // Vertical debug projection extends across viewport
          const viewportTop = viewport.viewBox.y;
          const viewportBottom = viewport.viewBox.y + viewport.viewBox.height;
          
          return (
            <line
              key={projection.id}
              x1={projection.position}
              y1={viewportTop}
              x2={projection.position}
              y2={viewportBottom}
              stroke={color}
              strokeWidth={strokeWidth}
              style={{
                pointerEvents: 'none',
                opacity: opacity
              }}
              data-debug-projection="vertical"
              data-projection-type={projection.projectionType}
              data-is-moving={projection.isMovingElement}
            />
          );
        }

        return null;
      })}


    </>
  );
};