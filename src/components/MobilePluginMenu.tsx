import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, Settings, Palette, Layers, Zap } from 'lucide-react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';

interface MobilePluginMenuProps {
  plugins: UIComponentDefinition[];
  onPluginSelect: (plugin: UIComponentDefinition) => void;
  onBack?: () => void;
  selectedPlugin?: UIComponentDefinition | null;
}

interface PluginCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  plugins: UIComponentDefinition[];
  orders: number[];
}

export const MobilePluginMenu: React.FC<MobilePluginMenuProps> = ({
  plugins,
  onPluginSelect,
  onBack,
  selectedPlugin
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { getVisiblePanels } = usePanelModeStore();
  
  const visiblePanels = getVisiblePanels();

  // Filter visible plugins only
  const visiblePlugins = plugins.filter(plugin => 
    visiblePanels.some(panel => panel.id === plugin.id)
  );

  // Categorize plugins based on their order and functionality
  const categories: PluginCategory[] = [
    {
      id: 'core-tools',
      name: 'Core Tools',
      icon: <Settings size={20} />,
      color: '#3b82f6',
      plugins: [],
      orders: [0, 1, 2, 3, 4, 5, 6, 10] // selection, curves, grid, command, creation, delete, guidelines, path-renderer, etc.
    },
    {
      id: 'styling',
      name: 'Styling & Effects',
      icon: <Palette size={20} />,
      color: '#8b5cf6',
      plugins: [],
      orders: [15, 16, 17] // gradients, text-style, animations, etc.
    },
    {
      id: 'advanced',
      name: 'Advanced Features',
      icon: <Layers size={20} />,
      color: '#059669',
      plugins: [],
      orders: [8, 20, 22, 23, 24, 25, 26, 30, 40] // groups, images, clipping, markers, symbols, filters, animation components, visual debug, creation renderer
    },
    {
      id: 'system',
      name: 'System & Utilities',
      icon: <Zap size={20} />,
      color: '#dc2626',
      plugins: [],
      orders: [-1, 100] // panel-mode, shortcuts
    }
  ];

  // Categorize plugins
  visiblePlugins.forEach(plugin => {
    const panel = visiblePanels.find(p => p.id === plugin.id);
    const order = panel?.order || 0;
    
    let assigned = false;
    for (const category of categories) {
      if (category.orders.includes(order)) {
        category.plugins.push(plugin);
        assigned = true;
        break;
      }
    }
    
    // If not assigned to any category, put in core tools
    if (!assigned) {
      categories[0].plugins.push(plugin);
    }
  });

  // Filter out empty categories
  const nonEmptyCategories = categories.filter(cat => cat.plugins.length > 0);

  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Better touch handling for iOS
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent, categoryId: string) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    
    // If user moves more than 10px, consider it a scroll gesture
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, categoryId: string) => {
    if (!touchStart) return;
    
    const touchTime = Date.now() - touchStart.time;
    
    // Only trigger toggle if:
    // 1. Touch was quick (< 300ms)
    // 2. User didn't drag
    // 3. Touch duration was reasonable for a tap
    if (!isDragging && touchTime < 300) {
      e.preventDefault();
      handleCategoryToggle(categoryId);
    }
    
    setTouchStart(null);
    setIsDragging(false);
  };

  const handlePluginTap = (plugin: UIComponentDefinition) => {
    onPluginSelect(plugin);
  };

  // If a plugin is selected, show back button and plugin content
  if (selectedPlugin) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <button
            onPointerDown={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#374151',
              marginRight: '8px'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>
            {visiblePanels.find(p => p.id === selectedPlugin.id)?.name || selectedPlugin.id}
          </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <MobilePluginContent plugin={selectedPlugin} />
        </div>
      </div>
    );
  }

  // Show category list
  return (
    <div 
      className="mobile-plugin-menu"
      style={{ 
        height: '100%', 
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        padding: '16px 16px 40px 16px' // Extra padding, especially bottom
      }}>
      {nonEmptyCategories.map(category => (
        <div key={category.id} style={{ marginBottom: '8px' }}>
          <button
            onTouchStart={(e) => handleTouchStart(e, category.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={(e) => handleTouchEnd(e, category.id)}
            onClick={(e) => {
              // Fallback for non-touch devices
              e.preventDefault();
              handleCategoryToggle(category.id);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'white',
              border: 'none',
              borderRadius: '12px',
              margin: '0 0 8px 0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ 
                color: category.color, 
                marginRight: '12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                {category.icon}
              </div>
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: '#374151',
                  textAlign: 'left'
                }}>
                  {category.name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  textAlign: 'left'
                }}>
                  {category.plugins.length} tool{category.plugins.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <ChevronRight 
              size={20} 
              style={{ 
                color: '#9ca3af',
                transform: expandedCategory === category.id ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} 
            />
          </button>
          
          {expandedCategory === category.id && (
            <div style={{ 
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '8px',
              marginBottom: '8px'
            }}>
              {category.plugins.map(plugin => {
                const panel = visiblePanels.find(p => p.id === plugin.id);
                return (
                  <button
                    key={plugin.id}
                    onClick={() => handlePluginTap(plugin)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      margin: '4px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#374151'
                      }}>
                        {panel?.name || plugin.id}
                      </div>
                      {panel?.order !== undefined && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#9ca3af'
                        }}>
                          Order: {panel.order}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} style={{ color: '#d1d5db' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      
      {/* Visual indicator for end of content */}
      <div style={{
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: '12px',
        marginTop: '16px'
      }}>
        • • •
      </div>
    </div>
  );
};

// Component that renders the actual plugin content
const MobilePluginContent: React.FC<{ plugin: UIComponentDefinition }> = ({ plugin }) => {
  return (
    <div style={{ 
      fontSize: '14px',
      width: '100%',
    }}>
      <MobileAccordionModeProvider>
        <plugin.component />
      </MobileAccordionModeProvider>
    </div>
  );
};

// Context provider for mobile accordion mode
const MobileAccordionContext = React.createContext(true);

const MobileAccordionModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MobileAccordionContext.Provider value={true}>
      {children}
    </MobileAccordionContext.Provider>
  );
};

export const useMobileAccordionMode = () => React.useContext(MobileAccordionContext);