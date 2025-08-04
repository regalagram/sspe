import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { stickyManager, AlignmentGuide, DebugProjection } from './StickyManager';

export const StickyRenderer: React.FC = () => {
  console.log('StickyRenderer: Component rendered');
  const { enabledFeatures, viewport } = useEditorStore();
  const [guidelines, setGuidelines] = useState<AlignmentGuide[]>([]);
  const [debugProjections, setDebugProjections] = useState<DebugProjection[]>([]);
  
  useEffect(() => {
    const unsubscribe = stickyManager.subscribe((newGuidelines, newDebugProjections) => {
      console.log('StickyRenderer: Received guidelines:', newGuidelines);
      console.log('StickyRenderer: Received debug projections:', newDebugProjections);
      setGuidelines(newGuidelines);
      setDebugProjections(newDebugProjections);
    });

    return unsubscribe;
  }, []);


  console.log('StickyRenderer: Render state:', {
    enabled: enabledFeatures.stickyGuidelinesEnabled,
    showGuidelines: stickyManager.getConfig().showGuidelines,
    guidelinesCount: guidelines.length,
    debugProjectionsCount: debugProjections.length,
    guidelines: guidelines,
    debugProjections: debugProjections
  });
  
  // Don't render if disabled
  if (!enabledFeatures.stickyGuidelinesEnabled || !stickyManager.getConfig().showGuidelines) {
    console.log('StickyRenderer: Not rendering - disabled');
    return null;
  }

  // Show debug projections if debug mode is enabled (even without guidelines)
  const showDebugProjections = stickyManager.getConfig().debugMode && debugProjections.length > 0;
  
  // Don't render if no guidelines and no debug projections
  if (guidelines.length === 0 && !showDebugProjections) {
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;

  console.log('StickyRenderer: About to render', guidelines.length, 'guidelines');

  return (
    <>
      {guidelines.map((guideline) => {
        console.log('StickyRenderer: Rendering guideline:', guideline);
        
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

      {/* Debug legend when debug projections are active */}
      {showDebugProjections && (
        <g>
          <rect
            x={viewport.viewBox.x + viewport.viewBox.width - 180 / viewport.zoom}
            y={viewport.viewBox.y + 20 / viewport.zoom}
            width={160 / viewport.zoom}
            height={70 / viewport.zoom}
            fill="rgba(0, 0, 0, 0.8)"
            stroke="#00ff00"
            strokeWidth={1 / viewport.zoom}
            rx={4 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={viewport.viewBox.x + viewport.viewBox.width - 170 / viewport.zoom}
            y={viewport.viewBox.y + 35 / viewport.zoom}
            fill="#00ff00"
            fontSize={10 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          >
            DEBUG PROJECTIONS:
          </text>
          <text
            x={viewport.viewBox.x + viewport.viewBox.width - 170 / viewport.zoom}
            y={viewport.viewBox.y + 50 / viewport.zoom}
            fill="#00ff00"
            fontSize={8 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          >
            Bright: Moving | Dim: Static
          </text>
          <text
            x={viewport.viewBox.x + viewport.viewBox.width - 170 / viewport.zoom}
            y={viewport.viewBox.y + 62 / viewport.zoom}
            fill="#00ff00"
            fontSize={8 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          >
            Edges | Centers | Midpoints
          </text>
          <text
            x={viewport.viewBox.x + viewport.viewBox.width - 170 / viewport.zoom}
            y={viewport.viewBox.y + 74 / viewport.zoom}
            fill="#666"
            fontSize={8 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          >
            Total: {debugProjections.length} projections
          </text>
        </g>
      )}

      {/* Alignment legend when guidelines are active */}
      {guidelines.length > 0 && (
        <g>
          <rect
            x={viewport.viewBox.x + 20 / viewport.zoom}
            y={viewport.viewBox.y + 20 / viewport.zoom}
            width={150 / viewport.zoom}
            height={60 / viewport.zoom}
            fill="rgba(255, 255, 255, 0.9)"
            stroke="#ccc"
            strokeWidth={1 / viewport.zoom}
            rx={4 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={viewport.viewBox.x + 30 / viewport.zoom}
            y={viewport.viewBox.y + 35 / viewport.zoom}
            fill="#666"
            fontSize={10 / viewport.zoom}
            style={{ pointerEvents: 'none' }}
          >
            Active Alignments:
          </text>
          {guidelines.slice(0, 3).map((guideline, index) => (
            <g key={`legend-${guideline.id}`}>
              <line
                x1={viewport.viewBox.x + 35 / viewport.zoom}
                y1={viewport.viewBox.y + (50 + index * 8) / viewport.zoom}
                x2={viewport.viewBox.x + 55 / viewport.zoom}
                y2={viewport.viewBox.y + (50 + index * 8) / viewport.zoom}
                stroke={guideline.color}
                strokeWidth={2 / viewport.zoom}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={viewport.viewBox.x + 60 / viewport.zoom}
                y={viewport.viewBox.y + (52 + index * 8) / viewport.zoom}
                fill="#666"
                fontSize={8 / viewport.zoom}
                style={{ pointerEvents: 'none' }}
              >
                {guideline.alignmentType}
              </text>
            </g>
          ))}
        </g>
      )}
    </>
  );
};