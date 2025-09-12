import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { smoothManager } from './SmoothManager';

export const SmoothRenderer: React.FC = () => {
  const { mode, viewport } = useEditorStore();
  const [previewPath, setPreviewPath] = useState('');
  const [feedbackPath, setFeedbackPath] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    // Actualizar preview path cuando sea necesario
    const updatePreview = () => {
      const newPreviewPath = smoothManager.getPreviewPath();
      const newFeedbackPath = smoothManager.getFeedbackPath();
      setPreviewPath(newPreviewPath);
      setFeedbackPath(newFeedbackPath);
    };

    // Intervalo para actualizar el preview (similar a PencilRenderer)
    let intervalId: NodeJS.Timeout | null = null;
    
    if (mode.current === 'smooth') {
      intervalId = setInterval(updatePreview, 50); // 20 FPS
    }

    // Mouse event handler para actualizar posición del cursor
    const handleMouseMove = (e: MouseEvent) => {
      if (mode.current === 'smooth') {
        const svg = document.querySelector('#svg-editor svg') as SVGSVGElement;
        if (!svg) return;

        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        setCursorPosition({ x: svgPt.x, y: svgPt.y });
      }
    };

    if (mode.current === 'smooth') {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mode.current]);

  // Solo renderizar si estamos en modo smooth
  if (mode.current !== 'smooth' || !smoothManager.isActiveTool()) {
    return null;
  }

  const settings = smoothManager.getSettings();

  return (
    <g data-layer="smooth-preview" data-plugin="smooth">
      {/* Overlay invisible para capturar eventos sobre todo el SVG */}
      <rect
        x={-10000}
        y={-10000}
        width={20000}
        height={20000}
        fill="rgba(0, 0, 0, 0.001)"
        className="creation-mode-overlay smooth-mode"
        style={{ 
          cursor: 'crosshair',
          pointerEvents: 'all'
        }}
      />
      
      {/* Feedback visual del brush - muestra la sección afectada */}
      {feedbackPath && (
        <path
          d={feedbackPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={4}
          opacity={0.8}
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
      
      {/* Preview del radio de influencia */}
      {previewPath && (
        <path
          d={previewPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          opacity={0.7}
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
      
      {/* Cursor del smooth brush */}
      <circle
        cx={cursorPosition.x}
        cy={cursorPosition.y}
        r={settings.radius}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={1}
        opacity={0.6}
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};
