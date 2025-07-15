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

  const handleSelectGroupElements = () => {
    // Recolectar todos los elementos del grupo
    const pathIds: string[] = [];
    const textIds: string[] = [];
    const groupIds: string[] = [];
    const subPathIds: string[] = [];
    
    group.children.forEach(child => {
      if (child.type === 'path') {
        pathIds.push(child.id);
        // Encontrar todos los subpaths del path
        const path = paths.find(p => p.id === child.id);
        if (path && path.subPaths) {
          path.subPaths.forEach(subPath => {
            subPathIds.push(subPath.id);
          });
        }
      } else if (child.type === 'text') {
        textIds.push(child.id);
      } else if (child.type === 'group') {
        groupIds.push(child.id);
      }
    });
    
    // Actualizar la selección directamente en el store
    useEditorStore.setState(state => ({
      ...state,
      selection: {
        ...state.selection,
        selectedPaths: pathIds,
        selectedTexts: textIds,
        selectedGroups: groupIds,
        selectedSubPaths: subPathIds,
        selectedCommands: [],
        selectedControlPoints: [],
        selectedTextSpans: []
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
  const showGroupBounds = isSelected && !isParentSelected;
  let groupBounds = null;
  
  if (showGroupBounds && bounds) {
    const margin = 10 / viewport.zoom;
    const strokeWidth = 2 / viewport.zoom;
    
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
      {isSelected && group.name && bounds && (
        <g 
          onClick={handleSelectGroupElements}
          style={{ cursor: 'pointer' }}
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
            stroke="#2196F3"
            strokeWidth={1 / viewport.zoom}
            rx={2 / viewport.zoom}
            style={{ pointerEvents: 'all' }}
          />
          {/* Text label */}
          <text
            x={bounds.x}
            y={bounds.y - 5 / viewport.zoom}
            fontSize={12 / viewport.zoom}
            fill="#2196F3"
            fontFamily="Arial, sans-serif"
            textAnchor="start"
            style={{ pointerEvents: 'all' }}
          >
            {group.name}
          </text>
        </g>
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