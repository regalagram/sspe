import React from 'react';
import { SVGCommandType } from '../types';

interface SVGCommandIconProps {
  command: SVGCommandType;
  size?: number;
  color?: string;
  className?: string;
}

const SVGCommandIcon: React.FC<SVGCommandIconProps> = ({ 
  command, 
  size = 16, 
  color = '#333', 
  className = '' 
}) => {
  const iconStyle = {
    width: size,
    height: size,
    display: 'block',
  };

  // Base commands - we'll use the uppercase version for display
  const baseCommand = command.toUpperCase() as SVGCommandType;
  
  // Use the original color and stroke width regardless of relative/absolute
  const commandColor = color;
  const strokeWidth = '2';

  switch (baseCommand) {
    case 'M':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={commandColor} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 9v-6M12 21v-6M21 12h-6M9 12H3"/>
        </svg>
      );

    case 'Z':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={commandColor} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="3" fill={commandColor}/>
        </svg>
      );

    case 'L':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={commandColor} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <line x1="6" y1="18" x2="18" y2="6"/>
          <circle cx="6" cy="18" r="2"/>
          <circle cx="18" cy="6" r="2"/>
        </svg>
      );



    case 'C':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={commandColor} 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <path d="M4 20 C4 20, 8 4, 12 12 C16 20, 20 4, 20 4"/>
          <circle cx="4" cy="20" r="2"/>
          <circle cx="20" cy="4" r="2"/>
          <line x1="4" y1="20" x2="8" y2="4" strokeDasharray="2,2" opacity="0.5"/>
          <line x1="20" y1="4" x2="16" y2="20" strokeDasharray="2,2" opacity="0.5"/>
          <circle cx="8" cy="4" r="1" fill={commandColor}/>
          <circle cx="16" cy="20" r="1" fill={commandColor}/>
        </svg>
      );









    default:
      // Fallback para comandos no reconocidos
      return (
        <div 
          style={{
            ...iconStyle,
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${size * 0.6}px`,
            fontFamily: 'monospace',
            color: commandColor,
          }}
        >
          {command}
        </div>
      );
  }
};

export default SVGCommandIcon;
