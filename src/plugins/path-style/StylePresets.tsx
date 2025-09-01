import React, { useState } from 'react';
import { PathStyle } from '../../types';
import { getStyleValue } from '../../utils/gradient-utils';
import { StylePreset, getAllCategories, getCategoryDisplayName, getPresetsByCategory } from './presetData';
import { Trash2 } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';

interface StylePresetsProps {
  onPresetApply: (style: PathStyle) => void;
}

interface PresetPreviewProps {
  preset: StylePreset;
  onClick: () => void;
}

const PresetPreview: React.FC<PresetPreviewProps> = ({ preset, onClick }) => {
  return (
    <div 
      onClick={onClick}
      title={preset.description}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        transition: 'all 0.2s ease',
        minWidth: '80px',
      }}
      onPointerEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
        e.currentTarget.style.borderColor = '#999';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#fff';
        e.currentTarget.style.borderColor = '#ddd';
      }}
    >
      {/* Visual Preview */}
      <svg 
        width="40" 
        height="30" 
        viewBox="0 0 40 30" 
        style={{ marginBottom: '4px' }}
      >
        <rect
          x="2"
          y="2"
          width="36"
          height="26"
          rx="3"
          fill={preset.style.fill ? getStyleValue(preset.style.fill) : 'none'}
          fillOpacity={preset.style.fillOpacity}
          stroke={preset.style.stroke ? getStyleValue(preset.style.stroke) : 'none'}
          strokeWidth={preset.style.strokeWidth || 1}
          strokeOpacity={preset.style.strokeOpacity}
          strokeDasharray={preset.style.strokeDasharray}
          strokeLinecap={preset.style.strokeLinecap}
          strokeLinejoin={preset.style.strokeLinejoin}
        />
      </svg>
      
      {/* Name */}
      <div style={{
        fontSize: '10px',
        textAlign: 'center',
        color: '#333',
        fontWeight: '500',
        lineHeight: '1.2',
        maxWidth: '70px',
        wordWrap: 'break-word',
      }}>
        {preset.name}
      </div>
    </div>
  );
};

export const StylePresets: React.FC<StylePresetsProps> = ({ onPresetApply }) => {
  const [selectedCategory, setSelectedCategory] = useState<StylePreset['category']>('basic');
  const categories = getAllCategories();
  const presetsInCategory = getPresetsByCategory(selectedCategory);

  return (
    <div style={{ marginBottom: '16px' }}>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '8px',
        borderBottom: '1px solid #eee',
      }}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '4px 4px',
              fontSize: '10px',
              border: 'none',
              backgroundColor: selectedCategory === category ? '#007bff' : 'transparent',
              color: selectedCategory === category ? '#fff' : '#666',
              cursor: 'pointer',
              borderRadius: '3px 3px 0 0',
              marginRight: '2px',
              transition: 'all 0.2s ease',
            }}
            onPointerEnter={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }
            }}
            onPointerLeave={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {getCategoryDisplayName(category)}
          </button>
        ))}
      </div>

      {/* Presets Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
        gap: '6px',
        maxHeight: '250px',
        overflowY: 'auto',
        padding: '4px',
        border: '1px solid #eee',
        borderRadius: '4px',
        backgroundColor: '#fafafa',
      }}>
        {presetsInCategory.map(preset => (
          <PresetPreview
            key={preset.id}
            preset={preset}
            onClick={() => onPresetApply(preset.style)}
          />
        ))}
      </div>

      {/* Clear Style Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
        <PluginButton
          icon={<Trash2 size={14} />}
          text="Clear All Styles"
          color="#dc3545"
          onPointerDown={() => onPresetApply({
            fill: 'none',
            stroke: 'none',
            strokeWidth: 1,
            fillOpacity: 1,
            strokeOpacity: 1,
            strokeDasharray: undefined,
            strokeLinecap: 'butt',
            strokeLinejoin: 'miter',
            fillRule: 'nonzero',
          })}
        />
      </div>

      {/* Description for selected category */}
      <div style={{
        fontSize: '10px',
        color: '#888',
        marginTop: '4px',
        fontStyle: 'italic',
        textAlign: 'center',
      }}>
        Click any preset to apply its style instantly
      </div>
    </div>
  );
};