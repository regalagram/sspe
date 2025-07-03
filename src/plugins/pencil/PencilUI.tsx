import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { Edit3, LogOut } from 'lucide-react';

export const PencilUI: React.FC = () => {
  const { mode, setCreateMode, exitCreateMode } = useEditorStore();
  const [strokeStyle, setStrokeStyle] = useState(pencilManager.getStrokeStyle());
  const [smootherParams, setSmootherParams] = useState(pencilManager.getSmootherParameters());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const isPencilActive = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';
  
  // Colores consistentes con otros plugins
  const toolColor = '#007acc';

  const handlePencilClick = () => {
    console.log('🎨 PencilUI: Activating pencil mode');
    setCreateMode('PENCIL');
  };

  const handleExitPencil = () => {
    console.log('🎨 PencilUI: Exiting pencil mode');
    exitCreateMode();
  };

  const handleStrokeColorChange = (color: string) => {
    pencilManager.setStrokeStyle({ stroke: color });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  const handleStrokeWidthChange = (width: number) => {
    pencilManager.setStrokeStyle({ strokeWidth: width });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  const handleSmootherParamChange = (param: string, value: number) => {
    pencilManager.setSmootherParameter(param, value);
    setSmootherParams(pencilManager.getSmootherParameters());
  };

  const handleResetSmoother = () => {
    pencilManager.resetSmootherToDefaults();
    setSmootherParams(pencilManager.getSmootherParameters());
  };

  const handleClearSavedSettings = () => {
    pencilManager.clearSavedSettings();
    setStrokeStyle(pencilManager.getStrokeStyle());
    setSmootherParams(pencilManager.getSmootherParameters());
  };

  const handlePreset = (presetType: 'precise' | 'fluid' | 'quick') => {
    switch (presetType) {
      case 'precise':
        pencilManager.applyPreciseDrawingPreset();
        break;
      case 'fluid':
        pencilManager.applyFluidDrawingPreset();
        break;
      case 'quick':
        pencilManager.applyQuickSketchPreset();
        break;
    }
    setSmootherParams(pencilManager.getSmootherParameters());
  };

  // Tooltip information
  const tooltipInfo = {
    smoothingFactor: {
      title: "Smoothing Factor (0-1)",
      description: "Controla la intensidad del suavizado adaptativo. 0 = sin suavizado, 1 = máximo suavizado. Defecto: 0.85"
    },
    simplifyTolerance: {
      title: "Simplify Tolerance (0.5-5)",
      description: "Controla cuántos puntos se eliminan durante la simplificación RDP. 0.5 = mantener más detalle, 5 = simplificar más agresivamente. Defecto: 2.0"
    },
    minDistance: {
      title: "Min Distance (0.5-3)",
      description: "Distancia mínima entre puntos capturados. 0.5 = más puntos/detalle, 3 = menos puntos/más fluido. Defecto: 1.5"
    },
    lowPassAlpha: {
      title: "Filter Strength (0.1-0.8)",
      description: "Intensidad del filtro de paso bajo para reducir ruido. 0.1 = menos filtrado, 0.8 = más filtrado. Defecto: 0.3"
    }
  };

  // Update stroke style when pencil becomes active
  React.useEffect(() => {
    if (isPencilActive) {
      setStrokeStyle(pencilManager.getStrokeStyle());
      setSmootherParams(pencilManager.getSmootherParameters());
    }
  }, [isPencilActive]);

  // Helper component for label with tooltip
  const LabelWithTooltip: React.FC<{ paramKey: string; children: React.ReactNode }> = ({ paramKey, children }) => (
    <div style={{ position: 'relative' }}>
      <label 
        onMouseEnter={() => setActiveTooltip(paramKey)}
        onMouseLeave={() => setActiveTooltip(null)}
        style={{ 
          fontSize: '10px', 
          fontWeight: '500', 
          minWidth: '60px',
          cursor: 'help',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted'
        }}
      >
        {children}
      </label>
      {activeTooltip === paramKey && (
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '-50px',
          width: '200px',
          backgroundColor: '#333',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {tooltipInfo[paramKey as keyof typeof tooltipInfo].title}
          </div>
          <div>
            {tooltipInfo[paramKey as keyof typeof tooltipInfo].description}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <DraggablePanel
      title="Pencil Tool"
      initialPosition={{ x: 980, y: 300 }}
      id="pencil-tools"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Pencil Tool Button using PluginButton component */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <PluginButton
            icon={<Edit3 size={14} color={isPencilActive ? 'white' : '#333'} />}
            text="Pencil Tool"
            color={toolColor}
            active={isPencilActive}
            disabled={false}
            onClick={handlePencilClick}
          />
          
          {isPencilActive && (
            <PluginButton
              icon={<LogOut size={16} />}
              text="Exit Pencil Mode"
              color="#dc3545"
              active={false}
              disabled={false}
              onClick={handleExitPencil}
            />
          )}
        </div>

        {/* Pencil Controls */}
        {isPencilActive && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '12px',
            marginTop: '6px'
          }}>
            {/* Color Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                minWidth: '38px'
              }}>
                Color:
              </label>
              <input
                type="color"
                value={strokeStyle.stroke}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                style={{ 
                  width: '35px', 
                  height: '28px', 
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              />
              <span style={{ 
                fontSize: '10px', 
                color: '#666',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
              }}>
                {strokeStyle.stroke}
              </span>
            </div>
            
            {/* Width Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                minWidth: '38px'
              }}>
                Width:
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={strokeStyle.strokeWidth}
                onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                style={{ 
                  flex: 1,
                  width: '80px',
                  maxWidth: '80px'
                }}
              />
              <span style={{ 
                fontSize: '11px', 
                minWidth: '25px', 
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {strokeStyle.strokeWidth}px
              </span>
            </div>

            {/* Visual Preview */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '6px',
              padding: '8px',
              backgroundColor: '#f8f8f8',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>Preview:</span>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                justifyContent: 'center'
              }}>
                <div 
                  style={{
                    width: `${Math.max(strokeStyle.strokeWidth * 2, 12)}px`,
                    height: `${Math.max(strokeStyle.strokeWidth * 2, 12)}px`,
                    borderRadius: '50%',
                    backgroundColor: strokeStyle.stroke,
                    border: '1px solid #ccc',
                    minWidth: '8px',
                    minHeight: '8px'
                  }}
                />
                <div style={{
                  flex: 1,
                  height: `${strokeStyle.strokeWidth}px`,
                  backgroundColor: strokeStyle.stroke,
                  borderRadius: `${strokeStyle.strokeWidth / 2}px`,
                  minHeight: '2px',
                  maxWidth: '100px'
                }} />
              </div>
            </div>

            {/* Advanced Parameters Toggle */}
            <div style={{ 
              borderTop: '1px solid #e0e0e0',
              paddingTop: '8px',
              marginTop: '8px'
            }}>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Advanced Settings</span>
                <span>{showAdvanced ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Advanced Parameters */}
            {showAdvanced && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #e8e8e8'
              }}>
                {/* Preset Buttons */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '4px',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '8px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>
                    Presets:
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      onClick={() => handlePreset('precise')}
                      style={{
                        flex: 1,
                        padding: '3px 4px',
                        fontSize: '9px',
                        backgroundColor: '#e3f2fd',
                        border: '1px solid #90caf9',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        color: '#1976d2'
                      }}
                      title="Para dibujos detallados y precisos"
                    >
                      Preciso
                    </button>
                    <button
                      onClick={() => handlePreset('fluid')}
                      style={{
                        flex: 1,
                        padding: '3px 4px',
                        fontSize: '9px',
                        backgroundColor: '#e8f5e8',
                        border: '1px solid #a5d6a7',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        color: '#388e3c'
                      }}
                      title="Para sketching fluido y natural"
                    >
                      Fluido
                    </button>
                    <button
                      onClick={() => handlePreset('quick')}
                      style={{
                        flex: 1,
                        padding: '3px 4px',
                        fontSize: '9px',
                        backgroundColor: '#fff3e0',
                        border: '1px solid #ffcc02',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        color: '#f57c00'
                      }}
                      title="Para bocetos rápidos y gestuales"
                    >
                      Rápido
                    </button>
                  </div>
                </div>

                {/* Smoothing Factor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LabelWithTooltip paramKey="smoothingFactor">
                    Smooth:
                  </LabelWithTooltip>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={smootherParams.smoothingFactor}
                    onChange={(e) => handleSmootherParamChange('smoothingFactor', parseFloat(e.target.value))}
                    style={{ flex: 1, width: '50px' }}
                  />
                  <span style={{ fontSize: '9px', minWidth: '20px', textAlign: 'center' }}>
                    {smootherParams.smoothingFactor.toFixed(2)}
                  </span>
                </div>

                {/* Simplify Tolerance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LabelWithTooltip paramKey="simplifyTolerance">
                    Simplify:
                  </LabelWithTooltip>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={smootherParams.simplifyTolerance}
                    onChange={(e) => handleSmootherParamChange('simplifyTolerance', parseFloat(e.target.value))}
                    style={{ flex: 1, width: '50px' }}
                  />
                  <span style={{ fontSize: '9px', minWidth: '20px', textAlign: 'center' }}>
                    {smootherParams.simplifyTolerance.toFixed(1)}
                  </span>
                </div>

                {/* Min Distance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LabelWithTooltip paramKey="minDistance">
                    MinDist:
                  </LabelWithTooltip>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={smootherParams.minDistance}
                    onChange={(e) => handleSmootherParamChange('minDistance', parseFloat(e.target.value))}
                    style={{ flex: 1, width: '50px' }}
                  />
                  <span style={{ fontSize: '9px', minWidth: '20px', textAlign: 'center' }}>
                    {smootherParams.minDistance.toFixed(1)}
                  </span>
                </div>

                {/* Low Pass Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LabelWithTooltip paramKey="lowPassAlpha">
                    Filter:
                  </LabelWithTooltip>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={smootherParams.lowPassAlpha}
                    onChange={(e) => handleSmootherParamChange('lowPassAlpha', parseFloat(e.target.value))}
                    style={{ flex: 1, width: '50px' }}
                  />
                  <span style={{ fontSize: '9px', minWidth: '20px', textAlign: 'center' }}>
                    {smootherParams.lowPassAlpha.toFixed(2)}
                  </span>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleResetSmoother}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e8e8e8',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    fontSize: '9px',
                    cursor: 'pointer',
                    color: '#666',
                    marginTop: '4px'
                  }}
                  title="Reset to default values"
                >
                  Reset Defaults
                </button>

                {/* Clear Saved Settings Button */}
                <button
                  onClick={handleClearSavedSettings}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ffe8e8',
                    border: '1px solid #ffaaaa',
                    borderRadius: '3px',
                    fontSize: '9px',
                    cursor: 'pointer',
                    color: '#d32f2f',
                    marginTop: '2px'
                  }}
                  title="Clear all saved settings and reset to factory defaults"
                >
                  Clear Storage
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};