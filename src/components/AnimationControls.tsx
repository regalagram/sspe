import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { Play, Pause, RotateCcw, Plus } from 'lucide-react';
import { createLinearGradient } from '../utils/gradient-utils';

export const AnimationControls: React.FC = () => {
  const { 
    animations, 
    animationState, 
    selection,
    filters,
    gradients,
    paths,
    texts,
    playAnimations, 
    pauseAnimations, 
    stopAnimations,
    addAnimation,
    updateAnimation,
    removeAnimation,
    createFadeAnimation,
    createMoveAnimation,
    createRotateAnimation,
    createScaleAnimation,
    createFilterBlurAnimation,
    createFilterOffsetAnimation,
    createFilterColorMatrixAnimation,
    createFilterFloodAnimation,
    createSetAnimation,
    createGradientStopAnimation,
    createGradientPositionAnimation,
    createAnimateMotionWithMPath,
    createAnimationChain,
    createPositionAnimation,
    createSizeAnimation,
    createCircleAnimation,
    createPathDataAnimation,
    createLineAnimation,
    createLinearGradientAnimation,
    createRadialGradientAnimation,
    createGradientStopOffsetAnimation,
    createPatternAnimation,
    createPatternTransformAnimation,
    createFontSizeAnimation,
    createTextPositionAnimation,
    createFontWeightAnimation,
    createLetterSpacingAnimation,
    createViewBoxAnimation,
    addGradient,
    updateTextStyle,
    updatePathStyle,
  } = useEditorStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAnimation, setEditingAnimation] = useState<any>(null);
  
  // Core animation properties
  const [animationType, setAnimationType] = useState<'animate' | 'animateMotion' | 'animateTransform' | 'set'>('animate');
  const [duration, setDuration] = useState(2);
  const [attributeName, setAttributeName] = useState('opacity');
  
  // Value properties
  const [fromValue, setFromValue] = useState('0');
  const [toValue, setToValue] = useState('1');
  const [valuesString, setValuesString] = useState('');
  const [useValues, setUseValues] = useState(false);
  
  // Timing properties
  const [beginTime, setBeginTime] = useState('0s');
  const [endTime, setEndTime] = useState('');
  const [repeatCount, setRepeatCount] = useState<string>('indefinite');
  const [repeatDur, setRepeatDur] = useState('');
  
  // Animation behavior
  const [fillMode, setFillMode] = useState<'freeze' | 'remove'>('freeze');
  const [calcMode, setCalcMode] = useState<'linear' | 'discrete' | 'paced' | 'spline'>('linear');
  const [keyTimes, setKeyTimes] = useState('');
  const [keySplines, setKeySplines] = useState('');
  
  // Transform-specific
  const [transformType, setTransformType] = useState<'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY'>('translate');
  const [additive, setAdditive] = useState<'replace' | 'sum'>('replace');
  const [accumulate, setAccumulate] = useState<'none' | 'sum'>('none');
  
  // Motion-specific
  const [pathData, setPathData] = useState('M 0,0 L 100,0');
  const [rotate, setRotate] = useState<'auto' | 'auto-reverse' | string>('auto');
  const [mpathRef, setMpathRef] = useState(''); // For mpath reference
  
  // Advanced properties
  const [attributeType, setAttributeType] = useState<'CSS' | 'XML' | 'auto'>('auto');
  const [byValue, setByValue] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [restartMode, setRestartMode] = useState<'always' | 'whenNotActive' | 'never'>('always');
  const [keyPoints, setKeyPoints] = useState(''); // For animateMotion
  
  // Set animation specific
  const [setToValueState, setSetToValueState] = useState('');
  
  
  // Synchronization
  const [chainName, setChainName] = useState('');
  const [selectedAnimationsForChain, setSelectedAnimationsForChain] = useState<string[]>([]);

  const handlePlayPause = () => {
    if (animationState.isPlaying) {
      pauseAnimations();
    } else {
      playAnimations();
    }
  };

  const handleStop = () => {
    stopAnimations();
  };

  const handleCreateAnimation = () => {
    const targetId = getAnimationTargetId();
    
    if (!targetId) {
      alert('Please select an element to animate');
      return;
    }

    const animationData = {
      type: animationType,
      targetElementId: targetId,
      attributeName,
      dur: `${duration}s`,
      values: animationType === 'animateMotion' ? 'M 0,0 L 100,0' : undefined,
      from: animationType === 'animateMotion' ? undefined : fromValue,
      to: animationType === 'animateMotion' ? undefined : toValue,
      path: animationType === 'animateMotion' ? 'M 0,0 L 100,0' : undefined,
      repeatCount: 'indefinite',
      ...(animationType === 'animateTransform' && { transformType: 'translate' })
    };

    addAnimation(animationData);
    setShowCreateForm(false);
  };

  const getAnimationTargetId = () => {
    const { paths, texts } = useEditorStore.getState();
    
    // If a text is directly selected, use it
    if (selection.selectedTexts.length > 0) {
      return selection.selectedTexts[0];
    }
    
    // If a path is directly selected, use it
    if (selection.selectedPaths.length > 0) {
      return selection.selectedPaths[0];
    }
    
    // If a subpath is selected, find the parent path
    if (selection.selectedSubPaths.length > 0) {
      const subPathId = selection.selectedSubPaths[0];
      const parentPath = paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      return parentPath?.id || subPathId; // Fallback to subpath if parent not found
    }
    
    // If a command is selected, find the parent path
    if (selection.selectedCommands.length > 0) {
      const commandId = selection.selectedCommands[0];
      for (const path of paths) {
        for (const subPath of path.subPaths) {
          if (subPath.commands.some(cmd => cmd.id === commandId)) {
            return path.id;
          }
        }
      }
    }
    
    return null;
  };

  const handleGradientAnimation = (elementId: string) => {
    // Create a new gradient for the element
    const timestamp = Date.now();
    const stop1Id = `stop-1-${timestamp}`;
    const stop2Id = `stop-2-${timestamp}`;
    
    const gradient = createLinearGradient(0, 0, 100, 0, [
      { id: stop1Id, offset: 0, color: '#0000ff', opacity: 1 },
      { id: stop2Id, offset: 100, color: '#00ffff', opacity: 1 }
    ]);
    
    // Add the gradient to the store
    addGradient(gradient);
    
    // Apply the gradient to the element
    const isText = texts.some(text => text.id === elementId);
    if (isText) {
      updateTextStyle(elementId, { fill: gradient });
    } else {
      updatePathStyle(elementId, { fill: gradient });
    }
    
    // Create enhanced gradient animations with color changes and movement
    // Animate stop colors
    addAnimation({
      type: 'animate',
      targetElementId: stop1Id,
      attributeName: 'stop-color',
      values: '#00f;#0ff;#00f',
      dur: '3s',
      repeatCount: 'indefinite',
    });
    
    addAnimation({
      type: 'animate',
      targetElementId: stop2Id,
      attributeName: 'stop-color',
      values: '#0ff;#00f;#0ff',
      dur: '3s',
      repeatCount: 'indefinite',
    });
    
    // Animate gradient position
    addAnimation({
      type: 'animate',
      targetElementId: gradient.id,
      attributeName: 'x1',
      values: '0%;100%;0%',
      dur: '3s',
      repeatCount: 'indefinite',
    });
    
    addAnimation({
      type: 'animate',
      targetElementId: gradient.id,
      attributeName: 'y1',
      values: '0%;100%;0%',
      dur: '3s',
      repeatCount: 'indefinite',
    });
    
    addAnimation({
      type: 'animate',
      targetElementId: gradient.id,
      attributeName: 'x2',
      values: '100%;0%;100%',
      dur: '3s',
      repeatCount: 'indefinite',
    });
    
    addAnimation({
      type: 'animate',
      targetElementId: gradient.id,
      attributeName: 'y2',
      values: '0%;100%;0%',
      dur: '3s',
      repeatCount: 'indefinite',
    });
  };

  const handleQuickAnimation = (type: 'fade' | 'move' | 'rotate' | 'scale' | 'blur' | 'offset' | 'colorMatrix' | 'viewBox' | 'position' | 'size' | 'circle' | 'line' | 'gradient' | 'pattern' | 'textPosition' | 'fontSize' | 'fontWeight' | 'letterSpacing') => {
    const targetId = getAnimationTargetId();
    
    if (type !== 'viewBox' && !targetId) {
      alert('Please select an element to animate');
      return;
    }

    switch (type) {
      case 'fade':
        createFadeAnimation(targetId!, '2s');
        break;
      case 'move':
        createMoveAnimation(targetId!, '2s', 0, 0, 100, 0);
        break;
      case 'rotate':
        createRotateAnimation(targetId!, '2s', '360');
        break;
      case 'scale':
        createScaleAnimation(targetId!, '2s');
        break;
      case 'blur':
        createFilterBlurAnimation(targetId!, '2s', 0, 5);
        break;
      case 'offset':
        createFilterOffsetAnimation(targetId!, '2s', 0, 0, 10, 10);
        break;
      case 'colorMatrix':
        createFilterColorMatrixAnimation(targetId!, '2s');
        break;
      case 'viewBox':
        createViewBoxAnimation('3s', '0 0 100 100', '0 0 200 200');
        break;
      case 'position':
        createPositionAnimation(targetId!, '2s', 0, 0, 100, 100);
        break;
      case 'size':
        createSizeAnimation(targetId!, '2s', 50, 50, 100, 100);
        break;
      case 'circle':
        createCircleAnimation(targetId!, '2s', 10, 50);
        break;
      case 'line':
        createLineAnimation(targetId!, '2s', 0, 0, 50, 50, 100, 100, 150, 150);
        break;
      case 'gradient':
        // For gradient animation, we need to create/find a gradient for the element
        // and animate the gradient, not the element itself
        handleGradientAnimation(targetId!);
        break;
      case 'pattern':
        createPatternAnimation(targetId!, '2s', 10, 10, 50, 50);
        break;
      case 'textPosition':
        createTextPositionAnimation(targetId!, '2s', 0, 0, 100, 100);
        break;
      case 'fontSize':
        createFontSizeAnimation(targetId!, '2s', 16, 32);
        break;
      case 'fontWeight':
        createFontWeightAnimation(targetId!, '2s', 'normal', 'bold');
        break;
      case 'letterSpacing':
        createLetterSpacingAnimation(targetId!, '2s', 0, 5);
        break;
    }
  };

  const handleEditAnimation = (animation: any) => {
    setEditingAnimation(animation);
    
    // Core properties
    setAnimationType(animation.type);
    setDuration(parseFloat(animation.dur) || 2);
    setAttributeName(animation.attributeName || 'opacity');
    
    // Value properties
    if (animation.values) {
      setUseValues(true);
      setValuesString(animation.values);
      setFromValue('');
      setToValue('');
    } else {
      setUseValues(false);
      setFromValue(animation.from || '0');
      setToValue(animation.to || '1');
      setValuesString('');
    }
    
    // Timing properties
    setBeginTime(animation.begin || '0s');
    setEndTime(animation.end || '');
    setRepeatCount(animation.repeatCount?.toString() || 'indefinite');
    setRepeatDur(animation.repeatDur || '');
    
    // Animation behavior
    setFillMode(animation.fill || 'freeze');
    setCalcMode(animation.calcMode || 'linear');
    setKeyTimes(animation.keyTimes || '');
    setKeySplines(animation.keySplines || '');
    
    // Transform-specific
    if (animation.type === 'animateTransform') {
      setTransformType(animation.transformType || 'translate');
      setAdditive(animation.additive || 'replace');
      setAccumulate(animation.accumulate || 'none');
    }
    
    // Motion-specific
    if (animation.type === 'animateMotion') {
      setPathData(animation.path || 'M 0,0 L 100,0');
      setRotate(animation.rotate || 'auto');
    }
    
    setShowEditForm(true);
    setShowCreateForm(false);
  };

  const handleUpdateAnimation = () => {
    if (!editingAnimation) return;

    const updates: any = {
      type: animationType,
      dur: `${duration}s`,
      
      // Timing properties
      begin: beginTime,
      end: endTime || undefined,
      repeatCount: repeatCount === 'indefinite' ? 'indefinite' : (parseFloat(repeatCount) || 1),
      repeatDur: repeatDur || undefined,
      
      // Animation behavior
      fill: fillMode,
      calcMode,
      keyTimes: keyTimes || undefined,
      keySplines: (calcMode === 'spline' && keySplines) ? keySplines : undefined,
    };

    // Type-specific properties
    if (animationType === 'animate') {
      updates.attributeName = attributeName;
      if (useValues) {
        updates.values = valuesString;
        updates.from = undefined;
        updates.to = undefined;
      } else {
        updates.from = fromValue;
        updates.to = toValue;
        updates.values = undefined;
      }
    } else if (animationType === 'animateTransform') {
      updates.attributeName = 'transform';
      updates.transformType = transformType;
      updates.additive = additive;
      updates.accumulate = accumulate;
      if (useValues) {
        updates.values = valuesString;
        updates.from = undefined;
        updates.to = undefined;
      } else {
        updates.from = fromValue;
        updates.to = toValue;
        updates.values = undefined;
      }
    } else if (animationType === 'animateMotion') {
      updates.path = pathData;
      updates.rotate = rotate === 'auto' || rotate === 'auto-reverse' ? rotate : parseFloat(rotate) || 0;
      updates.attributeName = undefined;
      updates.from = undefined;
      updates.to = undefined;
      updates.values = undefined;
    }

    updateAnimation(editingAnimation.id, updates);
    setShowEditForm(false);
    setEditingAnimation(null);
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingAnimation(null);
  };

  // Get available attributes based on animation type and selected element
  const getAvailableAttributes = (type: string) => {
    const targetId = getAnimationTargetId();
    const isTextElement = targetId && texts.some(text => text.id === targetId);
    
    switch (type) {
      case 'animate':
        const baseAttributes = [
          { value: 'opacity', label: 'Opacity' },
          { value: 'fill', label: 'Fill Color' },
          { value: 'fill-opacity', label: 'Fill Opacity' },
          { value: 'stroke', label: 'Stroke Color' },
          { value: 'stroke-width', label: 'Stroke Width' },
          { value: 'stroke-opacity', label: 'Stroke Opacity' },
          { value: 'stroke-dasharray', label: 'Stroke Dash Array' },
          { value: 'stroke-dashoffset', label: 'Stroke Dash Offset' },
          // Filter-related attributes
          { value: 'stdDeviation', label: 'Blur Standard Deviation' },
          { value: 'dx', label: 'X Offset (filter)' },
          { value: 'dy', label: 'Y Offset (filter)' },
          { value: 'flood-color', label: 'Flood Color (filter)' },
          { value: 'flood-opacity', label: 'Flood Opacity (filter)' },
          { value: 'values', label: 'Color Matrix Values (filter)' },
          { value: 'lighting-color', label: 'Lighting Color (filter)' },
          // Gradient-related attributes
          { value: 'x1', label: 'Gradient X1' },
          { value: 'y1', label: 'Gradient Y1' },
          { value: 'x2', label: 'Gradient X2' },
          { value: 'y2', label: 'Gradient Y2' },
          { value: 'cx', label: 'Gradient Center X' },
          { value: 'cy', label: 'Gradient Center Y' },
          { value: 'r', label: 'Gradient Radius' },
          { value: 'stop-color', label: 'Gradient Stop Color' },
          { value: 'offset', label: 'Gradient Stop Offset' },
        ];
        
        if (isTextElement) {
          // Text-specific attributes
          return [
            ...baseAttributes,
            { value: 'x', label: 'X Position' },
            { value: 'y', label: 'Y Position' },
            { value: 'font-size', label: 'Font Size' },
            { value: 'font-family', label: 'Font Family' },
            { value: 'font-weight', label: 'Font Weight' },
            { value: 'font-style', label: 'Font Style' },
            { value: 'text-anchor', label: 'Text Anchor' },
            { value: 'dominant-baseline', label: 'Dominant Baseline' },
            { value: 'alignment-baseline', label: 'Alignment Baseline' },
            { value: 'baseline-shift', label: 'Baseline Shift' },
            { value: 'letter-spacing', label: 'Letter Spacing' },
            { value: 'word-spacing', label: 'Word Spacing' },
            { value: 'text-decoration', label: 'Text Decoration' },
          ];
        } else {
          // Non-text elements (paths, shapes, etc.)
          return [
            ...baseAttributes,
            { value: 'cx', label: 'Center X (circle/ellipse)' },
            { value: 'cy', label: 'Center Y (circle/ellipse)' },
            { value: 'r', label: 'Radius (circle)' },
            { value: 'rx', label: 'Radius X (ellipse/rect)' },
            { value: 'ry', label: 'Radius Y (ellipse/rect)' },
            { value: 'x', label: 'X Position (rect)' },
            { value: 'y', label: 'Y Position (rect)' },
            { value: 'width', label: 'Width (rect)' },
            { value: 'height', label: 'Height (rect)' },
            { value: 'x1', label: 'X1 (line)' },
            { value: 'y1', label: 'Y1 (line)' },
            { value: 'x2', label: 'X2 (line)' },
            { value: 'y2', label: 'Y2 (line)' },
            { value: 'd', label: 'Path Data (path)' },
          ];
        }
      case 'animateTransform':
        return [
          { value: 'translate', label: 'Translate (move)' },
          { value: 'scale', label: 'Scale (resize)' },
          { value: 'rotate', label: 'Rotate' },
          { value: 'skewX', label: 'Skew X' },
          { value: 'skewY', label: 'Skew Y' },
        ];
      default:
        return [];
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    margin: '2px',
    fontSize: '11px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff'
  };

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Playback Controls
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <button 
            style={animationState.isPlaying ? activeButtonStyle : buttonStyle}
            onClick={handlePlayPause}
          >
            {animationState.isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {animationState.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button style={buttonStyle} onClick={handleStop}>
            <RotateCcw size={14} />
            Stop
          </button>
        </div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          Status: {animationState.isPlaying ? 'Playing' : 'Stopped'}
          {animationState.currentTime > 0 && ` (${animationState.currentTime.toFixed(1)}s)`}
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Quick Animations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('fade')}
            title="Fade In/Out animation - Changes opacity from 1 to 0.5. Works on all elements."
          >
            Fade In/Out
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('move')}
            title="Move animation - Translates element from one position to another. Works on all elements."
          >
            Move
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('rotate')}
            title="Rotate animation - Rotates element 360 degrees around its center. Works on all elements."
          >
            Rotate
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('scale')}
            title="Scale animation - Changes element size from 1 to 1.5. Works on all elements."
          >
            Scale
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('blur')}
            title="Blur animation - Animates gaussian blur stdDeviation from 0 to 5. Works on all elements."
          >
            Blur
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('offset')}
            title="Shadow animation - Animates filter offset to create shadow effect. Works on all elements."
          >
            Shadow
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('colorMatrix')}
            title="Color Shift animation - Animates color matrix values for color effects. Works on all elements."
          >
            Color Shift
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('viewBox')}
            title="Zoom animation - Animates SVG viewBox for zoom effect. Works on entire viewport."
          >
            Zoom
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('position')}
            title="Position animation - Animates X/Y coordinates. Works on shapes and text elements."
          >
            Position
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('size')}
            title="Size animation - Animates width/height properties. Works on rectangles and shapes."
          >
            Size
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('circle')}
            title="Circle animation - Animates radius property. Works specifically on circle elements."
          >
            Circle
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('line')}
            title="Line animation - Animates line endpoints (x1,y1,x2,y2). Works on line elements."
          >
            Line
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('gradient')}
            title="Gradient animation - Creates animated gradient with color and position changes. Works on all elements."
          >
            Gradient
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('pattern')}
            title="Pattern animation - Animates pattern transform and attributes. Works on elements with patterns."
          >
            Pattern
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('textPosition')}
            title="Text Position animation - Animates text X/Y coordinates. Works on text elements only."
          >
            Text Position
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('fontSize')}
            title="Font Size animation - Animates font-size from 12px to 24px. Works on text elements only."
          >
            Font Size
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('fontWeight')}
            title="Font Weight animation - Animates font-weight from normal to bold. Works on text elements only."
          >
            Font Weight
          </button>
          <button 
            style={buttonStyle} 
            onClick={() => handleQuickAnimation('letterSpacing')}
            title="Letter Spacing animation - Animates letter-spacing from 0 to 5px. Works on text elements only."
          >
            Letter Spacing
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Create Animation
        </div>
        <button 
          style={showCreateForm ? activeButtonStyle : buttonStyle}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={14} />
          {showCreateForm ? 'Hide Form' : 'Custom Animation'}
        </button>

        {showCreateForm && (
          <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                Animation Type:
              </label>
              <select 
                value={animationType} 
                onChange={(e) => setAnimationType(e.target.value as any)}
                style={{ width: '100%', padding: '4px', fontSize: '10px' }}
              >
                <option value="animate">Animate</option>
                <option value="animateMotion">Animate Motion</option>
                <option value="animateTransform">Animate Transform</option>
                <option value="set">Set (discrete)</option>
              </select>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                Duration (seconds):
              </label>
              <input 
                type="number" 
                value={duration} 
                onChange={(e) => setDuration(Number(e.target.value))}
                min="0.1"
                step="0.1"
                style={{ width: '100%', padding: '4px', fontSize: '10px' }}
              />
            </div>

            {animationType !== 'animateMotion' && (
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {animationType === 'animateTransform' ? 'Transform Type:' : 'Attribute:'}
                </label>
                <select 
                  value={animationType === 'animateTransform' ? transformType : attributeName} 
                  onChange={(e) => animationType === 'animateTransform' ? setTransformType(e.target.value as any) : setAttributeName(e.target.value)}
                  style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                >
                  {(animationType === 'animate' || animationType === 'set') && (
                    <>
                      <option value="opacity">Opacity</option>
                      <option value="fill">Fill</option>
                      <option value="stroke">Stroke</option>
                      <option value="stroke-width">Stroke Width</option>
                      <option value="cx">Center X (circle)</option>
                      <option value="cy">Center Y (circle)</option>
                      <option value="r">Radius (circle)</option>
                      <option value="rx">Radius X (ellipse/rect)</option>
                      <option value="ry">Radius Y (ellipse/rect)</option>
                      <option value="x">X Position</option>
                      <option value="y">Y Position</option>
                      <option value="width">Width</option>
                      <option value="height">Height</option>
                      <option value="x1">X1 (line)</option>
                      <option value="y1">Y1 (line)</option>
                      <option value="x2">X2 (line)</option>
                      <option value="y2">Y2 (line)</option>
                      <option value="d">Path Data</option>
                      <option value="pathLength">Path Length</option>
                      <option value="transform">Transform</option>
                    </>
                  )}
                  {animationType === 'animateTransform' && (
                    <>
                      <option value="translate">Translate</option>
                      <option value="rotate">Rotate</option>
                      <option value="scale">Scale</option>
                      <option value="skewX">Skew X</option>
                      <option value="skewY">Skew Y</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  From:
                </label>
                <input 
                  type="text" 
                  value={fromValue} 
                  onChange={(e) => setFromValue(e.target.value)}
                  style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  To:
                </label>
                <input 
                  type="text" 
                  value={toValue} 
                  onChange={(e) => setToValue(e.target.value)}
                  style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                />
              </div>
            </div>

            <button 
              style={{...buttonStyle, width: '100%', justifyContent: 'center'}}
              onClick={handleCreateAnimation}
            >
              Create Animation
            </button>
          </div>
        )}

        {showEditForm && editingAnimation && (
          <div style={{ marginTop: '8px', padding: '8px', border: '1px solid #007bff', borderRadius: '4px', backgroundColor: '#f0f8ff', maxHeight: '400px', overflow: 'auto' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '11px', color: '#007bff' }}>
              Edit Animation - {editingAnimation.type}
            </div>
            
            {/* Basic Properties */}
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Basic Properties</div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  Animation Type:
                </label>
                <select 
                  value={animationType} 
                  onChange={(e) => setAnimationType(e.target.value as any)}
                  style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                >
                  <option value="animate">Animate</option>
                  <option value="animateMotion">Animate Motion</option>
                  <option value="animateTransform">Animate Transform</option>
                </select>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  Duration (seconds):
                </label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min="0.1"
                  step="0.1"
                  style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                />
              </div>

              {animationType === 'animate' && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Attribute:
                  </label>
                  <select 
                    value={attributeName} 
                    onChange={(e) => setAttributeName(e.target.value)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  >
                    {getAvailableAttributes('animate').map(attr => (
                      <option key={attr.value} value={attr.value}>{attr.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {animationType === 'animateTransform' && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Transform Type:
                  </label>
                  <select 
                    value={transformType} 
                    onChange={(e) => setTransformType(e.target.value as any)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  >
                    {getAvailableAttributes('animateTransform').map(attr => (
                      <option key={attr.value} value={attr.value}>{attr.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Value Properties */}
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Animation Values</div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                  <input 
                    type="checkbox" 
                    checked={useValues} 
                    onChange={(e) => setUseValues(e.target.checked)}
                  />
                  Use Values String (semicolon-separated)
                </label>
              </div>

              {useValues ? (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Values:
                  </label>
                  <input 
                    type="text" 
                    value={valuesString} 
                    onChange={(e) => setValuesString(e.target.value)}
                    placeholder="0;0.5;1;0.5;0"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
              ) : (
                animationType !== 'animateMotion' && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        From:
                      </label>
                      <input 
                        type="text" 
                        value={fromValue} 
                        onChange={(e) => setFromValue(e.target.value)}
                        style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        To:
                      </label>
                      <input 
                        type="text" 
                        value={toValue} 
                        onChange={(e) => setToValue(e.target.value)}
                        style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                      />
                    </div>
                  </div>
                )
              )}

              {animationType === 'animateMotion' && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Path Data:
                  </label>
                  <input 
                    type="text" 
                    value={pathData} 
                    onChange={(e) => setPathData(e.target.value)}
                    placeholder="M 0,0 L 100,0 L 100,100 L 0,100 Z"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
              )}
            </div>

            {/* Timing Properties */}
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Timing Properties</div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Begin Time:
                  </label>
                  <input 
                    type="text" 
                    value={beginTime} 
                    onChange={(e) => setBeginTime(e.target.value)}
                    placeholder="0s"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    End Time:
                  </label>
                  <input 
                    type="text" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10s (optional)"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Repeat Count:
                  </label>
                  <input 
                    type="text" 
                    value={repeatCount} 
                    onChange={(e) => setRepeatCount(e.target.value)}
                    placeholder="indefinite or number"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Repeat Duration:
                  </label>
                  <input 
                    type="text" 
                    value={repeatDur} 
                    onChange={(e) => setRepeatDur(e.target.value)}
                    placeholder="10s (optional)"
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  />
                </div>
              </div>
            </div>

            {/* Animation Behavior */}
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Animation Behavior</div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Fill Mode:
                  </label>
                  <select 
                    value={fillMode} 
                    onChange={(e) => setFillMode(e.target.value as any)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  >
                    <option value="freeze">Freeze (keep final value)</option>
                    <option value="remove">Remove (reset to original)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Calc Mode:
                  </label>
                  <select 
                    value={calcMode} 
                    onChange={(e) => setCalcMode(e.target.value as any)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  >
                    <option value="linear">Linear</option>
                    <option value="discrete">Discrete (step)</option>
                    <option value="paced">Paced</option>
                    <option value="spline">Spline (bezier)</option>
                  </select>
                </div>
              </div>

              {calcMode === 'spline' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      Key Times:
                    </label>
                    <input 
                      type="text" 
                      value={keyTimes} 
                      onChange={(e) => setKeyTimes(e.target.value)}
                      placeholder="0;0.5;1"
                      style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      Key Splines:
                    </label>
                    <input 
                      type="text" 
                      value={keySplines} 
                      onChange={(e) => setKeySplines(e.target.value)}
                      placeholder="0.25 0 0.75 1;0.25 0 0.75 1"
                      style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transform-specific Properties */}
            {animationType === 'animateTransform' && (
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Transform Properties</div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      Additive:
                    </label>
                    <select 
                      value={additive} 
                      onChange={(e) => setAdditive(e.target.value as any)}
                      style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                    >
                      <option value="replace">Replace (default)</option>
                      <option value="sum">Sum (add to existing)</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      Accumulate:
                    </label>
                    <select 
                      value={accumulate} 
                      onChange={(e) => setAccumulate(e.target.value as any)}
                      style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                    >
                      <option value="none">None (default)</option>
                      <option value="sum">Sum (accumulate repeats)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Motion-specific Properties */}
            {animationType === 'animateMotion' && (
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>Motion Properties</div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                    Rotate:
                  </label>
                  <select 
                    value={rotate} 
                    onChange={(e) => setRotate(e.target.value)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px' }}
                  >
                    <option value="auto">Auto (follow path direction)</option>
                    <option value="auto-reverse">Auto-reverse (opposite direction)</option>
                    <option value="0">0 degrees (no rotation)</option>
                    <option value="90">90 degrees</option>
                    <option value="180">180 degrees</option>
                    <option value="270">270 degrees</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
              <button 
                style={{...buttonStyle, flex: 1, justifyContent: 'center', backgroundColor: '#007bff', color: 'white', border: '1px solid #007bff'}}
                onClick={handleUpdateAnimation}
              >
                Update Animation
              </button>
              <button 
                style={{...buttonStyle, flex: 1, justifyContent: 'center'}}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Animations ({animations.length})
        </div>
        {animations.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
            No animations created yet
          </div>
        ) : (
          <div style={{ maxHeight: '120px', overflow: 'auto' }}>
            {animations.map((anim, index) => (
              <div key={anim.id} style={{ 
                padding: '4px 8px', 
                margin: '2px 0', 
                backgroundColor: '#f0f0f0', 
                borderRadius: '3px',
                fontSize: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{anim.type}</div>
                    <div>Target: {(anim as any).targetElementId}</div>
                    <div>Duration: {anim.dur}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '8px',
                        cursor: 'pointer',
                        color: '#007bff'
                      }}
                      onClick={() => handleEditAnimation(anim)}
                      title="Edit animation"
                    >
                      Edit
                    </button>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid #dc3545',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '8px',
                        cursor: 'pointer',
                        color: '#dc3545'
                      }}
                      onClick={() => removeAnimation(anim.id)}
                      title="Remove animation"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};