import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { TextElementType, TextElement, MultilineTextElement, ViewportState } from '../types';
import { textEditManager } from '../managers/TextEditManager';
import { useEditorStore } from '../store/editorStore';
import { calculateTextBoundsDOM } from '../utils/text-utils';

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
      
  // Track component mount/unmount
  useEffect(() => {
        return () => {
          };
  }, [textElement.id]);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [position, setPosition] = useState<TextPosition | null>(null);
  const [currentContent, setCurrentContent] = useState<string | string[]>('');
  const [inputValue, setInputValue] = useState<string>(''); // Local input state to prevent overwrites
  
  // Track input value changes for debugging
  useEffect(() => {
      }, [inputValue]);
  
  const isMultiline = textElement.type === 'multiline-text';
  
  
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
      
      // Use calculateTextBoundsDOM to get accurate text dimensions
      const textBounds = calculateTextBoundsDOM(textElement);
      let accurateWidth = textBounds?.width || 100;
      let accurateHeight = textBounds?.height || fontSize * 1.2;
      
            
      if (rotation === 0) {
        // No rotation - use normal positioning
        const rect = svgTextElement.getBoundingClientRect();
        
        inputX = rect.x;
        inputY = rect.y;
        
        // Adjust for text baseline vs bounding box difference
        inputY = inputY + fontSize * BASELINE_ADJUSTMENT_NORMAL;
        
        // Use accurate dimensions from calculateTextBoundsDOM, scaled by zoom and with padding
        inputWidth = Math.max(
          accurateWidth * viewport.zoom + 40,  // Accurate width with padding
          fontSize * 4  // Minimum width
        );
        inputHeight = Math.max(
          accurateHeight * viewport.zoom,  // Accurate height
          fontSize * 1.2  // Minimum height
        );
        
              } else {
        // Text is rotated - use accurate dimensions from DOM measurement
                
        const rect = svgTextElement.getBoundingClientRect();
        
        // Use accurate dimensions from calculateTextBoundsDOM, scaled by zoom
        inputWidth = Math.max(
          accurateWidth * viewport.zoom + 30,  // Accurate width with padding
          fontSize * 3  // Minimum width
        );
        inputHeight = Math.max(
          accurateHeight * viewport.zoom,  // Accurate height
          fontSize * 1.2  // Minimum height
        );
        
        // SIMPLEST APPROACH: Use the top-left of the rotated text's bounding rect
        // Then let CSS rotation handle the rest
        inputX = rect.x;
        inputY = rect.y;
        
        // Calculate automatic 2D baseline adjustments for rotated text
        const rotatedAdjustments = calculateRotatedAdjustments(rotation, BASELINE_ADJUSTMENT_NORMAL);
        
        // Apply the calculated adjustments
        inputX = inputX + fontSize * rotatedAdjustments.x; // Horizontal adjustment
        inputY = inputY + fontSize * rotatedAdjustments.y; // Vertical adjustment
        
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
            setPosition(calculateTextPosition);
    
    // Only set initial content if we don't already have input value (prevents overwrites during typing)
    if (inputValue === '' || inputValue === undefined) {
      if (isMultiline) {
        const spans = (textElement as MultilineTextElement).spans.map(span => span.content);
        setCurrentContent(spans);
        setInputValue(spans.join('\n'));
              } else {
        const singleContent = (textElement as TextElement).content;
        setCurrentContent(singleContent);
        setInputValue(singleContent);
              }
    } else {
          }
  }, [textElement.id, calculateTextPosition]); // Depend on the memoized position calculation

  // Update position when viewport changes (but not constantly during typing)
  useEffect(() => {
    // Only update position if we don't already have one or if zoom changes significantly
    if (!position || Math.abs(viewport.zoom - (position.fontSize / (textElement.style.fontSize || 16))) > 0.1) {
            setPosition(calculateTextPosition);
    } else {
          }
  }, [viewport.zoom, calculateTextPosition]); // Only depend on zoom and the memoized position calculation

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
        
    // Update local input state immediately
    setInputValue(newContent);
    
    // Update input width dynamically using precise DOM measurement
    if (inputRef.current && position) {
      const fontSize = position.fontSize;
      
      // Create a temporary text element with the new content to get precise measurements
      let tempTextElement: TextElementType;
      
      if (isMultiline) {
        // For multiline text, split the new content into lines and update spans
        const lines = newContent.split('\n');
        tempTextElement = {
          ...textElement,
          type: 'multiline-text',
          spans: lines.map((line, index) => ({
            id: `temp-span-${index}`,
            content: line,
            dx: 0,
            dy: index === 0 ? 0 : fontSize * 1.2
          }))
        } as MultilineTextElement;
      } else {
        // For single line text, update content directly
        tempTextElement = {
          ...textElement,
          type: 'text',
          content: newContent
        } as TextElement;
      }
      
      // Use calculateTextBoundsDOM for precise measurement with new content
      const newTextBounds = calculateTextBoundsDOM(tempTextElement);
      
      if (newTextBounds) {
        const newWidth = Math.max(
          newTextBounds.width * viewport.zoom + 40, // Precise width with padding
          fontSize * 3 // Minimum width
        );
        inputRef.current.style.width = `${newWidth}px`;
        
              } else {
        // Fallback to basic calculation if DOM measurement fails
        console.warn('📝 TextEditOverlay: calculateTextBoundsDOM failed, using fallback');
        const fallbackWidth = Math.max(
          newContent.length * fontSize * 0.6 * viewport.zoom + 40,
          fontSize * 3
        );
        inputRef.current.style.width = `${fallbackWidth}px`;
      }
      
      // Maintain all text styling properties for consistency
      inputRef.current.style.letterSpacing = String(textElement.style.letterSpacing || '0px');
      inputRef.current.style.wordSpacing = String(textElement.style.wordSpacing || '0px');
      inputRef.current.style.fontKerning = 'auto';
      
      // Maintain rotation if present
      if (position.rotation) {
        inputRef.current.style.transform = `rotate(${position.rotation}deg)`;
        inputRef.current.style.transformOrigin = 'top left'; // Simple consistent origin
      }
    }
    
    if (isMultiline) {
      const lines = newContent.split('\n');
            setCurrentContent(lines);
      onContentChange(lines);
    } else {
            setCurrentContent(newContent);
      onContentChange(newContent);
    }
  }, [isMultiline, onContentChange, position]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
                onFinishEditing(false); // Cancel editing
        break;
      case 'Enter':
        if (!isMultiline && !e.shiftKey) {
          // Single line: Enter saves and exits
          e.preventDefault();
          e.stopPropagation();
                    onFinishEditing(true); // Save editing for single line
        } else if (isMultiline && e.ctrlKey) {
          // Multiline: Ctrl+Enter saves and exits
          e.preventDefault();
          e.stopPropagation();
                    onFinishEditing(true); // Save editing for multiline
        }
        // For multiline, plain Enter creates new lines naturally
        break;
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
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
    
        
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (inputRef.current) {
                        
        // Try multiple focus attempts
        const attemptFocus = (attempt: number = 1) => {
          if (attempt <= 3 && inputRef.current) {
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
                            
              if (!isSuccess && attempt < 3) {
                                attemptFocus(attempt + 1);
              } else if (isSuccess) {
                              } else {
                                // Last resort: use requestAnimationFrame
                requestAnimationFrame(() => {
                  if (inputRef.current) {
                                        inputRef.current.focus();
                    
                    setTimeout(() => {
                      const finalActiveElement = document.activeElement;
                      const finalSuccess = finalActiveElement === inputRef.current;
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
                    inputRef.current.select();
        } else if (inputRef.current instanceof HTMLTextAreaElement) {
                    // For textarea, we need a small delay to ensure focus is properly set
          setTimeout(() => {
            if (inputRef.current instanceof HTMLTextAreaElement) {
                                          inputRef.current.focus(); // Re-focus to ensure it's active
              inputRef.current.select(); // Then select all text
                            
              // Manual test: try to type programmatically (disabled for production)
              //               // inputRef.current.value = inputRef.current.value + '✓';
              // const event = new Event('input', { bubbles: true });
              // inputRef.current.dispatchEvent(event);
            }
          }, 100); // Slightly longer delay
        }
        
              } else {
              }
    }, 10); // Small delay to ensure DOM rendering
    
    return () => clearTimeout(timeoutId);
  }, [position]); // Run when position becomes available

  // Don't render if position is not calculated yet
  if (!position) {
        return null;
  }

    
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
                    onFinishEditing(true);
        }}
        onKeyDown={(e) => {
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
                                    handleContentChange(e.target.value);
          }}
          onKeyDown={(e) => {
                        handleKeyDown(e);
          }}
          onInput={(e) => {
                      }}
          onFocus={() => {
                                  }}
          onBlur={handleBlur}
          onPointerDown={(e) => {
                        e.stopPropagation(); // Prevent event bubbling that might interfere
          }}
          onClick={(e) => {
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
                        handleContentChange(e.target.value);
          }}
          onKeyDown={(e) => {
                        handleKeyDown(e);
          }}
          onInput={(e) => {
                      }}
          onFocus={() => {
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