import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // [0.3, 0.6, 0.9] - heights as viewport percentage
  initialSnap?: number; // Initial snap point index
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 1
}) => {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const currentSnapPoint = snapPoints[currentSnapIndex];
  const maxHeight = window.innerHeight * 0.95; // Maximum 95% of viewport
  const minHeight = window.innerHeight * 0.15; // Minimum 15% of viewport

  useEffect(() => {
    if (isOpen) {
      // Reset to initial snap when opening
      setCurrentSnapIndex(initialSnap);
      setDragOffset(0);
    }
  }, [isOpen, initialSnap]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!bottomSheetRef.current) return;
    
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(window.innerHeight * currentSnapPoint);
    setDragOffset(0);
    
    // Capture pointer for consistent tracking
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !bottomSheetRef.current) return;
    
    const deltaY = startY - e.clientY; // Inverted: up is positive
    const newOffset = Math.max(-startHeight + minHeight, Math.min(maxHeight - startHeight, deltaY));
    setDragOffset(newOffset);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const currentHeight = startHeight + dragOffset;
    const velocityThreshold = 50; // Minimum drag distance to trigger snap
    
    // Find closest snap point
    let closestSnapIndex = 0;
    let minDistance = Infinity;
    
    snapPoints.forEach((snapPoint, index) => {
      const snapHeight = window.innerHeight * snapPoint;
      const distance = Math.abs(currentHeight - snapHeight);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSnapIndex = index;
      }
    });
    
    // If dragging down significantly, consider closing
    if (dragOffset < -velocityThreshold && currentSnapIndex === 0) {
      onClose();
      return;
    }
    
    // If dragging up from smallest snap point and there's enough velocity
    if (dragOffset > velocityThreshold && currentSnapIndex < snapPoints.length - 1) {
      closestSnapIndex = Math.min(snapPoints.length - 1, currentSnapIndex + 1);
    }
    
    // If dragging down and there's enough velocity
    if (dragOffset < -velocityThreshold && currentSnapIndex > 0) {
      closestSnapIndex = Math.max(0, currentSnapIndex - 1);
    }
    
    setCurrentSnapIndex(closestSnapIndex);
    setDragOffset(0);
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  const finalHeight = isDragging 
    ? Math.max(minHeight, Math.min(maxHeight, startHeight + dragOffset))
    : window.innerHeight * currentSnapPoint;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    opacity: isOpen ? 1 : 0,
    transition: isDragging ? 'none' : 'opacity 0.3s ease',
  };

  const bottomSheetStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: `${finalHeight}px`,
    backgroundColor: 'white',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transform: `translateY(0)`,
    transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const dragHandleStyle: React.CSSProperties = {
    width: '40px',
    height: '4px',
    backgroundColor: '#d1d5db',
    borderRadius: '2px',
    margin: '8px auto 4px',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px 12px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  };

  return (
    <>
      <div style={backdropStyle} onPointerDown={handleBackdropClick} />
      <div ref={bottomSheetRef} className="bottom-sheet" style={bottomSheetStyle}>
        <div
          ref={dragHandleRef}
          style={dragHandleStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        
        <div style={headerStyle}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>
            Tools & Controls
          </div>
          <button
            onPointerDown={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    </>
  );
};