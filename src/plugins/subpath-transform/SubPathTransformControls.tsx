import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { Move, RotateCw, Scale, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SubPathTransformControlsProps {}

export const SubPathTransformControls: React.FC<SubPathTransformControlsProps> = () => {
  const { 
    selection,
    scaleSubPath,
    rotateSubPath,
    translateSubPath,
  } = useEditorStore();
  
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [uniformScale, setUniformScale] = useState(true);

  const hasSelectedSubPaths = selection.selectedSubPaths.length > 0;

  const handleScale = () => {
    if (!hasSelectedSubPaths) return;
    
    selection.selectedSubPaths.forEach(subPathId => {
      scaleSubPath(subPathId, scaleX, uniformScale ? scaleX : scaleY);
    });
  };

  const handleRotate = () => {
    if (!hasSelectedSubPaths) return;
    
    selection.selectedSubPaths.forEach(subPathId => {
      rotateSubPath(subPathId, rotation);
    });
  };

  const handleTranslate = () => {
    if (!hasSelectedSubPaths) return;
    
    selection.selectedSubPaths.forEach(subPathId => {
      translateSubPath(subPathId, { x: translateX, y: translateY });
    });
  };

  const handleUniformScaleChange = (value: number) => {
    setScaleX(value);
    if (uniformScale) {
      setScaleY(value);
    }
  };

  const handleScaleYChange = (value: number) => {
    setScaleY(value);
    if (uniformScale) {
      setScaleX(value);
    }
  };

  const resetTransforms = () => {
    setScaleX(1);
    setScaleY(1);
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
  };

  return (
    <DraggablePanel
      title="Transform"
      initialPosition={{ x: 980, y: 300 }}
      id="subpath-transform"
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        maxWidth: '174px',
        minWidth: '174px'
      }}>
        {!hasSelectedSubPaths && (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center', 
            padding: '16px 8px',
            fontStyle: 'italic'
          }}>
            Select one or more subpaths to transform
          </div>
        )}
        
        {hasSelectedSubPaths && (
          <>
            {/* Scale Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'bold'
              }}>
                Scale
              </div>
              
              <div>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '11px', 
                  cursor: 'pointer',
                  marginBottom: '4px'
                }}>
                  <input
                    type="checkbox"
                    checked={uniformScale}
                    onChange={(e) => setUniformScale(e.target.checked)}
                    style={{ accentColor: '#007acc', cursor: 'pointer' }}
                  />
                  Uniform scale
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Scale X</div>
                  <input
                    type="number"
                    value={scaleX}
                    onChange={(e) => handleUniformScaleChange(parseFloat(e.target.value) || 1)}
                    step="0.1"
                    min="0.1"
                    max="10"
                    style={{ 
                      width: '100%', 
                      padding: '4px', 
                      fontSize: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '3px'
                    }}
                  />
                </div>
                
                {!uniformScale && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Scale Y</div>
                    <input
                      type="number"
                      value={scaleY}
                      onChange={(e) => handleScaleYChange(parseFloat(e.target.value) || 1)}
                      step="0.1"
                      min="0.1"
                      max="10"
                      style={{ 
                        width: '100%', 
                        padding: '4px', 
                        fontSize: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                )}
              </div>
              
              <PluginButton
                icon={<Scale size={14} />}
                text="Apply Scale"
                color="#007acc"
                active={false}
                disabled={false}
                onClick={handleScale}
              />
            </div>

            {/* Rotation Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'bold'
              }}>
                Rotate
              </div>
              
              <div>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Angle (degrees)</div>
                <input
                  type="number"
                  value={rotation}
                  onChange={(e) => setRotation(parseFloat(e.target.value) || 0)}
                  step="15"
                  style={{ 
                    width: '100%', 
                    padding: '4px', 
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}
                />
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr',
                gap: '4px'
              }}>
                {[
                  { angle: 0, icon: <ArrowUp size={12} /> },
                  { angle: 90, icon: <RotateCw size={12} /> },
                  { angle: 180, icon: <ArrowDown size={12} /> },
                  { angle: 270, icon: <RotateCcw size={12} /> }
                ].map(({ angle, icon }) => (
                  <button
                    key={angle}
                    onClick={() => setRotation(angle)}
                    style={{
                      padding: '4px 8px',
                      background: rotation === angle ? '#007acc' : '#f5f5f5',
                      color: rotation === angle ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px'
                    }}
                  >
                    {icon} {angle}°
                  </button>
                ))}
              </div>
              
              <PluginButton
                icon={<RotateCw size={14} />}
                text="Apply Rotation"
                color="#007acc"
                active={false}
                disabled={false}
                onClick={handleRotate}
              />
            </div>

            {/* Translation Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'bold'
              }}>
                Translate
              </div>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Translate X</div>
                  <input
                    type="number"
                    value={translateX}
                    onChange={(e) => setTranslateX(parseFloat(e.target.value) || 0)}
                    step="1"
                    style={{ 
                      width: '100%', 
                      padding: '4px', 
                      fontSize: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '3px'
                    }}
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Translate Y</div>
                  <input
                    type="number"
                    value={translateY}
                    onChange={(e) => setTranslateY(parseFloat(e.target.value) || 0)}
                    step="1"
                    style={{ 
                      width: '100%', 
                      padding: '4px', 
                      fontSize: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '2px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => { setTranslateX(0); setTranslateY(-10); }}
                  style={{
                    padding: '4px 8px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <ArrowUp size={12} /> 10
                </button>
                <div style={{ 
                  display: 'flex', 
                  gap: '2px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => { setTranslateX(-10); setTranslateY(0); }}
                    style={{
                      padding: '4px 8px',
                      background: '#f5f5f5',
                      color: '#333',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <ArrowLeft size={12} /> 10
                  </button>
                  <button
                    onClick={() => { setTranslateX(10); setTranslateY(0); }}
                    style={{
                      padding: '4px 8px',
                      background: '#f5f5f5',
                      color: '#333',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <ArrowRight size={12} /> 10
                  </button>
                </div>
                <button
                  onClick={() => { setTranslateX(0); setTranslateY(10); }}
                  style={{
                    padding: '4px 8px',
                    background: '#f5f5f5',
                    color: '#333',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <ArrowDown size={12} /> 10
                </button>
              </div>
              
              <PluginButton
                icon={<Move size={14} />}
                text="Apply Translation"
                color="#007acc"
                active={false}
                disabled={false}
                onClick={handleTranslate}
              />
            </div>

            {/* Reset Section */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid #eee' }}>
              <PluginButton
                icon={<RotateCcw size={14} />}
                text="Reset Values"
                color="#6c757d"
                active={false}
                disabled={false}
                onClick={resetTransforms}
              />
            </div>
            
            <div style={{ 
              fontSize: '10px', 
              color: '#666', 
              textAlign: 'center',
              paddingTop: '4px'
            }}>
              Selected: {selection.selectedSubPaths.length} subpath{selection.selectedSubPaths.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </DraggablePanel>
  );
};
