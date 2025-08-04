import React, { useEffect, useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, transformPointerHandlers, TransformBounds, TransformHandle } from './TransformManager';
import { TransformHandles } from './TransformHandles';
import { DimensionsInfo } from './DimensionsInfo';

const TransformPlugin: React.FC = () => {
  const [bounds, setBounds] = useState<TransformBounds | null>(null);
  const [handles, setHandles] = useState<TransformHandle[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformMode, setTransformMode] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when handles should hide/show
  const selection = useEditorStore((state) => state.selection);
  const paths = useEditorStore((state) => state.paths);
  const texts = useEditorStore((state) => state.texts);
  const textPaths = useEditorStore((state) => state.textPaths);
  const images = useEditorStore((state) => state.images);
  const uses = useEditorStore((state) => state.uses);
  const groups = useEditorStore((state) => state.groups);
  const viewport = useEditorStore((state) => state.viewport);

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
    
    return () => {
      if (updateTimeoutId) {
        clearTimeout(updateTimeoutId);
      }
      transformManager.clearStateChangeCallback();
      transformManager.cleanup();
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

  return (
    <>
      {bounds && handles.length > 0 && (
        <>
          <TransformHandles bounds={bounds} handles={handles} />
          
          {/* Show dimensions info always when bounds are available */}
          <DimensionsInfo bounds={bounds} viewport={viewport} />
        </>
      )}
      
      {/* Transform status indicator */}
      {isTransforming && transformMode && (
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
      )}
    </>
  );
};

export const Transform: Plugin = {
  id: 'transform',
  name: 'Transform',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'transform-handles',
      component: TransformPlugin,
      position: 'svg-content'
    }
  ],
  pointerHandlers: transformPointerHandlers
};
