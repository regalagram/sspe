import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  constrainToParent?: boolean;
  handle?: string; // CSS selector for drag handle
  onPositionChange?: (position: Position) => void;
  disabled?: boolean;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  elementProps: {
    style: React.CSSProperties;
  };
  setPosition: (position: Position) => void;
  resetPosition: () => void;
}

export const useDraggable = (options: UseDraggableOptions = {}): UseDraggableReturn => {
  const {
    initialPosition = { x: 10, y: 10 },
    constrainToParent = true,
    handle,
    onPositionChange,
    disabled = false
  } = options;

  const [position, setPositionState] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  // Update position when initialPosition changes (from storage)
  useEffect(() => {
    setPositionState(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const setPosition = useCallback((newPosition: Position) => {
    setPositionState(newPosition);
    onPositionChange?.(newPosition);
  }, [onPositionChange]);

  const resetPosition = useCallback(() => {
    setPositionState(initialPosition);
    onPositionChange?.(initialPosition);
  }, [initialPosition, onPositionChange]);

  const constrainPosition = useCallback((pos: Position): Position => {
    if (!constrainToParent || !elementRef.current) return pos;

    const element = elementRef.current;
    const parent = element.parentElement;
    if (!parent) return pos;

    const elementRect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    const maxX = parent.clientWidth - elementRect.width;
    const maxY = parent.clientHeight - elementRect.height;

    return {
      x: Math.max(0, Math.min(maxX, pos.x)),
      y: Math.max(0, Math.min(maxY, pos.y))
    };
  }, [constrainToParent]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Check if we should handle this element
    if (handle && !e.currentTarget.matches(handle)) {
      const handleElement = (e.currentTarget as HTMLElement).querySelector(handle);
      if (!handleElement || !handleElement.contains(e.target as Node)) {
        return;
      }
    }

    setIsDragging(true);
    
    // Calculate drag offset based on current position
    const currentDragStart = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    let currentPosition = position;

    // Add global event listeners
    const handleMouseMove = (e: MouseEvent) => {
      // Handle mouse events normally

      const newPosition = {
        x: e.clientX - currentDragStart.x,
        y: e.clientY - currentDragStart.y
      };
      const constrainedPosition = constrainPosition(newPosition);
      currentPosition = constrainedPosition;
      setPositionState(constrainedPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Call onPositionChange with the final position
      onPositionChange?.(currentPosition);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position, constrainPosition, handle, onPositionChange, disabled]);

  // Update element ref when position changes
  useEffect(() => {
    if (elementRef.current) {
      const element = elementRef.current;
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    }
  }, [position]);

  const dragHandleProps = {
    onMouseDown: handleMouseDown,
    style: {
      cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab'),
      userSelect: 'none' as const,
    }
  };

  const elementProps = {
    style: {
      position: 'absolute' as const,
      left: position.x,
      top: position.y,
      zIndex: isDragging ? 1000 : 100,
    }
  };

  return {
    position,
    isDragging,
    dragHandleProps,
    elementProps,
    setPosition,
    resetPosition
  };
};
