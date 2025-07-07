import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Link, Unlink, CornerDownLeft, CornerUpRight } from 'lucide-react';
import { figmaHandleManager } from './FigmaHandleManager';
import { ControlPointType } from '../../types';

export const FigmaHandleControls: React.FC = () => {
  const editorStore = useEditorStore();
  const [state, setState] = useState(figmaHandleManager.getState());
  const [selectedControlPoint, setSelectedControlPoint] = useState<string | null>(null);

  // Set up editor store reference - REMOVED: Now handled by plugin
  // No longer calling figmaHandleManager.setEditorStore here to avoid reinitializations

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = figmaHandleManager.addListener(() => {
      setState(figmaHandleManager.getState());
    });
    
    return unsubscribe;
  }, []);

  // Update analysis when selection changes
  useEffect(() => {
    if (editorStore.selection.selectedCommands.length === 1) {
      const commandId = editorStore.selection.selectedCommands[0];
      const controlPointInfo = figmaHandleManager.analyzeControlPoint(commandId);
      if (controlPointInfo) {
        setSelectedControlPoint(commandId);
        figmaHandleManager.updateControlPointsForOptionState();
      }
    } else {
      setSelectedControlPoint(null);
    }
  }, [editorStore.selection.selectedCommands]);

  // Only show panel when exactly one command is selected
  if (!selectedControlPoint || editorStore.selection.selectedCommands.length !== 1) {
    return null;
  }

  const controlPointInfo = state.controlPoints.get(selectedControlPoint);
  if (!controlPointInfo) return null;

  const getTypeIcon = (type: ControlPointType) => {
    switch (type) {
      case 'mirrored':
        return <Link size={16} />;
      case 'aligned':
        return <CornerDownLeft size={16} />;
      case 'independent':
        return <Unlink size={16} />;
      default:
        return <Unlink size={16} />;
    }
  };

  const getTypeColor = (type: ControlPointType) => {
    switch (type) {
      case 'mirrored':
        return '#10b981'; // Verde
      case 'aligned':
        return '#3b82f6'; // Azul
      case 'independent':
        return '#f59e0b'; // Amarillo
      default:
        return '#6b7280'; // Gris
    }
  };

  const getTypeDescription = (type: ControlPointType) => {
    switch (type) {
      case 'mirrored':
        return 'Handles simétricos (mismo largo y dirección opuesta)';
      case 'aligned':
        return 'Handles alineados (dirección opuesta, largos independientes)';
      case 'independent':
        return 'Handles independientes (movimiento libre)';
      default:
        return 'Tipo desconocido';
    }
  };

  const convertToMirrored = () => {
    if (selectedControlPoint) {
      figmaHandleManager.convertToMirrored(selectedControlPoint);
    }
  };

  const canConvertToMirrored = controlPointInfo.type !== 'mirrored' && controlPointInfo.isBreakable;

  return (
    <div>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minWidth: '280px'
      }}>
        
        {/* Estado actual */}
        <div style={{
          padding: '8px',
          backgroundColor: '#2d3748',
          borderRadius: '4px',
          border: `1px solid ${getTypeColor(controlPointInfo.type)}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            {getTypeIcon(controlPointInfo.type)}
            <span style={{ 
              color: getTypeColor(controlPointInfo.type),
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {controlPointInfo.type.charAt(0).toUpperCase() + controlPointInfo.type.slice(1)}
            </span>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#a0aec0',
            lineHeight: '1.4'
          }}>
            {getTypeDescription(controlPointInfo.type)}
          </div>
        </div>

        {/* Indicador de tecla Option */}
        {state.isOptionPressed && (
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#fbbf24',
            borderRadius: '4px',
            color: '#1f2937',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            ⌥ Option: Modo Independiente
          </div>
        )}

        {/* Información de handles */}
        <div style={{
          display: 'flex',
          gap: '8px',
          fontSize: '11px',
          color: '#a0aec0'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Handles:</div>
            <div>Entrante: {controlPointInfo.incomingHandle ? '✓' : '✗'}</div>
            <div>Saliente: {controlPointInfo.outgoingHandle ? '✓' : '✗'}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Estado:</div>
            <div>Separable: {controlPointInfo.isBreakable ? '✓' : '✗'}</div>
            <div>Arrastrando: {state.dragState.isDragging ? '✓' : '✗'}</div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <PluginButton
            icon={<Link size={16} />}
            text="Convertir a Simétrico"
            color={canConvertToMirrored ? '#10b981' : '#6b7280'}
            onClick={convertToMirrored}
            disabled={!canConvertToMirrored}
            fullWidth={true}
          />
        </div>

        {/* Instrucciones */}
        <div style={{
          padding: '8px',
          backgroundColor: '#1a202c',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#a0aec0',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Instrucciones:</div>
          <div>• Arrastra handles para mover puntos de control</div>
          <div>• Mantén <strong>⌥ Option</strong> para mover independientemente</div>
          <div>• Sin Option: handles se mueven acoplados según su tipo</div>
        </div>

      </div>
    </div>
  );
};
