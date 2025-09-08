/**
 * Hook for managing pooled floating toolbar buttons
 * Prevents button detachment by reusing DOM elements
 */

import { useEffect, useRef, useState } from 'react';
import { buttonPoolManager } from '../utils/button-pool-manager';

interface UsePooledButtonOptions {
  actionId: string;
  parentContainer: HTMLElement | null;
  isVisible: boolean;
}

interface ButtonProperties {
  innerHTML?: string;
  title?: string;
  ariaLabel?: string;
  style?: Partial<CSSStyleDeclaration>;
  disabled?: boolean;
  onClick?: (e: Event) => void;
  onPointerDown?: (e: PointerEvent) => void;
}

export const usePooledButton = ({
  actionId,
  parentContainer,
  isVisible
}: UsePooledButtonOptions) => {
  const [buttonElements, setButtonElements] = useState<{
    button: HTMLButtonElement;
    container: HTMLDivElement;
  } | null>(null);
  const isMountedRef = useRef(true);
  const lastPropertiesRef = useRef<ButtonProperties>({});
  
  // Initialize button when conditions are met
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isVisible && parentContainer && actionId) {
      console.log('[PooledButton Hook] Initializing button for:', actionId);
      
      // Get or create pooled button
      const elements = buttonPoolManager.getButton(actionId, parentContainer);
      setButtonElements(elements);
      
      // Make button visible
      elements.container.style.display = 'block';
    } else {
      console.log('[PooledButton Hook] Hiding button for:', actionId);
      if (actionId) {
        buttonPoolManager.releaseButton(actionId);
      }
      setButtonElements(null);
    }
  }, [isVisible, parentContainer, actionId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[PooledButton Hook] Component unmounting for:', actionId);
      isMountedRef.current = false;
      if (actionId) {
        buttonPoolManager.releaseButton(actionId);
      }
    };
  }, [actionId]);
  
  // Function to update button properties
  const updateButton = (properties: ButtonProperties) => {
    if (!actionId || !buttonElements) return;
    
    // Only update if properties have actually changed
    const hasChanged = Object.keys(properties).some(key => {
      const typedKey = key as keyof ButtonProperties;
      return lastPropertiesRef.current[typedKey] !== properties[typedKey];
    });
    
    if (hasChanged) {
      buttonPoolManager.updateButton(actionId, properties);
      lastPropertiesRef.current = { ...properties };
    }
  };
  
  return {
    buttonElements,
    updateButton,
    isReady: !!buttonElements && isVisible
  };
};

/**
 * Hook specifically for floating toolbar buttons with React-like API
 */
export const useFloatingToolbarButton = (
  actionId: string,
  parentContainer: HTMLElement | null,
  isVisible: boolean
) => {
  const { buttonElements, updateButton, isReady } = usePooledButton({
    actionId,
    parentContainer,
    isVisible
  });
  
  // Render function that mimics React component behavior
  const renderButton = (props: {
    children?: string | React.ReactNode;
    title?: string;
    ariaLabel?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    onClick?: (e: Event) => void;
    onPointerDown?: (e: PointerEvent) => void;
  }) => {
    if (!isReady || !buttonElements) {
      return null;
    }
    
    // Convert React children to innerHTML string
    let innerHTML = '';
    if (typeof props.children === 'string') {
      innerHTML = props.children;
    } else if (props.children) {
      // For React nodes, we'll need to render them to string
      // For now, we'll handle basic cases
      innerHTML = String(props.children);
    }
    
    updateButton({
      innerHTML,
      title: props.title,
      ariaLabel: props.ariaLabel,
      style: props.style as Partial<CSSStyleDeclaration>,
      disabled: props.disabled,
      onClick: props.onClick,
      onPointerDown: props.onPointerDown
    });
    
    // Return a wrapper that represents the pooled button in React's virtual DOM
    return {
      $$typeof: Symbol.for('react.element'),
      type: 'div',
      key: `pooled-button-${actionId}`,
      ref: null,
      props: {
        'data-pooled-button-wrapper': actionId,
        style: { display: 'none' } // Hidden since actual DOM is managed by pool
      }
    };
  };
  
  return {
    renderButton,
    isReady,
    buttonElements
  };
};