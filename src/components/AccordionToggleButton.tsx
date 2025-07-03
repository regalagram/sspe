import React from 'react';
import { Menu, X } from 'lucide-react';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface AccordionToggleButtonProps {
  accordionVisible: boolean;
  toggleAccordionVisible: () => void;
  isFullscreen: boolean;
}

/**
 * Accordion toggle button component
 * Following the draggable panel pattern from README.md
 */
export const AccordionToggleButton: React.FC<AccordionToggleButtonProps> = ({
  accordionVisible,
  toggleAccordionVisible,
  isFullscreen
}) => {
  const { isMobile } = useMobileDetection();

  // Don't show in fullscreen mode
  if (isFullscreen) {
    return null;
  }

  return (
    <button
      data-accordion-toggle="true"
      onClick={(e) => {
        console.log('Toggle button click:', 'isTrusted:', (e as any).isTrusted, 'isMobile:', isMobile);
        // For desktop or trusted mobile clicks
        if (!isMobile || (e as any).isTrusted) {
          toggleAccordionVisible();
        }
      }}
      onTouchStart={isMobile ? (e) => {
        console.log('Toggle button touchstart');
      } : undefined}
      onTouchEnd={isMobile ? (e) => {
        console.log('Toggle button touchend');
        e.preventDefault();
        e.stopPropagation();
        toggleAccordionVisible();
      } : undefined}
      style={{
        position: 'fixed',
        top: '20px',
        right: accordionVisible ? '220px' : '20px', // Ajustado para el ancho de 200px + margen
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: '#007acc',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        color: 'white',
        touchAction: 'manipulation', // Better touch responsiveness
        WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', // Subtle tap highlight
      }}
      title={accordionVisible ? 'Hide accordion sidebar' : 'Show accordion sidebar'}
      onMouseEnter={!isMobile ? (e) => {
        e.currentTarget.style.background = '#005a9e';
        e.currentTarget.style.transform = 'scale(1.1)';
      } : undefined}
      onMouseLeave={!isMobile ? (e) => {
        e.currentTarget.style.background = '#007acc';
        e.currentTarget.style.transform = 'scale(1)';
      } : undefined}
    >
      {accordionVisible ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
};
