import React from 'react';
import { GradientStop } from '../types';
import { convertRgbToHex } from '../utils/color-utils';
import { Plus, X } from 'lucide-react';

interface GradientStopEditorProps {
  stops: GradientStop[];
  onStopsChange: (stops: GradientStop[]) => void;
  disabled?: boolean;
}

const colorToHex = (color: string | undefined): string => {
  if (!color || color === 'none') return '#000000';
  const converted = convertRgbToHex(color);
  if (!converted || converted === color && !color.startsWith('#')) {
    return '#000000';
  }
  return converted;
};

export const GradientStopEditor: React.FC<GradientStopEditorProps> = ({
  stops,
  onStopsChange,
  disabled = false
}) => {
  const addStop = () => {
    const newOffset = stops.length > 0 ? Math.max(...stops.map(s => s.offset)) + 0.1 : 0.5;
    const clampedOffset = Math.min(newOffset, 1);
    
    const newStop: GradientStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      offset: clampedOffset,
      color: '#000000',
      opacity: 1
    };
    
    const newStops = [...stops, newStop].sort((a, b) => a.offset - b.offset);
    onStopsChange(newStops);
  };

  const removeStop = (stopId: string) => {
    if (stops.length <= 2) return; // Keep at least 2 stops
    onStopsChange(stops.filter(stop => stop.id !== stopId));
  };

  const updateStop = (stopId: string, updates: Partial<GradientStop>) => {
    const newStops = stops.map(stop => 
      stop.id === stopId ? { ...stop, ...updates } : stop
    ).sort((a, b) => a.offset - b.offset);
    onStopsChange(newStops);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Color Stops:
        </span>
        <button
          onPointerDown={addStop}
          disabled={disabled || stops.length >= 10}
          style={{
            padding: '2px 6px',
            fontSize: '10px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            background: '#f9f9f9',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          <Plus size={10} />
          Add
        </button>
      </div>

      {stops.map((stop, index) => (
        <div key={stop.id} style={{ 
          display: 'flex', 
          gap: '6px', 
          alignItems: 'center',
          padding: '6px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: '#fafafa'
        }}>
          <input
            type="color"
            value={colorToHex(stop.color)}
            onChange={(e) => updateStop(stop.id, { color: e.target.value })}
            disabled={disabled}
            style={{ width: '24px', height: '24px', padding: '0', border: 'none' }}
          />
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>
              Position: {Math.round(stop.offset * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={stop.offset}
              onChange={(e) => updateStop(stop.id, { offset: Number(e.target.value) })}
              disabled={disabled}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '50px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>
              Opacity: {Math.round((stop.opacity || 1) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={stop.opacity || 1}
              onChange={(e) => updateStop(stop.id, { opacity: Number(e.target.value) })}
              disabled={disabled}
              style={{ width: '100%' }}
            />
          </div>

          {stops.length > 2 && (
            <button
              onPointerDown={() => removeStop(stop.id)}
              disabled={disabled}
              style={{
                padding: '2px',
                fontSize: '10px',
                border: '1px solid #ff6b6b',
                borderRadius: '3px',
                background: '#ffe0e0',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: '#ff6b6b'
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};