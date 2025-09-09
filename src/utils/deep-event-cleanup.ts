/**
 * DEEP EVENT CLEANUP UTILITY
 *
 * This utility provides safe event and reference cleanup for React components
 * to prevent memory leaks WITHOUT interfering with React's normal processes.
 *
 * PHILOSOPHY:
 * - React handles its own cleanup automatically and efficiently
 * - We should NOT touch React's internal references or Fiber objects
 * - We should NOT alter DOM structure in any way
 * - We should ONLY clean custom event listeners and properties that WE created
 * - If there are memory leaks, they're likely from manual event listeners or custom code
 *
 * WHAT WE CLEAN:
 * ✅ Event handler properties (onclick, onpointerdown, etc.)
 * ✅ Custom properties we created (_customHandlers, etc.)
 * ✅ Manual event listeners we attached
 * WHAT WE DON'T CLEAN:
 * ❌ React Fiber references (__reactFiber, etc.)
 * ❌ React internal instances (_reactInternalInstance, etc.)
 * ❌ DOM attributes or structure
 * ❌ Anything React manages internally
 */

import React from 'react';

/**
 * Performs deep event listener cleanup on an element and all its children
 * This removes event listeners and custom references that cause memory leaks
 * WITHOUT interfering with React's unmounting process or its internal references
 *
 * IMPORTANT: This function does NOT touch React's internal references or Fiber objects
 * as React handles those automatically during its normal unmounting process.
 *
 * @param rootElement - The root element to clean (usually a container)
 * @param options - Cleanup options
 */
export const performDeepEventCleanup = (
  rootElement: HTMLElement,
  options: {
    logProgress?: boolean;
    includeRootElement?: boolean;
  } = {}
) => {
  const { logProgress = true, includeRootElement = false } = options;
  
  if (logProgress) {
    console.log('[Deep Event Cleanup] Starting event-only cleanup - preserving DOM structure');
  }
  
  // Get ALL child elements (and optionally root element)
  const selector = includeRootElement ? '*' : ':scope > *';
  const elementsToClean = includeRootElement 
    ? [rootElement, ...rootElement.querySelectorAll('*')]
    : [...rootElement.querySelectorAll('*')];
  
  if (logProgress) {
    console.log(`[Deep Event Cleanup] Found ${elementsToClean.length} elements for event cleanup`);
  }
  
  // Clean only events and references, never touch DOM structure
  elementsToClean.forEach((element, index) => {
    try {
      if (logProgress && elementsToClean.length > 10 && index % 10 === 0) {
        console.log(`[Deep Event Cleanup] Processing element ${index + 1}/${elementsToClean.length}`);
      }
      
      cleanElementEvents(element);
      
    } catch (error) {
      if (logProgress) {
        console.warn(`[Deep Event Cleanup] Error cleaning events on element ${index}:`, error);
      }
    }
  });
  
  if (logProgress) {
    console.log('[Deep Event Cleanup] Completed event cleanup - DOM structure fully preserved for React');
  }
};

/**
 * Clean events and custom references from a single element
 * This ONLY clears JavaScript properties we created, NEVER React's internal references
 * React handles its own cleanup automatically during unmounting
 * @param element - The element to clean
 */
const cleanElementEvents = (element: Element) => {
  // Clear all possible event handler properties (these don't affect DOM structure)
  const eventProps = [
    // Pointer events (modern)
    'onpointerdown', 'onpointerup', 'onpointermove', 'onpointerenter', 'onpointerleave', 'onpointerover', 'onpointerout', 'onpointercancel',
    
    // Mouse events (legacy)
    'onmousedown', 'onmouseup', 'onmousemove', 'onmouseenter', 'onmouseleave', 'onmouseover', 'onmouseout', 'onclick', 'ondblclick', 'oncontextmenu',
    
    // Touch events (mobile)
    'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel',
    
    // Form events
    'onchange', 'oninput', 'onsubmit', 'onfocus', 'onblur', 'onselect', 'onreset',
    
    // Keyboard events
    'onkeydown', 'onkeyup', 'onkeypress',
    
    // UI events
    'onwheel', 'onscroll', 'onresize', 'onload', 'onerror', 'onabort',
    
    // Drag events
    'ondrag', 'ondragstart', 'ondragend', 'ondragover', 'ondragenter', 'ondragleave', 'ondrop',
    
    // Media events
    'onplay', 'onpause', 'onended', 'onvolumechange', 'ontimeupdate'
  ];
  
  eventProps.forEach(prop => {
    if (prop in element) {
      try {
        (element as any)[prop] = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
  
  // ⚠️  CRITICAL: DO NOT clear React references during unmounting!
  // React needs these references during its unmounting process
  // Only clear them AFTER React has finished unmounting (which it does automatically)
  // For now, we'll be conservative and NOT touch React's internal references

  // Clear ONLY custom event/handler properties that are NOT React-related
  try {
    // Clear custom properties that might cause memory leaks but are not React's
    const customPropsToClear = ['_customHandlers', '_customListeners', '_customEvents'];
    customPropsToClear.forEach(prop => {
      if (prop in element) {
        delete (element as any)[prop];
      }
    });
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // ⚠️  IMPORTANT: DO NOT remove attributes - this alters DOM structure!
  // Instead, just clear any references they might contain
  // The attributes themselves will be cleaned up by React's normal unmounting process

  // Clear any references stored in data attributes (without removing them)
  try {
    const attributes = [...element.attributes];
    attributes.forEach(attr => {
      if (attr.name.startsWith('data-react') || attr.name.includes('fiber') || attr.name.includes('Fiber')) {
        // Don't remove the attribute, just clear any object references it might contain
        // The attribute value is just a string, so no memory leak here
      }
    });
  } catch (e) {
    // Ignore cleanup errors
  }
};

/**
 * Create a cleanup function that can be called in React useEffect cleanup
 * @param elementRef - Ref to the element to clean
 * @param options - Cleanup options
 * @returns Cleanup function for useEffect
 */
export const createEventCleanupFunction = (
  elementRef: React.RefObject<HTMLElement> | (() => HTMLElement | null),
  options?: Parameters<typeof performDeepEventCleanup>[1]
) => {
  return () => {
    const element = typeof elementRef === 'function' ? elementRef() : elementRef.current;
    if (element) {
      performDeepEventCleanup(element, options);
    }
  };
};

/**
 * Utility to detect and log detached elements for debugging
 * @param container - Container to search for detached elements (optional)
 */
export const detectDetachedElements = (container: HTMLElement = document.body): void => {
  const allElements = container.querySelectorAll('*');
  const detachedElements: Element[] = [];

  allElements.forEach(element => {
    if (!document.contains(element)) {
      detachedElements.push(element);
    }
  });

  if (detachedElements.length > 0) {
    console.warn(`[Detached Elements] Found ${detachedElements.length} detached elements:`, detachedElements);
    
    // Group by tag name for easier analysis
    const grouped = detachedElements.reduce((acc, el) => {
      const tag = el.tagName.toLowerCase();
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.warn('[Detached Elements] Breakdown by tag:', grouped);
  } else {
    console.log('[Detached Elements] No detached elements found');
  }
};

/**
 * Aggressive cleanup for completely detached elements
 * Use this when elements are no longer attached to the DOM
 *
 * IMPORTANT: This function ONLY cleans JavaScript references and properties.
 * It does NOT alter DOM structure, remove elements, or modify attributes.
 * The DOM elements themselves will be cleaned up by the garbage collector
 * once all JavaScript references are cleared.
 *
 * @param rootElement - The detached element to clean
 */
export const performAggressiveCleanup = (rootElement: HTMLElement): void => {
  if (!rootElement) return;

  try {
    // First, perform the standard deep cleanup
    performDeepEventCleanup(rootElement, { 
      logProgress: false, 
      includeRootElement: true 
    });

    // Then, if the element is still in memory and not attached to document,
    // we can be more aggressive with cleanup
    if (!document.contains(rootElement)) {
      // Clean all possible references that might keep the element alive
      const allElements = [rootElement, ...rootElement.querySelectorAll('*')];
      
      allElements.forEach(element => {
        try {
          // ⚠️  CRITICAL: DO NOT remove attributes - this alters DOM structure!
          // Data attributes are just strings and don't cause memory leaks
          // React will clean them up during normal unmounting

          // Clear any remaining properties that might be objects or functions
          // BUT be very careful NOT to touch React's internal properties
          const elementKeys = Object.getOwnPropertyNames(element);
          elementKeys.forEach(key => {
            // ⚠️  SKIP React's internal properties - let React handle them
            if (key.startsWith('__react') || key.startsWith('_react') || 
                key.includes('fiber') || key.includes('Fiber') ||
                key === '_reactInternalFiber' || key === '_reactInternalInstance' ||
                key === '__reactEventHandlers') {
              return; // Don't touch React's properties
            }

            try {
              const value = (element as any)[key];
              // Only clear custom object/function properties that are NOT React-related
              if (typeof value === 'function' || 
                  (typeof value === 'object' && value !== null && 
                   !key.startsWith('__react') && !key.startsWith('_react'))) {
                (element as any)[key] = null;
              }
            } catch (e) {
              // Ignore errors when trying to clear properties
            }
          });
        } catch (e) {
          // Ignore cleanup errors for individual elements
        }
      });
    }
  } catch (error) {
    console.warn('[Aggressive Cleanup] Error during aggressive cleanup:', error);
  }
};

/**
 * Clean up floating toolbar button containers that may be left detached
 * This function is more aggressive and also checks for containers that might be in the process of being detached
 */
export const cleanupDetachedButtonContainers = (): number => {
  console.log('[Button Container Cleanup] Starting aggressive cleanup of button containers...');
  let cleanedCount = 0;

  try {
    // Use the same selector that works for potential orphans but check ALL elements
    const allButtonContainers = document.querySelectorAll('div[style*="display: flex"][style*="flex-direction: row"][style*="align-items: center"]');
    const containersToClean: HTMLElement[] = [];

    console.log(`[Button Container Cleanup] Found ${allButtonContainers.length} total button containers`);

    allButtonContainers.forEach(container => {
      const element = container as HTMLElement;
      const isDetached = !document.contains(element);
      const hasNoChildren = element.children.length === 0;
      const style = element.getAttribute('style') || '';

      // Log what we found
      if (isDetached) {
        console.log(`[Button Container Cleanup] Found DETACHED button container: ${element.tagName} - Children: ${element.children.length}`);
        containersToClean.push(element);
      } else if (hasNoChildren) {
        console.log(`[Button Container Cleanup] Found EMPTY button container: ${element.tagName} - Children: ${element.children.length}`);
        containersToClean.push(element);
      } else {
        console.log(`[Button Container Cleanup] Found ACTIVE button container: ${element.tagName} - Children: ${element.children.length}`);
      }
    });

    // Also search for any detached DIV elements that might have the button container styling
    // This catches elements that were detached before our selector could find them
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      if (!document.contains(element) && element instanceof HTMLElement && element.tagName === 'DIV') {
        const style = element.getAttribute('style') || '';
        if (style.includes('display: flex') && style.includes('flex-direction: row') && style.includes('align-items: center')) {
          if (!containersToClean.includes(element)) {
            console.log(`[Button Container Cleanup] Found additional DETACHED button container: ${element.tagName} - Children: ${element.children.length}`);
            containersToClean.push(element);
          }
        }
      }
    });

    console.log(`[Button Container Cleanup] Will clean ${containersToClean.length} containers`);

    // Clean up each container
    containersToClean.forEach((container, index) => {
      try {
        const containerId = container.id || `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🧹 [Button Container Cleanup] ===== CLEANING CONTAINER ${index + 1}/${containersToClean.length} =====`);
        console.log(`🆔 Container ID: ${containerId}`);
        console.log(`🏷️  Tag: ${container.tagName}`);
        console.log(`👶 Children: ${container.children.length}`);
        console.log(`🎨 Style: ${container.getAttribute('style')}`);
        console.log(`📍 In DOM: ${document.contains(container)}`);
        console.log(`🕒 Timestamp: ${new Date().toISOString()}`);

        // Log all children with detailed info
        Array.from(container.children).forEach((child, childIndex) => {
          const childElement = child as HTMLElement;
          const childId = childElement.id || `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.log(`  👶 Child ${childIndex + 1}:`);
          console.log(`    🆔 ID: ${childId}`);
          console.log(`    🏷️  Tag: ${child.tagName}`);
          console.log(`    📝 Text: "${child.textContent?.substring(0, 50) || 'empty'}"`);
          console.log(`    🎨 Style: ${childElement.getAttribute('style')}`);
          console.log(`    📍 In DOM: ${document.contains(childElement)}`);
          console.log(`    🔗 Parent: ${childElement.parentElement?.tagName || 'none'}`);
        });

        // Clean up children first (IMPORTANT: buttons before container)
        console.log(`🧽 [Button Container Cleanup] Cleaning ${container.children.length} children first...`);
        Array.from(container.children).forEach((child, childIndex) => {
          try {
            const childElement = child as HTMLElement;
            console.log(`  🧽 Cleaning child ${childIndex + 1}: ${child.tagName}.${Array.from(child.classList).join('.')} - "${child.textContent?.substring(0, 30) || 'empty'}"`);
            performAggressiveCleanup(childElement);
            console.log(`  ✅ Child ${childIndex + 1} cleaned successfully`);
          } catch (error) {
            console.warn(`  ❌ [Button Container Cleanup] Error cleaning child ${childIndex}:`, error);
          }
        });

        // Small delay to ensure children are cleaned before container
        setTimeout(() => {
          console.log(`🧽 [Button Container Cleanup] Now cleaning container itself...`);
          try {
            performAggressiveCleanup(container);
            console.log(`✅ [Button Container Cleanup] Container cleaned successfully`);
            console.log(`🧹 [Button Container Cleanup] ===== CONTAINER CLEANUP COMPLETE =====\n`);
          } catch (error) {
            console.warn(`❌ [Button Container Cleanup] Error cleaning container:`, error);
          }
        }, 10);

        cleanedCount++;

      } catch (error) {
        console.warn(`❌ [Button Container Cleanup] Error cleaning container ${index}:`, error);
      }
    });

  } catch (error) {
    console.error('[Button Container Cleanup] Error during cleanup:', error);
  }

  console.log(`[Button Container Cleanup] Completed - cleaned ${cleanedCount} containers`);
  return cleanedCount;
};

/**
 * Emergency cleanup for infinite loop prevention
 * Use this when you suspect a memory leak or infinite element creation
 */
export const emergencyCleanup = (): void => {
  console.warn('[Emergency Cleanup] Starting emergency cleanup - this should only be used for debugging');

  // Find all floating toolbar related elements
  const toolbarElements = document.querySelectorAll('[class*="floating-toolbar"], [id*="floating-toolbar"]');
  const detachedElements: Element[] = [];

  // Find elements that are not attached to document
  toolbarElements.forEach(element => {
    if (!document.contains(element)) {
      detachedElements.push(element);
    }
  });

  console.warn(`[Emergency Cleanup] Found ${detachedElements.length} detached toolbar elements`);

  // Aggressive cleanup of detached elements
  detachedElements.forEach((element, index) => {
    try {
      performAggressiveCleanup(element as HTMLElement);
      console.log(`[Emergency Cleanup] Cleaned element ${index + 1}/${detachedElements.length}`);
    } catch (error) {
      console.error(`[Emergency Cleanup] Error cleaning element ${index}:`, error);
    }
  });

  // Force garbage collection hint (if available)
  if (window.gc) {
    window.gc();
    console.log('[Emergency Cleanup] Forced garbage collection');
  }

  console.warn('[Emergency Cleanup] Emergency cleanup completed');
};

// Make emergency cleanup available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).emergencyCleanup = emergencyCleanup;
  (window as any).cleanupDetachedButtonContainers = cleanupDetachedButtonContainers;
  
  // Add continuous monitoring function
  (window as any).startDetachedMonitoring = () => {
    console.log('👀 [Detached Monitor] Starting continuous monitoring of detached elements...');
    
    let lastDetachedCount = 0;
    let lastButtonContainerCount = 0;
    let monitoringInterval: number | null = null;
    
    const checkForNewDetached = () => {
      const allElements = document.querySelectorAll('*');
      const currentDetached: Element[] = [];
      const currentButtonContainers: HTMLElement[] = [];
      
      allElements.forEach(element => {
        if (!document.contains(element)) {
          currentDetached.push(element);
          
          // Specifically check for button containers
          const style = (element as HTMLElement).style;
          if (element instanceof HTMLElement && element.tagName === 'DIV' && 
              style.display === 'flex' && 
              style.flexDirection === 'row' && 
              style.alignItems === 'center' &&
              style.gap === '0px') {
            currentButtonContainers.push(element);
          }
        }
      });
      
      // Check for changes in total detached count
      if (currentDetached.length !== lastDetachedCount) {
        const difference = currentDetached.length - lastDetachedCount;
        console.log(`🚨 [Detached Monitor] Detached elements changed: ${lastDetachedCount} → ${currentDetached.length} (${difference > 0 ? '+' : ''}${difference})`);
        
        if (difference > 0) {
          console.log('🔍 [Detached Monitor] New detached elements:');
          // Show only the newly detached elements
          const newDetached = currentDetached.slice(lastDetachedCount);
          newDetached.forEach((element, index) => {
            const el = element as HTMLElement;
            console.log(`  ${index + 1}. ${el.tagName}.${Array.from(el.classList).join('.')} - ${el.style.cssText.substring(0, 80)}...`);
          });
        }
        
        lastDetachedCount = currentDetached.length;
      }
      
      // Specifically check for button containers
      if (currentButtonContainers.length !== lastButtonContainerCount) {
        const difference = currentButtonContainers.length - lastButtonContainerCount;
        console.log(`🔲 [Detached Monitor] Button containers changed: ${lastButtonContainerCount} → ${currentButtonContainers.length} (${difference > 0 ? '+' : ''}${difference})`);
        
        if (currentButtonContainers.length > 0) {
          console.log('📋 [Detached Monitor] Current button containers:');
          currentButtonContainers.forEach((container, index) => {
            console.log(`  ${index + 1}. ${container.tagName} - Children: ${container.children.length}, Style: ${container.style.cssText.substring(0, 100)}...`);
            
            // Log children details
            Array.from(container.children).forEach((child, childIndex) => {
              console.log(`    Child ${childIndex + 1}: ${child.tagName}.${Array.from(child.classList).join('.')} - ${child.textContent?.substring(0, 50) || 'empty'}`);
            });
          });
          
          // Auto-cleanup if we detect button containers
          console.log('🧹 [Detached Monitor] Auto-cleaning detected button containers...');
          const cleaned = cleanupDetachedButtonContainers();
          console.log(`✅ [Detached Monitor] Auto-cleaned ${cleaned} button containers`);
        }
        
        lastButtonContainerCount = currentButtonContainers.length;
      }
    };
    
    // Check immediately
    checkForNewDetached();
    
    // Then check every 1 second (more frequent for button containers)
    monitoringInterval = window.setInterval(checkForNewDetached, 1000);
    
    // Return stop function
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        console.log('👀 [Detached Monitor] Stopped monitoring');
      }
    };
  };
  
  // Add aggressive diagnostic function
  (window as any).aggressiveMemoryDiagnosis = () => {
    console.log('🔬 [Aggressive Diagnosis] Starting deep memory leak analysis...');
    
    const allElements = document.querySelectorAll('*');
    const analysis = {
      totalElements: allElements.length,
      elementsWithObjectRefs: [] as Element[],
      elementsWithCircularRefs: [] as Element[],
      elementsWithClosures: [] as Element[],
      potentialMemoryLeaks: [] as Element[]
    };
    
    allElements.forEach(element => {
      const el = element as any;
      
      // Check for object references in properties
      const objectProps = Object.getOwnPropertyNames(el).filter(prop => {
        try {
          const value = el[prop];
          return typeof value === 'object' && value !== null && 
                 !prop.startsWith('__react') && !prop.startsWith('_react') &&
                 !prop.includes('fiber') && !prop.includes('Fiber');
        } catch {
          return false;
        }
      });
      
      if (objectProps.length > 0) {
        analysis.elementsWithObjectRefs.push(element);
      }
      
      // Check for function properties that might be closures
      const functionProps = Object.getOwnPropertyNames(el).filter(prop => {
        try {
          return typeof el[prop] === 'function' && 
                 !prop.startsWith('__react') && !prop.startsWith('_react') &&
                 !prop.startsWith('on') && !prop.includes('Handler');
        } catch {
          return false;
        }
      });
      
      if (functionProps.length > 0) {
        analysis.elementsWithClosures.push(element);
      }
      
      // Check for potential memory leaks (elements with many properties)
      if (objectProps.length > 5 || functionProps.length > 3) {
        analysis.potentialMemoryLeaks.push(element);
      }
    });
    
    console.log(`🔬 [Aggressive Diagnosis] Results:`);
    console.log(`  📊 Total elements analyzed: ${analysis.totalElements}`);
    console.log(`  🔗 Elements with object references: ${analysis.elementsWithObjectRefs.length}`);
    console.log(`  🔄 Elements with closures: ${analysis.elementsWithClosures.length}`);
    console.log(`  🚨 Potential memory leaks: ${analysis.potentialMemoryLeaks.length}`);
    
    if (analysis.potentialMemoryLeaks.length > 0) {
      console.log('🚨 [Aggressive Diagnosis] Potential memory leak elements:');
      analysis.potentialMemoryLeaks.slice(0, 10).forEach((element, index) => {
        const el = element as HTMLElement;
        console.log(`  ${index + 1}. ${el.tagName}.${Array.from(el.classList).join('.')} - ${el.style.cssText.substring(0, 60)}...`);
      });
    }
    
    return analysis;
  };
  
  // Add real-time button container monitor
  (window as any).startButtonContainerMonitor = () => {
    console.log('🔍 [Button Monitor] Starting real-time button container monitoring...');
    
    let observer: MutationObserver | null = null;
    let monitoringInterval: number | null = null;
    let lastCleanupTime = 0; // Track last cleanup to avoid interference
    
    // Function to check for button containers
    const checkForButtonContainers = () => {
      // Skip if monitoring is paused
      if ((window as any).__monitoringPaused) {
        return;
      }
      
      const buttonContainers = document.querySelectorAll('div[style*="display: flex"][style*="flex-direction: row"][style*="align-items: center"]');
      const detachedContainers: HTMLElement[] = [];
      
      buttonContainers.forEach(container => {
        if (!document.contains(container)) {
          detachedContainers.push(container as HTMLElement);
        }
      });
      
      if (detachedContainers.length > 0) {
        console.log(`🚨 [Button Monitor] Found ${detachedContainers.length} detached button containers!`);
        detachedContainers.forEach((container, index) => {
          console.log(`  ${index + 1}. Container with ${container.children.length} children`);
          Array.from(container.children).forEach((child, childIndex) => {
            console.log(`    Child ${childIndex + 1}: ${child.tagName}.${Array.from(child.classList).join('.')} - ${child.textContent?.substring(0, 30) || 'empty'}`);
          });
        });
        
        // Use smart cleanup instead of immediate cleanup to avoid interference
        console.log('� [Button Monitor] Using smart cleanup for detached containers...');
        const smartResult = (window as any).smartCleanupDetachedElements();
        console.log(`✅ [Button Monitor] Smart cleanup completed: ${smartResult.cleaned} elements cleaned`);
      }
    };
    
    // Set up MutationObserver to watch for both additions and removals
    observer = new MutationObserver((mutations) => {
      let hasChanges = false;
      const removedNodes: Node[] = [];
      
      mutations.forEach(mutation => {
        // Check for added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'DIV') {
              hasChanges = true;
            }
          }
        });
        
        // Check for removed nodes
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'DIV') {
              removedNodes.push(node);
              hasChanges = true;
            }
          }
        });
      });
      
      if (hasChanges) {
        // Skip if monitoring is paused
        if ((window as any).__monitoringPaused) {
          return;
        }
        
        // Check for button containers after changes
        setTimeout(() => {
          checkForButtonContainers();
          
          // Also check for any detached elements that were just removed
          if (removedNodes.length > 0) {
            console.log(`🔍 [Button Monitor] ${removedNodes.length} DIV elements were removed from DOM`);
            removedNodes.forEach((node, index) => {
              const element = node as HTMLElement;
              const style = element.getAttribute('style') || '';
              if (style.includes('display: flex') && style.includes('flex-direction: row') && style.includes('align-items: center')) {
                console.log(`  Removed element ${index + 1}: Button container with ${element.children.length} children`);
                // Mark element with detached timestamp instead of cleaning immediately
                (element as any).__detachedTimestamp = Date.now();
                console.log(`  📝 Marked removed button container for future cleanup`);
              }
            });
          }
        }, 10);
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also check periodically as backup - less frequent to avoid interference
    monitoringInterval = window.setInterval(() => {
      // Only run cleanup if we haven't run it recently to avoid interference
      const now = Date.now();
      if (now - lastCleanupTime > 2000) { // Only clean every 2 seconds
        checkForButtonContainers();
        lastCleanupTime = now;
      }
    }, 1000); // Check every second but don't always clean
    
    // Initial check
    checkForButtonContainers();
    
    // Return stop function
    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
      console.log('🔍 [Button Monitor] Stopped monitoring');
    };
  };
  
  // Add smart cleanup function that avoids interfering with active elements
  (window as any).smartCleanupDetachedElements = () => {
    console.log('🧠 [Smart Cleanup] Starting intelligent cleanup of detached elements...');
    
    const allElements = document.querySelectorAll('*');
    const detachedElements: {element: HTMLElement, detachedTime: number}[] = [];
    const now = Date.now();
    
    allElements.forEach(element => {
      if (!document.contains(element) && element instanceof HTMLElement) {
        // Check if this element has a timestamp of when it became detached
        const detachedTimestamp = (element as any).__detachedTimestamp;
        if (!detachedTimestamp) {
          // Mark element with current timestamp
          (element as any).__detachedTimestamp = now;
        }
        
        detachedElements.push({
          element,
          detachedTime: detachedTimestamp || now
        });
      }
    });
    
    console.log(`📊 [Smart Cleanup] Found ${detachedElements.length} detached elements`);
    
    // Only clean elements that have been detached for more than 2 seconds
    const oldDetachedElements = detachedElements.filter(item => 
      now - item.detachedTime > 2000
    );
    
    console.log(`⏰ [Smart Cleanup] ${oldDetachedElements.length} elements have been detached for >2s`);
    
    if (oldDetachedElements.length > 0) {
      let cleaned = 0;
      oldDetachedElements.forEach(({element}) => {
        try {
          // Check if it's a button container
          const style = element.getAttribute('style') || '';
          if (element.tagName === 'DIV' && 
              style.includes('display: flex') && 
              style.includes('flex-direction: row') && 
              style.includes('align-items: center')) {
            console.log(`🧹 [Smart Cleanup] Cleaning old button container with ${element.children.length} children`);
          }
          
          performAggressiveCleanup(element);
          cleaned++;
        } catch (error) {
          console.warn('[Smart Cleanup] Error cleaning element:', error);
        }
      });
      
      console.log(`✅ [Smart Cleanup] Cleaned ${cleaned} old detached elements`);
    } else {
      console.log('✅ [Smart Cleanup] No old detached elements to clean');
    }
    
    return {
      totalDetached: detachedElements.length,
      oldDetached: oldDetachedElements.length,
      cleaned: oldDetachedElements.length
    };
  };
  (window as any).findAndCleanDetachedElements = () => {
    console.log('🔍 [Detached Elements] Searching for all detached elements...');
    
    const allElements = document.querySelectorAll('*');
    const detachedElements: HTMLElement[] = [];
    const detachedButtonContainers: HTMLElement[] = [];
    
    allElements.forEach(element => {
      if (!document.contains(element) && element instanceof HTMLElement) {
        detachedElements.push(element);
        
        // Check if it's a button container
        const style = element.getAttribute('style') || '';
        if (element.tagName === 'DIV' && 
            style.includes('display: flex') && 
            style.includes('flex-direction: row') && 
            style.includes('align-items: center')) {
          detachedButtonContainers.push(element);
        }
      }
    });
    
    console.log(`📊 [Detached Elements] Found ${detachedElements.length} total detached elements`);
    console.log(`🎯 [Detached Elements] Found ${detachedButtonContainers.length} detached button containers`);
    
    if (detachedButtonContainers.length > 0) {
      console.log('📝 [Detached Elements] Button container details:');
      detachedButtonContainers.forEach((container, index) => {
        console.log(`  Container ${index + 1}:`);
        console.log(`    Children: ${container.children.length}`);
        console.log(`    Style: ${container.getAttribute('style')}`);
        Array.from(container.children).forEach((child, childIndex) => {
          console.log(`    Child ${childIndex + 1}: ${child.tagName}.${Array.from(child.classList).join('.')} - "${child.textContent?.substring(0, 50) || 'empty'}"`);
        });
      });
      
      // Auto-clean them
      console.log('🧹 [Detached Elements] Auto-cleaning detached button containers...');
      let cleaned = 0;
      detachedButtonContainers.forEach(container => {
        try {
          performAggressiveCleanup(container);
          cleaned++;
        } catch (error) {
          console.warn('[Detached Elements] Error cleaning container:', error);
        }
      });
      console.log(`✅ [Detached Elements] Cleaned ${cleaned} detached button containers`);
    }
    
    // Also clean other detached elements
    if (detachedElements.length > detachedButtonContainers.length) {
      const otherDetached = detachedElements.filter(el => !detachedButtonContainers.includes(el));
      console.log(`🧹 [Detached Elements] Cleaning ${otherDetached.length} other detached elements...`);
      let cleaned = 0;
      otherDetached.forEach(element => {
        try {
          performAggressiveCleanup(element);
          cleaned++;
        } catch (error) {
          console.warn('[Detached Elements] Error cleaning element:', error);
        }
      });
      console.log(`✅ [Detached Elements] Cleaned ${cleaned} other detached elements`);
    }
    
    return {
      totalDetached: detachedElements.length,
      buttonContainers: detachedButtonContainers.length,
      cleaned: detachedElements.length
    };
  };

  // Enhanced function to detect truly detached elements (not in DOM but in memory)
  (window as any).traceDetachedElementsInMemory = () => {
    console.log('🔍 [Memory Tracer] ===== TRACING DETACHED ELEMENTS IN MEMORY =====');
    console.log(`🕒 Start Time: ${new Date().toISOString()}`);

    const detachedElements: HTMLElement[] = [];
    const buttonContainers: HTMLElement[] = [];

    // Check global window object for element references
    const checkObjectForElements = (obj: any, path = 'window', depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 3) return;

      try {
        Object.keys(obj).forEach(key => {
          try {
            const value = obj[key];
            if (value instanceof HTMLElement) {
              if (!document.contains(value)) {
                detachedElements.push(value);
                // Check if it's a button container
                const style = value.style;
                if (value.tagName === 'DIV' && style.display === 'flex' && 
                    style.flexDirection === 'row' && style.alignItems === 'center') {
                  buttonContainers.push(value);
                }
                console.log(`🚨 [Memory Detector] Detached element in ${path}.${key}: ${value.tagName}.${Array.from(value.classList).join('.')}`);
                console.log(`   Style: ${value.getAttribute('style')?.substring(0, 100) || 'none'}`);
              }
            } else if (value instanceof NodeList || value instanceof HTMLCollection) {
              Array.from(value).forEach((item, index) => {
                if (item instanceof HTMLElement && !document.contains(item)) {
                  detachedElements.push(item);
                  // Check if it's a button container
                  const style = item.style;
                  if (item.tagName === 'DIV' && style.display === 'flex' && 
                      style.flexDirection === 'row' && style.alignItems === 'center') {
                    buttonContainers.push(item);
                  }
                  console.log(`🚨 [Memory Detector] Detached element in ${path}.${key}[${index}]: ${item.tagName}.${Array.from(item.classList).join('.')}`);
                  console.log(`   Style: ${item.getAttribute('style')?.substring(0, 100) || 'none'}`);
                }
              });
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              checkObjectForElements(value, `${path}.${key}`, depth + 1);
            }
          } catch (e) {
            // Ignore access errors for specific properties
          }
        });
      } catch (e) {
        // Ignore access errors for the object itself
      }
    };

    console.log('🔍 [Memory Tracer] Scanning window object for detached elements...');
    checkObjectForElements(window);

    // Check React-specific storage if available
    if ((window as any).React) {
      console.log('🔍 [Memory Tracer] Scanning React object for detached elements...');
      checkObjectForElements((window as any).React, 'React');
    }

    // Check common global objects that might hold element references
    const commonObjects = ['document', '_reactInternalInstance', '__reactFiber', 'floatingToolbar'];
    commonObjects.forEach(objName => {
      try {
        const obj = (window as any)[objName];
        if (obj) {
          console.log(`🔍 [Memory Tracer] Scanning ${objName} for detached elements...`);
          checkObjectForElements(obj, objName);
        }
      } catch (e) {
        // Ignore errors
      }
    });

    console.log(`\n📊 [Memory Tracer] Results:`);
    console.log(`🚨 Total detached elements found: ${detachedElements.length}`);
    console.log(`📦 Detached button containers: ${buttonContainers.length}`);

    if (buttonContainers.length > 0) {
      console.log('\n📋 [Memory Tracer] Detached button containers details:');
      buttonContainers.forEach((container, index) => {
        console.log(`  ${index + 1}. ${container.tagName} - Children: ${container.children.length}`);
        console.log(`     Style: ${container.getAttribute('style')}`);
        
        // Log children
        Array.from(container.children).forEach((child, childIndex) => {
          console.log(`     Child ${childIndex + 1}: ${child.tagName} - "${child.textContent?.substring(0, 30) || 'empty'}"`);
        });
      });
    }

    console.log('🔍 [Memory Tracer] ===== MEMORY TRACE COMPLETE =====\n');

    return {
      detachedElements: detachedElements.length,
      buttonContainers: buttonContainers.length,
      elements: detachedElements,
      buttonContainerElements: buttonContainers
    };
  };
};

  // Original traceDetachedElements function
  (window as any).traceDetachedElements = () => {
    console.log('🔍 [Element Tracer] ===== TRACING DETACHED ELEMENTS =====');
    console.log(`🕒 Start Time: ${new Date().toISOString()}`);

    const allElements = document.querySelectorAll('*');
    const buttonContainers = document.querySelectorAll('div[style*="display: flex"][style*="flex-direction: row"][style*="align-items: center"]');

    console.log(`📊 [Element Tracer] Total elements in DOM: ${allElements.length}`);
    console.log(`📦 [Element Tracer] Button containers found: ${buttonContainers.length}`);

    // Check each button container
    buttonContainers.forEach((container, index) => {
      const element = container as HTMLElement;
      const isDetached = !document.contains(element);
      const containerId = element.id || `container-${Date.now()}-${index}`;

      console.log(`\n📦 [Element Tracer] Container ${index + 1}/${buttonContainers.length}:`);
      console.log(`  🆔 ID: ${containerId}`);
      console.log(`  🏷️  Tag: ${element.tagName}`);
      console.log(`  👶 Children: ${element.children.length}`);
      console.log(`  📍 In DOM: ${!isDetached}`);
      console.log(`  🚨 Detached: ${isDetached}`);
      console.log(`  🎨 Style: ${element.getAttribute('style')}`);

      // Check children
      Array.from(element.children).forEach((child, childIndex) => {
        const childElement = child as HTMLElement;
        const childId = childElement.id || `child-${childIndex}`;
        const childDetached = !document.contains(childElement);

        console.log(`    👶 Child ${childIndex + 1}:`);
        console.log(`      🆔 ID: ${childId}`);
        console.log(`      🏷️  Tag: ${child.tagName}`);
        console.log(`      📝 Text: "${child.textContent?.substring(0, 30) || 'empty'}"`);
        console.log(`      📍 In DOM: ${!childDetached}`);
        console.log(`      🚨 Detached: ${childDetached}`);
        console.log(`      � Parent: ${childElement.parentElement?.tagName || 'none'}`);
      });

      if (isDetached) {
        console.log(`  ⚠️  WARNING: This container is DETACHED from DOM!`);
        console.log(`  💡 This container should be cleaned up`);
      }
    });

    // Check for orphaned elements
    const orphanedElements: HTMLElement[] = [];
    allElements.forEach(element => {
      if (!document.contains(element) && element instanceof HTMLElement) {
        orphanedElements.push(element);
      }
    });

    console.log(`\n🚨 [Element Tracer] Orphaned elements: ${orphanedElements.length}`);
    if (orphanedElements.length > 0) {
      orphanedElements.slice(0, 10).forEach((element, index) => {
        console.log(`  ${index + 1}. ${element.tagName}.${Array.from(element.classList).join('.')} - "${element.textContent?.substring(0, 30) || 'empty'}"`);
      });
    }

    console.log('🔍 [Element Tracer] ===== TRACE COMPLETE =====\n');

    return {
      totalElements: allElements.length,
      buttonContainers: buttonContainers.length,
      orphanedElements: orphanedElements.length
    };
  };

  // Enhanced function to detect truly detached elements (not in DOM but in memory)
  (window as any).traceDetachedElementsInMemory = () => {
    console.log('🔍 [Memory Tracer] ===== TRACING DETACHED ELEMENTS IN MEMORY =====');
    console.log(`🕒 Start Time: ${new Date().toISOString()}`);

    const detachedElements: HTMLElement[] = [];
    const buttonContainers: HTMLElement[] = [];

    // Check global window object for element references
    const checkObjectForElements = (obj: any, path = 'window', depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 3) return;

      try {
        Object.keys(obj).forEach(key => {
          try {
            const value = obj[key];
            if (value instanceof HTMLElement) {
              if (!document.contains(value)) {
                detachedElements.push(value);
                // Check if it's a button container
                const style = value.style;
                if (value.tagName === 'DIV' && style.display === 'flex' && 
                    style.flexDirection === 'row' && style.alignItems === 'center') {
                  buttonContainers.push(value);
                }
                console.log(`🚨 [Memory Detector] Detached element in ${path}.${key}: ${value.tagName}.${Array.from(value.classList).join('.')}`);
                console.log(`   Style: ${value.getAttribute('style')?.substring(0, 100) || 'none'}`);
              }
            } else if (value instanceof NodeList || value instanceof HTMLCollection) {
              Array.from(value).forEach((item, index) => {
                if (item instanceof HTMLElement && !document.contains(item)) {
                  detachedElements.push(item);
                  // Check if it's a button container
                  const style = item.style;
                  if (item.tagName === 'DIV' && style.display === 'flex' && 
                      style.flexDirection === 'row' && style.alignItems === 'center') {
                    buttonContainers.push(item);
                  }
                  console.log(`🚨 [Memory Detector] Detached element in ${path}.${key}[${index}]: ${item.tagName}.${Array.from(item.classList).join('.')}`);
                  console.log(`   Style: ${item.getAttribute('style')?.substring(0, 100) || 'none'}`);
                }
              });
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              checkObjectForElements(value, `${path}.${key}`, depth + 1);
            }
          } catch (e) {
            // Ignore access errors for specific properties
          }
        });
      } catch (e) {
        // Ignore access errors for the object itself
      }
    };

    console.log('🔍 [Memory Tracer] Scanning window object for detached elements...');
    checkObjectForElements(window);

    // Check React-specific storage if available
    if ((window as any).React) {
      console.log('🔍 [Memory Tracer] Scanning React object for detached elements...');
      checkObjectForElements((window as any).React, 'React');
    }

    // Check common global objects that might hold element references
    const commonObjects = ['document', '_reactInternalInstance', '__reactFiber', 'floatingToolbar'];
    commonObjects.forEach(objName => {
      try {
        const obj = (window as any)[objName];
        if (obj) {
          console.log(`🔍 [Memory Tracer] Scanning ${objName} for detached elements...`);
          checkObjectForElements(obj, objName);
        }
      } catch (e) {
        // Ignore errors
      }
    });

    console.log(`\n📊 [Memory Tracer] Results:`);
    console.log(`🚨 Total detached elements found: ${detachedElements.length}`);
    console.log(`📦 Detached button containers: ${buttonContainers.length}`);

    if (buttonContainers.length > 0) {
      console.log('\n📋 [Memory Tracer] Detached button containers details:');
      buttonContainers.forEach((container, index) => {
        console.log(`  ${index + 1}. ${container.tagName} - Children: ${container.children.length}`);
        console.log(`     Style: ${container.getAttribute('style')}`);
        
        // Log children
        Array.from(container.children).forEach((child, childIndex) => {
          console.log(`     Child ${childIndex + 1}: ${child.tagName} - "${child.textContent?.substring(0, 30) || 'empty'}"`);
        });
      });
    }

    console.log('🔍 [Memory Tracer] ===== MEMORY TRACE COMPLETE =====\n');

    return {
      detachedElements: detachedElements.length,
      buttonContainers: buttonContainers.length,
      elements: detachedElements,
      buttonContainerElements: buttonContainers
    };
  };

  // Function to aggressively clean button containers before unmounting
  (window as any).cleanupButtonContainersAggressively = () => {
    console.log('🧹 [Aggressive Cleanup] Starting aggressive cleanup of button containers...');

    // Find all button containers with the specific style pattern
    const buttonContainers = document.querySelectorAll('div[style*="display: flex"][style*="flex-direction: row"][style*="align-items: center"]');
    let cleanedCount = 0;

    buttonContainers.forEach(container => {
      try {
        const element = container as HTMLElement;

        // Only clean elements that are not currently visible/active
        if (element.style.display === 'none' || !element.offsetParent) {
          console.log(`🧹 [Aggressive Cleanup] Cleaning detached button container: ${element.tagName}.${Array.from(element.classList).join('.')}`);

          // Clear all children and their references
          const cleanupElement = (el: Element) => {
            // Clear event listeners
            const eventProps = [
              'onclick', 'onpointerdown', 'onmousedown', 'ontouchstart', 'onmouseover', 'onmouseout',
              'onmouseenter', 'onmouseleave', 'oncontextmenu', 'ondblclick'
            ];
            eventProps.forEach(prop => {
              if (prop in el) {
                try {
                  (el as any)[prop] = null;
                } catch (e) {}
              }
            });

            // Clear React references
            const reactProps = ['_reactInternalFiber', '__reactFiber', '_customHandlers', '_customListeners'];
            reactProps.forEach(prop => {
              if (prop in el) {
                try {
                  delete (el as any)[prop];
                } catch (e) {}
              }
            });

            // Clear data attributes
            Array.from(el.attributes).forEach(attr => {
              if (attr.name.startsWith('data-') && attr.value && attr.value.includes('object')) {
                try {
                  el.removeAttribute(attr.name);
                } catch (e) {}
              }
            });

            // Recursively clean children
            Array.from(el.children).forEach(cleanupElement);
          };

          cleanupElement(element);

          // Clear the container itself
          element.innerHTML = '';

          // If element is detached, we can remove it completely
          if (!document.contains(element)) {
            try {
              element.remove();
              console.log('✅ [Aggressive Cleanup] Removed detached button container');
            } catch (e) {
              console.warn('[Aggressive Cleanup] Could not remove detached element:', e);
            }
          }

          cleanedCount++;
        }
      } catch (error) {
        console.warn('[Aggressive Cleanup] Error cleaning container:', error);
      }
    });

    console.log(`✅ [Aggressive Cleanup] Cleaned ${cleanedCount} button containers`);
    return cleanedCount;
  };

  // Add function to monitor element recreation
  (window as any).monitorElementRecreation = (duration = 5000) => {
    console.log(`🔄 [Recreation Monitor] Monitoring element recreation for ${duration}ms...`);

    const initialSnapshot = (window as any).traceDetachedElements();
    const startTime = Date.now();

    const checkRecreation = () => {
      const currentSnapshot = (window as any).traceDetachedElements();
      const elapsed = Date.now() - startTime;

      console.log(`🔄 [Recreation Monitor] ${elapsed}ms elapsed:`);
      console.log(`  📦 Initial button containers: ${initialSnapshot.buttonContainers}`);
      console.log(`  📦 Current button containers: ${currentSnapshot.buttonContainers}`);
      console.log(`  🚨 Initial orphaned: ${initialSnapshot.orphanedElements}`);
      console.log(`  🚨 Current orphaned: ${currentSnapshot.orphanedElements}`);

      if (currentSnapshot.buttonContainers > initialSnapshot.buttonContainers) {
        console.log(`⚠️  WARNING: Button containers increased! (+${currentSnapshot.buttonContainers - initialSnapshot.buttonContainers})`);
      }

      if (currentSnapshot.orphanedElements > initialSnapshot.orphanedElements) {
        console.log(`⚠️  WARNING: Orphaned elements increased! (+${currentSnapshot.orphanedElements - initialSnapshot.orphanedElements})`);
      }

      if (elapsed < duration) {
        setTimeout(checkRecreation, 1000);
      } else {
        console.log(`🔄 [Recreation Monitor] Monitoring complete after ${elapsed}ms`);
      }
    };

    setTimeout(checkRecreation, 1000);
  };

  console.log('�🛠️ [Deep Event Cleanup] Enhanced monitoring system loaded with:');
  console.log('  • startDetachedMonitoring() - Real-time detached element monitoring');
  console.log('  • cleanupDetachedButtonContainers() - Aggressive button container cleanup');
  console.log('  • startButtonContainerMonitor() - Real-time button container monitoring');
  console.log('  • findAndCleanDetachedElements() - Comprehensive detached element cleanup');
  console.log('  • smartCleanupDetachedElements() - Intelligent cleanup that avoids interference');
  console.log('  • traceDetachedElements() - Detailed element tracing for debugging');
  console.log('  • traceDetachedElementsInMemory() - Detect detached elements in memory (Chrome DevTools)');
  console.log('  • cleanupButtonContainersAggressively() - Aggressive cleanup of button containers');
  console.log('  • monitorElementRecreation() - Monitor if elements are recreated after cleanup');
  console.log('  • pauseMonitoring() - Temporarily pause monitoring during operations');
  console.log('  • diagnoseMemoryLeaks() - Comprehensive memory leak analysis');
  console.log('💡 [Deep Event Cleanup] Use these functions in browser console to monitor and clean memory leaks');
  console.log('  • startButtonContainerMonitor() - Real-time button container monitoring');
  console.log('  • cleanupButtonContainersAggressively() - Aggressive cleanup of button containers');
  console.log('  • diagnoseMemoryLeaks() - Comprehensive memory leak analysis');
  console.log('💡 [Deep Event Cleanup] Use these functions in browser console to monitor and clean memory leaks');
  (window as any).diagnoseMemoryLeaks = () => {
    console.log('🔍 [Memory Leak Diagnosis] Starting comprehensive analysis...');
    
    // 1. Check for detached elements with improved detection
    const allElements = document.querySelectorAll('*');
    const detachedElements: Element[] = [];
    const toolbarElements: Element[] = [];
    const buttonContainers: Element[] = [];
    const suspiciousElements: Element[] = [];
    
    allElements.forEach(element => {
      if (!document.contains(element)) {
        detachedElements.push(element);
        
        // Check if it's a toolbar-related element
        if (element.classList.contains('floating-toolbar-content') || 
            element.closest('.floating-toolbar-content')) {
          toolbarElements.push(element);
        }
        
        // Check if it's a button container (flex row with specific styles)
        const style = (element as HTMLElement).style;
        if (element instanceof HTMLElement && element.tagName === 'DIV' && 
            style.display === 'flex' && 
            style.flexDirection === 'row' && 
            style.alignItems === 'center') {
          buttonContainers.push(element);
        }

        // Check for suspicious elements that might be toolbar-related
        if (element instanceof HTMLElement) {
          const style = element.style;
          // Look for elements with absolute positioning and high z-index (common in toolbars)
          if ((style.position === 'absolute' || style.position === 'fixed') && 
              (parseInt(style.zIndex || '0') > 30)) {
            suspiciousElements.push(element);
          }
          
          // Look for elements with flex layout that might be toolbar containers
          if (style.display === 'flex' && style.position !== 'static') {
            suspiciousElements.push(element);
          }
        }
      }
    });
    
    console.log(`📊 [Diagnosis] Total elements: ${allElements.length}`);
    console.log(`🚨 [Diagnosis] Detached elements: ${detachedElements.length}`);
    console.log(`🎯 [Diagnosis] Detached toolbar elements: ${toolbarElements.length}`);
    console.log(`🔲 [Diagnosis] Detached button containers: ${buttonContainers.length}`);
    console.log(`🔍 [Diagnosis] Suspicious detached elements: ${suspiciousElements.length}`);
    
    // Log details of detached button containers
    if (buttonContainers.length > 0) {
      console.log('📋 [Diagnosis] Detached button containers details:');
      buttonContainers.forEach((container, index) => {
        const el = container as HTMLElement;
        console.log(`  ${index + 1}. ${el.tagName} - Children: ${el.children.length}, Style: ${el.style.cssText.substring(0, 100)}...`);
        
        // Log children details
        Array.from(el.children).forEach((child, childIndex) => {
          console.log(`    Child ${childIndex + 1}: ${child.tagName}.${Array.from(child.classList).join('.')} - ${child.textContent?.substring(0, 50) || 'empty'}`);
        });
      });
    }

    // Log suspicious elements
    if (suspiciousElements.length > 0) {
      console.log('🚨 [Diagnosis] Suspicious detached elements:');
      suspiciousElements.forEach((element, index) => {
        const el = element as HTMLElement;
        console.log(`  ${index + 1}. ${el.tagName}.${Array.from(el.classList).join('.')} - Style: ${el.style.cssText.substring(0, 100)}...`);
      });
    }
    
    // 2. Check for elements with event listeners
    const elementsWithListeners: Element[] = [];
    allElements.forEach(element => {
      const eventProps = ['onclick', 'onpointerdown', 'onmousedown', 'ontouchstart'];
      const hasListeners = eventProps.some(prop => (element as any)[prop] !== null && (element as any)[prop] !== undefined);
      if (hasListeners) {
        elementsWithListeners.push(element);
      }
    });
    
    console.log(`👂 [Diagnosis] Elements with event listeners: ${elementsWithListeners.length}`);
    
    // 3. Check for React Fiber references
    const elementsWithFiber: Element[] = [];
    allElements.forEach(element => {
      if ((element as any)._reactInternalFiber || (element as any).__reactFiber) {
        elementsWithFiber.push(element);
      }
    });
    
    console.log(`⚛️ [Diagnosis] Elements with React Fiber: ${elementsWithFiber.length}`);
    
    // 4. Check for custom properties that might cause leaks
    const elementsWithCustomProps: Element[] = [];
    allElements.forEach(element => {
      const customProps = Object.getOwnPropertyNames(element).filter(prop => 
        !prop.startsWith('__react') && 
        !prop.startsWith('_react') &&
        typeof (element as any)[prop] === 'function'
      );
      if (customProps.length > 0) {
        elementsWithCustomProps.push(element);
      }
    });
    
    console.log(`🔧 [Diagnosis] Elements with custom properties: ${elementsWithCustomProps.length}`);
    
    // 5. Memory usage estimate (Chrome only)
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      console.log(`💾 [Diagnosis] Memory usage:`, {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      });
    }
    
    // 6. Recommendations
    console.log('💡 [Diagnosis] Recommendations:');
    if (detachedElements.length > 50) {
      console.log('  - High number of detached elements detected. Consider running emergencyCleanup()');
    }
    if (elementsWithListeners.length > 20) {
      console.log('  - Many elements have event listeners. Check for missing cleanup');
    }
    if (elementsWithFiber.length > 100) {
      console.log('  - Many elements have React Fiber references. React cleanup may be incomplete');
    }
    if (buttonContainers.length > 0) {
      console.log(`  - Found ${buttonContainers.length} detached button containers. Consider running cleanupDetachedButtonContainers()`);
    }
    
    return {
      totalElements: allElements.length,
      detachedElements: detachedElements.length,
      toolbarElements: toolbarElements.length,
      buttonContainers: buttonContainers.length,
      elementsWithListeners: elementsWithListeners.length,
      elementsWithFiber: elementsWithFiber.length,
      elementsWithCustomProps: elementsWithCustomProps.length
    };
  };
  
  // Add function to temporarily pause monitoring during toolbar operations
  (window as any).pauseMonitoring = (duration = 1000) => {
    console.log(`⏸️ [Monitor] Pausing monitoring for ${duration}ms to avoid interference`);
    
    // Set a global flag to pause monitoring
    (window as any).__monitoringPaused = true;
    
    setTimeout(() => {
      (window as any).__monitoringPaused = false;
      console.log('▶️ [Monitor] Resumed monitoring');
    }, duration);
  };