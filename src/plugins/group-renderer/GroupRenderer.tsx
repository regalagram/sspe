import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SVGGroup, SVGGroupChild } from '../../types';

interface GroupRendererProps {
  group: SVGGroup;
  isSelected?: boolean;
  isParentSelected?: boolean;
}

const GroupElement: React.FC<GroupRendererProps> = ({ group, isSelected = false, isParentSelected = false }) => {
  const { paths, texts, groups, selection, viewport } = useEditorStore();

  // Don't render if group is not visible
  if (group.visible === false) {
    return null;
  }

  // Get the actual elements that belong to this group
  const renderChild = (child: SVGGroupChild) => {
    switch (child.type) {
      case 'path':
        const path = paths.find(p => p.id === child.id);
        if (!path) return null;
        
        // Path rendering should be handled by PathRenderer
        // This is a placeholder - actual implementation would delegate to PathRenderer
        return null;
        
      case 'text':
        const text = texts.find(t => t.id === child.id);
        if (!text) return null;
        
        // Text rendering should be handled by TextRenderer
        // This is a placeholder - actual implementation would delegate to TextRenderer
        return null;
        
      case 'group':
        const childGroup = groups.find(g => g.id === child.id);
        if (!childGroup) return null;
        
        const isChildSelected = selection.selectedGroups.includes(child.id);
        return (
          <GroupElement
            key={child.id}
            group={childGroup}
            isSelected={isChildSelected}
            isParentSelected={isSelected || isParentSelected}
          />
        );
        
      default:
        return null;
    }
  };

  // Calculate group selection visual indicators
  const showGroupBounds = isSelected && !isParentSelected;
  let groupBounds = null;
  
  if (showGroupBounds) {
    // Calculate bounding box of all children
    // This is a simplified version - real implementation would calculate actual bounds
    const margin = 10 / viewport.zoom;
    const strokeWidth = 2 / viewport.zoom;
    
    // Placeholder bounds - should be calculated from actual child elements
    const bounds = {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    };
    
    groupBounds = (
      <rect
        x={bounds.x - margin}
        y={bounds.y - margin}
        width={bounds.width + margin * 2}
        height={bounds.height + margin * 2}
        fill="none"
        stroke="#2196F3"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
        style={{
          pointerEvents: 'none'
        }}
        data-element-type="group-bounds"
        data-element-id={group.id}
      />
    );
  }

  return (
    <g
      id={`group-${group.id}`}
      transform={group.transform}
      style={{
        opacity: group.locked ? 0.6 : 1,
        pointerEvents: group.locked ? 'none' : 'all'
      }}
      data-element-type="group"
      data-element-id={group.id}
    >
      {/* Render all children */}
      {group.children.map(renderChild)}
      
      {/* Group selection indicators */}
      {groupBounds}
      
      {/* Group name label when selected */}
      {isSelected && group.name && (
        <text
          x={0}
          y={-5 / viewport.zoom}
          fontSize={12 / viewport.zoom}
          fill="#2196F3"
          fontFamily="Arial, sans-serif"
          textAnchor="start"
          style={{ pointerEvents: 'none' }}
        >
          {group.name}
        </text>
      )}
    </g>
  );
};

export const GroupRenderer: React.FC = () => {
  const { groups, selection } = useEditorStore();

  return (
    <>
      {groups.map(group => {
        const isSelected = selection.selectedGroups.includes(group.id);
        return (
          <GroupElement
            key={group.id}
            group={group}
            isSelected={isSelected}
          />
        );
      })}
    </>
  );
};