/**
 * Pooled version of FloatingToolbarButton that prevents DOM detachment
 * Uses button pool manager to reuse DOM elements
 */

import React, { useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { ToolbarAction } from '../../types/floatingToolbar';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { buttonPoolManager } from '../../utils/button-pool-manager';
import { CONFIG } from '../../config/constants';

interface PooledFloatingToolbarButtonProps {
  action: ToolbarAction;
  parentContainer: HTMLElement;
  size?: number;
  compact?: boolean;
  isSubmenuOpen?: boolean;
  onSubmenuToggle?: () => void;
}

export const PooledFloatingToolbarButton: React.FC<PooledFloatingToolbarButtonProps> = ({
  action,
  parentContainer,
  size,
  compact = false,
  isSubmenuOpen = false,
  onSubmenuToggle
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef<number>(0);
  
  const isMobileDevice = isMobile || isTablet;
  const buttonSize = size || (isMobileDevice ? CONFIG.UI.TOOLBAR.MOBILE_BUTTON_SIZE : CONFIG.UI.TOOLBAR.DESKTOP_BUTTON_SIZE);
  const iconSize = isMobileDevice ? CONFIG.UI.ICONS.MOBILE_SIZE : CONFIG.UI.ICONS.DESKTOP_SIZE;

  // Initialize button and manage its lifecycle
  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log('[PooledButton] Setting up button for action:', action.id);
    
    // Get pooled button elements
    const { button, container } = buttonPoolManager.getButton(action.id, parentContainer);
    
    // Update button properties
    updateButtonProperties(button, container);
    
    // Cleanup function
    return () => {
      console.log('[PooledButton] Component unmounting for action:', action.id);
      isMountedRef.current = false;
      buttonPoolManager.releaseButton(action.id);
    };
  }, [action.id, parentContainer]);
  
  // Update button when properties change
  useEffect(() => {
    const currentTime = Date.now();
    
    // Throttle updates to prevent excessive DOM manipulation
    if (currentTime - lastUpdateRef.current < 16) { // ~60fps
      return;
    }
    
    lastUpdateRef.current = currentTime;
    updateButtonProperties();
  }, [
    action,
    buttonSize,
    iconSize,
    isSubmenuOpen,
    compact,
    isMobileDevice
  ]);

  const updateButtonProperties = (
    targetButton?: HTMLButtonElement,
    targetContainer?: HTMLDivElement
  ) => {
    const properties = {
      title: action.tooltip || action.label,
      ariaLabel: action.label,
      style: getButtonStyle(),
      disabled: action.disabled || false,
      innerHTML: getButtonContent(),
      onClick: handleClick,
      onPointerDown: handlePointerDown
    };
    
    if (targetButton && targetContainer) {
      // Direct update for initialization
      Object.assign(targetButton.style, properties.style);
      targetButton.title = properties.title || '';
      targetButton.setAttribute('aria-label', properties.ariaLabel || '');
      targetButton.innerHTML = properties.innerHTML;
      targetButton.disabled = properties.disabled;
      
      // Add event listeners
      targetButton.addEventListener('click', properties.onClick);
      targetButton.addEventListener('pointerdown', properties.onPointerDown);
    } else {
      // Update through pool manager
      buttonPoolManager.updateButton(action.id, properties);
    }
  };

  const getButtonStyle = (): Partial<CSSStyleDeclaration> => {
    return {
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: getButtonBackground(),
      color: getButtonColor(),
      border: 'none',
      borderRadius: '0px',
      cursor: action.disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      position: 'relative',
      opacity: action.disabled ? '0.5' : '1',
      touchAction: 'manipulation',
      outline: 'none',
      userSelect: 'none'
    };
  };

  const getButtonBackground = (): string => {
    if (action.disabled) return '#f9fafb';
    if (action.type === 'toggle' && action.toggle?.isActive()) return '#374151';
    if (action.destructive) return '#fef2f2';
    if (isSubmenuOpen && (action.type === 'dropdown' || action.type === 'input' || action.type === 'color')) return '#f3f4f6';
    return 'white';
  };

  const getButtonColor = (): string => {
    if (action.disabled) return '#9ca3af';
    if (action.type === 'toggle' && action.toggle?.isActive()) return 'white';
    if (action.destructive) return '#ef4444';
    return '#374151';
  };

  const getButtonContent = (): string => {
    if (action.icon) {
      // Create a simple SVG representation for the icon
      // This is a simplified approach - in a real implementation you'd want proper icon handling
      const IconComponent = action.icon;
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1"/>
      </svg>`;
    }
    return action.label || '';
  };

  const handleClick = (e: Event) => {
    if (action.disabled) return;
    
    e.stopPropagation();
    
    switch (action.type) {
      case 'button':
        action.action?.(e as any);
        break;
      case 'toggle':
        action.toggle?.onToggle();
        break;
      case 'dropdown':
      case 'input':
      case 'color':
        onSubmenuToggle?.();
        break;
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (action.disabled) return;
    
    // Handle pointer-specific logic
    const target = e.target as HTMLElement;
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    const isMultiTouch = e.pointerType === 'touch' && (e as any).touches?.length > 1;
    
    if (isButton && !isMultiTouch) {
      e.stopPropagation();
    }
  };

  // This component doesn't render anything directly since the DOM is managed by the pool
  // Return a hidden placeholder that React can track
  return (
    <div 
      key={`pooled-${action.id}`}
      data-pooled-placeholder={action.id}
      style={{ display: 'none' }}
    />
  );
};