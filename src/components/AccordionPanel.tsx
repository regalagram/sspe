import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionPanelProps {
  isExpanded: boolean;
  onClick: () => void;
  title: string;
  badge?: number | string;
}

/**
 * Accordion panel toggle button component for sidebar controls
 */
export const AccordionToggleButton: React.FC<AccordionPanelProps> = ({
  isExpanded,
  onClick,
  title,
  badge
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 border-b border-gray-200 focus:outline-none focus:bg-gray-50"
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {badge && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {badge}
          </span>
        )}
      </div>
      {isExpanded ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );
};