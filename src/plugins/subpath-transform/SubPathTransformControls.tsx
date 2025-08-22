import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Move, RotateCw, Maximize2, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Waves, Minimize2, FlipHorizontal, FlipVertical } from 'lucide-react';
import { 
  areCommandsInSameSubPath
} from '../../utils/path-simplification-utils';
import { subPathTransformManager } from './SubPathTransformManager';

// Custom hook for persistent state in localStorage
const usePersistentState = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistentState = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  };

  return [state, setPersistentState];
};

interface SubPathTransformControlsProps {}

export const SubPathTransformControls: React.FC<SubPathTransformControlsProps> = () => {
  const { 
    selection,
    paths,
    grid,
    scaleSubPath,
    rotateSubPath,
    translateSubPath,
    mirrorSubPathHorizontal,
    mirrorSubPathVertical,
    replaceSubPathCommands,
    pushToHistory
  } = useEditorStore();
  
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [uniformScale, setUniformScale] = useState(true);
  
  // Collapsible sections state
  const [scaleExpanded, setScaleExpanded] = useState(false);
  const [rotationExpanded, setRotationExpanded] = useState(false);
  const [translationExpanded, setTranslationExpanded] = useState(false);
  const [mirrorExpanded, setMirrorExpanded] = useState(false);
  const [smoothingExpanded, setSmoothingExpanded] = useState(true);
  const [simplificationExpanded, setSimplificationExpanded] = useState(true);
  
  // Smoothing and Simplification settings with localStorage persistence
  const [simplifyTolerance, setSimplifyTolerance] = usePersistentState('pathSimplification.tolerance', 0.1);
  const [simplifyDistance, setSimplifyDistance] = usePersistentState('pathSimplification.distance', 10);

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

  const handleMirrorHorizontal = () => {
    if (!hasSelectedSubPaths) return;
    
    selection.selectedSubPaths.forEach(subPathId => {
      mirrorSubPathHorizontal(subPathId);
    });
  };

  const handleMirrorVertical = () => {
    if (!hasSelectedSubPaths) return;
    
    selection.selectedSubPaths.forEach(subPathId => {
      mirrorSubPathVertical(subPathId);
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
    setSimplifyTolerance(0.1);
    setSimplifyDistance(10);
  };

  // Smoothing functionality with animation
  const handleSmooth = () => {
    const { selectedCommands, selectedSubPaths } = selection;
    
    // Determine what to smooth: selected commands OR selected subpaths
    let targetSubPath: any = null;
    let targetCommands: any[] = [];
    let startIndex: number | undefined;
    let endIndex: number | undefined;
    let canSmooth = false;
    let isMultipleSubPaths = false;
    let targetSubPaths: any[] = [];
    
    if (selectedCommands.length >= 2) {
      // Use selected commands approach
      const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
      const result = analysisResult;
      if (result.sameSubPath && result.subPath && result.commands && result.commands.length >= 2) {
        targetSubPath = result.subPath;
        targetCommands = result.commands;
        startIndex = result.startIndex;
        endIndex = result.endIndex;
        canSmooth = true;
      }
    } else if (selectedSubPaths.length === 1) {
      // Use selected subpath approach - smooth the entire subpath
      const subPathId = selectedSubPaths[0];
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
        if (subPath && subPath.commands.length >= 2) {
          targetSubPath = subPath;
          targetCommands = subPath.commands;
          startIndex = 0;
          endIndex = subPath.commands.length - 1;
          canSmooth = true;
          break;
        }
      }
    } else if (selectedSubPaths.length > 1) {
      // Multiple subpaths selected - smooth all that have enough commands
      isMultipleSubPaths = true;
      for (const subPathId of selectedSubPaths) {
        for (const path of paths) {
          const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
          if (subPath && subPath.commands.length >= 2) {
            targetSubPaths.push(subPath);
          }
        }
      }
      canSmooth = targetSubPaths.length > 0;
    }

    if (!canSmooth) return;

    // Save current state to history before making changes
    pushToHistory();

    if (isMultipleSubPaths && targetSubPaths.length > 0) {
      // Handle multiple subpaths - apply smoothing with animation to each
      targetSubPaths.forEach((subPath, index) => {
        const subPathCommands = subPath.commands;
        
        if (subPathCommands.length < 2) return;
        
        const segmentToSmooth = [...subPathCommands];
        
        // Apply smoothing with animation
        const delay = index * 100; // Stagger animations
        setTimeout(() => {
          subPathTransformManager.smoothWithAnimation(segmentToSmooth, (smoothedCommands) => {
            // Ensure the subpath ALWAYS starts with M
            if (smoothedCommands.length > 0 && smoothedCommands[0].command !== 'M') {
              const firstCmd = smoothedCommands[0];
              if ('x' in firstCmd && 'y' in firstCmd) {
                smoothedCommands[0] = {
                  ...firstCmd,
                  command: 'M'
                };
              }
            }
            
            // Replace all commands in this subpath
            replaceSubPathCommands(subPath.id, smoothedCommands);
          });
        }, delay);
      });
    } else if (!isMultipleSubPaths && targetSubPath && targetCommands && startIndex !== undefined && endIndex !== undefined) {
      // Handle single subpath or selected commands with animation
      const segmentToSmooth = [...targetCommands];
      
      subPathTransformManager.smoothWithAnimation(segmentToSmooth, (smoothedCommands) => {
        // Create the new commands array for the entire subpath
        let newSubPathCommands = [...targetSubPath.commands];
        
        // Replace the segment range with the new smoothed commands
        const actualStartIndex = Math.max(0, startIndex!);
        const actualEndIndex = Math.min(targetSubPath.commands.length - 1, endIndex!);
        const replaceLength = actualEndIndex - actualStartIndex + 1;
        
        newSubPathCommands.splice(actualStartIndex, replaceLength, ...smoothedCommands);
        
        // Ensure the subpath ALWAYS starts with M
        if (newSubPathCommands.length > 0 && newSubPathCommands[0].command !== 'M') {
          const firstCmd = newSubPathCommands[0];
          if ('x' in firstCmd && 'y' in firstCmd) {
            newSubPathCommands[0] = {
              ...firstCmd,
              command: 'M'
            };
          }
        }
        
        // Replace all commands in the subpath
        replaceSubPathCommands(targetSubPath.id, newSubPathCommands);
      });
    }
  };

  // Simplification functionality with animation
  const handleSimplify = () => {
    const { selectedCommands, selectedSubPaths } = selection;
    
    // Determine what to simplify: selected commands OR selected subpaths (single or multiple)
    let targetSubPath: any = null;
    let targetSubPaths: any[] = [];
    let targetCommands: any[] = [];
    let startIndex: number | undefined;
    let endIndex: number | undefined;
    let canSimplify = false;
    let isMultiSubPath = false;
    
    if (selectedCommands.length >= 2) {
      // Use selected commands approach
      const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
      const result = analysisResult;
      if (result.sameSubPath && result.subPath && result.commands && result.commands.length >= 2) {
        targetSubPath = result.subPath;
        targetCommands = result.commands;
        startIndex = result.startIndex;
        endIndex = result.endIndex;
        canSimplify = true;
      }
    } else if (selectedSubPaths.length >= 1) {
      // Use selected subpath(s) approach - simplify entire subpath(s)
      if (selectedSubPaths.length === 1) {
        // Single subpath
        const subPathId = selectedSubPaths[0];
        for (const path of paths) {
          const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
          if (subPath && subPath.commands.length >= 2) {
            targetSubPath = subPath;
            targetCommands = subPath.commands;
            startIndex = 0;
            endIndex = subPath.commands.length - 1;
            canSimplify = true;
            break;
          }
        }
      } else {
        // Multiple subpaths
        for (const subPathId of selectedSubPaths) {
          for (const path of paths) {
            const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
            if (subPath && subPath.commands.length >= 2) {
              targetSubPaths.push(subPath);
            }
          }
        }
        if (targetSubPaths.length > 0) {
          canSimplify = true;
          isMultiSubPath = true;
        }
      }
    }

    if (!canSimplify) return;

    // Save current state to history before making changes
    pushToHistory();

    if (isMultiSubPath) {
      // Handle multiple sub-paths with animation
      targetSubPaths.forEach((subPath, index) => {
        if (subPath.commands.length < 2) return;
        
        const commands = subPath.commands;
        
        // Apply simplification with animation
        const delay = index * 100; // Stagger animations
        setTimeout(() => {
          subPathTransformManager.simplifyWithAnimation(commands, simplifyTolerance, (simplifiedCommands) => {
            if (simplifiedCommands.length === 0) return;

            // Ensure the subpath ALWAYS starts with M
            if (simplifiedCommands.length > 0 && simplifiedCommands[0].command !== 'M') {
              const firstCmd = simplifiedCommands[0];
              if ('x' in firstCmd && 'y' in firstCmd) {
                simplifiedCommands[0] = {
                  ...firstCmd,
                  command: 'M'
                };
              }
            }
            
            // Replace all commands in this subpath
            replaceSubPathCommands(subPath.id, simplifiedCommands);
          });
        }, delay);
      });
    } else if (targetSubPath && targetCommands && startIndex !== undefined && endIndex !== undefined) {
      // Handle single sub-path with animation
      const commandsToSimplify = [...targetCommands];
      
      subPathTransformManager.simplifyWithAnimation(commandsToSimplify, simplifyTolerance, (simplifiedCommands) => {
        if (simplifiedCommands.length === 0) return;

        // Create the new commands array for the entire subpath
        let newSubPathCommands = [...targetSubPath.commands];
        
        // Replace the selected range with simplified commands
        newSubPathCommands.splice(startIndex!, endIndex! - startIndex! + 1, ...simplifiedCommands);
        
        // Ensure the subpath ALWAYS starts with M
        if (newSubPathCommands.length > 0 && newSubPathCommands[0].command !== 'M') {
          const firstCmd = newSubPathCommands[0];
          if ('x' in firstCmd && 'y' in firstCmd) {
            newSubPathCommands[0] = {
              ...firstCmd,
              command: 'M'
            };
          }
        }
        
        // Replace all commands in the subpath
        replaceSubPathCommands(targetSubPath.id, newSubPathCommands);
      });
    }
  };

  // Check if smoothing/simplification can be applied
  const canApplySmoothing = () => {
    const { selectedCommands, selectedSubPaths } = selection;
    
    if (selectedCommands.length >= 2) {
      const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
      return analysisResult.sameSubPath && analysisResult.subPath && analysisResult.commands && analysisResult.commands.length >= 2;
    } else if (selectedSubPaths.length >= 1) {
      return selectedSubPaths.some(subPathId => {
        for (const path of paths) {
          const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
          if (subPath && subPath.commands.length >= 2) {
            return true;
          }
        }
        return false;
      });
    }
    return false;
  };

  const canApplySimplification = canApplySmoothing; // Same logic

  // Check if there are values that can be reset
  const hasValuesToReset = () => {
    return scaleX !== 1 || 
           scaleY !== 1 || 
           rotation !== 0 || 
           translateX !== 0 || 
           translateY !== 0 || 
           simplifyTolerance !== 0.1 || 
           simplifyDistance !== 10;
  };

  // Event listeners for keyboard shortcuts
  useEffect(() => {
    const handleMirrorHorizontalEvent = () => handleMirrorHorizontal();
    const handleMirrorVerticalEvent = () => handleMirrorVertical();
    const handleSmoothEvent = () => handleSmooth();
    const handleSimplifyEvent = () => handleSimplify();
    
    document.addEventListener('mirror-horizontal-trigger', handleMirrorHorizontalEvent);
    document.addEventListener('mirror-vertical-trigger', handleMirrorVerticalEvent);
    document.addEventListener('path-smoothing-trigger', handleSmoothEvent);
    document.addEventListener('path-simplification-trigger', handleSimplifyEvent);
    
    return () => {
      document.removeEventListener('mirror-horizontal-trigger', handleMirrorHorizontalEvent);
      document.removeEventListener('mirror-vertical-trigger', handleMirrorVerticalEvent);
      document.removeEventListener('path-smoothing-trigger', handleSmoothEvent);
      document.removeEventListener('path-simplification-trigger', handleSimplifyEvent);
    };
  }, [handleMirrorHorizontal, handleMirrorVertical, handleSmooth, handleSimplify]);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px'
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
            {/* Smoothing Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setSmoothingExpanded(!smoothingExpanded)}
              >
                <span style={{ transform: smoothingExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Smoothing
              </div>
              
              {smoothingExpanded && (
                <>
                  <PluginButton
                    icon={<Waves size={14} />}
                    text="Smooth"
                    color="#007acc"
                    active={false}
                    disabled={!canApplySmoothing()}
                    onPointerDown={handleSmooth}
                  />
                </>
              )}
            </div>

            {/* Simplification Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setSimplificationExpanded(!simplificationExpanded)}
              >
                <span style={{ transform: simplificationExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Simplification
              </div>
              
              {simplificationExpanded && (
                <>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Tolerance</div>
                      <input
                        type="number"
                        value={simplifyTolerance}
                        onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value) || 0.1)}
                        min="0.01"
                        max="1"
                        step="0.01"
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
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '2px' }}>Distance</div>
                      <input
                        type="number"
                        value={simplifyDistance}
                        onChange={(e) => setSimplifyDistance(parseInt(e.target.value) || 10)}
                        min="1"
                        max="50"
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
                  
                  <PluginButton
                    icon={<Minimize2 size={14} />}
                    text="Simplificate"
                    color="#007acc"
                    active={false}
                    disabled={!canApplySimplification()}
                    onPointerDown={handleSimplify}
                  />
                </>
              )}
            </div>

            {/* Scale Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setScaleExpanded(!scaleExpanded)}
              >
                <span style={{ transform: scaleExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Scale
              </div>
              
              {scaleExpanded && (
                <>
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
                    icon={<Maximize2 size={14} />}
                    text="Scale"
                    color="#007acc"
                    active={false}
                    disabled={false}
                    onPointerDown={handleScale}
                  />
                </>
              )}
            </div>

            {/* Rotation Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setRotationExpanded(!rotationExpanded)}
              >
                <span style={{ transform: rotationExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Rotation
              </div>
              
              {rotationExpanded && (
                <>
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
                        onPointerDown={() => setRotation(angle)}
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
                    text="Rotate"
                    color="#007acc"
                    active={false}
                    disabled={false}
                    onPointerDown={handleRotate}
                  />
                </>
              )}
            </div>

            {/* Translation Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setTranslationExpanded(!translationExpanded)}
              >
                <span style={{ transform: translationExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Translation
              </div>
              
              {translationExpanded && (
                <>
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
                    gap: '2px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onPointerDown={() => { setTranslateX(0); setTranslateY(-10); }}
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
                    <button
                      onPointerDown={() => { setTranslateX(-10); setTranslateY(0); }}
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
                      onPointerDown={() => { setTranslateX(10); setTranslateY(0); }}
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
                    <button
                      onPointerDown={() => { setTranslateX(0); setTranslateY(10); }}
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
                    text="Translate"
                    color="#007acc"
                    active={false}
                    disabled={false}
                    onPointerDown={handleTranslate}
                  />
                </>
              )}
            </div>

            {/* Mirroring Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onPointerDown={() => setMirrorExpanded(!mirrorExpanded)}
              >
                <span style={{ transform: mirrorExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                Mirroring
              </div>
              
              {mirrorExpanded && (
                <>
                  <PluginButton
                    icon={<FlipHorizontal size={14} />}
                    text="Mirror Horizontal"
                    color="#007acc"
                    active={false}
                    disabled={false}
                    onPointerDown={handleMirrorHorizontal}
                  />
                  
                  <PluginButton
                    icon={<FlipVertical size={14} />}
                    text="Mirror Vertical"
                    color="#007acc"
                    active={false}
                    disabled={false}
                    onPointerDown={handleMirrorVertical}
                  />
                </>
              )}
            </div>

            {/* Reset Section - Only visible when there are values to reset */}
            {hasValuesToReset() && (
                <PluginButton
                  icon={<RotateCcw size={14} />}
                  text="Reset Values"
                  color="#6c757d"
                  active={false}
                  disabled={false}
                  onPointerDown={resetTransforms}
                />
            )}
          </>
        )}
      </div>
    </div>
  );
};
