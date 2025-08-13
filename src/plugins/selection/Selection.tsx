import React, { useState, PointerEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Copy } from 'lucide-react';
import { Pointer, XCircle } from 'lucide-react';
import { getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { toolModeManager } from '../../managers/ToolModeManager';

// Rectangle Selection Manager
interface RectSelectionState {
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
}

class RectSelectionManager {
  private state: RectSelectionState = {
    isSelecting: false,
    selectionStart: null,
    selectionRect: null,
  };

  private editorStore: any;
  private listeners: (() => void)[] = [];

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const { mode } = this.editorStore;

    // Check if clicking on a transform handle - if so, don't start rectangle selection
    const target = e.target as SVGElement;
    const handleType = target.getAttribute('data-handle-type');
    const handleId = target.getAttribute('data-handle-id');
    
    if (handleType === 'transform' || handleType === 'rotation' || handleId) {
      return false; // Let transform plugin handle this
    }

    // Don't start rectangle selection if something is already being moved/transformed
    if (transformManager.isMoving() || transformManager.isTransforming()) {
      return false;
    }

    // Check if we're clicking on an element that should be handled by other plugins
    const elementType = target.getAttribute('data-element-type');
    const elementId = target.getAttribute('data-element-id');
    const isSpecificElement = elementType && (
      elementType === 'image' || 
      elementType === 'use' || 
      elementType === 'text' || 
      elementType === 'multiline-text' || 
      elementType === 'textPath'
    );
    
    // Handle individual element selection first
    if (mode.current === 'select' && e.button === 0 && elementId && isSpecificElement) {
      // Let the element-specific selection logic handle this
      // (pointer-interaction plugin will handle the actual selection)
      return false;
    }
    
    // Allow rectangle selection to start if:
    // - We're in select mode
    // - No control point interaction
    // - Left mouse button
    // - No shift key (shift is for adding to selection)
    // - No specific element interaction (commandId only exists for paths/commands, not for empty space)
    // - AND clicking on empty space (no commandId and no specific element type)
    const shouldStartRectSelection = mode.current === 'select' && 
                                   !controlPoint && 
                                   e.button === 0 && 
                                   !e.shiftKey && 
                                   (!commandId && !isSpecificElement);

    if (shouldStartRectSelection) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      this.state.isSelecting = true;
      this.state.selectionStart = svgPoint;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionStart) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      const x = Math.min(this.state.selectionStart.x, svgPoint.x);
      const y = Math.min(this.state.selectionStart.y, svgPoint.y);
      const width = Math.abs(this.state.selectionStart.x - svgPoint.x);
      const height = Math.abs(this.state.selectionStart.y - svgPoint.y);
      this.state.selectionRect = { x, y, width, height };
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { clearSelection } = this.editorStore;
    
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, texts, selectMultiple, selectInBox } = this.editorStore;
      
      const hasSignificantArea = this.state.selectionRect.width > 5 || this.state.selectionRect.height > 5;
      
      if (hasSignificantArea) {
        // Use the centralized selectInBox function for mixed selections
        selectInBox(this.state.selectionRect);
      }

      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return hasSignificantArea;
    }

    if (this.state.isSelecting) {
      // Single click on empty space - clear selection
      const target = e.target as SVGElement;
      const elementType = target.getAttribute('data-element-type');
      const isEmptySpaceClick = !context.commandId && !context.controlPoint && !elementType && !e.shiftKey;
      
      if (isEmptySpaceClick) {
        clearSelection();
      }
      
      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  getCursor(): string {
    return this.state.isSelecting ? 'crosshair' : 'default';
  }

  getSelectionRect() {
    return this.state.selectionRect;
  }

  isSelecting() {
    return this.state.isSelecting;
  }
}

const rectSelectionManager = new RectSelectionManager();

// Hook to access rect selection state
export const useRectSelection = () => {
  return {
    getCursor: () => rectSelectionManager.getCursor(),
    getSelectionRect: () => rectSelectionManager.getSelectionRect(),
    isSelecting: () => rectSelectionManager.isSelecting(),
  };
};

// Selection Rectangle Renderer
export const SelectionRectRenderer: React.FC = () => {
  const { viewport, selection } = useEditorStore();
  const [, forceUpdate] = useState({});

  React.useEffect(() => {
    const unsubscribe = rectSelectionManager.addListener(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  // Use selectionBox from store (for pointer-interaction drag selection) or fallback to rectSelectionManager
  const storeSelectionBox = selection.selectionBox;
  const managerSelectionRect = rectSelectionManager.getSelectionRect();
  const isManagerSelecting = rectSelectionManager.isSelecting();
  
  // Prioritize store selectionBox over manager selectionRect
  const selectionRect = storeSelectionBox || (isManagerSelecting ? managerSelectionRect : null);
  
  // Debug logging
    
  if (!selectionRect) {
        return null;
  }
  
  
  return (
    <rect
      x={selectionRect.x}
      y={selectionRect.y}
      width={selectionRect.width}
      height={selectionRect.height}
      fill="rgba(0, 120, 204, 0.15)"
      stroke="#007acc"
      strokeWidth={1 / viewport.zoom}
      style={{ pointerEvents: 'none' }}
    />
  );
};

// Detailed Selection Information Component
const SelectionDetails: React.FC = () => {
  const { selection, paths, texts, images, uses, groups, clipPaths, masks, filters, markers, symbols, textPaths, animations, animationState } = useEditorStore();
  
  // Helper function to check if an element has animations
  const getElementAnimations = (elementId: string) => {
    return animations.filter(animation => 
      animation.targetElementId === elementId
    );
  };
  
  // Helper function to check if an element has filters applied
  const getElementFilters = (style: any) => {
    if (!style) return [];
    const appliedFilters: string[] = [];
    
    if (style.filter) {
      // Parse filter string to extract filter names/IDs
      const filterMatch = style.filter.match(/url\(#([^)]+)\)/g);
      if (filterMatch) {
        filterMatch.forEach((match: string) => {
          const filterId = match.replace(/url\(#(.+)\)/, '$1');
          const filter = filters.find(f => f.id === filterId);
          if (filter) {
            appliedFilters.push(filter.id);
          } else {
            appliedFilters.push(filterId);
          }
        });
      } else if (style.filter !== 'none') {
        appliedFilters.push(style.filter);
      }
    }
    
    return appliedFilters;
  };
  
  // Helper function to get position information
  const getPositionInfo = (element: any, type: string) => {
    switch (type) {
      case 'Path':
        // For paths, get the first command's position
        if (element.subPaths?.[0]?.commands?.[0]) {
          const firstCmd = element.subPaths[0].commands[0];
          return { x: firstCmd.x || 0, y: firstCmd.y || 0 };
        }
        return null;
      case 'Text':
        return { x: element.x || 0, y: element.y || 0 };
      case 'Image':
      case 'Use':
        return { x: element.x || 0, y: element.y || 0, width: element.width, height: element.height };
      case 'Group':
        // For groups, calculate bounding box from children or use transform
        if (element.transform) {
          // Parse transform for translate values
          const translateMatch = element.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
          if (translateMatch) {
            return { x: parseFloat(translateMatch[1]), y: parseFloat(translateMatch[2]) };
          }
        }
        return { x: 0, y: 0 }; // Default group position
      default:
        return null;
    }
  };
  
  const getElementDetails = () => {
    const details: any[] = [];
    
    // Check for root-level animations (animations applied to the entire SVG)
    const rootAnimations = animations.filter(animation => 
      animation.targetElementId === 'svg-root'
    );
    
    if (rootAnimations.length > 0) {
      details.push({
        type: 'SVG Root Animations',
        id: 'svg-root',
        info: `${rootAnimations.length} global animation${rootAnimations.length !== 1 ? 's' : ''}`,
        animations: rootAnimations,
        isGlobal: true
      });
    }
    
    // Paths
    selection.selectedPaths.forEach(pathId => {
      const path = paths.find(p => p.id === pathId);
      if (path) {
        const elementAnimations = getElementAnimations(pathId);
        const elementFilters = getElementFilters(path.style);
        const position = getPositionInfo(path, 'Path');
        
        details.push({
          type: 'Path',
          id: pathId,
          info: `${path.subPaths.length} subpath${path.subPaths.length !== 1 ? 's' : ''}`,
          position,
          animations: elementAnimations,
          filters: elementFilters,
          style: path.style,
          locked: path.subPaths.some(sp => sp.locked)
        });
      }
    });
    
    // SubPaths
    selection.selectedSubPaths.forEach(subPathId => {
      const parentPath = paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
      const subPath = parentPath?.subPaths.find(sp => sp.id === subPathId);
      if (subPath && parentPath) {
        const elementAnimations = getElementAnimations(parentPath.id);
        const elementFilters = getElementFilters(parentPath.style);
        const position = subPath.commands[0] ? { x: subPath.commands[0].x || 0, y: subPath.commands[0].y || 0 } : null;
        
        details.push({
          type: 'SubPath',
          id: subPathId,
          info: `${subPath.commands.length} command${subPath.commands.length !== 1 ? 's' : ''}`,
          position,
          animations: elementAnimations,
          filters: elementFilters,
          parent: `Path: ${parentPath.id.slice(-8)}`,
          locked: subPath.locked
        });
      }
    });
    
    // Commands
    selection.selectedCommands.forEach(commandId => {
      let commandInfo = null;
      for (const path of paths) {
        for (const subPath of path.subPaths) {
          const command = subPath.commands.find(cmd => cmd.id === commandId);
          if (command) {
            const elementAnimations = getElementAnimations(path.id);
            const elementFilters = getElementFilters(path.style);
            const position = { x: command.x || 0, y: command.y || 0 };
            
            let commandDetails = `${command.command}`;
            if (command.command === 'C') {
              commandDetails += ` (${command.x?.toFixed(1) || 0}, ${command.y?.toFixed(1) || 0}) CP1(${command.x1?.toFixed(1) || 0}, ${command.y1?.toFixed(1) || 0}) CP2(${command.x2?.toFixed(1) || 0}, ${command.y2?.toFixed(1) || 0})`;
            } else {
              commandDetails += ` (${command.x?.toFixed(1) || 0}, ${command.y?.toFixed(1) || 0})`;
            }
            
            commandInfo = {
              type: 'Command',
              id: commandId,
              info: commandDetails,
              position,
              animations: elementAnimations,
              filters: elementFilters,
              parent: `SubPath: ${subPath.id.slice(-8)}`,
              locked: subPath.locked
            };
            break;
          }
        }
        if (commandInfo) break;
      }
      if (commandInfo) details.push(commandInfo);
    });
    
    // Texts
    selection.selectedTexts.forEach(textId => {
      const text = texts.find(t => t.id === textId);
      if (text) {
        const content = text.type === 'text' ? text.content : 
          text.spans?.map(span => span.content).join(' ') || '';
        const elementAnimations = getElementAnimations(textId);
        const elementFilters = getElementFilters(text.style);
        const position = getPositionInfo(text, 'Text');
        
        details.push({
          type: 'Text',
          id: textId,
          info: `"${content.slice(0, 20)}${content.length > 20 ? '...' : ''}"`,
          position,
          animations: elementAnimations,
          filters: elementFilters,
          style: { fontSize: text.fontSize, fontFamily: text.fontFamily, ...text.style },
          locked: text.locked,
          rotation: text.rotation,
          transform: text.transform
        });
      }
    });
    
    // TextPaths
    selection.selectedTextPaths?.forEach(textPathId => {
      const textPath = textPaths.find(tp => tp.id === textPathId);
      if (textPath) {
        const elementAnimations = getElementAnimations(textPathId);
        const elementFilters = getElementFilters(textPath.style);
        
        details.push({
          type: 'TextPath',
          id: textPathId,
          info: `"${textPath.content.slice(0, 20)}${textPath.content.length > 20 ? '...' : ''}"`,
          animations: elementAnimations,
          filters: elementFilters,
          parent: `Path: ${textPath.pathRef?.slice(-8)}`,
          startOffset: textPath.startOffset,
          method: textPath.method,
          side: textPath.side,
          locked: textPath.locked,
          transform: textPath.transform
        });
      }
    });
    
    // Images
    selection.selectedImages.forEach(imageId => {
      const image = images.find(i => i.id === imageId);
      if (image) {
        const elementAnimations = getElementAnimations(imageId);
        const position = getPositionInfo(image, 'Image');
        
        details.push({
          type: 'Image',
          id: imageId,
          info: `${image.width}×${image.height}px`,
          position,
          animations: elementAnimations,
          source: image.href,
          locked: image.locked,
          transform: image.transform,
          opacity: image.style?.opacity,
          preserveAspectRatio: image.preserveAspectRatio
        });
      }
    });
    
    // Use elements
    selection.selectedUses.forEach(useId => {
      const use = uses.find(u => u.id === useId);
      if (use) {
        const elementAnimations = getElementAnimations(useId);
        const position = getPositionInfo(use, 'Use');
        
        details.push({
          type: 'Use',
          id: useId,
          info: `${use.width || 100}×${use.height || 100}px`,
          position,
          animations: elementAnimations,
          href: use.href,
          locked: use.locked,
          transform: use.transform
        });
      }
    });
    
    // Groups
    selection.selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const childTypes = group.children.reduce((acc, child) => {
          acc[child.type] = (acc[child.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const childInfo = Object.entries(childTypes)
          .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
          .join(', ');
        
        const elementAnimations = getElementAnimations(groupId);
        const position = getPositionInfo(group, 'Group');
        
        details.push({
          type: 'Group',
          id: groupId,
          info: childInfo,
          position,
          animations: elementAnimations,
          children: group.children,
          style: group.style,
          locked: group.locked,
          lockLevel: group.lockLevel,
          visible: group.visible,
          transform: group.transform,
          name: group.name
        });
      }
    });
    
    // SVG Elements
    ['clipPaths', 'masks', 'filters', 'markers', 'symbols'].forEach(elementType => {
      const selectionKey = `selected${elementType.charAt(0).toUpperCase() + elementType.slice(1)}` as keyof typeof selection;
      const storeKey = elementType as keyof typeof useEditorStore.getState;
      
      (selection[selectionKey] as string[])?.forEach(elementId => {
        const elements = (useEditorStore.getState()[storeKey] as any[]);
        const element = elements.find((e: any) => e.id === elementId);
        if (element) {
          details.push({
            type: elementType.slice(0, -1).charAt(0).toUpperCase() + elementType.slice(1, -1),
            id: elementId,
            info: element.name || `${elementType.slice(0, -1)} element`,
            ...(element.type && { elementType: element.type })
          });
        }
      });
    });
    
    return details;
  };
  
  const elementDetails = getElementDetails();
  
  // Check if we only have root animations and no selected elements
  const hasOnlyRootAnimations = elementDetails.length === 1 && elementDetails[0]?.isGlobal;
  const hasNoSelection = elementDetails.length === 0;
  const rootAnimationsOnly = elementDetails.filter(detail => detail.isGlobal);
  
  if (hasNoSelection) {
    // Show root animations even when nothing is selected
    const rootAnimations = animations.filter(animation => 
      animation.targetElementId === 'svg-root'
    );
    
    if (rootAnimations.length > 0) {
      return (
        <div style={{
          fontSize: '11px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: '#fff'
        }}>
          <div style={{
            background: '#fff5f3',
            padding: '8px',
            borderBottom: '1px solid #ffccb8',
            fontWeight: 'bold',
            color: '#ff6b35'
          }}>
            🎬 Global SVG Animations ({rootAnimations.length})
          </div>
          
          <div style={{ padding: '8px' }}>
            <div style={{ marginBottom: '4px', color: '#333' }}>
              Animations applied to the entire SVG
            </div>
            
            {rootAnimations.map((animation: any, animIndex: number) => (
              <div key={animIndex} style={{ 
                fontSize: '9px',
                color: '#d14',
                padding: '4px 0',
                borderBottom: animIndex < rootAnimations.length - 1 ? '1px solid #ffe4d6' : 'none'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {animation.type}: {animation.attributeName || 'transform'}
                </div>
                <div style={{ marginLeft: '8px', color: '#666', marginTop: '2px' }}>
                  Duration: {animation.dur}
                  {animation.from && ` | From: ${animation.from}`}
                  {animation.to && ` | To: ${animation.to}`}
                  {animation.values && ` | Values: ${animation.values}`}
                  {animation.type === 'animateTransform' && animation.transformType && ` | Type: ${animation.transformType}`}
                  {animation.repeatCount && ` | Repeat: ${animation.repeatCount}`}
                  {animation.begin && ` | Begin: ${animation.begin}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center',
        padding: '8px',
        background: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontStyle: 'italic'
      }}>
        No elements selected
      </div>
    );
  }
  
  return (
    <div style={{
      fontSize: '11px',
      maxHeight: '300px',
      overflowY: 'auto',
      border: '1px solid #ddd',
      borderRadius: '4px',
      background: '#fff'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#f5f5f5',
        padding: '8px',
        borderBottom: '1px solid #ddd',
        fontWeight: 'bold',
        color: '#333'
      }}>
        Selection Details ({elementDetails.length} items)
      </div>
      
      {elementDetails.map((detail, index) => (
        <div key={`${detail.type}-${detail.id}-${index}`} style={{
          padding: '8px',
          borderBottom: index < elementDetails.length - 1 ? '1px solid #eee' : 'none'
        }}>
          <div style={{
            fontWeight: 'bold',
            color: '#007acc',
            marginBottom: '2px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{detail.type}</span>
            <span style={{
              fontSize: '9px',
              color: '#666',
              fontFamily: 'monospace',
              background: '#f0f0f0',
              padding: '1px 4px',
              borderRadius: '2px'
            }}>
              {detail.id.slice(-8)}
            </span>
          </div>
          
          <div style={{ color: '#333', marginBottom: '4px' }}>
            {detail.info}
          </div>
          
          {detail.position && (
            <div style={{ 
              fontSize: '10px',
              color: '#007acc',
              background: '#f0f8ff',
              padding: '2px 4px',
              borderRadius: '2px',
              marginBottom: '2px',
              display: 'inline-block'
            }}>
              📍 ({detail.position.x.toFixed(1)}, {detail.position.y.toFixed(1)})
              {detail.position.width && detail.position.height && 
                ` • ${detail.position.width}×${detail.position.height}px`
              }
            </div>
          )}
          
          {detail.animations && detail.animations.length > 0 && (
            <div style={{ 
              fontSize: '10px',
              color: '#ff6b35',
              background: '#fff5f3',
              padding: '2px 4px',
              borderRadius: '2px',
              marginBottom: '2px',
              display: 'inline-block',
              marginLeft: detail.position ? '4px' : '0'
            }}>
              🎬 {detail.animations.length} animation{detail.animations.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {/* Detailed animation information */}
          {detail.animations && detail.animations.length > 0 && (
            <div style={{ 
              marginTop: '4px',
              padding: '4px 8px',
              background: '#fff5f3',
              borderRadius: '3px',
              border: '1px solid #ffccb8'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#ff6b35', fontSize: '10px' }}>
                🎬 Animation Details:
              </div>
              {detail.animations.map((animation: any, animIndex: number) => (
                <div key={animIndex} style={{ 
                  fontSize: '9px',
                  color: '#d14',
                  padding: '1px 0',
                  borderBottom: animIndex < detail.animations.length - 1 ? '1px solid #ffe4d6' : 'none'
                }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {animation.type}: {animation.attributeName || 'transform'}
                  </div>
                  <div style={{ marginLeft: '8px', color: '#666' }}>
                    Duration: {animation.dur} | 
                    {animation.from && ` From: ${animation.from} |`}
                    {animation.to && ` To: ${animation.to} |`}
                    {animation.values && ` Values: ${animation.values} |`}
                    {animation.type === 'animateTransform' && animation.transformType && ` Type: ${animation.transformType} |`}
                    {animation.repeatCount && ` Repeat: ${animation.repeatCount} |`}
                    {animation.begin && ` Begin: ${animation.begin}`}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {detail.filters && detail.filters.length > 0 && (
            <div style={{ 
              fontSize: '10px',
              color: '#8b5cf6',
              background: '#f5f3ff',
              padding: '2px 4px',
              borderRadius: '2px',
              marginBottom: '2px',
              display: 'inline-block',
              marginLeft: (detail.position || detail.animations?.length) ? '4px' : '0'
            }}>
              🎨 {detail.filters.join(', ')}
            </div>
          )}
          
          {detail.locked && (
            <div style={{ 
              fontSize: '10px',
              color: '#dc2626',
              background: '#fef2f2',
              padding: '2px 4px',
              borderRadius: '2px',
              marginBottom: '2px',
              display: 'inline-block',
              marginLeft: (detail.position || detail.animations?.length || detail.filters?.length) ? '4px' : '0'
            }}>
              🔒 Locked
            </div>
          )}
          
          {detail.parent && (
            <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
              ↳ {detail.parent}
            </div>
          )}
          
          {detail.children && (
            <div style={{ 
              marginTop: '4px',
              padding: '4px 8px',
              background: '#f8f8f8',
              borderRadius: '3px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#555' }}>Group Contents:</div>
              {detail.children.map((child: any, childIndex: number) => (
                <div key={childIndex} style={{ 
                  fontSize: '10px',
                  color: '#666',
                  padding: '1px 0',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{child.type}</span>
                  <span style={{ fontFamily: 'monospace' }}>{child.id.slice(-6)}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Additional element-specific information */}
          {detail.rotation && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              🔄 Rotation: {detail.rotation}°
            </div>
          )}
          
          {detail.opacity !== undefined && detail.opacity !== 1 && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              🌊 Opacity: {(detail.opacity * 100).toFixed(0)}%
            </div>
          )}
          
          {detail.transform && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              🔄 Transform: {detail.transform.slice(0, 30)}...
            </div>
          )}
          
          {detail.startOffset !== undefined && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              🏁 Start Offset: {detail.startOffset}
            </div>
          )}
          
          {detail.method && (
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              🔗 Method: {detail.method} | Side: {detail.side || 'left'}
            </div>
          )}
          
          {detail.lockLevel && detail.lockLevel !== 'none' && (
            <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>
              🔒 Lock Level: {detail.lockLevel}
            </div>
          )}
          
          {detail.visible === false && (
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
              👁 Hidden
            </div>
          )}
          
          {detail.name && (
            <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}>
              🏷 Name: {detail.name}
            </div>
          )}
          
          {detail.style && (
            <div style={{ 
              marginTop: '4px',
              fontSize: '10px',
              color: '#666',
              background: '#f8f8f8',
              padding: '2px 4px',
              borderRadius: '2px'
            }}>
              {detail.style.fill && `Fill: ${detail.style.fill} `}
              {detail.style.stroke && `Stroke: ${detail.style.stroke} `}
              {detail.style.strokeWidth && `SW: ${detail.style.strokeWidth} `}
              {detail.style.fontSize && `Font: ${detail.style.fontSize}px `}
              {detail.style.fontFamily && `Family: ${detail.style.fontFamily} `}
            </div>
          )}
          
          {detail.source && (
            <div style={{ 
              fontSize: '10px',
              color: '#007acc',
              marginTop: '2px',
              wordBreak: 'break-all'
            }}>
              {detail.source.slice(0, 40)}...
            </div>
          )}
          
          {detail.href && (
            <div style={{ 
              fontSize: '10px',
              color: '#007acc',
              marginTop: '2px'
            }}>
              → {detail.href}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Selection Tools UI Components
interface SelectionToolsProps {
  currentMode: string;
  onSetSelectionMode: () => void;
  onClearSelection: () => void;
  selectedCount: number;
}

export const SelectionTools: React.FC<SelectionToolsProps> = ({
  currentMode,
  onSetSelectionMode,
  onClearSelection,
  selectedCount,
}) => {
  const duplicateSelection = useEditorStore(s => s.duplicateSelection);
  return (
    <div className="selection-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PluginButton
        icon={<Pointer size={16} />}
        text="Selection Mode"
        color="#007acc"
        active={currentMode === 'select'}
        disabled={false}
        onPointerDown={onSetSelectionMode}
      />
      <PluginButton
        icon={<XCircle size={16} />}
        text="Clear Selection"
        color="#dc3545"
        active={false}
        disabled={selectedCount === 0}
        onPointerDown={onClearSelection}
      />
      <PluginButton
        icon={<Copy size={16} />}
        text="Duplicar selección"
        color="#28a745"
        active={false}
        disabled={selectedCount === 0}
        onPointerDown={duplicateSelection}
      />
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        textAlign: 'center',
        padding: '8px',
        background: '#f0f0f0',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
      </div>
      
      <SelectionDetails />
    </div>
  );
};

export const SelectionToolsComponent: React.FC = () => {
  const { mode, selection, clearSelection } = useEditorStore();
  // Usar toolModeManager para cambiar el modo global
  
  const selectedCount = 
    selection.selectedPaths.length + 
    selection.selectedSubPaths.length + 
    selection.selectedCommands.length +
    (selection.selectedTexts?.length || 0) +
    (selection.selectedImages?.length || 0) +
    (selection.selectedUses?.length || 0) +
    (selection.selectedGroups?.length || 0);
  
  return (
    <div>
      <SelectionTools
        currentMode={mode.current}
        onSetSelectionMode={() => toolModeManager.setMode('select')}
        onClearSelection={clearSelection}
        selectedCount={selectedCount}
      />
    </div>
  );
};

// Combined Selection Plugin
export const SelectionPlugin: Plugin = {
  id: 'selection',
  name: 'Selection',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],

  initialize: (editor) => {
    rectSelectionManager.setEditorStore(editor);
  },

  pointerHandlers: {
    onPointerDown: rectSelectionManager.handlePointerDown,
    onPointerMove: rectSelectionManager.handlePointerMove,
    onPointerUp: rectSelectionManager.handlePointerUp,
  },

  shortcuts: [
    {
      key: 'v',
      description: 'Selection Tool',
      action: () => {
        toolModeManager.setMode('select');
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select All',
      action: () => {
        const store = useEditorStore.getState();
        
        // Get all element IDs that are children of groups (we want to select these instead of the groups)
        const groupChildrenIds = new Set<string>();
        store.groups.forEach(group => {
          if (!group.locked) {
            group.children.forEach(child => {
              groupChildrenIds.add(child.id);
            });
          }
        });
        
        // Collect all element IDs, filtering out locked elements
        // Include group children but exclude the groups themselves
        const allPaths = store.paths
          .filter(p => !p.style?.filter?.includes('locked'))
          .map(p => p.id);
        
        // For sub-paths, include all from all paths (including those in groups)
        const allSubPaths = store.paths
          .flatMap(path => 
            path.subPaths
              .filter(subPath => !subPath.locked)
              .map(subPath => subPath.id)
          );
        
        const allTexts = store.texts
          .filter(t => !t.locked)
          .map(t => t.id);
        const allTextPaths = store.textPaths
          .filter(tp => !tp.locked)
          .map(tp => tp.id);
        const allImages = store.images
          .filter(i => !i.locked)
          .map(i => i.id);
        const allClipPaths = store.clipPaths
          .filter(cp => !cp.locked)
          .map(cp => cp.id);
        const allMasks = store.masks
          .filter(m => !m.locked)
          .map(m => m.id);
        const allFilters = store.filters
          .filter(f => !f.locked)
          .map(f => f.id);
        const allMarkers = store.markers
          .filter(m => !m.locked)
          .map(m => m.id);
        const allSymbols = store.symbols
          .filter(s => !s.locked)
          .map(s => s.id);
        const allUses = store.uses
          .filter(u => !u.locked)
          .map(u => u.id);
        
        // Build complete selection state with all individual elements, NO groups
        useEditorStore.setState({
          selection: {
            ...store.selection,
            selectedPaths: allPaths,
            selectedSubPaths: allSubPaths,
            selectedCommands: [],
            selectedControlPoints: [],
            selectedTexts: allTexts,
            selectedTextSpans: [],
            selectedTextPaths: allTextPaths,
            selectedGroups: [], // Empty - we don't select groups, only their contents
            selectedImages: allImages,
            selectedClipPaths: allClipPaths,
            selectedMasks: allMasks,
            selectedFilters: allFilters,
            selectedMarkers: allMarkers,
            selectedSymbols: allSymbols,
            selectedUses: allUses,
          }
        });
      }
    },
    {
      key: 'Escape',
      modifiers: ['shift'],
      description: 'Deselect All',
      action: () => {
        const store = useEditorStore.getState();
        store.clearSelection();
      }
    }
  ],

  ui: [
    {
      id: 'selection-tools',
      component: SelectionToolsComponent,
      position: 'sidebar',
      order: 0
    },
    {
      id: 'selection-rect-renderer',
      component: SelectionRectRenderer,
      position: 'svg-content',
      order: 100,
    },
  ]
};
