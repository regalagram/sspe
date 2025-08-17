import React from 'react';
import { TreeItem } from './TreeUtils';
import { useEditorStore } from '../../store/editorStore';
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
  Circle
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
  const { selection, selectText, selectPath, selectSubPath, selectCommand, selectGroup, selectImage, selectUse, clearSelection, updateText, updateMultilineText, texts } = useEditorStore();
  
  const isExpanded = expandedNodes.has(item.id);
  const hasChildren = item.children.length > 0;
  const indentLevel = level * 16;

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
        const path = store.paths.find(p => p.id === item.id);
        if (path) {
          const pathIndex = store.paths.findIndex(p => p.id === item.id);
          const updatedPath = { ...path, locked: !item.locked };
          const newPaths = [...store.paths];
          newPaths[pathIndex] = updatedPath;
          store.replacePaths(newPaths);
        }
        break;
      case 'subpath':
        const pathWithSubPath = store.paths.find(path => 
          path.subPaths.some(sp => sp.id === item.id)
        );
        if (pathWithSubPath) {
          const subPathIndex = pathWithSubPath.subPaths.findIndex(sp => sp.id === item.id);
          if (subPathIndex >= 0) {
            const updatedSubPath = {
              ...pathWithSubPath.subPaths[subPathIndex],
              locked: !item.locked
            };
            store.updateSubPath(item.id, updatedSubPath);
          }
        }
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
        // Groups have more complex lock levels, just toggle basic lock
        store.updateGroup(item.id, { locked: !item.locked });
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

  // Get appropriate icon for element type
  const getElementIcon = () => {
    switch (item.type) {
      case 'text':
        return <Type size={14} className="text-blue-600" />;
      case 'path':
        return <Box size={14} className="text-green-600" />;
      case 'subpath':
        return <Layers size={14} className="text-green-500" />;
      case 'command':
        return <Circle size={14} className="text-green-400" />;
      case 'group':
        return <Group size={14} className="text-purple-600" />;
      case 'image':
        return <ImageIcon size={14} className="text-orange-600" />;
      case 'symbol':
        return <Layers size={14} className="text-indigo-600" />;
      case 'use':
        return <MousePointer size={14} className="text-pink-600" />;
      default:
        return <Box size={14} className="text-gray-500" />;
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
          flex items-center gap-1 py-1 px-2 text-sm cursor-pointer rounded
          hover:bg-gray-100 transition-colors
          ${selected ? 'bg-blue-100 text-blue-800' : ''}
          ${item.locked ? 'opacity-60' : ''}
        `}
        style={{ paddingLeft: `${indentLevel + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <div className="w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded(item.id);
              }}
              className="hover:bg-gray-200 rounded p-0.5"
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          ) : null}
        </div>

        {/* Element Icon */}
        {getElementIcon()}

        {/* Element Name */}
        <span className="flex-1 truncate" title={item.name}>
          {highlightText(item.name, searchQuery)}
        </span>

        {/* Element Type Badge */}
        <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
          {item.type}
        </span>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Visibility Toggle (for groups) */}
          {item.type === 'group' && (
            <button
              onClick={handleToggleVisibility}
              className="p-0.5 hover:bg-gray-200 rounded"
              title={item.visible ? 'Hide' : 'Show'}
            >
              {item.visible !== false ? (
                <Eye size={12} className="text-gray-600" />
              ) : (
                <EyeOff size={12} className="text-gray-400" />
              )}
            </button>
          )}

          {/* Lock Toggle */}
          {['text', 'path', 'subpath', 'command', 'group', 'image', 'symbol', 'use'].includes(item.type) && (
            <button
              onClick={handleToggleLock}
              className="p-0.5 hover:bg-gray-200 rounded"
              title={item.locked ? 'Unlock' : 'Lock'}
            >
              {item.locked ? (
                <Lock size={12} className="text-red-500" />
              ) : (
                <Unlock size={12} className="text-green-500" />
              )}
            </button>
          )}
        </div>
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