import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { stickyManager, AlignmentGuide } from './StickyManager';

export const StickyRenderer: React.FC = () => {
  console.log('StickyRenderer: Component rendered');
  const { enabledFeatures, viewport } = useEditorStore();
  const [guidelines, setGuidelines] = useState<AlignmentGuide[]>([]);
  
  useEffect(() => {
    const unsubscribe = stickyManager.subscribe((newGuidelines) => {
      console.log('StickyRenderer: Received guidelines:', newGuidelines);
      setGuidelines(newGuidelines);
    });

    return unsubscribe;
  }, []);


  console.log('StickyRenderer: Render state:', {
    enabled: enabledFeatures.stickyGuidelinesEnabled,
    showGuidelines: stickyManager.getConfig().showGuidelines,
    guidelinesCount: guidelines.length,
    guidelines: guidelines
  });

  // Show test guidelines when enabled but no guidelines are active (for debugging)
  const showTestGuidelines = enabledFeatures.stickyGuidelinesEnabled && stickyManager.getConfig().showGuidelines && guidelines.length === 0;
  
  // Don't render if disabled
  if (!enabledFeatures.stickyGuidelinesEnabled || !stickyManager.getConfig().showGuidelines) {
    console.log('StickyRenderer: Not rendering - disabled');
    return null;
  }

  // If no guidelines but enabled, show test lines
  if (showTestGuidelines) {
    const strokeWidth = 1 / viewport.zoom;
    const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;
    const centerX = viewport.viewBox.x + viewport.viewBox.width / 2;
    const centerY = viewport.viewBox.y + viewport.viewBox.height / 2;
    
    return (
      <>
        {/* Test vertical line */}
        <line
          x1={centerX}
          y1={viewport.viewBox.y}
          x2={centerX}
          y2={viewport.viewBox.y + viewport.viewBox.height}
          stroke="#ff5f5f"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          style={{
            pointerEvents: 'none',
            opacity: 0.3
          }}
          data-sticky-guideline="test-vertical"
        />
        {/* Test horizontal line */}
        <line
          x1={viewport.viewBox.x}
          y1={centerY}
          x2={viewport.viewBox.x + viewport.viewBox.width}
          y2={centerY}
          stroke="#ff5f5f"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          style={{
            pointerEvents: 'none',
            opacity: 0.3
          }}
          data-sticky-guideline="test-horizontal"
        />
        <text
          x={centerX}
          y={centerY - 20 / viewport.zoom}
          fill="#ff5f5f"
          fontSize={12 / viewport.zoom}
          textAnchor="middle"
          style={{ pointerEvents: 'none', opacity: 0.7 }}
        >
          Sticky Guidelines Active - Drag elements to see alignment
        </text>
      </>
    );
  }

  // Don't render if no active guidelines
  if (guidelines.length === 0) {
    return null;
  }

  const strokeWidth = 1 / viewport.zoom;
  const dashArray = `${4 / viewport.zoom} ${4 / viewport.zoom}`;

  console.log('StickyRenderer: About to render', guidelines.length, 'guidelines');

  return (
    <>
      {guidelines.map((guideline) => {
        console.log('StickyRenderer: Rendering guideline:', guideline);
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
              stroke={guideline.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-sticky-guideline="horizontal"
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
              stroke={guideline.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              style={{
                pointerEvents: 'none',
                opacity: 0.8
              }}
              data-sticky-guideline="vertical"
            />
          );
        }

        return null;
      })}
    </>
  );
};