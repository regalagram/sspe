import React, { useState, useRef, useEffect } from 'react';
import { useHistoryDebug } from '../store/useEditorHistory';
import { useHistoryPerformanceMonitor, useHistoryOptimizationTips } from '../store/useHistoryPerformance';
import { useHistoryDebugActions } from '../store/useHistoryDebugActions';
import { useDiffConfig } from '../store/diffConfig';
import { useZundoDebugVisibility } from '../store/useZundoDebugVisibility';

interface Position {
  x: number;
  y: number;
}

export const ZundoDebugPanel: React.FC = () => {
  // TODOS LOS HOOKS DEBEN IR AL INICIO DEL COMPONENTE
  const { 
    pastStatesCount, 
    futureStatesCount, 
    isTracking,
    pastStates,
    futureStates,
    memory 
  } = useHistoryDebug();
  
  const { metrics, hasWarnings, isHealthy, memoryLeakDiagnostic } = useHistoryPerformanceMonitor();
  const optimizationTips = useHistoryOptimizationTips();
  const { clearHistory, toggleTracking, forceHistoryEntry, simulateHeavyOperation, inspectDiffMode } = useHistoryDebugActions();
  const { config: diffConfig, toggleDiffMode } = useDiffConfig();
  const { visible } = useZundoDebugVisibility();
  const [isExpanded, setIsExpanded] = useState(false);

  // Estados para hacer el panel movible
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Funciones para hacer el panel arrastrable
  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && panelRef.current) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limitar el panel a los bordes de la ventana
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const panelWidth = panelRef.current.offsetWidth;
      const panelHeight = panelRef.current.offsetHeight;
      
      const clampedX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
      const clampedY = Math.max(0, Math.min(newY, windowHeight - panelHeight));
      
      setPosition({ x: clampedX, y: clampedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Agregar y remover event listeners para el drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Solo retornar null DESPUÉS de todos los hooks
  if (process.env.NODE_ENV !== 'development' || !visible) {
    return null;
  }

  // Determinar color para el indicador de memoria
  const getMemoryColor = (percentage: number) => {
    if (percentage < 50) return '#4ade80'; // verde
    if (percentage < 80) return '#fbbf24'; // amarillo
    return '#ef4444'; // rojo
  };

  const memoryColor = getMemoryColor(memory.memoryUsagePercentage);
  const healthColor = isHealthy ? '#4ade80' : hasWarnings ? '#ef4444' : '#fbbf24';

  const buttonStyle = {
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid #3b82f6',
    color: '#93c5fd',
    cursor: 'pointer',
    fontSize: '8px',
    padding: '3px 6px',
    borderRadius: '3px',
    margin: '1px'
  };

  return (
    <div 
      ref={panelRef}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'Monaco, Consolas, monospace',
        zIndex: 10000,
        minWidth: '280px',
        maxWidth: isExpanded ? '400px' : '320px',
        border: '1px solid #374151',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: isDragging ? 'none' : 'all 0.3s ease',
        cursor: isDragging ? 'grabbing' : 'default'
      }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
          borderBottom: '1px solid #374151',
          paddingBottom: '6px',
          cursor: 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <h4 style={{ 
          margin: '0', 
          fontSize: '13px', 
          color: '#60a5fa'
        }}>
          🍜 Zundo Debug
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: healthColor,
            boxShadow: `0 0 4px ${healthColor}`
          }} />
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 4px',
              borderRadius: '3px'
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      {/* Estados */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: '#d1d5db', marginBottom: '4px' }}>📊 Estados</div>
        <div>Past: <span style={{ color: '#34d399' }}>{pastStatesCount}</span></div>
        <div>Future: <span style={{ color: '#fbbf24' }}>{futureStatesCount}</span></div>
        <div>Tracking: {isTracking ? '✅' : '❌'}</div>
      </div>

      {/* Diff Mode Configuration */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: '#d1d5db', marginBottom: '4px' }}>📦 Storage Mode</div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '10px'
        }}>
          <span style={{ color: '#9ca3af' }}>Mode:</span>
          <button 
            onClick={() => toggleDiffMode()}
            style={{
              background: diffConfig.mode === 'diff' 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(59, 130, 246, 0.2)',
              border: `1px solid ${diffConfig.mode === 'diff' ? '#22c55e' : '#3b82f6'}`,
              color: diffConfig.mode === 'diff' ? '#4ade80' : '#60a5fa',
              cursor: 'pointer',
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '3px',
              fontWeight: 'bold'
            }}
          >
            {diffConfig.mode.toUpperCase()}
          </button>
          <span style={{ 
            color: '#6b7280', 
            fontSize: '8px',
            maxWidth: '180px'
          }}>
            {diffConfig.mode === 'diff' 
              ? '🟢 Storing only changes (smaller memory)' 
              : '🔵 Storing full states (more memory)'}
          </span>
        </div>
        
        {/* Storage mode info when expanded */}
        {isExpanded && (
          <div style={{
            marginTop: '6px',
            padding: '6px',
            background: 'rgba(75, 85, 99, 0.3)',
            borderRadius: '4px',
            fontSize: '8px',
            color: '#9ca3af'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px', color: '#d1d5db' }}>
              📚 Storage Modes:
            </div>
            <div>• <span style={{ color: '#60a5fa' }}>FULL</span>: Complete state snapshots (safer, more memory)</div>
            <div>• <span style={{ color: '#4ade80' }}>DIFF</span>: Only changed fields (efficient, less memory)</div>
            <div style={{ marginTop: '4px', color: '#fbbf24' }}>
              ⚠️ Changes apply to new state updates
            </div>
          </div>
        )}
      </div>

      {/* Memoria */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: '#d1d5db', marginBottom: '4px' }}>💾 Memoria</div>
        <div style={{ fontSize: '10px' }}>
          <div>Total: <span style={{ color: memoryColor, fontWeight: 'bold' }}>
            {memory.formatted.totalHistorySize}
          </span></div>
          <div>Past: <span style={{ color: '#34d399' }}>
            {memory.formatted.pastStatesSize}
          </span></div>
          <div>Future: <span style={{ color: '#fbbf24' }}>
            {memory.formatted.futureStatesSize}
          </span></div>
          <div>Current: <span style={{ color: '#60a5fa' }}>
            {memory.formatted.currentStateSize}
          </span></div>
          <div>Avg/State: <span style={{ color: '#a78bfa' }}>
            {memory.formatted.avgStateSize}
          </span></div>
        </div>
        
        {/* Barra de progreso de memoria */}
        <div style={{ 
          marginTop: '6px',
          background: '#374151',
          height: '6px',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${memory.memoryUsagePercentage}%`,
            height: '100%',
            background: memoryColor,
            transition: 'all 0.3s ease'
          }} />
        </div>
        <div style={{ 
          fontSize: '9px', 
          color: '#9ca3af', 
          marginTop: '2px' 
        }}>
          {memory.memoryUsagePercentage.toFixed(1)}% del máximo estimado ({memory.formatted.maxPossibleSize})
        </div>
      </div>

      {/* Controles de Debug */}
      {isExpanded && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#d1d5db', marginBottom: '4px' }}>🛠️ Controles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            <button onClick={clearHistory} style={buttonStyle}>
              Clear History
            </button>
            <button onClick={toggleTracking} style={buttonStyle}>
              {isTracking ? 'Pause' : 'Resume'}
            </button>
            <button onClick={forceHistoryEntry} style={buttonStyle}>
              Force Entry
            </button>
            <button onClick={simulateHeavyOperation} style={buttonStyle}>
              Simulate Heavy
            </button>
            <button onClick={inspectDiffMode} style={buttonStyle}>
              Inspect Diff
            </button>
          </div>
        </div>
      )}

      {/* Memory Leak Diagnostic - Solo se muestra si hay diagnóstico */}
      {memoryLeakDiagnostic && memoryLeakDiagnostic.detected && (
        <div style={{
          background: memoryLeakDiagnostic.confidence === 'high' 
            ? 'rgba(239, 68, 68, 0.15)' 
            : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${memoryLeakDiagnostic.confidence === 'high' ? '#ef4444' : '#f59e0b'}`,
          borderRadius: '6px',
          padding: '8px',
          fontSize: '9px',
          marginBottom: '12px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '6px',
            color: memoryLeakDiagnostic.confidence === 'high' ? '#fecaca' : '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🚨 Memory Leak Detectado 
            <span style={{
              background: memoryLeakDiagnostic.confidence === 'high' ? '#ef4444' : '#f59e0b',
              color: 'white',
              padding: '1px 4px',
              borderRadius: '2px',
              fontSize: '8px',
              textTransform: 'uppercase'
            }}>
              {memoryLeakDiagnostic.confidence}
            </span>
          </div>
          
          {/* Growth Info */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ color: '#d1d5db', fontWeight: 'bold' }}>📈 Crecimiento:</div>
            <div>• Tasa: <span style={{ color: '#fbbf24' }}>
              {(memoryLeakDiagnostic.growth.rate / 1024).toFixed(2)} KB/muestra
            </span></div>
            <div>• Consistencia: <span style={{ color: '#fbbf24' }}>
              {(memoryLeakDiagnostic.growth.consistency * 100).toFixed(1)}%
            </span></div>
            <div>• Ventana: <span style={{ color: '#60a5fa' }}>
              {memoryLeakDiagnostic.growth.timeWindow}
            </span></div>
          </div>

          {/* Patrones detectados */}
          {memoryLeakDiagnostic.patterns.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#d1d5db', fontWeight: 'bold' }}>🔍 Patrones:</div>
              {memoryLeakDiagnostic.patterns.map((pattern: string, index: number) => (
                <div key={index} style={{ color: '#fbbf24' }}>• {pattern}</div>
              ))}
            </div>
          )}

          {/* Áreas sospechosas */}
          {memoryLeakDiagnostic.suspiciousAreas.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#d1d5db', fontWeight: 'bold' }}>⚠️ Áreas Sospechosas:</div>
              {memoryLeakDiagnostic.suspiciousAreas.map((area: string, index: number) => (
                <div key={index} style={{ color: '#fecaca', fontSize: '8px' }}>• {area}</div>
              ))}
            </div>
          )}

          {/* Recomendaciones */}
          {isExpanded && memoryLeakDiagnostic.recommendations.length > 0 && (
            <div>
              <div style={{ color: '#d1d5db', fontWeight: 'bold' }}>💡 Recomendaciones:</div>
              {memoryLeakDiagnostic.recommendations.map((rec: string, index: number) => (
                <div key={index} style={{ color: '#34d399', fontSize: '8px' }}>• {rec}</div>
              ))}
            </div>
          )}
          
          {!isExpanded && (
            <div style={{ 
              fontSize: '8px', 
              color: '#9ca3af', 
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              Expandir (+) para ver recomendaciones detalladas
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '4px',
          padding: '6px',
          fontSize: '9px',
          color: '#fecaca',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Warnings:</div>
          {metrics.warnings.map((warning: string, index: number) => (
            <div key={index}>• {warning}</div>
          ))}
        </div>
      )}

      {/* Performance expandido */}
      {isExpanded && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#d1d5db', marginBottom: '4px' }}>🚀 Performance</div>
          <div style={{ fontSize: '9px' }}>
            <div>Total Memory: <span style={{ color: '#f97316' }}>
              {(metrics.totalStatesSize / 1024).toFixed(1)} KB
            </span></div>
            <div>Avg Size: <span style={{ color: '#a78bfa' }}>
              {(metrics.avgStateSize / 1024).toFixed(1)} KB
            </span></div>
            <div>Usage: <span style={{ color: '#6b7280' }}>
              {metrics.memoryUsagePercentage.toFixed(1)}%
            </span></div>
            
            {/* Información de debugging adicional */}
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #374151' }}>
              <div style={{ color: '#d1d5db', fontWeight: 'bold', marginBottom: '3px' }}>
                🔧 Debug Info:
              </div>
              <div>Past States Size: <span style={{ color: '#34d399' }}>
                {pastStates.length} objetos
              </span></div>
              <div>Future States Size: <span style={{ color: '#fbbf24' }}>
                {futureStates.length} objetos
              </span></div>
              {memory.memoryUsagePercentage > 70 && (
                <div style={{ color: '#ef4444' }}>
                  ⚠️ Alto uso de memoria detectado
                </div>
              )}
            </div>
          </div>
          
          {/* Optimization Tips */}
          {optimizationTips.length > 0 && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '6px',
              fontSize: '8px',
              color: '#93c5fd',
              marginTop: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>💡 Tips:</div>
              {optimizationTips.map((tip: string, index: number) => (
                <div key={index}>• {tip}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estados detallados */}
      <div style={{ fontSize: '9px' }}>
        <details>
          <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>
            Ver Estados ({pastStatesCount + futureStatesCount + 1} total)
          </summary>
          <div style={{ 
            marginTop: '6px', 
            maxHeight: '120px', 
            overflow: 'auto',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '4px',
            borderRadius: '3px'
          }}>
            {pastStates.length > 0 && (
              <div style={{ color: '#34d399', marginBottom: '4px' }}>
                Past ({pastStates.length}):
                {pastStates.slice(-3).map((_: any, index: number) => (
                  <div key={index} style={{ paddingLeft: '8px', color: '#6b7280' }}>
                    #{pastStates.length - 3 + index + 1}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ color: '#60a5fa', margin: '4px 0' }}>
              Current: #1 (active)
            </div>
            
            {futureStates.length > 0 && (
              <div style={{ color: '#fbbf24' }}>
                Future ({futureStates.length}):
                {futureStates.slice(0, 3).map((_: any, index: number) => (
                  <div key={index} style={{ paddingLeft: '8px', color: '#6b7280' }}>
                    #{index + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Footer con controles */}
      <div style={{ 
        marginTop: '12px', 
        paddingTop: '6px', 
        borderTop: '1px solid #374151',
        fontSize: '8px',
        color: '#6b7280',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Zundo v2 • Cool-off: 300ms • Limit: 50</span>
        {isExpanded && (
          <button
            onClick={() => {
              console.log('Zundo Debug Data:', {
                memory,
                metrics,
                optimizationTips,
                states: { pastStatesCount, futureStatesCount }
              });
            }}
            style={{
              background: 'transparent',
              border: '1px solid #374151',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '7px',
              padding: '2px 4px',
              borderRadius: '3px'
            }}
          >
            Log Data
          </button>
        )}
      </div>
    </div>
  );
};
