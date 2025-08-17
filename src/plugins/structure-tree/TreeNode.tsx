import React from 'react';
import { TreeItem } from './TreeUtils';
import { useEditorStore } from '../../store/editorStore';
import { recursivelyLockGroup, recursivelyLockPath, recursivelyLockSubPath } from '../selection/FloatingSelectionActions';
import { 
  ChevronRight, 
  ChevronDown,
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  Type,
  Image as ImageIcon,
  Group,
  Box,
  MousePointer,
  Layers,
  Circle,
  Trash2
} from 'lucide-react';

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  searchQuery?: string;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  item,
  level,
  expandedNodes,
  onToggleExpanded,
  searchQuery = ''
}) => {
  const { selection, selectText, selectPath, selectSubPath, selectCommand, selectGroup, selectImage, selectUse, clearSelection, updateText, updateMultilineText, texts, deleteText, removePath, deleteGroup, removeImage, removeSymbol, removeUse, removeSubPath } = useEditorStore();
  
  const isExpanded = expandedNodes.has(item.id);
  const hasChildren = item.children.length > 0;
  const indentLevel = level * 12;

  // Check if this item is currently selected
  const isSelected = () => {
    switch (item.type) {
      case 'text':
        return selection.selectedTexts.includes(item.id);
      case 'path':
        return selection.selectedPaths.includes(item.id);
      case 'subpath':
        return selection.selectedSubPaths.includes(item.id);
      case 'command':
        return selection.selectedCommands.includes(item.id);
      case 'group':
        return selection.selectedGroups.includes(item.id);
      case 'image':
        return selection.selectedImages.includes(item.id);
      case 'symbol':
        return selection.selectedSymbols.includes(item.id);
      case 'use':
        return selection.selectedUses.includes(item.id);
      default:
        return false;
    }
  };

  // Handle element selection
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If shift is pressed, add to selection, otherwise clear and select
    const addToSelection = e.shiftKey;
    
    if (!addToSelection) {
      clearSelection();
    }

    switch (item.type) {
      case 'text':
        selectText(item.id, addToSelection);
        break;
      case 'path':
        selectPath(item.id, addToSelection);
        break;
      case 'subpath':
        selectSubPath(item.id, addToSelection);
        break;
      case 'command':
        selectCommand(item.id, addToSelection);
        break;
      case 'group':
        selectGroup(item.id, addToSelection);
        break;
      case 'image':
        selectImage(item.id, addToSelection);
        break;
      case 'symbol':
        // Symbols currently don't have selection method
        // Could use addToSelection or create a custom method
        break;
      case 'use':
        selectUse(item.id, addToSelection);
        break;
    }
  };

  // Handle lock/unlock
  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const store = useEditorStore.getState();
    store.pushToHistory();

    switch (item.type) {
      case 'text':
        // Find the actual text element to determine if it's simple or multiline
        const textElement = texts.find(t => t.id === item.id);
        if (textElement) {
          if (textElement.type === 'text') {
            updateText(item.id, { locked: !item.locked });
          } else if (textElement.type === 'multiline-text') {
            updateMultilineText(item.id, { locked: !item.locked });
          }
        }
        break;
      case 'path':
        // Use recursive lock for paths - locks path, all subpaths, and all commands
        recursivelyLockPath(item.id, !item.locked);
        break;
      case 'subpath':
        // Use recursive lock for subpaths - locks subpath and all its commands
        recursivelyLockSubPath(item.id, !item.locked);
        break;
      case 'command':
        for (const path of store.paths) {
          for (const subPath of path.subPaths) {
            const commandIndex = subPath.commands.findIndex(cmd => cmd.id === item.id);
            if (commandIndex >= 0) {
              const updatedCommands = [...subPath.commands];
              updatedCommands[commandIndex] = {
                ...updatedCommands[commandIndex],
                locked: !item.locked
              };
              store.replaceSubPathCommands(subPath.id, updatedCommands);
              return;
            }
          }
        }
        break;
      case 'group':
        // Use recursive lock for groups - locks group and all its children recursively
        recursivelyLockGroup(item.id, !item.locked);
        break;
      case 'image':
        store.updateImage(item.id, { locked: !item.locked });
        break;
      case 'symbol':
        store.updateSymbol(item.id, { locked: !item.locked });
        break;
      case 'use':
        store.updateUse(item.id, { locked: !item.locked });
        break;
    }
  };

  // Handle visibility toggle for supported elements
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const store = useEditorStore.getState();
    store.pushToHistory();

    if (item.type === 'group') {
      store.updateGroup(item.id, { visible: !item.visible });
    }
    // Add other visibility toggles as needed
  };

  // Handle delete element
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const store = useEditorStore.getState();
    store.pushToHistory();

    switch (item.type) {
      case 'text':
        deleteText(item.id);
        break;
      case 'path':
        removePath(item.id);
        break;
      case 'group':
        deleteGroup(item.id);
        break;
      case 'image':
        removeImage(item.id);
        break;
      case 'symbol':
        removeSymbol(item.id);
        break;
      case 'use':
        removeUse(item.id);
        break;
      case 'subpath':
        removeSubPath(item.id);
        break;
      case 'command':
        // Find parent subpath and delete command
        for (const path of store.paths) {
          for (const subPath of path.subPaths) {
            const commandIndex = subPath.commands.findIndex(cmd => cmd.id === item.id);
            if (commandIndex >= 0) {
              const updatedCommands = subPath.commands.filter(cmd => cmd.id !== item.id);
              store.replaceSubPathCommands(subPath.id, updatedCommands);
              return;
            }
          }
        }
        break;
    }
  };

  // Get appropriate icon for element type
  const getElementIcon = () => {
    if (item.locked) {
      // All locked elements get blue icons
      const IconComponent = (() => {
        switch (item.type) {
          case 'text': return Type;
          case 'path': return Box;
          case 'subpath': return Layers;
          case 'command': return Circle;
          case 'group': return Group;
          case 'image': return ImageIcon;
          case 'symbol': return Layers;
          case 'use': return MousePointer;
          default: return Box;
        }
      })();
      return <IconComponent size={12} className="text-blue-600" />;
    }
    
    // Non-locked elements get their normal colors
    switch (item.type) {
      case 'text':
        return <Type size={12} className="text-blue-600" />;
      case 'path':
        return <Box size={12} className="text-green-600" />;
      case 'subpath':
        return <Layers size={12} className="text-green-500" />;
      case 'command':
        return <Circle size={12} className="text-green-400" />;
      case 'group':
        return <Group size={12} className="text-purple-600" />;
      case 'image':
        return <ImageIcon size={12} className="text-orange-600" />;
      case 'symbol':
        return <Layers size={12} className="text-indigo-600" />;
      case 'use':
        return <MousePointer size={12} className="text-pink-600" />;
      default:
        return <Box size={12} className="text-gray-500" />;
    }
  };

  // Highlight text if it matches search query
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200">{part}</mark>
        : part
    );
  };

  const selected = isSelected();

  return (
    <div className="tree-node">
      <div 
        className={`
          text-xs cursor-pointer
          hover:bg-gray-100 transition-colors
          ${selected ? 'bg-blue-100' : ''}
          ${item.locked ? 'text-blue-600 font-medium' : ''}
          ${selected && !item.locked ? 'text-blue-800' : ''}
        `}
        style={{ 
          paddingLeft: `${indentLevel + 2}px`,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: '2px',
          height: '16px',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
          width: '100%'
        }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <div style={{ 
          width: '12px', 
          height: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(item.id);
              }}
              style={{ 
                width: '12px', 
                height: '12px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                margin: 0
              }}
            >
              {isExpanded ? (
                <ChevronDown size={8} />
              ) : (
                <ChevronRight size={8} />
              )}
            </button>
          ) : null}
        </div>

        {/* Element Icon */}
        <div style={{ 
          width: '12px', 
          height: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {getElementIcon()}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1px',
          flexShrink: 0,
          height: '16px'
        }}>
          {/* Visibility Toggle (for groups) */}
          {item.type === 'group' && (
            <button
              onClick={handleToggleVisibility}
              style={{ 
                width: '10px', 
                height: '10px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                margin: 0
              }}
              title={item.visible ? 'Hide' : 'Show'}
            >
              {item.visible !== false ? (
                <Eye size={8} className="text-gray-600" />
              ) : (
                <EyeOff size={8} className="text-gray-400" />
              )}
            </button>
          )}

          {/* Lock Toggle */}
          {['text', 'path', 'subpath', 'command', 'group', 'image', 'symbol', 'use'].includes(item.type) && (
            <button
              onClick={handleToggleLock}
              style={{ 
                width: '10px', 
                height: '10px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                margin: 0
              }}
              title={item.locked ? 'Unlock' : 'Lock'}
            >
              {item.locked ? (
                <Lock size={8} className="text-red-500" />
              ) : (
                <Unlock size={8} className="text-green-500" />
              )}
            </button>
          )}

          {/* Delete Button */}
          {['text', 'path', 'subpath', 'command', 'group', 'image', 'symbol', 'use'].includes(item.type) && (
            <button
              onClick={handleDelete}
              style={{ 
                width: '10px', 
                height: '10px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                margin: 0
              }}
              title="Delete"
            >
              <Trash2 size={8} className="text-red-500" />
            </button>
          )}
        </div>

        {/* Element Name */}
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '12px',
          lineHeight: '16px',
          marginLeft: '2px',
          minWidth: 0,
          color: item.locked ? '#2563eb' : 'inherit' // Force blue color for locked elements
        }} title={item.name}>
          {highlightText(item.name, searchQuery)}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {item.children.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};