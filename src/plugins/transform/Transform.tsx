import React, { useEffect, useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, transformMouseHandlers, TransformBounds, TransformHandle } from './TransformManager';
import { TransformHandles } from './TransformHandles';

const TransformPlugin: React.FC = () => {
  const [bounds, setBounds] = useState<TransformBounds | null>(null);
  const [handles, setHandles] = useState<TransformHandle[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformMode, setTransformMode] = useState<string | null>(null);
  const selection = useEditorStore((state) => state.selection);
  const paths = useEditorStore((state) => state.paths);
  const viewport = useEditorStore((state) => state.viewport);

  // Initialize transform manager with editor store
  useEffect(() => {
    transformManager.setEditorStore(useEditorStore.getState());
    return () => {
      transformManager.cleanup();
    };
  }, []);

  // Update transform state when selection or paths change
  useEffect(() => {
    if (transformManager.hasValidSelection()) {
      transformManager.updateTransformState();
      setBounds(transformManager.getBounds());
      setHandles(transformManager.getHandles());
    } else {
      setBounds(null);
      setHandles([]);
    }
  }, [selection.selectedCommands, selection.selectedSubPaths, paths]);

  // Update during transformation
  useEffect(() => {
    const interval = setInterval(() => {
      const isCurrentlyTransforming = transformManager.isTransforming();
      setIsTransforming(isCurrentlyTransforming);
      
      if (isCurrentlyTransforming) {
        setBounds(transformManager.getBounds());
        setHandles(transformManager.getHandles());
        setTransformMode(transformManager.getTransformMode());
      } else {
        setTransformMode(null);
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
