import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { guidelinesManager } from './GuidelinesManager';
import { ActiveSnap } from '../../types';

export const GuidelinesRenderer: React.FC = () => {
  const { enabledFeatures, viewport } = useEditorStore();
  const [activeSnap, setActiveSnap] = useState<ActiveSnap | null>(null);
  
  console.log('GuidelinesRenderer render - guidelinesEnabled:', enabledFeatures.guidelinesEnabled, 'activeSnap:', activeSnap);

  useEffect(() => {
    // Subscribe to guideline manager updates
    const unsubscribe = guidelinesManager.subscribe((snap) => {
      console.log('GuidelinesRenderer received snap update:', snap);
      setActiveSnap(snap);
    });

    return unsubscribe;
  }, []);

  // Don't render if guidelines are disabled
  if (!enabledFeatures.guidelinesEnabled || !activeSnap) {
    return null;
  }

  const { guidelines, distanceGuidelines, distanceMarkers } = activeSnap;
  const strokeWidth = 1 / viewport.zoom;
  const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;

  return (
    <>
      {guidelines.map((guideline) => {
        if (!guideline.visible) return null;

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
              stroke={guideline.color || '#ff0000'}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-guideline-type="horizontal"
              data-guideline-id={guideline.id}
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
              stroke={guideline.color || '#ff0000'}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-guideline-type="vertical"
              data-guideline-id={guideline.id}
            />
          );
        }

        return null;
      })}

      {/* Distance guidelines (continuous lines) */}
      {distanceGuidelines && distanceGuidelines.map((distanceGuideline) => {
        if (!distanceGuideline.visible) return null;

        if (distanceGuideline.type === 'horizontal') {
          // Horizontal distance guideline
          const y = activeSnap.snapPoint.y; // Use snap point Y for positioning
          
          return (
            <line
              key={distanceGuideline.id}
              x1={distanceGuideline.startPosition}
              y1={y}
              x2={distanceGuideline.endPosition}
              y2={y}
              stroke={distanceGuideline.color || '#00aa00'}
              strokeWidth={strokeWidth}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-distance-guideline-type="horizontal"
              data-distance-guideline-id={distanceGuideline.id}
            />
          );
        } else if (distanceGuideline.type === 'vertical') {
          // Vertical distance guideline
          const x = activeSnap.snapPoint.x; // Use snap point X for positioning
          
          return (
            <line
              key={distanceGuideline.id}
              x1={x}
              y1={distanceGuideline.startPosition}
              x2={x}
              y2={distanceGuideline.endPosition}
              stroke={distanceGuideline.color || '#00aa00'}
              strokeWidth={strokeWidth}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-distance-guideline-type="vertical"
              data-distance-guideline-id={distanceGuideline.id}
            />
          );
        }

        return null;
      })}

      {/* Distance markers (X marks) */}
      {distanceMarkers && distanceMarkers.map((marker) => {
        const markerSize = 4 / viewport.zoom;
        const crossStroke = strokeWidth * 1.5;
        
        return (
          <g key={marker.id} data-distance-marker-id={marker.id}>
            {/* X mark - diagonal lines */}
            <line
              x1={marker.x - markerSize}
              y1={marker.y - markerSize}
              x2={marker.x + markerSize}
              y2={marker.y + markerSize}
              stroke={marker.color || '#00aa00'}
              strokeWidth={crossStroke}
              style={{
                pointerEvents: 'none',
                opacity: 0.9
              }}
            />
            <line
              x1={marker.x - markerSize}
              y1={marker.y + markerSize}
              x2={marker.x + markerSize}
              y2={marker.y - markerSize}
              stroke={marker.color || '#00aa00'}
              strokeWidth={crossStroke}
              style={{
                pointerEvents: 'none',
                opacity: 0.9
              }}
            />
            
            {/* Distance value text (optional) */}
            <text
              x={marker.x}
              y={marker.y - markerSize * 2}
              fill={marker.color || '#00aa00'}
              fontSize={10 / viewport.zoom}
              textAnchor="middle"
              style={{
                pointerEvents: 'none',
                opacity: 0.7,
                fontFamily: 'monospace'
              }}
            >
              {Math.round(marker.distance)}px
            </text>
          </g>
        );
      })}

      {/* Snap point indicator */}
      {activeSnap && (
        <circle
          cx={activeSnap.snapPoint.x}
          cy={activeSnap.snapPoint.y}
          r={3 / viewport.zoom}
          fill="none"
          stroke={guidelinesManager.getConfig().guidelineColor}
          strokeWidth={strokeWidth * 2}
          style={{
            pointerEvents: 'none',
            opacity: 0.9
          }}
          data-element-type="snap-indicator"
        />
      )}
    </>
  );
};