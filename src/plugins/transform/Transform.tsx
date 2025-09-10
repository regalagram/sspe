import React, { useEffect, useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, transformPointerHandlers, TransformBounds, TransformHandle } from './TransformManager';
import { TransformHandles } from './TransformHandles';
import { DimensionsInfo } from './DimensionsInfo';
import { handleManager } from '../handles/HandleManager';

// Memoized transform status indicator for performance
interface TransformStatusIndicatorProps {
  isTransforming: boolean;
  transformMode: string | null;
  viewport: { zoom: number };
}

const TransformStatusIndicator = React.memo<TransformStatusIndicatorProps>(({ isTransforming, transformMode, viewport }) => {
  if (!isTransforming || !transformMode) {
    return null;
  }

  return (
    <g>
      <rect
        x={10 / viewport.zoom}
        y={10 / viewport.zoom}
        width={120 / viewport.zoom}
        height={30 / viewport.zoom}
        fill="rgba(0, 0, 0, 0.8)"
        rx={4 / viewport.zoom}
        pointerEvents="none"
      />
      <text
        x={70 / viewport.zoom}
        y={28 / viewport.zoom}
        textAnchor="middle"
        fontSize={12 / viewport.zoom}
        fill="white"
        pointerEvents="none"
      >
        {transformMode === 'scale' ? 'Scaling' : 'Rotating'}
      </text>
    </g>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isTransforming === nextProps.isTransforming &&
    prevProps.transformMode === nextProps.transformMode &&
    prevProps.viewport.zoom === nextProps.viewport.zoom
  );
});

TransformStatusIndicator.displayName = 'TransformStatusIndicator';

const TransformPluginCore: React.FC = () => {
  const [bounds, setBounds] = useState<TransformBounds | null>(null);
  const [handles, setHandles] = useState<TransformHandle[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformMode, setTransformMode] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when handles should hide/show
  const [isHandleDragging, setIsHandleDragging] = useState(false);
  const selection = useEditorStore((state) => state.selection);
  const paths = useEditorStore((state) => state.paths);
  const texts = useEditorStore((state) => state.texts);
  const textPaths = useEditorStore((state) => state.textPaths);
  const images = useEditorStore((state) => state.images);
  const uses = useEditorStore((state) => state.uses);
  const groups = useEditorStore((state) => state.groups);
  const viewport = useEditorStore((state) => state.viewport);

  // Function to check if selected commands should hide transform box
  const shouldHideTransformForCommands = (): boolean => {
    const selectedCommands = selection.selectedCommands;
    
    // Case 1: Exactly 2 commands selected (coincident pair)
    if (selectedCommands.length === 2) {
      return checkTwoCommandsCoincident(selectedCommands);
    }
    
    // Case 2: Single command that's Z or final command in a closed path
    if (selectedCommands.length === 1) {
      return checkSingleCommandShouldHideTransform(selectedCommands[0]);
    }
    
    return false;
  };

  // Check if two commands are coincident
  const checkTwoCommandsCoincident = (selectedCommands: string[]): boolean => {
    // Find positions of both commands
    let positions: Array<{ x: number, y: number, id: string, command: string }> = [];
    
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        for (let i = 0; i < subPath.commands.length; i++) {
          const command = subPath.commands[i];
          if (selectedCommands.includes(command.id)) {
            if (command.command === 'Z') {
              // Z command closes the path, its position is the same as the first command
              const firstCommand = subPath.commands[0];
              if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
                positions.push({ 
                  x: firstCommand.x, 
                  y: firstCommand.y, 
                  id: command.id,
                  command: command.command 
                });
              }
            } else if (command.x !== undefined && command.y !== undefined) {
              positions.push({ 
                x: command.x, 
                y: command.y, 
                id: command.id,
                command: command.command 
              });
            }
          }
        }
      }
    }

    // Check if we have exactly 2 positions and they are very close (coincident)
    if (positions.length === 2) {
      const tolerance = 0.1; // Very small tolerance for floating point comparison
      const dx = Math.abs(positions[0].x - positions[1].x);
      const dy = Math.abs(positions[0].y - positions[1].y);
      const areCoincident = dx < tolerance && dy < tolerance;
      
      return areCoincident;
    }

    return false;
  };

  // Check if single command should hide transform (individual commands don't need transform box)
  const checkSingleCommandShouldHideTransform = (commandId: string): boolean => {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        for (let i = 0; i < subPath.commands.length; i++) {
          const command = subPath.commands[i];
          if (command.id === commandId) {
            // Hide transform for ALL individual commands
            // Individual commands don't need transform handles - they should just be draggable points
            return true;
          }
        }
      }
    }
    return false;
  };

  // Initialize transform manager with editor store
  useEffect(() => {
    transformManager.setEditorStore(useEditorStore.getState());
    
    // Set up callback for transform state changes (hide/show handles)
    // Use aggressive throttling to prevent infinite loops during rapid state changes
    let lastUpdateTime = 0;
    let updateTimeoutId: NodeJS.Timeout | null = null;
    
    transformManager.setStateChangeCallback(() => {
      const now = Date.now();
      const isActive = transformManager.isTransforming() || transformManager.isMoving();
      const throttleDelay = isActive ? 100 : 16; // More aggressive throttling during active transforms
      
      if (now - lastUpdateTime < throttleDelay) {
        // Debounce: clear previous timeout and set a new one
        if (updateTimeoutId) {
          clearTimeout(updateTimeoutId);
        }
        updateTimeoutId = setTimeout(() => {
          lastUpdateTime = Date.now();
          setForceUpdate(prev => prev + 1);
          setIsTransforming(transformManager.isTransforming());
          setTransformMode(transformManager.getTransformMode());
        }, throttleDelay);
        return;
      }
      
      lastUpdateTime = now;
      setForceUpdate(prev => prev + 1);
      setIsTransforming(transformManager.isTransforming());
      setTransformMode(transformManager.getTransformMode());
    });
    
    // Subscribe to handle manager drag state changes
    const unsubscribeHandles = handleManager.addListener(() => {
      const handleState = handleManager.getState();
      setIsHandleDragging(handleState.dragState.isDragging);
    });
    
    return () => {
      if (updateTimeoutId) {
        clearTimeout(updateTimeoutId);
      }
      transformManager.clearStateChangeCallback();
      transformManager.cleanup();
      unsubscribeHandles();
    };
  }, []);

  // Update transform state when selection or paths change
  useEffect(() => {
    // Don't update if currently transforming to avoid infinite loops
    if (transformManager.isTransforming()) {
      return;
    }
    
    // Always pass the current store state to transform manager
    transformManager.setEditorStore(useEditorStore.getState());
    
    const hasValidSelection = transformManager.hasValidSelection();
    
    if (hasValidSelection) {
      transformManager.updateTransformState();
      const newBounds = transformManager.getBounds();
      const newHandles = transformManager.getHandles();
      setBounds(newBounds);
      setHandles(newHandles);
    } else {
      setBounds(null);
      setHandles([]);
    }
  }, [selection.selectedCommands, selection.selectedSubPaths, selection.selectedTexts, selection.selectedTextPaths, selection.selectedImages, selection.selectedUses, selection.selectedGroups, paths, texts, textPaths, images, uses, groups]);

  // Update during transformation and movement
  useEffect(() => {
    const interval = setInterval(() => {
      const isCurrentlyTransforming = transformManager.isTransforming();
      const isCurrentlyMoving = transformManager.isMoving();
      
      if (isCurrentlyTransforming || isCurrentlyMoving) {
        // Update bounds/handles during transformation or movement for live feedback
        // Don't call updateTransformState during active transformations to prevent loops
        transformManager.setEditorStore(useEditorStore.getState()); // Ensure latest state
        
        // Only update bounds and handles without triggering state changes
        const newBounds = transformManager.getBounds();
        const newHandles = transformManager.getHandles();
        setBounds(newBounds);
        setHandles(newHandles);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  // Check if transform box should be hidden for commands
  const shouldHideTransformBox = shouldHideTransformForCommands();
  
  // Also hide transform box when dragging handles (to prevent interference)
  const shouldHideForHandleDrag = isHandleDragging;
  
  // Final decision: hide if either condition is true
  const finalShouldHide = shouldHideTransformBox || shouldHideForHandleDrag;
  
  return (
    <>
      {bounds && handles.length > 0 && !finalShouldHide && (
        <>
          <TransformHandles bounds={bounds} handles={handles} />
          
          {/* Show dimensions info always when bounds are available */}
          <DimensionsInfo bounds={bounds} viewport={viewport} />
        </>
      )}
      
      {/* Transform status indicator */}
      <TransformStatusIndicator 
        isTransforming={isTransforming}
        transformMode={transformMode}
        viewport={viewport}
      />
    </>
  );
};

// Memoized wrapper to prevent unnecessary re-renders
const TransformPlugin = React.memo(TransformPluginCore, () => {
  // Always re-render - let internal state management and memoized sub-components handle optimization
  return false;
});

export const Transform: Plugin = {
  id: 'transform',
  name: 'Transform',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'transform-handles',
      component: TransformPlugin,
      position: 'svg-content',
      order: 100 // Always render selection UI on top of everything
    }
  ],
  pointerHandlers: transformPointerHandlers
};
