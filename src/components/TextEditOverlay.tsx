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
  rotationCenterX?: number;
  rotationCenterY?: number;
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
      let rotationCenterX = 0;
      let rotationCenterY = 0;
      
      if (textElement.transform) {
        const rotateMatch = textElement.transform.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
          const parts = rotateMatch[1].trim().split(/[,\s]+/);
          const angle = parseFloat(parts[0]) || 0;
          rotation = angle;
          
          // Check if rotation has center coordinates: rotate(angle, cx, cy)
          if (parts.length >= 3) {
            rotationCenterX = parseFloat(parts[1]) || 0;
            rotationCenterY = parseFloat(parts[2]) || 0;
          } else {
            // Default SVG rotation center is 0,0, but for text it's typically the text position
            rotationCenterX = textElement.x;
            rotationCenterY = textElement.y;
          }
        }
      }
      
      // Fine-tuning constants for baseline alignment  
      const BASELINE_ADJUSTMENT_NORMAL = -0.1; // Vertical adjustment for normal text
      
      let inputX, inputY, inputWidth, inputHeight;
      
      // Use calculateTextBoundsDOM to get accurate text dimensions
      const textBounds = calculateTextBoundsDOM(textElement);
      let accurateWidth = textBounds?.width || 100;
      let accurateHeight = textBounds?.height || fontSize * 1.2;
            
      if (rotation === 0) {
        // No rotation - compare different approaches
        const svgElement = svgTextElement.closest('svg') as SVGSVGElement;
        const textRect = svgTextElement.getBoundingClientRect();
        
        // Method 1: Use getBoundingClientRect directly (this should be the most accurate)
        inputX = textRect.x;
        inputY = textRect.y;
        
        if (svgElement) {
          // Method 2: Transform approach for comparison
          const svgRect = svgElement.getBoundingClientRect();
          const point = svgElement.createSVGPoint();
          point.x = textElement.x;
          point.y = textElement.y;
          
          const viewportGroup = svgElement.querySelector('g[transform]') as SVGGElement;
          if (viewportGroup) {
            const matrix = viewportGroup.getCTM();
            if (matrix) {
              const transformedPoint = point.matrixTransform(matrix);
              const transformX = svgRect.left + transformedPoint.x;
              const transformY = svgRect.top + transformedPoint.y;
              
              // Debug comparison
              console.log('Position comparison:', {
                method1_getBoundingClientRect: { x: textRect.x, y: textRect.y },
                method2_transform: { x: transformX, y: transformY },
                difference: { 
                  x: textRect.x - transformX, 
                  y: textRect.y - transformY 
                },
                originalTextPosition: { x: textElement.x, y: textElement.y },
                viewport: { pan: viewport.pan, zoom: viewport.zoom }
              });
            }
          }
        }
        
        // Adjust for text baseline vs bounding box difference
        // Remove the baseline adjustment for now to see if it improves alignment
        // inputY = inputY + fontSize * BASELINE_ADJUSTMENT_NORMAL;
        
        // Use accurate dimensions from calculateTextBoundsDOM, scaled by zoom
        inputWidth = Math.max(
          accurateWidth * viewport.zoom,  // Accurate width without additional padding
          fontSize * 4  // Minimum width
        );
        inputHeight = Math.max(
          accurateHeight * viewport.zoom,  // Accurate height
          fontSize * 1.2  // Minimum height
        );
        
      } else {
        // Text is rotated - calculate dimensions for unrotated text and center over rotated position
        // Strategy: Use unrotated text dimensions but position centered over rotated text visual bounds
        
        const textRect = svgTextElement.getBoundingClientRect();
        
        // Get the dimensions that the text would have if it were NOT rotated
        const originalTextBounds = calculateTextBoundsDOM({
          ...textElement,
          transform: undefined // Remove transform to get original bounds
        });
        
        if (originalTextBounds) {
          // Use the unrotated text dimensions scaled by zoom
          const unrotatedWidth = originalTextBounds.width * viewport.zoom;
          const unrotatedHeight = originalTextBounds.height * viewport.zoom;
          
          // Ensure minimum sizes
          inputWidth = Math.max(unrotatedWidth, fontSize * 3);
          inputHeight = Math.max(unrotatedHeight, fontSize * 1.2);
          
          // Position input centered over the rotated text's visual center
          const rotatedCenterX = textRect.x + textRect.width / 2;
          const rotatedCenterY = textRect.y + textRect.height / 2;
          
          inputX = rotatedCenterX - inputWidth / 2;
          inputY = rotatedCenterY - inputHeight / 2;
          
        } else {
          // Fallback: use estimated dimensions based on text content
          const textContent = isMultiline ? 
            (textElement as MultilineTextElement).spans.map(s => s.content).join('\\n') : 
            (textElement as TextElement).content;
          
          const estimatedWidth = Math.max(textContent.length * fontSize * 0.6 * viewport.zoom, fontSize * 3);
          const estimatedHeight = fontSize * 1.2 * viewport.zoom;
          
          inputWidth = estimatedWidth;
          inputHeight = estimatedHeight;
          
          // Center over rotated text
          const rotatedCenterX = textRect.x + textRect.width / 2;
          const rotatedCenterY = textRect.y + textRect.height / 2;
          
          inputX = rotatedCenterX - inputWidth / 2;
          inputY = rotatedCenterY - inputHeight / 2;
        }
        
        console.log('Rotated text positioning - UNROTATED DIMENSIONS approach:', {
          textRect: { x: textRect.x, y: textRect.y, width: textRect.width, height: textRect.height },
          rotatedCenter: { x: textRect.x + textRect.width / 2, y: textRect.y + textRect.height / 2 },
          originalBounds: originalTextBounds,
          inputDimensions: { width: inputWidth, height: inputHeight },
          inputPosition: { x: inputX, y: inputY },
          fontSize: fontSize,
          rotation: rotation,
          approach: 'unrotated_dimensions_centered_over_rotated_visual'
        });
      }
      
      return {
        x: inputX,
        y: inputY,
        width: inputWidth,
        height: inputHeight,
        fontSize,
        fontFamily: textElement.style.fontFamily || 'Arial, sans-serif',
        rotation: rotation,
        rotationCenterX: rotationCenterX,
        rotationCenterY: rotationCenterY
      };
    } catch (error) {
      console.error('TextEditOverlay: Error calculating position:', error);
      return null;
    }
  }, [textElement.id, textElement.style.fontSize, textElement.style.fontFamily, textElement.transform, viewport.zoom, viewport.pan.x, viewport.pan.y, isMultiline]);

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
    // Update position if viewport zoom or pan changes significantly
    if (!position || 
        Math.abs(viewport.zoom - (position.fontSize / (textElement.style.fontSize || 16))) > 0.1) {
            setPosition(calculateTextPosition);
    } else {
          }
  }, [viewport.zoom, viewport.pan.x, viewport.pan.y, calculateTextPosition]); // Depend on zoom, pan, and the memoized position calculation

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
          newTextBounds.width * viewport.zoom, // Precise width without additional padding
          fontSize * 3 // Minimum width
        );
        
        // For rotated text, also recenter the input when width changes
        if (position.rotation && position.rotation !== 0) {
          const currentWidth = parseFloat(inputRef.current.style.width) || position.width;
          const widthChange = newWidth - currentWidth;
          
          if (Math.abs(widthChange) > 10) { // Only reposition if significant change
            // Get the visual center of the rotated text (this shouldn't change)
            const svgTextElement = document.getElementById(textElement.id);
            if (svgTextElement) {
              const textRect = svgTextElement.getBoundingClientRect();
              const rotatedCenterX = textRect.x + textRect.width / 2;
              
              // Recenter horizontally with new width
              const newLeft = rotatedCenterX - newWidth / 2;
              inputRef.current.style.left = `${newLeft}px`;
              
              console.log('Recentered rotated text input:', {
                oldWidth: currentWidth,
                newWidth: newWidth,
                widthChange: widthChange,
                newLeft: newLeft,
                rotatedCenter: { x: rotatedCenterX }
              });
            }
          }
        }
        
        inputRef.current.style.width = `${newWidth}px`;
        
      } else {
        // Fallback to basic calculation if DOM measurement fails
        console.warn('📝 TextEditOverlay: calculateTextBoundsDOM failed, using fallback');
        const fallbackWidth = Math.max(
          newContent.length * fontSize * 0.6 * viewport.zoom,
          fontSize * 3
        );
        
        // For rotated text, also recenter with fallback width
        if (position.rotation && position.rotation !== 0) {
          const svgTextElement = document.getElementById(textElement.id);
          if (svgTextElement) {
            const textRect = svgTextElement.getBoundingClientRect();
            const rotatedCenterX = textRect.x + textRect.width / 2;
            const newLeft = rotatedCenterX - fallbackWidth / 2;
            inputRef.current.style.left = `${newLeft}px`;
          }
        }
        
        inputRef.current.style.width = `${fallbackWidth}px`;
      }
      
      // Maintain all text styling properties for consistency
      inputRef.current.style.letterSpacing = String(textElement.style.letterSpacing || '0px');
      inputRef.current.style.wordSpacing = String(textElement.style.wordSpacing || '0px');
      inputRef.current.style.fontKerning = 'auto';
      
      // Force correct font-size with !important to override mobile CSS
      inputRef.current.style.setProperty('font-size', `${position.fontSize}px`, 'important');
      
      // For rotated text, don't rotate the input - just style it as overlay
      if (position.rotation) {
        // No rotation - just overlay styling
        inputRef.current.style.transform = '';
        inputRef.current.style.transformOrigin = '';
        
        // Different styling for single vs multiline text
        if (isMultiline) {
          // For multiline text: maintain left alignment, use block display
          inputRef.current.style.textAlign = 'left';
          inputRef.current.style.display = 'block';
          inputRef.current.style.alignItems = 'unset';
          inputRef.current.style.justifyContent = 'unset';
        } else {
          // For single line text: center within the overlay area
          inputRef.current.style.textAlign = 'center';
          inputRef.current.style.display = 'flex';
          inputRef.current.style.alignItems = 'center';
          inputRef.current.style.justifyContent = 'center';
        }
      } else {
        // Normal text - clear overlay styles
        inputRef.current.style.transform = '';
        inputRef.current.style.transformOrigin = '';
        inputRef.current.style.textAlign = 'left';
        inputRef.current.style.display = 'block';
        inputRef.current.style.alignItems = 'unset';
        inputRef.current.style.justifyContent = 'unset';
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

  // Force correct font-size on mobile by using !important via JavaScript
  useEffect(() => {
    if (!inputRef.current || !position) return;
    
    const input = inputRef.current;
    
    // Force the exact font-size using setProperty with !important to override mobile CSS
    input.style.setProperty('font-size', `${position.fontSize}px`, 'important');
    
    // Also set other critical properties that might be overridden
    input.style.setProperty('min-height', 'unset', 'important');
    input.style.setProperty('padding', '0px', 'important');
    
  }, [position]);

  // Handle iOS zoom prevention dynamically while preserving exact font size
  useEffect(() => {
    if (!inputRef.current || !position) return;
    
    const input = inputRef.current;
    
    // iOS zoom prevention strategy: temporarily set 16px on focus, then restore after focus
    const handleFocus = () => {
      // Temporarily set minimum font size to prevent zoom
      if (position.fontSize < 16) {
        input.style.setProperty('font-size', '16px', 'important');
        // After a brief moment, restore the correct font size
        setTimeout(() => {
          if (input) {
            input.style.setProperty('font-size', `${position.fontSize}px`, 'important');
          }
        }, 100);
      }
    };
    
    input.addEventListener('focus', handleFocus);
    
    return () => {
      if (input) {
        input.removeEventListener('focus', handleFocus);
      }
    };
  }, [position]);

  // Apply styling when position is available - NO rotation for rotated text
  useEffect(() => {
    if (!inputRef.current || !position) return;
    
    const input = inputRef.current;
    
    // For rotated text, don't apply rotation to input - just position it as overlay
    if (position.rotation) {
      // Don't rotate the input - just position it over the visual text
      input.style.transform = '';
      input.style.transformOrigin = '';
      
      // Different styling for single vs multiline text
      if (isMultiline) {
        // For multiline text: maintain left alignment, use block display
        input.style.textAlign = 'left'; // Keep original text alignment
        input.style.display = 'block';
        input.style.alignItems = 'unset';
        input.style.justifyContent = 'unset';
      } else {
        // For single line text: center within the overlay area
        input.style.textAlign = 'center';
        input.style.display = 'flex';
        input.style.alignItems = 'center';
        input.style.justifyContent = 'center';
      }
      
      console.log('Applied overlay styling for rotated text:', {
        rotation: position.rotation,
        isMultiline: isMultiline,
        inputPosition: { x: position.x, y: position.y },
        textAlign: isMultiline ? 'left' : 'center',
        approach: 'no_rotation_overlay_with_alignment'
      });
    } else {
      // For non-rotated text, keep normal styling
      input.style.transform = '';
      input.style.transformOrigin = '';
      input.style.textAlign = 'left';
      input.style.display = 'block';
      input.style.alignItems = 'unset';
      input.style.justifyContent = 'unset';
    }
  }, [position, textElement.id]);

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
    fontSize: position.fontSize, // Use exact dynamic font size (will handle iOS zoom separately)
    fontFamily: position.fontFamily,
    fontWeight: textElement.style.fontWeight || 'normal',
    fontStyle: textElement.style.fontStyle || 'normal',
    color: typeof textElement.style.fill === 'string' ? textElement.style.fill : '#000000',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0',
    outline: 'none',
    boxShadow: 'none',
    padding: '0', // No padding for perfect alignment
    zIndex: 99999, // Much higher z-index
    boxSizing: 'content-box', // Changed from border-box to avoid border affecting position
    // Text styling to match SVG text as closely as possible
    textAlign: 'left', // SVG textAnchor will be handled by positioning
    lineHeight: '1', // Exact line height for precise alignment
    // Match exact letter spacing and word spacing from SVG text
    letterSpacing: textElement.style.letterSpacing || '0',
    wordSpacing: textElement.style.wordSpacing || '0',
    // Simplified CSS to match SVG text rendering more closely
    fontKerning: 'normal', // Changed from 'auto' to be more predictable
    textRendering: 'geometricPrecision', // Changed for exact sizing
    WebkitFontSmoothing: 'subpixel-antialiased', // Less aggressive smoothing
    MozOsxFontSmoothing: 'auto', // Default Mac rendering
    // Additional alignment properties
    verticalAlign: 'baseline', // Ensure baseline alignment
    display: 'block', // Block display for better positioning control
    // Rotation will be applied dynamically with proper transform-origin
    transform: undefined, // Will be set dynamically in handleContentChange
    transformOrigin: undefined, // Will be calculated dynamically
    // Mobile-specific overrides to prevent interference from global styles
    margin: '0',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    // Ensure minimum font size for iOS to prevent zoom, but allow inline override
    // Disable mobile-specific touch behaviors that might interfere
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    // Ensure precise text selection
    WebkitUserSelect: 'text',
    MozUserSelect: 'text',
    userSelect: 'text',
    // Disable browser autocomplete styles
    WebkitBoxShadow: 'none',
    MozBoxShadow: 'none'
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
          className="text-edit-overlay-input text-edit-overlay-textarea"
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
            backgroundColor: 'transparent',
            border: 'none',
            // Explicit editable styles and fixes for textarea
            pointerEvents: 'all',
            userSelect: 'text',
            cursor: 'text',
            display: 'block', // Ensure proper display
            verticalAlign: 'top', // Better alignment for textarea
            whiteSpace: 'pre-wrap', // Preserve line breaks
            wordWrap: 'break-word', // Handle long words
            lineHeight: textElement.style.lineHeight || '1.2', // More explicit line height for multiline
            // Override fontSize to ensure exact size (after iOS zoom prevention)
            fontSize: position.fontSize
          }}
          rows={Math.max(2, (currentContent as string[]).length)}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          className="text-edit-overlay-input text-edit-overlay-input-single"
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
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            // Ensure font properties match exactly
            fontSize: position.fontSize,
            fontFamily: position.fontFamily,
            lineHeight: '1', // Match SVG text line height
            padding: '0', // Remove default padding
            margin: '0', // Remove default margin
            boxSizing: 'border-box'
          }}
        />
      )}
    </>,
    document.body // Render directly into document.body, outside any SVG
  );
};