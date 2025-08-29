import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';

export const PencilRenderer: React.FC = () => {
  const { mode } = useEditorStore();
  const [currentPath, setCurrentPath] = React.useState('');
  const [strokeWidth, setStrokeWidth] = React.useState(3);
  const [strokeColor, setStrokeColor] = React.useState('#6b7280');
  const [strokeOpacity, setStrokeOpacity] = React.useState(1.0);
  const [isDrawing, setIsDrawing] = React.useState(false);

  // Update rendering state periodically while drawing
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (mode.current === 'create' && mode.createMode?.commandType === 'PENCIL') {
      intervalId = setInterval(() => {
        const pathData = pencilManager.getCurrentPathData();
        const settings = pencilManager.getSettings();
        const drawing = pencilManager.getIsDrawing();
        
        setCurrentPath(pathData);
        setStrokeWidth(settings.strokeWidth);
        setStrokeColor(settings.strokeColor);
        setStrokeOpacity(settings.strokeOpacity);
        setIsDrawing(drawing);
      }, 16); // ~60fps updates
    } else {
      setCurrentPath('');
      setIsDrawing(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode.current, mode.createMode?.commandType]);

  // Don't render anything if not in pencil mode or no current path
  if (mode.current !== 'create' || mode.createMode?.commandType !== 'PENCIL' || !currentPath) {
    return null;
  }

  return (
    <g data-pencil-current-stroke="true">
      <path
        d={currentPath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={isDrawing ? strokeOpacity * 0.8 : strokeOpacity}
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};