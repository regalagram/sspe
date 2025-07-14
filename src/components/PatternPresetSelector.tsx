import React, { useState } from 'react';
import { Pattern } from '../types';
import { 
  patternPresets, 
  PatternPreset, 
  getPatternCategories, 
  getPatternsByCategory, 
  getCategoryDisplayName,
  createPatternFromPreset 
} from '../plugins/gradients/patternPresets';

interface PatternPresetSelectorProps {
  onPatternSelect: (pattern: Pattern) => void;
  disabled?: boolean;
}

const PatternPreview: React.FC<{ 
  preset: PatternPreset; 
  onClick: () => void;
  disabled?: boolean;
}> = ({ preset, onClick, disabled = false }) => {
  return (
    <div
      onPointerDown={disabled ? undefined : onClick}
      style={{
        width: '60px',
        height: '40px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#fff',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s'
      }}
      title={`${preset.name} - ${preset.description || ''}`}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#007bff';
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#ddd';
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 60 40"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern
            id={`preview-${preset.id}`}
            width={preset.width}
            height={preset.height}
            patternUnits="userSpaceOnUse"
          >
            <g dangerouslySetInnerHTML={{ __html: preset.content }} />
          </pattern>
        </defs>
        <rect
          width="60"
          height="40"
          fill={`url(#preview-${preset.id})`}
        />
      </svg>
      
      {/* Pattern Name Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          fontSize: '8px',
          padding: '2px 4px',
          textAlign: 'center',
          lineHeight: '1.2'
        }}
      >
        {preset.name}
      </div>
    </div>
  );
};

export const PatternPresetSelector: React.FC<PatternPresetSelectorProps> = ({
  onPatternSelect,
  disabled = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('geometric');
  const categories = getPatternCategories();

  const handlePatternClick = (preset: PatternPreset) => {
    if (disabled) return;
    const pattern = createPatternFromPreset(preset);
    onPatternSelect(pattern);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Category Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Pattern Category:
        </span>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={disabled}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: disabled ? '#f5f5f5' : '#fff'
          }}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {getCategoryDisplayName(category)}
            </option>
          ))}
        </select>
      </div>

      {/* Pattern Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px'
        }}
      >
        {getPatternsByCategory(selectedCategory).map(preset => (
          <PatternPreview
            key={preset.id}
            preset={preset}
            onClick={() => handlePatternClick(preset)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Info Text */}
      <div
        style={{
          fontSize: '10px',
          color: '#888',
          textAlign: 'center',
          fontStyle: 'italic',
          padding: '4px'
        }}
      >
        Click on a pattern to apply it
      </div>
    </div>
  );
};