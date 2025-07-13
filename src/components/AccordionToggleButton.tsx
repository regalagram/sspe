import React from 'react';
import { Menu, X } from 'lucide-react';

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
  return (
    <button
      data-accordion-toggle="true"
      onPointerDown={(e) => {
        toggleAccordionVisible();
      }}
      style={{
        position: 'fixed',
        top: '20px',
        right: accordionVisible ? '220px' : '20px',
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
      }}
      title={accordionVisible ? 'Hide accordion sidebar' : 'Show accordion sidebar'}
      onPointerEnter={(e) => {
        e.currentTarget.style.background = '#005a9e';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.background = '#007acc';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {accordionVisible ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
};
