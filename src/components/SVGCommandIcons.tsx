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

  switch (command) {
    case 'M':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
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
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="3" fill={color}/>
        </svg>
      );

    case 'L':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
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

    case 'H':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <line x1="6" y1="12" x2="18" y2="12"/>
          <circle cx="6" cy="12" r="2"/>
          <circle cx="18" cy="12" r="2"/>
        </svg>
      );

    case 'V':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <line x1="12" y1="6" x2="12" y2="18"/>
          <circle cx="12" cy="6" r="2"/>
          <circle cx="12" cy="18" r="2"/>
        </svg>
      );

    case 'C':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
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
          <circle cx="8" cy="4" r="1" fill={color}/>
          <circle cx="16" cy="20" r="1" fill={color}/>
        </svg>
      );

    case 'S':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <path d="M4 16 C4 16, 8 8, 12 12 S20 8, 20 16"/>
          <circle cx="4" cy="16" r="2"/>
          <circle cx="20" cy="16" r="2"/>
          <circle cx="12" cy="12" r="1" fill={color}/>
          <line x1="4" y1="16" x2="8" y2="8" strokeDasharray="2,2" opacity="0.5"/>
          <line x1="20" y1="16" x2="16" y2="8" strokeDasharray="2,2" opacity="0.5"/>
          <circle cx="8" cy="8" r="1" fill={color} opacity="0.7"/>
          <circle cx="16" cy="8" r="1" fill={color} opacity="0.7"/>
        </svg>
      );

    case 'Q':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <path d="M5 18 Q12 6, 19 18"/>
          <circle cx="5" cy="18" r="2"/>
          <circle cx="19" cy="18" r="2"/>
          <line x1="5" y1="18" x2="12" y2="6" strokeDasharray="2,2" opacity="0.5"/>
          <line x1="19" y1="18" x2="12" y2="6" strokeDasharray="2,2" opacity="0.5"/>
          <circle cx="12" cy="6" r="1" fill={color}/>
        </svg>
      );

    case 'T':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <path d="M4 12 Q8 4, 12 12 T20 12"/>
          <circle cx="4" cy="12" r="2"/>
          <circle cx="20" cy="12" r="2"/>
          <circle cx="12" cy="12" r="1" fill={color}/>
          <line x1="8" y1="4" x2="16" y2="20" strokeDasharray="1,3" opacity="0.4"/>
        </svg>
      );

    case 'A':
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={className}
          style={iconStyle}
        >
          <path d="M6 18 A6 6 0 0 1 18 6"/>
          <circle cx="6" cy="18" r="2"/>
          <circle cx="18" cy="6" r="2"/>
          <circle cx="12" cy="12" r="1" fill={color} opacity="0.5"/>
          <circle cx="12" cy="12" r="8" fill="none" strokeDasharray="1,4" opacity="0.3"/>
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
            color: color,
          }}
        >
          {command}
        </div>
      );
  }
};

export default SVGCommandIcon;
