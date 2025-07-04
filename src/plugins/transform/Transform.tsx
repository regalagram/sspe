import React, { useEffect, useState, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, transformMouseHandlers, TransformBounds, TransformHandle } from './TransformManager';
import { TransformHandles } from './TransformHandles';

const TransformPlugin: React.FC = () => {
  const [bounds, setBounds] = useState<TransformBounds | null>(null);
  const [handles, setHandles] = useState<TransformHandle[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformMode, setTransformMode] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when handles should hide/show
  const selection = useEditorStore((state) => state.selection);
  const paths = useEditorStore((state) => state.paths);
  const viewport = useEditorStore((state) => state.viewport);
  
  // Use ref to prevent infinite loops
  const isUpdatingRef = useRef(false);
  const selectionRef = useRef(selection);
  const pathsRef = useRef(paths);

  // Initialize transform manager with editor store
  useEffect(() => {
    transformManager.setEditorStore(useEditorStore.getState());
    
    // Set up callback for transform state changes (hide/show handles)
    transformManager.setStateChangeCallback(() => {
      if (isUpdatingRef.current) return; // Prevent infinite loops
      
      setForceUpdate(prev => prev + 1);
      setIsTransforming(transformManager.isTransforming());
      setTransformMode(transformManager.getTransformMode());
    });
    
    return () => {
      transformManager.clearStateChangeCallback();
      transformManager.cleanup();
    };
  }, []);

  // Update transform state when selection or paths change
  useEffect(() => {
    // Prevent infinite loops by checking if we're already updating
    if (isUpdatingRef.current) return;
    
    // Check if selection or paths actually changed
    const selectionChanged = JSON.stringify(selection) !== JSON.stringify(selectionRef.current);
    const pathsChanged = JSON.stringify(paths) !== JSON.stringify(pathsRef.current);
    
    if (!selectionChanged && !pathsChanged) return;
    
    // Update refs
    selectionRef.current = selection;
    pathsRef.current = paths;
    
    isUpdatingRef.current = true;
    
    try {
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
    } finally {
      isUpdatingRef.current = false;
    }
  }, [selection.selectedCommands, selection.selectedSubPaths, paths]);

  // Update during transformation
  useEffect(() => {
    const interval = setInterval(() => {
      const isCurrentlyTransforming = transformManager.isTransforming();
      
      if (isCurrentlyTransforming) {
        // Only update bounds/handles during transformation for live feedback
        setBounds(transformManager.getBounds());
        setHandles(transformManager.getHandles());
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {bounds && handles.length > 0 && (
        <TransformHandles bounds={bounds} handles={handles} />
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
            {transformManager.getShiftPressed() ? ' (Proportional)' : ''}
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
  mouseHandlers: transformMouseHandlers
};
