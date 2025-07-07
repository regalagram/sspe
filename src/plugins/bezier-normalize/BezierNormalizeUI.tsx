import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Shuffle, ArrowLeftRight, RefreshCw, Unlink } from 'lucide-react';
import { bezierNormalizeManager, BezierPointInfo, BezierNormalizeAction } from './BezierNormalizeManager';

interface BezierNormalizeControlsProps {}

export const BezierNormalizeControls: React.FC<BezierNormalizeControlsProps> = () => {
  const editorStore = useEditorStore();
  const [state, setState] = React.useState(bezierNormalizeManager.getState());

  // Set up editor store reference
  React.useEffect(() => {
    bezierNormalizeManager.setEditorStore(editorStore);
  }, [editorStore]);

  // Subscribe to state changes
  React.useEffect(() => {
    const unsubscribe = bezierNormalizeManager.addListener(() => {
      setState(bezierNormalizeManager.getState());
    });
    
    return unsubscribe;
  }, []);

  // Update analysis when selection changes
  React.useEffect(() => {
    bezierNormalizeManager.updateState();
  }, [editorStore.selection.selectedCommands]);

  // Handle action execution
  const executeAction = (action: BezierNormalizeAction) => {
    bezierNormalizeManager.executeAction(action);
  };

  // Only show panel when exactly one command is selected
  if (editorStore.selection.selectedCommands.length !== 1 || !state.pointInfo) {
    return null;
  }

  const { pointInfo, availableActions } = state;

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'normalize-from-current':
        return <ArrowLeftRight size={16} />;
      case 'normalize-from-other':
        return <Shuffle size={16} />;
      case 'convert-and-normalize':
        return <RefreshCw size={16} />;
      case 'break-control-points':
        return <Unlink size={16} />;
      default:
        return <RefreshCw size={16} />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'normalize-from-current':
        return '#2196f3';
      case 'normalize-from-other':
        return '#ff9800';
      case 'convert-and-normalize':
        return '#4caf50';
      case 'break-control-points':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  const getScenarioDescription = () => {
    const { prevSegmentType, nextSegmentType } = pointInfo;
    
    if (prevSegmentType === 'curve' && nextSegmentType === 'curve') {
      return {
        scenario: 'Caso Feliz',
        description: 'Punto entre curvas Bézier',
        color: '#4caf50'
      };
    } else if (prevSegmentType === 'line' && nextSegmentType === 'line') {
      return {
        scenario: 'Caso no Feliz',
        description: 'Punto entre rectas',
        color: '#ff9800'
      };
    } else if (
      (prevSegmentType === 'line' && nextSegmentType === 'curve') ||
      (prevSegmentType === 'curve' && nextSegmentType === 'line')
    ) {
      return {
        scenario: 'Caso Híbrido',
        description: 'Punto con recta y curva',
        color: '#2196f3'
      };
    }
    
    return {
      scenario: 'Caso Desconocido',
      description: 'Configuración no reconocida',
      color: '#757575'
    };
  };

  const scenario = getScenarioDescription();

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
        
        {/* Option Key Indicator */}
        {state.isOptionPressed && (
          <div style={{
            fontSize: '11px',
            color: '#fff',
            padding: '6px',
            backgroundColor: '#ff6b35',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ⌥ Option pressed - Control points can be broken
          </div>
        )}

        {/* Scenario Info */}
        <div style={{ 
          fontSize: '12px', 
          color: '#666',
          padding: '8px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          lineHeight: '1.4'
        }}>
          <div style={{ 
            fontWeight: '600', 
            marginBottom: '4px',
            color: scenario.color
          }}>
            {scenario.scenario}
          </div>
          <div style={{ fontSize: '11px' }}>
            {scenario.description}
          </div>
        </div>

        {/* Point Info */}
        <div style={{ 
          fontSize: '11px', 
          color: '#666',
          padding: '6px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div>Punto: ({pointInfo.command.x?.toFixed(2)}, {pointInfo.command.y?.toFixed(2)})</div>
          <div>Segmento anterior: {pointInfo.prevSegmentType || 'ninguno'}</div>
          <div>Segmento siguiente: {pointInfo.nextSegmentType || 'ninguno'}</div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          {availableActions.map((action: BezierNormalizeAction, index: number) => (
            <PluginButton
              key={action.type}
              icon={getActionIcon(action.type)}
              text={action.label}
              color={getActionColor(action.type)}
              onClick={() => executeAction(action)}
              fullWidth={true}
            />
          ))}
        </div>

        {/* Help Text */}
        {availableActions.length === 0 && (
          <div style={{ 
            fontSize: '11px', 
            color: '#999',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '8px'
          }}>
            Selecciona un punto para ver las opciones de normalización
          </div>
        )}
    </div>
  );
};
