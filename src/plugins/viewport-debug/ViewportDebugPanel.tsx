import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const ViewportDebugPanel: React.FC = () => {
  const { viewport } = useEditorStore();

  const formatNumber = (num: number): string => {
    return Number.isInteger(num) ? num.toString() : num.toFixed(3);
  };

  const formatViewBox = (viewBox: { x: number; y: number; width: number; height: number }) => {
    return `${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)} ${formatNumber(viewBox.width)} ${formatNumber(viewBox.height)}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Zoom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Zoom:
        </div>
        <div style={{ 
          fontSize: '11px',
          color: '#374151',
          paddingLeft: '4px'
        }}>
          {formatNumber(viewport.zoom)} ({(viewport.zoom * 100).toFixed(1)}%)
        </div>
      </div>

      {/* Pan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Pan:
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>x:</span> {formatNumber(viewport.pan.x)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151' }}>
            <span style={{ color: '#666' }}>y:</span> {formatNumber(viewport.pan.y)}
          </div>
        </div>
      </div>

      {/* ViewBox */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          ViewBox:
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>x:</span> {formatNumber(viewport.viewBox.x)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>y:</span> {formatNumber(viewport.viewBox.y)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>width:</span> {formatNumber(viewport.viewBox.width)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '6px' }}>
            <span style={{ color: '#666' }}>height:</span> {formatNumber(viewport.viewBox.height)}
          </div>
          <div style={{ 
            fontSize: '10px',
            color: '#888',
            backgroundColor: '#f8f9fa',
            padding: '4px 6px',
            borderRadius: '4px',
            fontFamily: 'SF Mono, Monaco, Consolas, monospace'
          }}>
            "{formatViewBox(viewport.viewBox)}"
          </div>
        </div>
      </div>

      {/* Center Point */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Center:
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>x:</span> {formatNumber(viewport.viewBox.x + viewport.viewBox.width / 2)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151' }}>
            <span style={{ color: '#666' }}>y:</span> {formatNumber(viewport.viewBox.y + viewport.viewBox.height / 2)}
          </div>
        </div>
      </div>

      {/* Bounds */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Bounds:
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>left:</span> {formatNumber(viewport.viewBox.x)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>top:</span> {formatNumber(viewport.viewBox.y)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151', marginBottom: '2px' }}>
            <span style={{ color: '#666' }}>right:</span> {formatNumber(viewport.viewBox.x + viewport.viewBox.width)}
          </div>
          <div style={{ fontSize: '11px', color: '#374151' }}>
            <span style={{ color: '#666' }}>bottom:</span> {formatNumber(viewport.viewBox.y + viewport.viewBox.height)}
          </div>
        </div>
      </div>

      {/* Aspect Ratio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Aspect Ratio:
        </div>
        <div style={{ 
          fontSize: '11px',
          color: '#374151',
          paddingLeft: '4px'
        }}>
          {formatNumber(viewport.viewBox.width / viewport.viewBox.height)} : 1
        </div>
      </div>

      {/* Transform Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Transform:
        </div>
        <div style={{ paddingLeft: '4px' }}>
          <div style={{ 
            fontSize: '10px',
            color: '#888',
            backgroundColor: '#f8f9fa',
            padding: '4px 6px',
            borderRadius: '4px',
            fontFamily: 'SF Mono, Monaco, Consolas, monospace',
            lineHeight: '1.4'
          }}>
            scale({formatNumber(viewport.zoom)}) <br/>
            translate({formatNumber(-viewport.pan.x)}, {formatNumber(-viewport.pan.y)})
          </div>
        </div>
      </div>
    </div>
  );
};