import React, { useState } from 'react';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { SHAPE_TEMPLATES, ShapeTemplate } from './ShapeDefinitions';
import { shapeManager } from './ShapeManager';
import { 
  Square, 
  Circle, 
  Triangle, 
  Diamond, 
  Hexagon, 
  Star, 
  ArrowRight, 
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Heart,
  Cloud,
  CheckSquare,
  LogOut,
  Plus,
  Dot
} from 'lucide-react';

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
      onClick={handleClick}
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
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = '#e9ecef';
        }
      }}
      onMouseLeave={(e) => {
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
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  const [currentSize, setCurrentSize] = useState<number>(50);

  // Initialize shape manager with current size on mount
  React.useEffect(() => {
    shapeManager.setCurrentSize(currentSize);
  }, []);

  // Sync with shape manager state
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

    // Check state periodically (could be optimized with events)
    const interval = setInterval(checkShapeManagerState, 100);
    
    return () => clearInterval(interval);
  }, [activeShapeId]);

  const handleShapeSelect = (shapeId: string) => {
    console.log('🔷 ShapesUI.handleShapeSelect called with shapeId:', shapeId);
    console.log('🔷 ShapesUI: Current activeShapeId:', activeShapeId);
    
    if (activeShapeId === shapeId) {
      // Deselect if clicking the same shape
      console.log('🔷 ShapesUI: Deselecting shape');
      setActiveShapeId(null);
      shapeManager.stopShapeCreation();
    } else {
      // Select new shape
      console.log('🔷 ShapesUI: Selecting new shape');
      setActiveShapeId(shapeId);
      shapeManager.setCurrentSize(currentSize);
      shapeManager.startShapeCreation(shapeId);
    }
  };

  const handleExitShapeMode = () => {
    setActiveShapeId(null);
    shapeManager.stopShapeCreation();
  };

  const handleSizeChange = (newSize: number) => {
    setCurrentSize(newSize);
    shapeManager.setCurrentSize(newSize);
  };

  // Get all shapes from all categories
  const allShapes = SHAPE_TEMPLATES;

  return (
    <DraggablePanel
      title="Shapes"
      initialPosition={{ x: 980, y: 220 }}
      id="shapes-panel"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* Size Control */}
        <SizeControl size={currentSize} onSizeChange={handleSizeChange} />

        {/* Shape Buttons Grid */}
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

        {/* Exit Shape Mode Button */}
        {activeShapeId && (
            <PluginButton
              icon={<LogOut size={16} />}
              text="Exit Shape Mode"
              color="#dc3545"
              active={false}
              disabled={false}
              onClick={handleExitShapeMode}
              fullWidth={true}
            />
        )}
      </div>
    </DraggablePanel>
  );
};
