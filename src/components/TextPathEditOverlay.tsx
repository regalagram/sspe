import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ViewportState, SVGTextPath } from '../types';

// Font-specific baseline corrections to improve text alignment
const calculateFontBaselineCorrection = (fontFamily: string, fontSize: number): number => {
  const family = fontFamily?.toLowerCase() || '';
  
  // Font-specific corrections - these are fixed pixel offsets
  const corrections: Record<string, number> = {
    'times': -2,
    'serif': -2,
    'georgia': -2,
    'arial': -1,
    'helvetica': -1,
    'sans-serif': -1,
    'courier': 0,
    'monospace': 0,
    'verdana': -1,
    'tahoma': -1
  };
  
  let correctionFactor = -1; // Default correction
  
  for (const [fontName, factor] of Object.entries(corrections)) {
    if (family.includes(fontName)) {
      correctionFactor = factor;
      break;
    }
  }
  
  // Return correction in pixels (no scaling by font size to avoid zoom amplification issues)
  // The correction is a fixed pixel offset, not proportional to font size
  const baselineCorrection = correctionFactor;
  
  return baselineCorrection;
};

interface TextPathEditOverlayProps {
  textPath: SVGTextPath;
  viewport: ViewportState;
  onContentChange: (content: string) => void;
  onFinishEditing: (save: boolean, finalContent?: string) => void;
}

interface TextPathPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

export const TextPathEditOverlay: React.FC<TextPathEditOverlayProps> = ({
  textPath,
  viewport,
  onContentChange,
  onFinishEditing
}) => {
      
  // Track component mount/unmount
  useEffect(() => {
        return () => {
          };
  }, [textPath.id]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<TextPathPosition | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>(''); // Local input state to prevent overwrites
  
  // Track input value changes for debugging
  useEffect(() => {
      }, [inputValue]);

  // Calculate the exact position for the textpath edit overlay
  const calculateTextPathPosition = useMemo((): TextPathPosition | null => {
    try {
      // Find the actual SVG text element in the DOM by data attribute
      // For textpaths, the data attributes are on the <text> element, not the <textPath> element
      const svgTextElement = document.querySelector(`[data-element-type="textPath"][data-element-id="${textPath.id}"]`);
      if (!svgTextElement) {
        console.warn('TextPathEditOverlay: Could not find SVG textpath element:', textPath.id);
        console.warn('TextPathEditOverlay: Looking for selector:', `[data-element-type="textPath"][data-element-id="${textPath.id}"]`);
        return null;
      }

      // Calculate font size in screen pixels (accounting for zoom)
      const fontSize = (textPath.style?.fontSize || 16) * viewport.zoom;
      
      // Get the bounding box of the textpath element
      const textRect = svgTextElement.getBoundingClientRect();
      
      // For textpath, calculate dimensions based on content length and font size
      // rather than the curved path dimensions to avoid very tall/narrow boxes
      const contentLength = textPath.content.length;
      const estimatedTextWidth = Math.max(
        contentLength * fontSize * 0.6, // Rough character width estimation
        fontSize * 5 // Minimum reasonable width
      );
      
      // Use a fixed height based on font size for better UX
      let inputWidth = Math.min(estimatedTextWidth, textRect.width * 2); // Don't make it too wide
      let inputHeight = fontSize * 1.4; // Single line height
      
      // Position at the center of the textpath's bounding box
      let inputX = textRect.left + (textRect.width - inputWidth) / 2;
      let inputY = textRect.top + (textRect.height - inputHeight) / 2;
      
      // Apply font-specific baseline correction for better alignment
      const baselineCorrection = calculateFontBaselineCorrection(textPath.style?.fontFamily || 'Arial', fontSize);
      inputY += baselineCorrection;
      
      return {
        x: inputX,
        y: inputY,
        width: inputWidth,
        height: inputHeight,
        fontSize,
        fontFamily: textPath.style?.fontFamily || 'Arial, sans-serif'
      };
    } catch (error) {
      console.error('TextPathEditOverlay: Error calculating position:', error);
      return null;
    }
  }, [textPath.id, textPath.style?.fontSize, textPath.style?.fontFamily, viewport.zoom, viewport.pan.x, viewport.pan.y]);

  // Initialize content and position
  useEffect(() => {
        setPosition(calculateTextPathPosition);
    
    // Only set initial content if we don't already have input value (prevents overwrites during typing)
    if (inputValue === '' || inputValue === undefined) {
      setCurrentContent(textPath.content);
      setInputValue(textPath.content);
          } else {
          }
  }, [textPath.id, calculateTextPathPosition]); // Depend on the memoized position calculation

  // Update position when viewport changes (but not constantly during typing)
  useEffect(() => {
    // Update position if viewport zoom or pan changes significantly
    if (!position || 
        Math.abs(viewport.zoom - (position.fontSize / (textPath.style?.fontSize || 16))) > 0.1) {
            setPosition(calculateTextPathPosition);
    } else {
          }
    }, [viewport.zoom, viewport.pan.x, viewport.pan.y, calculateTextPathPosition]); // Depend on zoom, pan, and the memoized position calculation

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    // Update local input state immediately to prevent overwrites
    setInputValue(newContent);
    
    // Update input width dynamically
    if (inputRef.current && position) {
      const fontSize = position.fontSize;
      
      // Estimate new width based on content
      const newWidth = Math.max(
        newContent.length * fontSize * 0.6, // Rough character width estimation
        fontSize * 3 // Minimum width
      );
      
      inputRef.current.style.width = `${newWidth}px`;
      
      // Maintain all text styling properties for consistency
      inputRef.current.style.letterSpacing = String(textPath.style?.letterSpacing || '0px');
      inputRef.current.style.wordSpacing = String(textPath.style?.wordSpacing || '0px');
      inputRef.current.style.fontKerning = 'auto';
      
      // Force correct font-size with !important to override mobile CSS
      inputRef.current.style.setProperty('font-size', `${position.fontSize}px`, 'important');
    }
    
    // Only update currentContent locally, don't call onContentChange immediately
    setCurrentContent(newContent);
  }, [position, textPath.style?.letterSpacing, textPath.style?.wordSpacing]);

  // Handle finishing editing with content sync
  const handleFinishEditing = useCallback((save: boolean) => {
    if (save) {
      onFinishEditing(save, inputValue);
    } else {
      onFinishEditing(save);
    }
  }, [inputValue, onFinishEditing]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        handleFinishEditing(false); // Cancel editing
        break;
      case 'Enter':
        // For textpath, Enter saves and exits (single line only)
        e.preventDefault();
        e.stopPropagation();
        handleFinishEditing(true); // Save editing
        break;
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        handleFinishEditing(true); // Save and move to next
        break;
    }
  }, [handleFinishEditing]);

  // Handle blur events (clicking outside)
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Small delay to allow other interactions to register first
    setTimeout(() => {
      onFinishEditing(true); // Save on blur
    }, 100);
  }, [onFinishEditing]);

  // Force correct font-size and visibility on mobile by using !important via JavaScript
  useEffect(() => {
    if (!inputRef.current || !position) return;
    
    const input = inputRef.current;
    
    // Force the exact font-size using setProperty with !important to override mobile CSS
    input.style.setProperty('font-size', `${position.fontSize}px`, 'important');
    
    // Remove visual styling for perfect alignment
    input.style.setProperty('background-color', 'transparent', 'important');
    input.style.setProperty('border', 'none', 'important');
    input.style.setProperty('border-radius', '0', 'important');
    input.style.setProperty('box-shadow', 'none', 'important');
    input.style.setProperty('outline', 'none', 'important');
    
    // Ensure text interaction works
    input.style.setProperty('user-select', 'text', 'important');
    input.style.setProperty('-webkit-user-select', 'text', 'important');
    input.style.setProperty('-moz-user-select', 'text', 'important');
    input.style.setProperty('pointer-events', 'all', 'important');
    input.style.setProperty('cursor', 'text', 'important');
    
    // Also set other critical properties that might be overridden
    input.style.setProperty('min-height', 'unset', 'important');
    input.style.setProperty('padding', '0', 'important');
    input.style.setProperty('margin', '0', 'important');
    
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

  // Apply styling when position is available
  useEffect(() => {
    if (!inputRef.current || !position) return;
    
    const input = inputRef.current;
    
    // Standard styling for textpath input
    input.style.transform = '';
    input.style.transformOrigin = '';
    input.style.textAlign = 'left';
    input.style.display = 'block';
    input.style.alignItems = 'unset';
    input.style.justifyContent = 'unset';
  }, [position]);

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
        
        // Select all text for easy replacement
        inputRef.current.select();
        
              } else {
              }
    }, 10); // Small delay to ensure DOM rendering
    
    return () => clearTimeout(timeoutId);
  }, [position]); // Run when position becomes available

  // Don't render if position is not calculated yet
  if (!position) {
        return null;
  }

    
  // Shared styles for input/textarea (based on TextEditOverlay)
  const sharedStyles: React.CSSProperties = {
    position: 'fixed', // Fixed positioning for overlay
    left: position.x,
    top: position.y,
    width: position.width,
    fontSize: position.fontSize, // Use exact dynamic font size (will handle iOS zoom separately)
    fontFamily: position.fontFamily,
    fontWeight: textPath.style?.fontWeight || 'normal',
    fontStyle: textPath.style?.fontStyle || 'normal',
    color: typeof textPath.style?.fill === 'string' && textPath.style?.fill !== 'none' ? textPath.style?.fill : '#000000',
    // IMPORTANT: Override CSS !important styles with inline styles that have higher specificity
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0',
    outline: 'none',
    boxShadow: 'none',
    padding: '0', // Remove all padding for perfect text alignment
    zIndex: 99999, // Much higher z-index
    boxSizing: 'border-box', // Use border-box to include padding and border in dimensions
    // Text styling to match SVG text as closely as possible
    textAlign: 'left', // SVG textAnchor will be handled by positioning
    lineHeight: '1', // Exact line height for precise alignment
    // Match exact letter spacing and word spacing from SVG text
    letterSpacing: textPath.style?.letterSpacing || '0',
    wordSpacing: textPath.style?.wordSpacing || '0',
    // Simplified CSS to match SVG text rendering more closely
    fontKerning: 'normal', // Changed from 'auto' to be more predictable
    textRendering: 'geometricPrecision', // Changed for exact sizing
    WebkitFontSmoothing: 'subpixel-antialiased', // Less aggressive smoothing
    MozOsxFontSmoothing: 'auto', // Default Mac rendering
    // Additional alignment properties
    verticalAlign: 'baseline', // Ensure baseline alignment
    display: 'block', // Block display for better positioning control
    // Mobile-specific overrides to prevent interference from global styles
    margin: '0',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    // Ensure minimum font size for iOS to prevent zoom, but allow inline override
    // Disable mobile-specific touch behaviors that might interfere
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    // Ensure precise text selection - CRITICAL FOR CURSOR FUNCTIONALITY
    WebkitUserSelect: 'text',
    MozUserSelect: 'text',
    userSelect: 'text',
    // Enable pointer events for text interaction
    pointerEvents: 'all',
    cursor: 'text',
    // Disable browser autocomplete styles
    WebkitBoxShadow: 'none',
    MozBoxShadow: 'none'
  };

  // Render the overlay outside the SVG using a portal
  return ReactDOM.createPortal(
    <>
      {/* Input for editing textpath */}
      <input
        ref={inputRef}
        className="textpath-edit-input"
        type="text"
        value={inputValue}
        autoFocus
        tabIndex={1}
        readOnly={false}
        disabled={false}
        spellCheck={false}
        contentEditable={true}
        data-testid="textpath-text-editor"
        placeholder="Editar texto en ruta..."
        onChange={(e) => {
          handleContentChange(e.target.value);
        }}
        onKeyDown={(e) => {
          handleKeyDown(e);
        }}
        onInput={(e) => {
          // Additional input handling if needed
        }}
        onFocus={() => {
          // Focus handling if needed
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
          // Override specific properties for single-line input
          height: position.height,
          // Keep background and border from sharedStyles for visibility
          // Ensure font properties match exactly
          fontSize: position.fontSize,
          fontFamily: position.fontFamily,
          lineHeight: '1', // Match SVG text line height
          margin: '0' // Remove default margin
        }}
      />
    </>,
    document.body // Render directly into document.body, outside any SVG
  );
};
