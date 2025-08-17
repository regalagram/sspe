import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SVGGroup, SVGGroupChild, GroupLockLevel } from '../../types';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
import { calculateTextBoundsDOM } from '../../utils/text-utils';
import { calculateGlobalViewBox } from '../../utils/viewbox-utils';
import { subPathToString } from '../../utils/path-utils';

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

  // Calculate bounds using the same method as TransformManager (which works correctly)
  const calculateGroupBounds = (group: SVGGroup) => {
    if (typeof document === 'undefined') return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    let hasContent = false;

    // Add all children of the group to the temp SVG (same logic as TransformManager)
    for (const child of group.children) {
      switch (child.type) {
        case 'path': {
          const path = paths.find((p: any) => p.id === child.id);
          if (path) {
            // Add all subpaths from this path
            for (const subPath of path.subPaths) {
              const pathElement = document.createElementNS(svgNS, 'path');
              const pathData = subPathToString(subPath);
              if (pathData) {
                pathElement.setAttribute('d', pathData);
                tempSvg.appendChild(pathElement);
                hasContent = true;
              }
            }
          }
          break;
        }
        case 'text': {
          const text = texts.find((t: any) => t.id === child.id);
          if (text) {
            // Use the same method as TransformManager - calculateTextBoundsDOM
            const bounds = calculateTextBoundsDOM(text);
            if (bounds) {
              // Create a rectangle path that represents the text bounds
              const pathElement = document.createElementNS(svgNS, 'path');
              const pathData = `M ${bounds.x},${bounds.y} L ${bounds.x + bounds.width},${bounds.y} L ${bounds.x + bounds.width},${bounds.y + bounds.height} L ${bounds.x},${bounds.y + bounds.height} Z`;
              pathElement.setAttribute('d', pathData);
              pathElement.setAttribute('fill', 'none');
              pathElement.setAttribute('stroke', 'none');
              tempSvg.appendChild(pathElement);
              hasContent = true;
            }
          }
          break;
        }
        case 'image': {
          const image = images.find((img: any) => img.id === child.id);
          if (image) {
            const imageElement = document.createElementNS(svgNS, 'image');
            imageElement.setAttribute('x', image.x.toString());
            imageElement.setAttribute('y', image.y.toString());
            imageElement.setAttribute('width', image.width.toString());
            imageElement.setAttribute('height', image.height.toString());
            if (image.transform) {
              imageElement.setAttribute('transform', image.transform);
            }
            tempSvg.appendChild(imageElement);
            hasContent = true;
          }
          break;
        }
        case 'group': {
          // For nested groups, recursively add their children
          const childGroup = groups.find((g: any) => g.id === child.id);
          if (childGroup) {
            const childBounds = calculateGroupBounds(childGroup);
            if (childBounds) {
              // Create a rectangle representing the child group bounds
              const pathElement = document.createElementNS(svgNS, 'path');
              const pathData = `M ${childBounds.x},${childBounds.y} L ${childBounds.x + childBounds.width},${childBounds.y} L ${childBounds.x + childBounds.width},${childBounds.y + childBounds.height} L ${childBounds.x},${childBounds.y + childBounds.height} Z`;
              pathElement.setAttribute('d', pathData);
              pathElement.setAttribute('fill', 'none');
              pathElement.setAttribute('stroke', 'none');
              tempSvg.appendChild(pathElement);
              hasContent = true;
            }
          }
          break;
        }
      }
    }

    if (!hasContent) {
      return null;
    }

    // Use the DOM-based viewbox calculation (same as TransformManager)
    const viewBoxResult = calculateGlobalViewBox(tempSvg);
    
    // Clean up
    if (tempSvg.parentNode) {
      tempSvg.parentNode.removeChild(tempSvg);
    }

    if (!viewBoxResult || viewBoxResult.width <= 0 || viewBoxResult.height <= 0) {
      return null;
    }

    // Parse the viewBox to get coordinates
    const viewBoxParts = viewBoxResult.viewBox.split(' ').map(Number);
    const [x, y, width, height] = viewBoxParts;

    // Convert to bounds (remove padding that calculateGlobalViewBox adds)
    const padding = Math.max(2, Math.max(width, height) * 0.05);
    let actualX = x + padding;
    let actualY = y + padding;
    const actualWidth = width - padding * 2;
    const actualHeight = height - padding * 2;

    // Apply group transform to the bounds
    if (group.transform) {
      const transformMatch = group.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (transformMatch) {
        const translateX = parseFloat(transformMatch[1]) || 0;
        const translateY = parseFloat(transformMatch[2]) || 0;
        actualX += translateX;
        actualY += translateY;
      }
    }

    return {
      x: actualX,
      y: actualY,
      width: actualWidth,
      height: actualHeight
    };
  };

  const bounds = calculateGroupBounds(group);

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