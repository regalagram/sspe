/**
 * Simplified hook for managing floating toolbar
 * Creates individual toolbar elements for each instance
 */

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Safe JSON stringify that handles circular references
const safeStringify = (obj: any, indent = 2) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Skip properties that might cause circular references
      if (key === 'content' && typeof value === 'object' && value !== null) {
        return '[React Element - skipped to avoid circular reference]';
      }
      if (key === 'attributes' && Array.isArray(value)) {
        // Simplify attributes to avoid complex objects
        return value.map((attr: any) => `${attr.name}="${attr.value}"`);
      }
      return value;
    }, indent);
  } catch (error) {
    return '[Could not stringify due to circular reference]';
  }
};

// Function to recursively find and clean all button elements from captured content
const findAndCleanAllButtonsFromContent = (capturedContent: any) => {
  if (!capturedContent) {
    console.log('🧽 [Cleanup] No captured content found');
    return 0;
  }

  let buttonsCleaned = 0;

  // Function to find buttons in HTML string using regex
  const findButtonsInHTML = (htmlString: string) => {
    if (!htmlString) return 0;

    // Match all <button> tags (case insensitive)
    const buttonRegex = /<button[^>]*>.*?<\/button>/gi;
    const matches = htmlString.match(buttonRegex) || [];

    matches.forEach((buttonHTML, index) => {
      console.log(`🧽 [Cleanup] Found and cleaning BUTTON ${buttonsCleaned + index}:`, {
        buttonHTML: buttonHTML.substring(0, 200) + (buttonHTML.length > 200 ? '...' : ''),
        // Extract attributes for logging
        title: buttonHTML.match(/title="([^"]*)"/)?.[1] || '',
        ariaLabel: buttonHTML.match(/aria-label="([^"]*)"/)?.[1] || '',
        className: buttonHTML.match(/class="([^"]*)"/)?.[1] || ''
      });

      // Since we can't access the actual DOM elements (they may be gone),
      // we'll log what we would clean and mark them as processed
      buttonsCleaned++;
    });

    return matches.length;
  };

  // Also check childrenDetails for any additional buttons
  const findButtonsInChildren = (children: any[]) => {
    if (!Array.isArray(children)) return;

    children.forEach((child, index) => {
      if (child.tagName === 'BUTTON') {
        console.log(`🧽 [Cleanup] Found and cleaning BUTTON ${buttonsCleaned}:`, {
          tagName: child.tagName,
          className: child.className,
          id: child.id,
          title: child.title,
          ariaLabel: child.attributes?.find((attr: any) => attr.name === 'aria-label')?.value,
          innerHTML: child.innerHTML?.substring(0, 100) + (child.innerHTML?.length > 100 ? '...' : '')
        });
        buttonsCleaned++;
      }

      // Check innerHTML of child elements for buttons
      if (child.innerHTML) {
        buttonsCleaned += findButtonsInHTML(child.innerHTML);
      }

      // Recursively check child elements
      if (child.childrenDetails && Array.isArray(child.childrenDetails)) {
        findButtonsInChildren(child.childrenDetails);
      }
    });
  };

  // Check main innerHTML first
  if (capturedContent.innerHTML) {
    console.log('🔍 [Cleanup] Checking main innerHTML for buttons:', {
      innerHTMLLength: capturedContent.innerHTML.length,
      innerHTMLPreview: capturedContent.innerHTML.substring(0, 300) + (capturedContent.innerHTML.length > 300 ? '...' : '')
    });
    buttonsCleaned += findButtonsInHTML(capturedContent.innerHTML);
  }

  // Then check childrenDetails
  if (capturedContent.childrenDetails && Array.isArray(capturedContent.childrenDetails)) {
    console.log('🔍 [Cleanup] Checking childrenDetails for buttons:', {
      childrenCount: capturedContent.childrenDetails.length
    });
    findButtonsInChildren(capturedContent.childrenDetails);
  }

  console.log(`🧽 [Cleanup] Found ${buttonsCleaned} BUTTON elements in captured content`);
  return buttonsCleaned;
};

interface UseFloatingToolbarSingletonOptions {
  isVisible: boolean;
  portalContainer: HTMLElement | null;
  position: { x: number; y: number } | null;
  isMobile?: boolean;
}

export const useFloatingToolbar = ({
  isVisible,
  portalContainer,
  position,
  isMobile = false
}: UseFloatingToolbarSingletonOptions) => {
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(null);
  const [isActuallyVisible, setIsActuallyVisible] = useState(isVisible);
  const [isCapturingContent, setIsCapturingContent] = useState(false);
  const [isShowingCleanupMessage, setIsShowingCleanupMessage] = useState(false);
  const isMountedRef = useRef(true);
  const lastCapturedContentRef = useRef<any>(null);
  const lastRenderedContentRef = useRef<any>(null);
  const lastValidContentRef = useRef<React.ReactNode>(null);
  const isCleaningUpRef = useRef(false);

  // Reset mounted state on hook initialization
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create/update toolbar element when needed
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (isActuallyVisible && portalContainer && position) {
      console.log('🎨 [Toolbar] Creating/updating visible toolbar:', {
        isVisible,
        isActuallyVisible,
        hasPortalContainer: !!portalContainer,
        position,
        toolbarElementExists: !!toolbarElement
      });

      // Remove existing element if any
      if (toolbarElement && toolbarElement.parentNode) {
        try {
          toolbarElement.parentNode.removeChild(toolbarElement);
        } catch (error) {
          console.warn('[Toolbar Hook] Error removing existing element:', error);
        }
      }

      // Create new toolbar element
      const element = createToolbarElement();
      portalContainer.appendChild(element);

      // Update position
      updateToolbarPosition(element, position, isMobile);

      setToolbarElement(element);
      console.log('✅ [Toolbar] New toolbar element created and positioned');
    }
    // NOTE: We DON'T hide the toolbar here when isVisible is false
    // The cleanup useEffect will handle showing the cleanup message and then hiding
  }, [isActuallyVisible, portalContainer, position, isMobile]);

  // Sync isActuallyVisible with isVisible, capture content immediately when hiding, then delay cleanup
  useEffect(() => {
    if (isVisible) {
      // When becoming visible, immediately set isActuallyVisible to true
      setIsActuallyVisible(true);
      setIsCapturingContent(false);
      setIsShowingCleanupMessage(false); // Reset cleanup message state
      isCleaningUpRef.current = false;
      lastCapturedContentRef.current = null;
      lastRenderedContentRef.current = null;
      lastValidContentRef.current = null; // Clear last valid content when becoming visible again
    } else if (!isVisible && isActuallyVisible && toolbarElement && toolbarElement.parentNode) {
      // When becoming invisible, DON'T capture content yet - just start cleanup process
      console.log('�️ [Toolbar Visibility] Toolbar becoming invisible - starting cleanup process');

      // CAPTURE CONTENT FROM LAST RENDERED CONTENT (not from DOM which may be empty)
      const capturedContent = lastRenderedContentRef.current || {
        innerHTML: '',
        childNodesCount: 0,
        childElementsCount: 0,
        textContent: '',
        style: toolbarElement.style.cssText,
        childrenDetails: []
      };

      lastCapturedContentRef.current = capturedContent;

      // LOG CAPTURED CONTENT IMMEDIATELY
      console.log('🔍 [Toolbar] CONTENT CAPTURED FROM LAST RENDERED (not from empty DOM):', safeStringify(capturedContent));

      // Log all child elements from captured content
      console.log('🔍 [Toolbar] === CHILD ELEMENTS CAPTURED FROM LAST RENDERED ===');
      if (capturedContent.childrenDetails) {
        capturedContent.childrenDetails.forEach((child: any, index: number) => {
          console.log(`🔍 [Captured] Child ${index} - ${child.tagName}.${child.className}:`, {
            tagName: child.tagName,
            className: child.className,
            id: child.id,
            innerHTML: child.innerHTML?.substring(0, 100) + (child.innerHTML?.length > 100 ? '...' : ''),
            outerHTML: child.outerHTML?.substring(0, 200) + (child.outerHTML?.length > 200 ? '...' : ''),
            style: child.style?.substring(0, 100) + (child.style?.length > 100 ? '...' : ''),
            attributes: child.attributes
          });
        });
      }
      console.log('🔍 [Toolbar] === END CHILD ELEMENTS CAPTURED FROM LAST RENDERED ===');

      // IMMEDIATE CLEANUP: Clean ALL buttons FROM CAPTURED CONTENT (not from DOM which may be empty)
      console.log('🧹 [Cleanup] IMMEDIATE CLEANUP: Starting cleanup of buttons from captured content');
      const buttonsCleaned = findAndCleanAllButtonsFromContent(capturedContent);
      console.log(`🧹 [Cleanup] IMMEDIATE CLEANUP: ${buttonsCleaned} buttons processed from captured content`);

      // Start 2-second delay to show cleanup message
      console.log('⏰ [Toolbar Visibility] Starting 2-second delay with cleanup message...');
      console.log('🔄 [Toolbar Visibility] Setting states:', {
        isShowingCleanupMessage: true,
        isActuallyVisible: false,
        isCleaningUp: true
      });
      setIsShowingCleanupMessage(true);
      setIsActuallyVisible(false); // Hide buttons immediately
      isCleaningUpRef.current = true;

      setTimeout(() => {
        console.log('⏰ [Toolbar Visibility] 2-second delay completed, hiding toolbar completely');
        console.log('🔄 [Toolbar Visibility] Current states before hiding:', {
          isShowingCleanupMessage,
          isActuallyVisible,
          isCleaningUp: isCleaningUpRef.current
        });

        // Hide cleanup message and complete removal
        setIsShowingCleanupMessage(false);
        isCleaningUpRef.current = false;

        // Final cleanup and removal
        if (toolbarElement && toolbarElement.parentNode) {
          try {
            toolbarElement.parentNode.removeChild(toolbarElement);
            console.log('✅ [Toolbar Visibility] Toolbar completely removed after cleanup message');
          } catch (error) {
            console.warn('[Toolbar Visibility] Error during final removal:', error);
          }
        }

      }, 2000); // 2 second delay for cleanup message
    }
  }, [isVisible, isActuallyVisible, toolbarElement]);
  useEffect(() => {
    // Simplified cleanup - only run when component unmounts or element is removed
    return () => {
      console.log('🔄 [Toolbar Cleanup] Component unmounting or element removed');
      if (toolbarElement && toolbarElement.parentNode) {
        try {
          // Final cleanup on unmount
          toolbarElement.parentNode.removeChild(toolbarElement);
          console.log('✅ [Toolbar Cleanup] Element removed on cleanup');
        } catch (error) {
          console.warn('[Toolbar Cleanup] Error during cleanup removal:', error);
        }
      }
    };
  }, [toolbarElement]);
  useEffect(() => {
    return () => {
      console.log('🔄 [Toolbar Cleanup] useEffect cleanup triggered');
      if (toolbarElement && toolbarElement.parentNode) {
        try {
          // AGGRESSIVE CLEANUP: Clear content and clean all references BEFORE removal
          console.log('🧹 [Toolbar Cleanup] Starting aggressive cleanup to prevent detached elements');

          // Log captured content if available (avoid circular references)
          if (lastCapturedContentRef.current) {
            try {
              console.log('📋 [Toolbar Cleanup] Content summary before cleanup:', {
                hasContent: !!lastCapturedContentRef.current.content,
                innerHTMLLength: lastCapturedContentRef.current.innerHTML?.length || 0,
                childElementsCount: lastCapturedContentRef.current.childrenDetails?.length || 0,
                textContentLength: lastCapturedContentRef.current.textContent?.length || 0
              });
              // Don't stringify the full object to avoid circular references
            } catch (error) {
              console.log('📋 [Toolbar Cleanup] Could not log captured content due to serialization error');
            }
          }

          // Step 1: Force cleanup of all child elements and their references FIRST
          const cleanupDetachedElements = (element: Element) => {
            // Clean all child elements recursively
            Array.from(element.children).forEach(child => {
              // Clear all event listeners and references
              if (child instanceof HTMLElement) {
                console.log('🧽 [Cleanup] Cleaning child element:', {
                  tagName: child.tagName,
                  className: child.className,
                  id: child.id,
                  innerHTML: child.innerHTML?.substring(0, 100) + (child.innerHTML?.length > 100 ? '...' : ''),
                  style: child.style.cssText?.substring(0, 100) + (child.style.cssText?.length > 100 ? '...' : '')
                });

                // Clear pointer events only (no mouse/touch events in this system)
                const pointerProps = [
                  'onpointerdown', 'onpointerup', 'onpointermove', 'onpointerenter', 'onpointerleave', 'onpointercancel'
                ];
                pointerProps.forEach(prop => {
                  if (prop in child) {
                    const originalValue = (child as any)[prop];
                    (child as any)[prop] = null;
                    console.log(`🧽 [Cleanup] Cleared ${prop} from ${child.tagName} (was: ${originalValue})`);
                  }
                });

                // Clear React references
                const reactProps = ['_reactInternalFiber', '__reactFiber', '_customHandlers', '_customListeners'];
                reactProps.forEach(prop => {
                  if (prop in child) {
                    const originalValue = (child as any)[prop];
                    delete (child as any)[prop];
                    console.log(`🧽 [Cleanup] Deleted ${prop} from ${child.tagName} (was: ${originalValue})`);
                  }
                });

                // Clear data attributes that might hold references
                Array.from(child.attributes).forEach(attr => {
                  if (attr.name.startsWith('data-') && attr.value && attr.value.includes('object')) {
                    try {
                      child.removeAttribute(attr.name);
                    } catch (e) {
                      // Ignore cleanup errors
                    }
                  }
                });

                // Recursively clean children
                cleanupDetachedElements(child);
              }
            });
          };

          // Clean all children first
          cleanupDetachedElements(toolbarElement);
          console.log('✅ [Toolbar Cleanup] Children cleaned, now showing cleanup message');

          // Step 2: Replace content with cleanup message (AFTER cleaning children)
          toolbarElement.innerHTML = `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 12px 16px;
              background: rgba(0, 0, 0, 0.9);
              color: white;
              border-radius: 6px;
              border: 2px solid #ff6b6b;
              font-size: 12px;
              font-weight: bold;
              text-align: center;
              min-width: 120px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            ">
              <div style="margin-bottom: 4px;">🧹 toolbar</div>
              <div style="font-size: 10px; opacity: 0.8;">limpiando...</div>
            </div>
          `;
          console.log('📝 [Toolbar Cleanup] Cleanup message set INSIDE toolbar:', toolbarElement.innerHTML);

          // Force visibility and reflow
          toolbarElement.style.display = 'block';
          toolbarElement.style.visibility = 'visible';
          toolbarElement.style.opacity = '1';
          toolbarElement.offsetHeight; // Force reflow
          console.log('🔄 [Toolbar Cleanup] Reflow forced, cleanup message visible inside toolbar');

          // Step 3: Clear the element's own references
          const selfProps = ['_reactInternalFiber', '__reactFiber', '_customHandlers', '_customListeners'];
          selfProps.forEach(prop => {
            if (prop in toolbarElement) {
              try {
                delete (toolbarElement as any)[prop];
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          });

          // Step 4: Clear all attributes that might hold references
          Array.from(toolbarElement.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && attr.value && attr.value.includes('object')) {
              try {
                toolbarElement.removeAttribute(attr.name);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          });

          // Step 5: Delay of 2 seconds to show cleanup message before removal
          console.log('⏰ [Toolbar Cleanup] Starting 2-second delay before removal');
          setTimeout(() => {
            console.log('⏰ [Toolbar Cleanup] 2-second delay completed, removing element');
            try {
              if (toolbarElement.parentNode) {
                toolbarElement.parentNode.removeChild(toolbarElement);
                console.log('✅ [Toolbar Cleanup] Element successfully removed after aggressive cleanup');
              } else {
                console.log('⚠️ [Toolbar Cleanup] Element has no parent node, already removed?');
              }
            } catch (error) {
              console.warn('[Toolbar Cleanup] Error during final removal:', error);
            }
          }, 2000); // 2 second delay to show cleanup message

        } catch (error) {
          console.warn('[Toolbar Hook] Error during aggressive cleanup:', error);
          // Fallback to simple removal
          try {
            if (toolbarElement.parentNode) {
              toolbarElement.parentNode.removeChild(toolbarElement);
            }
          } catch (fallbackError) {
            console.warn('[Toolbar Hook] Fallback removal also failed:', fallbackError);
          }
        }
      }

      // Reset references on cleanup
      isCleaningUpRef.current = false;
      lastCapturedContentRef.current = null;
    };
  }, [toolbarElement]);

  // Handle cleanup message display duration
  useEffect(() => {
    if (isShowingCleanupMessage) {
      console.log('⏰ [Cleanup Message] Showing cleanup message for 3 seconds...');
      const timer = setTimeout(() => {
        console.log('⏰ [Cleanup Message] Cleanup message duration completed, hiding message');
        setIsShowingCleanupMessage(false);
        // Final cleanup after message is hidden
        setTimeout(() => {
          console.log('🧹 [Cleanup Message] Final cleanup after message hidden');
          isCleaningUpRef.current = false;
          lastCapturedContentRef.current = null;
        }, 100);
      }, 3000); // Show cleanup message for 3 seconds

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isShowingCleanupMessage]);

  return {
    toolbarElement,
    renderPortal: (content: React.ReactNode) => {
      // Always render content if we have an element and are actually visible
      // OR if we're in cleanup mode (showing cleanup message)
      // OR if we're in capture mode (keeping content visible during delay)
      const shouldRender = toolbarElement && (isActuallyVisible || isCleaningUpRef.current || isCapturingContent || isShowingCleanupMessage);

      console.log('🔍 [renderPortal] Evaluating render conditions:', {
        hasToolbarElement: !!toolbarElement,
        isActuallyVisible,
        isCleaningUp: isCleaningUpRef.current,
        isCapturingContent,
        isShowingCleanupMessage,
        shouldRender,
        hasContent: !!content,
        hasLastValidContent: !!lastValidContentRef.current,
        isVisible,
        contentType: typeof content
      });

      if (shouldRender) {
        console.log('✅ [Toolbar] renderPortal active, rendering content:', {
          isVisible,
          isActuallyVisible,
          isCapturingContent,
          isShowingCleanupMessage,
          isCleaningUp: isCleaningUpRef.current,
          hasContent: !!content,
          hasLastValidContent: !!lastValidContentRef.current,
          usingLastValidContent: !content && isCapturingContent,
          contentType: typeof content,
          toolbarInnerHTML: toolbarElement.innerHTML.substring(0, 200) + (toolbarElement.innerHTML.length > 200 ? '...' : '')
        });

        // CAPTURE THE CURRENT RENDERED CONTENT for future cleanup
        if (content && toolbarElement) {
          const renderedContent = {
            content,
            innerHTML: toolbarElement.innerHTML,
            childNodesCount: toolbarElement.childNodes.length,
            childElementsCount: toolbarElement.children.length,
            textContent: toolbarElement.textContent || '',
            childrenDetails: Array.from(toolbarElement.children).map((child, index) => {
              if (child instanceof HTMLElement) {
                return {
                  index,
                  tagName: child.tagName,
                  className: child.className,
                  id: child.id,
                  innerHTML: child.innerHTML,
                  outerHTML: child.outerHTML.substring(0, 200) + (child.outerHTML.length > 200 ? '...' : ''),
                  attributes: Array.from(child.attributes).map(attr => `${attr.name}="${attr.value}"`),
                  style: child.style.cssText
                };
              }
              return { index, type: child.nodeType, textContent: child.textContent };
            })
          };
          lastRenderedContentRef.current = renderedContent;
          lastValidContentRef.current = content; // Store the last valid content
          console.log('📝 [Toolbar] Content captured during render:', {
            hasContent: !!content,
            childElementsCount: renderedContent.childElementsCount,
            innerHTMLLength: renderedContent.innerHTML.length,
            lastValidContentStored: !!lastValidContentRef.current
          });
        }

        // Use the current content if available, otherwise use the last valid content during capture mode
        let contentToRender = content || (isCapturingContent ? lastValidContentRef.current : null);

        // If showing cleanup message, override with cleanup message content
        if (isShowingCleanupMessage) {
          console.log('🎯 [Toolbar] SHOWING CLEANUP MESSAGE - overriding content');
          contentToRender = React.createElement('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
              minWidth: '140px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }
          }, 'Cleaning toolbar ...');
        } else {
          console.log('❌ [Toolbar] NOT showing cleanup message, isShowingCleanupMessage:', isShowingCleanupMessage);
        }

        if (!contentToRender) {
          console.log('⚠️ [Toolbar] No content to render, blocking portal');
          return null;
        }

        console.log('✅ [Toolbar] renderPortal active, rendering content:', {
          isVisible,
          isActuallyVisible,
          isCapturingContent,
          isShowingCleanupMessage,
          isCleaningUp: isCleaningUpRef.current,
          hasContent: !!content,
          hasLastValidContent: !!lastValidContentRef.current,
          usingLastValidContent: !content && isCapturingContent,
          contentType: typeof contentToRender,
          contentKeys: contentToRender && typeof contentToRender === 'object' && 'key' in contentToRender ? (contentToRender as any).key : 'no-key',
          toolbarInnerHTML: toolbarElement.innerHTML.substring(0, 200) + (toolbarElement.innerHTML.length > 200 ? '...' : '')
        });

        try {
          return createPortal(contentToRender, toolbarElement);
        } catch (error) {
          console.error('[Toolbar] Error creating portal:', error);
          return null;
        }
      }

      // Block renderPortal if conditions not met
      console.log('🚫 [Toolbar] renderPortal blocked - conditions not met:', {
        hasToolbarElement: !!toolbarElement,
        isMounted: isMountedRef.current,
        isVisible,
        isActuallyVisible,
        isCapturingContent,
        isShowingCleanupMessage,
        isCleaningUp: isCleaningUpRef.current,
        hasContent: !!content
      });
      return null;
    }
  };
};

const createToolbarElement = (): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'floating-toolbar-content';
  element.style.cssText = `
    position: absolute;
    z-index: 40;
    pointer-events: auto;
    display: flex;
    flex-direction: row;
    gap: 0px;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  `;
  return element;
};

/**
 * Update toolbar position and mobile-specific styles
 */
const updateToolbarPosition = (
  element: HTMLDivElement,
  position: { x: number; y: number },
  isMobile: boolean
) => {
  // Only update positioning properties, don't overwrite the base styles
  element.style.left = isMobile ? '50%' : `${position.x}px`;
  element.style.top = isMobile ? '8px' : `${position.y}px`;
  element.style.transform = isMobile ? 'translateX(-50%)' : 'none';
  element.style.webkitTransform = isMobile ? 'translate3d(-50%, 0, 0)' : 'none';
  element.style.animation = isMobile ? 'none' : '0.2s ease-out 0s 1 normal forwards running fadeInScale';
  element.style.transformOrigin = 'center bottom';
  element.style.zIndex = isMobile ? '9999' : '40';
};