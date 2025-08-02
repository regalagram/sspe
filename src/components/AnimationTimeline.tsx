import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export const AnimationTimeline: React.FC = () => {
  const { 
    animations, 
    animationState, 
    playAnimations,
    pauseAnimations,
    stopAnimations,
    setAnimationTime,
    removeAnimation,
    calculateChainDelays
  } = useEditorStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Calculate chain delays for timeline visualization
  const chainDelays = calculateChainDelays();
  
  // Calculate timeline width and position including chain delays
  const timelineWidth = 180; // pixels
  const animationDurations = animations.map(anim => {
    const duration = parseFloat(anim.dur || '2s') || 2;
    const chainDelay = (chainDelays.get(anim.id) || 0) / 1000; // Convert ms to seconds
    return chainDelay + duration;
  });
  const maxDuration = Math.max(5, ...animationDurations); // minimum 5 seconds
  const currentTimePosition = (animationState.currentTime / maxDuration) * timelineWidth;

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / timelineWidth) * maxDuration;
    
    setAnimationTime(Math.max(0, Math.min(maxDuration, newTime)));
  };

  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newTime = (newX / timelineWidth) * maxDuration;
      
      setAnimationTime(Math.max(0, Math.min(maxDuration, newTime)));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, maxDuration, timelineWidth, setAnimationTime]);

  const formatTime = (time: number) => {
    return `${time.toFixed(1)}s`;
  };

  const handleSkipBack = () => {
    setAnimationTime(Math.max(0, animationState.currentTime - 0.5));
  };

  const handleSkipForward = () => {
    setAnimationTime(Math.min(maxDuration, animationState.currentTime + 0.5));
  };

  const handlePlayPause = () => {
    if (animationState.isPlaying) {
      pauseAnimations();
    } else {
      playAnimations();
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    margin: '1px',
    fontSize: '10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    gap: '3px'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff'
  };

  return (
    <div style={{ fontSize: '12px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
        Timeline ({formatTime(maxDuration)})
      </div>

      {/* Playback Controls */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px', justifyContent: 'center' }}>
        <button style={buttonStyle} onClick={handleSkipBack}>
          <SkipBack size={12} />
        </button>
        <button 
          style={animationState.isPlaying ? activeButtonStyle : buttonStyle}
          onClick={handlePlayPause}
        >
          {animationState.isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button style={buttonStyle} onClick={handleSkipForward}>
          <SkipForward size={12} />
        </button>
        <button style={buttonStyle} onClick={stopAnimations}>
          Stop
        </button>
      </div>

      {/* Timeline Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666', marginBottom: '4px' }}>
          <span>0s</span>
          <span>{formatTime(maxDuration / 2)}</span>
          <span>{formatTime(maxDuration)}</span>
        </div>
        
        <div 
          ref={timelineRef}
          style={{
            position: 'relative',
            width: `${timelineWidth}px`,
            height: '20px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            margin: '0 auto'
          }}
          onClick={handleTimelineClick}
        >
          {/* Animation Bars with Chain Delays */}
          {animations.map((anim, index) => {
            const duration = parseFloat(anim.dur || '2s') || 2;
            const chainDelay = (chainDelays.get(anim.id) || 0) / 1000; // Convert ms to seconds
            const startPosition = (chainDelay / maxDuration) * timelineWidth;
            const width = (duration / maxDuration) * timelineWidth;
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
            
            return (
              <div key={anim.id}>
                {/* Chain Delay indicator (if any) */}
                {chainDelay > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: `${2 + index * 3}px`,
                      width: `${startPosition}px`,
                      height: '2px',
                      backgroundColor: '#ddd',
                      borderRadius: '1px',
                      opacity: 0.5,
                      borderRight: '1px dashed #999'
                    }}
                    title={`Delay: ${chainDelay.toFixed(1)}s`}
                  />
                )}
                
                {/* Animation Bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${startPosition}px`,
                    top: `${2 + index * 3}px`,
                    width: `${width}px`,
                    height: '2px',
                    backgroundColor: colors[index % colors.length],
                    borderRadius: '1px',
                    opacity: 0.8
                  }}
                  title={`${anim.type} - ${(anim as any).targetElementId}\nDelay: ${chainDelay.toFixed(1)}s, Duration: ${anim.dur || '2s'}`}
                />
              </div>
            );
          })}
          
          {/* Current Time Scrubber */}
          <div
            ref={scrubberRef}
            style={{
              position: 'absolute',
              left: `${currentTimePosition}px`,
              top: '0',
              width: '2px',
              height: '100%',
              backgroundColor: '#007bff',
              cursor: isDragging ? 'grabbing' : 'grab',
              zIndex: 10
            }}
            onPointerDown={handleScrubberPointerDown}
          >
            {/* Scrubber Handle */}
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                left: '-4px',
                width: '10px',
                height: '6px',
                backgroundColor: '#007bff',
                borderRadius: '2px',
                cursor: 'inherit'
              }}
            />
          </div>
        </div>
        
        <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '4px' }}>
          Current: {formatTime(animationState.currentTime)}
        </div>
      </div>

      {/* Animation List */}
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#333', fontSize: '11px' }}>
          Active Animations
        </div>
        {animations.length === 0 ? (
          <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
            No animations in timeline
          </div>
        ) : (
          <div style={{ maxHeight: '100px', overflow: 'auto' }}>
            {animations.map((anim, index) => {
              const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
              
              return (
                <div 
                  key={anim.id} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3px 6px', 
                    margin: '1px 0', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '3px',
                    fontSize: '9px',
                    borderLeft: `3px solid ${colors[index % colors.length]}`
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{anim.type}</div>
                    <div style={{ color: '#666' }}>
                      {(anim as any).targetElementId && (anim as any).targetElementId.length > 15 
                        ? `${(anim as any).targetElementId.substring(0, 15)}...` 
                        : (anim as any).targetElementId
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: '8px', color: '#666' }}>
                    {anim.dur || '2s'}
                  </div>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      padding: '2px',
                      fontSize: '10px'
                    }}
                    onClick={() => removeAnimation(anim.id)}
                    title="Remove animation"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline Info */}
      <div style={{ 
        marginTop: '12px', 
        padding: '6px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '3px', 
        fontSize: '9px',
        color: '#666'
      }}>
        <div>Status: {animationState.isPlaying ? 'Playing' : 'Paused'}</div>
        <div>Progress: {maxDuration > 0 ? Math.round((animationState.currentTime / maxDuration) * 100) : 0}%</div>
      </div>
    </div>
  );
};