import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { curvesManager, CurveToolMode, PointType } from './CurvesManager';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { PenTool, Square, Circle, RotateCcw, Trash2 } from 'lucide-react';

export const CurvesUI: React.FC = () => {
  const { mode } = useEditorStore();
  const [curveState, setCurveState] = React.useState(curvesManager.getState());

  // Update state when curves manager changes
  React.useEffect(() => {
    const updateState = () => {
      setCurveState(curvesManager.getState());
    };
    
    // Update immediately
    updateState();
    
    // Set up interval to check for state changes
    const interval = setInterval(updateState, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Also update when editor mode changes
  React.useEffect(() => {
    setCurveState(curvesManager.getState());
  }, [mode]);

  // Contenido del panel
  const renderContent = () => {
    if (!curveState.isActive && mode.current !== 'curves') {
      return (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <PluginButton
            icon={<PenTool size={16} />}
            text="Activate Curve Tool"
            color="#007acc"
            onClick={() => curvesManager.activateCurveTool()}
          />
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
            <p><strong>Curve Tool:</strong></p>
            <p>• Click: Create corner point</p>
            <p>• Click + Drag: Create smooth point</p>
            <p>• Alt + Click: Convert point type</p>
            <p>• Double-click first point: Close path</p>
            <p>• Enter: Finish path</p>
            <p>• Escape: Exit tool</p>
          </div>
        </div>
      );
    }

    if (curveState.isActive) {
      return (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Tool status */}
          <div style={{ 
            backgroundColor: '#007acc', 
            color: 'white', 
            padding: '6px 8px', 
            borderRadius: '4px', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {curveState.mode === CurveToolMode.CREATING && 'Creating Path'}
            {curveState.mode === CurveToolMode.EDITING && 'Editing Points'}
            {curveState.mode === CurveToolMode.DRAGGING_HANDLE && 'Dragging Handle'}
            {curveState.mode === CurveToolMode.DRAGGING_POINT && 'Dragging Point'}
          </div>

          {/* Current path info */}
          <div style={{ fontSize: '12px', color: '#666' }}>
            Points: {curveState.points.length}
            {curveState.selectedPointId && (
              <div>
                Selected: {curveState.points.find(p => p.id === curveState.selectedPointId)?.type || 'none'}
              </div>
            )}
          </div>

          {/* Point type controls */}
          {curveState.selectedPointId && (
            <div style={{ 
              display: 'flex', 
              gap: '4px',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                Point Type:
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <PluginButton
                  icon={<Square size={14} />}
                  text="Corner"
                  color="#666"
                  onClick={() => {
                    if (curveState.selectedPointId) {
                      curvesManager.setPointType(curveState.selectedPointId, PointType.CORNER);
                    }
                  }}
                />
                <PluginButton
                  icon={<Circle size={14} />}
                  text="Smooth"
                  color="#666"
                  onClick={() => {
                    if (curveState.selectedPointId) {
                      curvesManager.setPointType(curveState.selectedPointId, PointType.SMOOTH);
                    }
                  }}
                />
                <PluginButton
                  icon={<RotateCcw size={14} />}
                  text="Asymmetric"
                  color="#666"
                  onClick={() => {
                    if (curveState.selectedPointId) {
                      curvesManager.setPointType(curveState.selectedPointId, PointType.ASYMMETRIC);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <PluginButton
              icon={<PenTool size={16} />}
              text="Finish Path (Enter)"
              color="#28a745"
              onClick={() => curvesManager.finishPath()}
            />
            
            {curveState.selectedPointId && (
              <PluginButton
                icon={<Trash2 size={16} />}
                text="Delete Selected Point"
                color="#dc3545"
                onClick={() => {
                  curvesManager.deleteSelectedPoint();
                }}
              />
            )}
            
            <PluginButton
              icon={<PenTool size={16} />}
              text="Exit Tool (Escape)"
              color="#6c757d"
              onClick={() => curvesManager.exitCurveTool()}
            />
          </div>

          {/* Instructions */}
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            borderTop: '1px solid #eee',
            paddingTop: '8px',
            lineHeight: '1.3'
          }}>
            <p><strong>Instructions:</strong></p>
            <p>• Click to create corner point</p>
            <p>• Click + drag to create smooth point</p>
            <p>• Alt + click to convert point type</p>
            <p>• Drag points to move them</p>
            <p>• Drag handles to adjust curves</p>
            <p>• Double-click first point to close path</p>
          </div>
        </div>
      );
    }

    return null;
  };

  // En modo acordeón, el DraggablePanel se renderiza automáticamente por el sistema
  // Solo necesitamos devolver el contenido
  const title = curveState.isActive ? 'Curves Tool - Active' : 'Curves Tool';
  
  return (
    <DraggablePanel 
      title={title}
      id="curves-tool-panel"
    >
      {renderContent()}
    </DraggablePanel>
  );
};
