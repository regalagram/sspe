import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SVGGroup, SVGGroupChild, GroupLockLevel } from '../../types';
import { useAnimationsForElement } from '../../components/AnimationRenderer';

interface GroupRendererProps {
  group: SVGGroup;
  isSelected?: boolean;
  isParentSelected?: boolean;
}

const GroupElement: React.FC<GroupRendererProps> = ({ group, isSelected = false, isParentSelected = false }) => {
  const { paths, texts, images, groups, selection, viewport, getGroupLockLevel, isGroupLocked, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(group.id);

  const handleSelectGroupElements = () => {
    // Check if group is locked for selection
    if (isGroupLocked(group.id, 'selection')) {
      return;
    }
    
    // Instead of selecting individual elements, select the group itself
    useEditorStore.setState(state => ({
      ...state,
      selection: {
        ...state.selection,
        selectedPaths: [],
        selectedTexts: [],
        selectedGroups: [group.id], // Select the group directly
        selectedSubPaths: [],
        selectedCommands: [],
        selectedControlPoints: [],
        selectedTextSpans: [],
        selectedImages: [],
        selectedUses: [],
        selectedAnimations: []
      }
    }));
  };

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

  // Calculate bounding box of all children (for both selection indicators and name positioning)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let foundValidBounds = false;
  
  group.children.forEach(child => {
    if (child.type === 'path') {
      const path = paths.find(p => p.id === child.id);
      if (path && path.subPaths) {
        path.subPaths.forEach(sp => {
          sp.commands.forEach(cmd => {
            if (typeof cmd.x === 'number' && typeof cmd.y === 'number') {
              minX = Math.min(minX, cmd.x);
              minY = Math.min(minY, cmd.y);
              maxX = Math.max(maxX, cmd.x);
              maxY = Math.max(maxY, cmd.y);
              foundValidBounds = true;
            }
            if (typeof cmd.x1 === 'number' && typeof cmd.y1 === 'number') {
              minX = Math.min(minX, cmd.x1);
              minY = Math.min(minY, cmd.y1);
              maxX = Math.max(maxX, cmd.x1);
              maxY = Math.max(maxY, cmd.y1);
              foundValidBounds = true;
            }
            if (typeof cmd.x2 === 'number' && typeof cmd.y2 === 'number') {
              minX = Math.min(minX, cmd.x2);
              minY = Math.min(minY, cmd.y2);
              maxX = Math.max(maxX, cmd.x2);
              maxY = Math.max(maxY, cmd.y2);
              foundValidBounds = true;
            }
          });
        });
      }
    } else if (child.type === 'text') {
      const text = texts.find(t => t.id === child.id);
      if (text) {
        const fontSize = text.style?.fontSize || 16;
        let textWidth = 0;
        let textHeight = fontSize;
        
        if (text.type === 'text') {
          textWidth = (text.content?.length || 0) * fontSize * 0.6;
        } else if (text.type === 'multiline-text') {
          const maxLineLength = Math.max(...text.spans.map(span => span.content?.length || 0));
          textWidth = maxLineLength * fontSize * 0.6;
          textHeight = text.spans.length * fontSize * 1.2;
        }
        
        minX = Math.min(minX, text.x);
        minY = Math.min(minY, text.y);
        maxX = Math.max(maxX, text.x + textWidth);
        maxY = Math.max(maxY, text.y + textHeight);
        foundValidBounds = true;
      }
    } else if (child.type === 'image') {
      const image = images.find(img => img.id === child.id);
      if (image) {
        minX = Math.min(minX, image.x);
        minY = Math.min(minY, image.y);
        maxX = Math.max(maxX, image.x + image.width);
        maxY = Math.max(maxY, image.y + image.height);
        foundValidBounds = true;
      }
    } else if (child.type === 'group') {
      // For nested groups, we would need to recursively calculate bounds
      // For now, skip nested groups to avoid complexity
    }
  });
  
  const bounds = foundValidBounds ? {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  } : null;

  // Calculate group selection visual indicators
  // Show bounds if:
  // 1. Group is selected and not a child of another selected group (original behavior)
  // 2. OR the showGroupsFrame debug feature is enabled (force show all group frames)
  const showGroupBounds = (isSelected && !isParentSelected) || enabledFeatures.showGroupsFrame;
  let groupBounds = null;
  
  if (showGroupBounds && bounds) {
    const margin = 10 / viewport.zoom;
    const strokeWidth = 2 / viewport.zoom;
    
    // Different colors for selection vs debug mode
    const isSelectedState = isSelected && !isParentSelected;
    const strokeColor = isSelectedState ? "#2196F3" : "#FF9800"; // Blue for selected, orange for debug
    
    groupBounds = (
      <rect
        x={bounds.x - margin}
        y={bounds.y - margin}
        width={bounds.width + margin * 2}
        height={bounds.height + margin * 2}
        fill="none"
        stroke={strokeColor}
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
      id={group.id}
      transform={group.transform}
      filter={group.style?.filter}
      clipPath={group.style?.clipPath}
      mask={group.style?.mask}
      style={{
        opacity: isGroupLocked(group.id, 'selection') ? 0.6 : 1,
        pointerEvents: isGroupLocked(group.id, 'movement') ? 'none' : 'all'
      }}
      data-element-type="group"
      data-element-id={group.id}
    >
      {/* Render all children */}
      {group.children.map(renderChild)}
      
      {/* Group selection indicators */}
      {groupBounds}
      
      {/* Group name label when selected or debug feature enabled */}
      {(isSelected || enabledFeatures.showGroupsFrame) && group.name && bounds && (
        <g 
          onClick={handleSelectGroupElements}
          style={{ cursor: isGroupLocked(group.id, 'selection') ? 'not-allowed' : 'pointer' }}
          data-element-type="group-name"
          data-element-id={group.id}
        >
          {/* Background rectangle for text */}
          <rect
            x={bounds.x - 2 / viewport.zoom}
            y={bounds.y - 17 / viewport.zoom}
            width={(group.name.length * 7 + 4) / viewport.zoom}
            height={14 / viewport.zoom}
            fill="white"
            stroke={isGroupLocked(group.id, 'selection') ? '#ff5722' : (isSelected && !isParentSelected ? '#2196F3' : '#FF9800')}
            strokeWidth={1 / viewport.zoom}
            rx={2 / viewport.zoom}
            style={{ pointerEvents: 'all' }}
          />
          {/* Lock indicator */}
          {isGroupLocked(group.id, 'selection') && (
            <text
              x={bounds.x + (group.name.length * 7 + 6) / viewport.zoom}
              y={bounds.y - 5 / viewport.zoom}
              fontSize={10 / viewport.zoom}
              fill="#ff5722"
              fontFamily="Arial, sans-serif"
              textAnchor="start"
              style={{ pointerEvents: 'all' }}
            >
              🔒
            </text>
          )}
          {/* Text label */}
          <text
            x={bounds.x}
            y={bounds.y - 5 / viewport.zoom}
            fontSize={12 / viewport.zoom}
            fill={isGroupLocked(group.id, 'selection') ? '#ff5722' : (isSelected && !isParentSelected ? '#2196F3' : '#FF9800')}
            fontFamily="Arial, sans-serif"
            textAnchor="start"
            style={{ pointerEvents: 'all' }}
          >
            {group.name}
          </text>
        </g>
      )}
      
      {/* Include animations with programmatic control */}
      {animations}
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