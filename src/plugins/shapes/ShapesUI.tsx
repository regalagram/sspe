import React, { useState } from 'react';
import { PluginButton } from '../../components/PluginButton';
import { SHAPE_TEMPLATES, ShapeTemplate } from './ShapeDefinitions';
import { shapeManager } from './ShapeManager';
import { toolModeManager } from '../../core/ToolModeManager';
import { useEditorStore } from '../../store/editorStore';
import { Square, Circle, Triangle, Diamond, Hexagon, Star, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Heart, Cloud, CheckSquare, LogOut, Plus, Dot } from 'lucide-react';

// Icon mapping for Lucide icons
const iconMap: Record<string, React.ComponentType<{size?: number}>> = {
  'debug-dot': Dot,
  'rectangle': Square,
  'square': Square,
  'circle': Circle,
  'ellipse': Circle,
  'triangle': Triangle,
  'diamond': Diamond,
  'pentagon': Hexagon, // Using hexagon as closest available
  'hexagon': Hexagon,
  'octagon': Hexagon, // Using hexagon as closest available
  'star': Star,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'heart': Heart,
  'cloud': Cloud,
  'checkbox': CheckSquare,
  'plus': Plus,
};

interface ShapeButtonProps {
  shape: ShapeTemplate;
  isActive: boolean;
  onSelect: (shapeId: string) => void;
}

const ShapeButton: React.FC<ShapeButtonProps> = ({ shape, isActive, onSelect }) => {
  const IconComponent = iconMap[shape.id];

  const handleClick = () => {
    onSelect(shape.id);
  };

  return (
    <button
      onPointerDown={handleClick}
      title={shape.name}
      style={{
        background: isActive ? '#007acc' : '#f8f9fa',
        color: isActive ? 'white' : '#666',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        minHeight: '36px',
        minWidth: '36px'
      }}
      onPointerEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = '#e9ecef';
        }
      }}
      onPointerLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = '#f8f9fa';
        }
      }}
    >
      {IconComponent ? (
        <IconComponent size={16} />
      ) : (
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {shape.name.charAt(0).toUpperCase()}
        </div>
      )}
    </button>
  );
};

interface SizeControlProps {
  size: number;
  onSizeChange: (size: number) => void;
}

const SizeControl: React.FC<SizeControlProps> = ({ size, onSizeChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (!isNaN(newSize)) {
      onSizeChange(Math.max(10, Math.min(300, newSize)));
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px'
    }}>
      <label style={{ 
        fontSize: '11px', 
        fontWeight: 'bold', 
        color: '#666'
      }}>
        Size
      </label>
      
      <input
        type="number"
        min="10"
        max="300"
        value={size}
        onChange={handleInputChange}
        style={{
          marginLeft: 'auto',
          width: '60px',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '3px',
          fontSize: '11px',
          textAlign: 'right'
        }}
      />
    </div>
  );
};

export const ShapesUI: React.FC = () => {
  const { shapeSize = 50, setShapeSize } = useEditorStore();
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);

  React.useEffect(() => {
    shapeManager.setCurrentSize(shapeSize);
  }, [shapeSize]);

  React.useEffect(() => {
    const checkShapeManagerState = () => {
      const managerShapeId = shapeManager.getCurrentShapeId();
      const isCreating = shapeManager.isInShapeCreationMode();
      if (!isCreating || !managerShapeId) {
        setActiveShapeId(null);
      } else if (managerShapeId !== activeShapeId) {
        setActiveShapeId(managerShapeId);
      }
    };
    const interval = setInterval(checkShapeManagerState, 100);
    return () => clearInterval(interval);
  }, [activeShapeId]);

  const handleShapeSelect = (shapeId: string) => {
    if (activeShapeId === shapeId) {
      setActiveShapeId(null);
      if (toolModeManager.isActive('shapes')) {
        toolModeManager.setMode('select');
      } else {
        shapeManager.stopShapeCreation();
      }
    } else {
      setActiveShapeId(shapeId);
      shapeManager.setCurrentSize(shapeSize);
      toolModeManager.setMode('shapes', { shapeId: shapeId });
    }
  };

  const handleExitShapeMode = () => {
    setActiveShapeId(null);
    if (toolModeManager.isActive('shapes')) {
      toolModeManager.setMode('select');
    } else {
      shapeManager.stopShapeCreation();
    }
  };

  const handleSizeChange = (newSize: number) => {
    setShapeSize(newSize);
    shapeManager.setCurrentSize(newSize);
  };

  const allShapes = SHAPE_TEMPLATES;

  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <SizeControl size={shapeSize} onSizeChange={handleSizeChange} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          overflowY: 'auto'
        }}>
          {allShapes.map(shape => (
            <ShapeButton
              key={shape.id}
              shape={shape}
              isActive={activeShapeId === shape.id}
              onSelect={handleShapeSelect}
            />
          ))}
        </div>
        {activeShapeId && (
            <PluginButton
              icon={<LogOut size={16} />}
              text="Exit Shape Mode"
              color="#dc3545"
              active={false}
              disabled={false}
              onPointerDown={handleExitShapeMode}
              fullWidth={true}
            />
        )}
      </div>
    </div>
  );
};
