import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { TextElementType, TextElement, MultilineTextElement, ViewportState } from '../types';
import { textEditManager } from '../managers/TextEditManager';
import { useEditorStore } from '../store/editorStore';

interface TextEditOverlayProps {
  textElement: TextElementType;
  viewport: ViewportState;
  onContentChange: (content: string | string[]) => void;
  onFinishEditing: (save: boolean) => void;
}

interface TextPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  rotation?: number;
}

export const TextEditOverlay: React.FC<TextEditOverlayProps> = ({
  textElement,
  viewport,
  onContentChange,
  onFinishEditing
}) => {
  console.log('📝 TextEditOverlay: Component rendered for text:', textElement.id);
  console.log('📝 TextEditOverlay: Props changed:', {
    textElementId: textElement.id,
    viewportZoom: viewport.zoom,
    viewportPan: viewport.pan
  });
  
  // Track component mount/unmount
  useEffect(() => {
    console.log('📝 TextEditOverlay: Component mounted for text:', textElement.id);
    return () => {
      console.log('📝 TextEditOverlay: Component unmounting for text:', textElement.id);
    };
  }, [textElement.id]);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [position, setPosition] = useState<TextPosition | null>(null);
  const [currentContent, setCurrentContent] = useState<string | string[]>('');
  const [inputValue, setInputValue] = useState<string>(''); // Local input state to prevent overwrites
  
  // Track input value changes for debugging
  useEffect(() => {
    console.log('📝 TextEditOverlay: inputValue state changed to:', inputValue);
  }, [inputValue]);
  
  const isMultiline = textElement.type === 'multiline-text';
  
  console.log('📝 TextEditOverlay: isMultiline:', isMultiline);

  // Calculate the exact position of the text element in screen coordinates (memoized)
  const calculateTextPosition = useMemo((): TextPosition | null => {
    try {
      // Find the actual SVG text element in the DOM
      const svgTextElement = document.getElementById(textElement.id);
      if (!svgTextElement) {
        console.warn('TextEditOverlay: Could not find SVG text element:', textElement.id);
        return null;
      }

      // Calculate font size in screen pixels (accounting for zoom)
      const fontSize = (textElement.style.fontSize || 16) * viewport.zoom;
      
      // Use original text for width calculation
      const originalText = isMultiline ? 
        (textElement as MultilineTextElement).spans.map(s => s.content).join('\n') : 
        (textElement as TextElement).content;
      
      // Handle text rotation - extract rotation from transform attribute
      let rotation = 0;
      if (textElement.transform) {
        const rotateMatch = textElement.transform.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
          const parts = rotateMatch[1].trim().split(/[,\s]+/);
          const angle = parseFloat(parts[0]) || 0;
          rotation = angle;
          console.log('📝 TextEditOverlay: Detected rotation:', rotation, 'degrees');
        }
      }
      
      // Fine-tuning constants for baseline alignment
      // Normal text baseline adjustment (reference value)
      const BASELINE_ADJUSTMENT_NORMAL = -0.1; // Vertical adjustment for normal text
      
      // Calculate automatic adjustments for rotated text based on rotation angle
      const calculateRotatedAdjustments = (rotationDegrees: number, normalAdjustment: number) => {
        // Convert degrees to radians
        const rotationRadians = (rotationDegrees * Math.PI) / 180;
        
        // For rotated text, we need to decompose the baseline adjustment into 2D components
        // The normal adjustment acts as the magnitude of the adjustment vector
        // We rotate this adjustment vector by the same angle as the text
        
        // Base adjustment magnitude (use a multiplier for rotated text as it typically needs more adjustment)
        const rotatedMagnitude = Math.abs(normalAdjustment) * 5; // Increased magnitude for rotated text
        
        // Calculate 2D adjustments using trigonometry
        // X adjustment: horizontal component of the rotated adjustment vector
        const adjustmentX = rotatedMagnitude * Math.sin(rotationRadians);
        // Y adjustment: vertical component of the rotated adjustment vector  
        const adjustmentY = rotatedMagnitude * Math.cos(rotationRadians);
        
        return {
          x: adjustmentX,
          y: adjustmentY
        };
      };
      
      let inputX, inputY, inputWidth, inputHeight;
      
      if (rotation === 0) {
        // No rotation - use normal positioning
        const rect = svgTextElement.getBoundingClientRect();
        const charWidth = fontSize * 0.6;
        
        inputX = rect.x;
        inputY = rect.y;
        
        // Adjust for text baseline vs bounding box difference
        // getBoundingClientRect gives us the full text bounding box, but we want to align with the text baseline
        inputY = inputY + fontSize * BASELINE_ADJUSTMENT_NORMAL; // Smaller adjustment for non-rotated text
        
        inputWidth = Math.max(
          originalText.length * charWidth + 40,
          fontSize * 4,
          rect.width + 20
        );
        inputHeight = Math.max(rect.height, fontSize * 1.2);
        
        console.log('📝 TextEditOverlay: No rotation - using rect position:', { 
          rectPosition: { x: rect.x, y: rect.y },
          adjustedPosition: { inputX, inputY }, 
          inputWidth, 
          inputHeight,
          fontSize: {
            calculated: fontSize,
            original: textElement.style.fontSize,
            zoom: viewport.zoom,
            formula: `${textElement.style.fontSize || 16} * ${viewport.zoom}`
          },
          baselineAdjustment: fontSize * BASELINE_ADJUSTMENT_NORMAL
        });
      } else {
        // Text is rotated - SIMPLIFIED APPROACH: Use the exact visual position of the text
        console.log('📝 TextEditOverlay: Calculating position for rotated text (simplified approach)...');
        
        // Get the visual bounding rect - this is where the text actually appears on screen
        const rect = svgTextElement.getBoundingClientRect();
        const bbox = (svgTextElement as unknown as SVGTextElement).getBBox();
        
        // Calculate input dimensions based on unrotated text (using bbox)
        const charWidth = fontSize * 0.55;
        const textWidth = bbox.width * viewport.zoom;
        
        inputWidth = Math.max(
          textWidth + 30,
          originalText.length * charWidth + 30,
          fontSize * 3
        );
        inputHeight = Math.max(bbox.height * viewport.zoom, fontSize * 1.2);
        
        // SIMPLEST APPROACH: Use the top-left of the rotated text's bounding rect
        // Then let CSS rotation handle the rest
        inputX = rect.x;
        inputY = rect.y;
        
        // Calculate automatic 2D baseline adjustments for rotated text
        const rotatedAdjustments = calculateRotatedAdjustments(rotation, BASELINE_ADJUSTMENT_NORMAL);
        
        // Apply the calculated adjustments
        inputX = inputX + fontSize * rotatedAdjustments.x; // Horizontal adjustment
        inputY = inputY + fontSize * rotatedAdjustments.y; // Vertical adjustment
        
        console.log('📝 TextEditOverlay: Rotated text - simplified positioning:', {
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          rectPosition: { x: rect.x, y: rect.y },
          adjustedPosition: { inputX, inputY },
          inputDimensions: { inputWidth, inputHeight },
          fontSize,
          rotation,
          calculatedAdjustments: {
            horizontal: fontSize * rotatedAdjustments.x,
            vertical: fontSize * rotatedAdjustments.y,
            rotationDegrees: rotation,
            adjustmentComponents: rotatedAdjustments
          },
          viewport: { zoom: viewport.zoom, pan: viewport.pan }
        });
      }
      
      return {
        x: inputX,
        y: inputY,
        width: inputWidth,
        height: inputHeight,
        fontSize,
        fontFamily: textElement.style.fontFamily || 'Arial, sans-serif',
        rotation: rotation
      };
    } catch (error) {
      console.error('TextEditOverlay: Error calculating position:', error);
      return null;
    }
  }, [textElement.id, textElement.style.fontSize, textElement.style.fontFamily, textElement.transform, viewport.zoom, isMultiline]);

  // Initialize content and position
  useEffect(() => {
    console.log('📝 TextEditOverlay: Initializing content and position...');
    console.log('📝 TextEditOverlay: Calculated position:', calculateTextPosition);
    setPosition(calculateTextPosition);
    
    // Only set initial content if we don't already have input value (prevents overwrites during typing)
    if (inputValue === '' || inputValue === undefined) {
      if (isMultiline) {
        const spans = (textElement as MultilineTextElement).spans.map(span => span.content);
        setCurrentContent(spans);
        setInputValue(spans.join('\n'));
        console.log('📝 TextEditOverlay: Set initial multiline content:', spans);
      } else {
        const singleContent = (textElement as TextElement).content;
        setCurrentContent(singleContent);
        setInputValue(singleContent);
        console.log('📝 TextEditOverlay: Set initial single line content:', singleContent);
      }
    } else {
      console.log('📝 TextEditOverlay: Skipping content initialization - user is typing, inputValue:', inputValue);
    }
  }, [textElement.id, calculateTextPosition]); // Depend on the memoized position calculation

  // Update position when viewport changes (but not constantly during typing)
  useEffect(() => {
    // Only update position if we don't already have one or if zoom changes significantly
    if (!position || Math.abs(viewport.zoom - (position.fontSize / (textElement.style.fontSize || 16))) > 0.1) {
      console.log('📝 TextEditOverlay: Updating position due to viewport change');
      setPosition(calculateTextPosition);
    } else {
      console.log('📝 TextEditOverlay: Skipping position update - no significant viewport change');
    }
  }, [viewport.zoom, calculateTextPosition]); // Only depend on zoom and the memoized position calculation

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    console.log('📝 TextEditOverlay: handleContentChange called with:', newContent);
    
    // Update local input state immediately
    setInputValue(newContent);
    
    // Update input width dynamically without recalculating entire position
    if (inputRef.current && position) {
      const fontSize = position.fontSize;
      const charWidth = fontSize * 0.55; // Use same precise char width as position calculation
      const newWidth = Math.max(
        newContent.length * charWidth + 30, // Use same padding as initial calculation
        fontSize * 3, // Same minimum width
        position.width * 0.7 // Allow more shrinking for better fit
      );
      inputRef.current.style.width = `${newWidth}px`;
      
      // Maintain all text styling properties for consistency
      inputRef.current.style.letterSpacing = textElement.style.letterSpacing || '0px';
      inputRef.current.style.wordSpacing = textElement.style.wordSpacing || '0px';
      inputRef.current.style.fontKerning = 'auto';
      
      // Maintain rotation if present
      if (position.rotation) {
        inputRef.current.style.transform = `rotate(${position.rotation}deg)`;
        inputRef.current.style.transformOrigin = 'top left'; // Simple consistent origin
      }
    }
    
    if (isMultiline) {
      const lines = newContent.split('\n');
      console.log('📝 TextEditOverlay: Setting multiline content:', lines);
      setCurrentContent(lines);
      onContentChange(lines);
    } else {
      console.log('📝 TextEditOverlay: Setting single line content:', newContent);
      setCurrentContent(newContent);
      onContentChange(newContent);
    }
  }, [isMultiline, onContentChange, position]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    console.log('📝 TextEditOverlay: keyDown:', e.key, 'ctrl:', e.ctrlKey, 'shift:', e.shiftKey, 'isMultiline:', isMultiline);
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        console.log('📝 TextEditOverlay: Escape pressed - canceling editing');
        onFinishEditing(false); // Cancel editing
        break;
      case 'Enter':
        if (!isMultiline && !e.shiftKey) {
          // Single line: Enter saves and exits
          e.preventDefault();
          e.stopPropagation();
          console.log('📝 TextEditOverlay: Enter pressed on single line - saving and exiting');
          onFinishEditing(true); // Save editing for single line
        } else if (isMultiline && e.ctrlKey) {
          // Multiline: Ctrl+Enter saves and exits
          e.preventDefault();
          e.stopPropagation();
          console.log('📝 TextEditOverlay: Ctrl+Enter pressed on multiline - saving and exiting');
          onFinishEditing(true); // Save editing for multiline
        }
        // For multiline, plain Enter creates new lines naturally
        break;
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        console.log('📝 TextEditOverlay: Tab pressed - saving and exiting');
        onFinishEditing(true); // Save and move to next
        break;
    }
  }, [isMultiline, onFinishEditing]);

  // Handle blur events (clicking outside)
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Small delay to allow other interactions to register first
    setTimeout(() => {
      onFinishEditing(true); // Save on blur
    }, 100);
  }, [onFinishEditing]);

  // Auto-focus when component mounts and position is available
  useEffect(() => {
    if (!position) return; // Wait for position to be calculated
    
    console.log('📝 TextEditOverlay: Auto-focus effect with position, inputRef.current:', !!inputRef.current);
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (inputRef.current) {
        console.log('📝 TextEditOverlay: Focusing input element...');
        console.log('📝 TextEditOverlay: Input element details:', {
          tagName: inputRef.current.tagName,
          type: inputRef.current.type,
          value: inputRef.current.value,
          disabled: inputRef.current.disabled,
          readOnly: inputRef.current.readOnly
        });
        
        // Try multiple focus attempts
        const attemptFocus = (attempt: number = 1) => {
          if (attempt <= 3 && inputRef.current) {
            console.log('📝 TextEditOverlay: Focus attempt', attempt);
            inputRef.current.focus();
            // Simulate click event instead of calling click method
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
            });
            inputRef.current.dispatchEvent(clickEvent);
            
            setTimeout(() => {
              const activeElement = document.activeElement;
              const isSuccess = activeElement === inputRef.current;
              console.log('📝 TextEditOverlay: Focus attempt', attempt, 'result:', {
                isInputFocused: isSuccess,
                activeElementTag: activeElement?.tagName,
                activeElementId: (activeElement as any)?.id,
                inputHasFocus: inputRef.current === document.activeElement
              });
              
              if (!isSuccess && attempt < 3) {
                console.log('📝 TextEditOverlay: Focus failed, trying again...');
                attemptFocus(attempt + 1);
              } else if (isSuccess) {
                console.log('📝 TextEditOverlay: Focus successful after', attempt, 'attempts!');
              } else {
                console.log('📝 TextEditOverlay: Focus failed after all attempts, trying requestAnimationFrame...');
                // Last resort: use requestAnimationFrame
                requestAnimationFrame(() => {
                  if (inputRef.current) {
                    console.log('📝 TextEditOverlay: Final focus attempt with requestAnimationFrame');
                    inputRef.current.focus();
                    
                    setTimeout(() => {
                      const finalActiveElement = document.activeElement;
                      const finalSuccess = finalActiveElement === inputRef.current;
                      console.log('📝 TextEditOverlay: Final focus result:', {
                        success: finalSuccess,
                        activeElement: finalActiveElement?.tagName
                      });
                    }, 10);
                  }
                });
              }
            }, 10 * attempt); // Increasing delay
          }
        };
        
        attemptFocus();
        
        // Select all text for easy replacement (with delay for textarea)
        if (inputRef.current instanceof HTMLInputElement) {
          console.log('📝 TextEditOverlay: Selecting all text in input');
          inputRef.current.select();
        } else if (inputRef.current instanceof HTMLTextAreaElement) {
          console.log('📝 TextEditOverlay: Selecting all text in textarea (with delay)');
          // For textarea, we need a small delay to ensure focus is properly set
          setTimeout(() => {
            if (inputRef.current instanceof HTMLTextAreaElement) {
              console.log('📝 TextEditOverlay: Executing delayed select for textarea');
              console.log('📝 TextEditOverlay: Textarea element details before focus:', {
                element: inputRef.current,
                value: inputRef.current.value,
                disabled: inputRef.current.disabled,
                readOnly: inputRef.current.readOnly,
                style: inputRef.current.style.cssText,
                offsetWidth: inputRef.current.offsetWidth,
                offsetHeight: inputRef.current.offsetHeight
              });
              inputRef.current.focus(); // Re-focus to ensure it's active
              inputRef.current.select(); // Then select all text
              console.log('📝 TextEditOverlay: Textarea select complete, value length:', inputRef.current.value.length);
              
              // Manual test: try to type programmatically (disabled for production)
              // console.log('📝 TextEditOverlay: Testing programmatic input...');
              // inputRef.current.value = inputRef.current.value + '✓';
              // const event = new Event('input', { bubbles: true });
              // inputRef.current.dispatchEvent(event);
            }
          }, 100); // Slightly longer delay
        }
        
        console.log('📝 TextEditOverlay: Focus and selection complete');
      } else {
        console.log('📝 TextEditOverlay: Still no input element to focus');
      }
    }, 10); // Small delay to ensure DOM rendering
    
    return () => clearTimeout(timeoutId);
  }, [position]); // Run when position becomes available

  // Don't render if position is not calculated yet
  if (!position) {
    console.log('📝 TextEditOverlay: Not rendering - position not calculated');
    return null;
  }

  console.log('📝 TextEditOverlay: Rendering overlay with position:', position);
  console.log('📝 TextEditOverlay: Content to render:', currentContent);

  const sharedStyles: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: position.width, // Use calculated dynamic width
    minWidth: position.fontSize * 2, // Minimum width
    fontSize: position.fontSize,
    fontFamily: position.fontFamily,
    fontWeight: textElement.style.fontWeight || 'normal',
    fontStyle: textElement.style.fontStyle || 'normal',
    color: typeof textElement.style.fill === 'string' ? textElement.style.fill : '#000000',
    backgroundColor: 'transparent',
    border: '1px solid rgba(0, 120, 204, 0.5)', // Thinner border for less visual interference
    borderRadius: '3px',
    outline: 'none',
    padding: '0px', // No padding for perfect alignment
    zIndex: 99999, // Much higher z-index
    boxSizing: 'content-box', // Changed from border-box to avoid border affecting position
    // Text styling to match SVG text as closely as possible
    textAlign: 'left', // SVG textAnchor will be handled by positioning
    lineHeight: textElement.style.lineHeight || 'normal', // Use 'normal' instead of 1.2 for better matching
    // Match exact letter spacing and word spacing from SVG text
    letterSpacing: textElement.style.letterSpacing || '0px', // More precise default
    wordSpacing: textElement.style.wordSpacing || '0px', // More precise default
    // Simplified CSS to match SVG text rendering more closely
    fontKerning: 'normal', // Changed from 'auto' to be more predictable
    textRendering: 'geometricPrecision', // Changed for exact sizing
    WebkitFontSmoothing: 'subpixel-antialiased', // Less aggressive smoothing
    MozOsxFontSmoothing: 'auto', // Default Mac rendering
    // Additional alignment properties
    verticalAlign: 'baseline', // Ensure baseline alignment
    display: 'block', // Block display for better positioning control
    // Apply rotation if present  
    transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined,
    transformOrigin: position.rotation ? 'top left' : 'top left' // Simple top-left origin for both cases
  };

  // Use local input state to prevent overwrites during typing
  // const contentValue = Array.isArray(currentContent) ? currentContent.join('\n') : currentContent;

  console.log('📝 TextEditOverlay: Preparing to render overlay via portal');
  console.log('📝 TextEditOverlay: Final render state:', {
    isMultiline,
    inputValue,
    inputValueLength: inputValue.length,
    currentContent,
    position,
    textElementType: textElement.type,
    textElementId: textElement.id
  });

  // Render the overlay outside the SVG using a portal
  return ReactDOM.createPortal(
    <>
      {/* Temporarily disable backdrop to test focus issues */}
      {false && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: 'transparent',
          cursor: 'default',
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          if (e.target === inputRef.current) return;
          console.log('📝 TextEditOverlay: Backdrop clicked, finishing editing');
          onFinishEditing(true);
        }}
        onKeyDown={(e) => {
          console.log('📝 TextEditOverlay: Backdrop received keydown:', e.key);
        }}
      />
      )}
      
      {/* Input/Textarea for editing */}
      {isMultiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={inputValue}
          autoFocus
          tabIndex={1}
          readOnly={false}
          disabled={false}
          spellCheck={false}
          contentEditable={true}
          data-testid="multiline-text-editor"
          placeholder="Editar texto multilínea..."
          onChange={(e) => {
            console.log('📝 TextEditOverlay: Textarea onChange fired with:', e.target.value);
            console.log('📝 TextEditOverlay: Textarea onChange event details:', {
              target: e.target,
              value: e.target.value,
              disabled: e.target.disabled,
              readOnly: e.target.readOnly,
              focused: document.activeElement === e.target
            });
            handleContentChange(e.target.value);
          }}
          onKeyDown={(e) => {
            console.log('📝 TextEditOverlay: Textarea onKeyDown fired with:', e.key);
            handleKeyDown(e);
          }}
          onInput={(e) => {
            console.log('📝 TextEditOverlay: Textarea onInput fired with:', (e.target as HTMLTextAreaElement).value);
          }}
          onFocus={() => {
            console.log('📝 TextEditOverlay: Textarea focused!');
            console.log('📝 TextEditOverlay: Textarea focus details:', {
              activeElement: document.activeElement,
              isTextarea: document.activeElement instanceof HTMLTextAreaElement,
              value: (document.activeElement as HTMLTextAreaElement)?.value,
              canEdit: !!(document.activeElement as HTMLTextAreaElement)?.focus
            });
          }}
          onBlur={handleBlur}
          onPointerDown={(e) => {
            console.log('📝 TextEditOverlay: Textarea pointer down event');
            e.stopPropagation(); // Prevent event bubbling that might interfere
          }}
          onClick={(e) => {
            console.log('📝 TextEditOverlay: Textarea click event');
            e.stopPropagation(); // Prevent event bubbling that might interfere
          }}
          style={{
            ...sharedStyles,
            minHeight: position.height,
            resize: 'none',
            overflow: 'hidden',
            // Override specific properties for multiline textarea
            backgroundColor: 'rgba(255, 255, 0, 0.2)', // More visible yellow background
            border: '2px solid rgba(0, 120, 204, 0.8)', // Same border as single-line input
            // Explicit editable styles and fixes for textarea
            pointerEvents: 'all',
            userSelect: 'text',
            cursor: 'text',
            display: 'block', // Ensure proper display
            verticalAlign: 'top', // Better alignment for textarea
            whiteSpace: 'pre-wrap', // Preserve line breaks
            wordWrap: 'break-word', // Handle long words
            lineHeight: textElement.style.lineHeight || '1.2' // More explicit line height for multiline
          }}
          rows={Math.max(2, (currentContent as string[]).length)}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={inputValue}
          autoFocus
          tabIndex={1}
          onChange={(e) => {
            console.log('📝 TextEditOverlay: Input onChange fired with:', e.target.value);
            handleContentChange(e.target.value);
          }}
          onKeyDown={(e) => {
            console.log('📝 TextEditOverlay: Input onKeyDown fired with:', e.key);
            handleKeyDown(e);
          }}
          onInput={(e) => {
            console.log('📝 TextEditOverlay: Input onInput fired with:', (e.target as HTMLInputElement).value);
          }}
          onFocus={() => {
            console.log('📝 TextEditOverlay: Input focused!');
          }}
          onBlur={handleBlur}
          style={{
            ...sharedStyles,
            // Override specific properties for single-line input
            height: position.height,
            backgroundColor: 'rgba(255, 255, 0, 0.1)', // Light yellow background for visibility
            border: '2px solid rgba(0, 120, 204, 0.8)'
          }}
        />
      )}
    </>,
    document.body // Render directly into document.body, outside any SVG
  );
};