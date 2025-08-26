import { SVGPath, SVGGroup, TextElementType, SVGImage, SVGSymbol, SVGUse } from '../../types';
import { getElementZIndex } from '../../utils/z-index-manager';

export interface TreeItem {
  id: string;
  name: string;
  type: 'document' | 'path' | 'subpath' | 'command' | 'text' | 'group' | 'image' | 'symbol' | 'use';
  elementType?: string; // Original element type for detailed info
  locked?: boolean;
  visible?: boolean;
  children: TreeItem[];
  metadata?: {
    commandCount?: number;
    subPathCount?: number;
    childCount?: number;
    style?: any;
    transform?: string;
    zIndex?: number;
  };
}

export interface DocumentElements {
  paths: SVGPath[];
  texts: TextElementType[];
  groups: SVGGroup[];
  images: SVGImage[];
  symbols: SVGSymbol[];
  uses: SVGUse[];
}

export function buildTreeStructure(elements: DocumentElements): TreeItem[] {
  const tree: TreeItem[] = [];

  // Add groups first (they might contain other elements)
  elements.groups.forEach(group => {
    tree.push(buildGroupNode(group, elements));
  });

  // Add standalone paths (not in groups)
  elements.paths.forEach(path => {
    if (!isElementInGroup(path.id, elements.groups, 'path')) {
      tree.push(buildPathNode(path));
    }
  });

  // Add standalone texts (not in groups)
  elements.texts.forEach(text => {
    if (!isElementInGroup(text.id, elements.groups, 'text')) {
      tree.push(buildTextNode(text));
    }
  });

  // Add standalone images (not in groups)
  elements.images.forEach(image => {
    if (!isElementInGroup(image.id, elements.groups, 'image')) {
      tree.push(buildImageNode(image));
    }
  });

  // Add symbols
  elements.symbols.forEach(symbol => {
    tree.push(buildSymbolNode(symbol, elements));
  });

  // Add use elements
  elements.uses.forEach(use => {
    if (!isElementInGroup(use.id, elements.groups, 'use')) {
      tree.push(buildUseNode(use));
    }
  });

  return tree;
}

function buildGroupNode(group: SVGGroup, allElements: DocumentElements): TreeItem {
  const children: TreeItem[] = [];

  // Add children based on group's children array
  group.children.forEach(child => {
    switch (child.type) {
      case 'path':
        const path = allElements.paths.find(p => p.id === child.id);
        if (path) {
          children.push(buildPathNode(path));
        }
        break;
      case 'text':
      case 'textPath':
        const text = allElements.texts.find(t => t.id === child.id);
        if (text) {
          children.push(buildTextNode(text));
        }
        break;
      case 'group':
        const subgroup = allElements.groups.find(g => g.id === child.id);
        if (subgroup) {
          children.push(buildGroupNode(subgroup, allElements));
        }
        break;
      case 'image':
        const image = allElements.images.find(img => img.id === child.id);
        if (image) {
          children.push(buildImageNode(image));
        }
        break;
      case 'use':
        const use = allElements.uses.find(u => u.id === child.id);
        if (use) {
          children.push(buildUseNode(use));
        }
        break;
    }
  });

  return {
    id: group.id,
    name: group.name || `Group ${group.id.slice(-4)}`,
    type: 'group',
    elementType: 'SVGGroup',
    locked: group.locked,
    visible: group.visible,
    children,
    metadata: {
      childCount: children.length,
      transform: group.transform,
      zIndex: getElementZIndex(group.id)
    }
  };
}

function buildPathNode(path: SVGPath): TreeItem {
  const children: TreeItem[] = [];

  // Add subpaths
  path.subPaths.forEach(subPath => {
    const subPathChildren: TreeItem[] = [];

    // Add commands
    subPath.commands.forEach(command => {
      subPathChildren.push({
        id: command.id,
        name: `${command.command}${command.x !== undefined ? ` (${Math.round(command.x)}, ${Math.round(command.y || 0)})` : ''}`,
        type: 'command',
        elementType: 'SVGCommand',
        locked: command.locked,
        children: [],
        metadata: {
          style: command
        }
      });
    });

    children.push({
      id: subPath.id,
      name: `SubPath (${subPath.commands.length} commands)`,
      type: 'subpath',
      elementType: 'SVGSubPath',
      locked: subPath.locked,
      children: subPathChildren,
      metadata: {
        commandCount: subPath.commands.length
      }
    });
  });

  return {
    id: path.id,
    name: `Path (${path.subPaths.length} subpaths)`,
    type: 'path',
    elementType: 'SVGPath',
    locked: path.locked,
    children,
    metadata: {
      subPathCount: path.subPaths.length,
      style: path.style,
      zIndex: getElementZIndex(path.id)
    }
  };
}

function buildTextNode(text: TextElementType): TreeItem {
  const content = getTextContent(text);
  const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;
  
  return {
    id: text.id,
    name: `Text: "${truncatedContent}"`,
    type: 'text',
    elementType: text.type === 'text' ? 'TextElement' : text.type === 'multiline-text' ? 'MultilineTextElement' : 'TextPathElement',
    locked: text.locked,
    children: [],
    metadata: {
      style: text.style,
      transform: text.transform,
      zIndex: getElementZIndex(text.id)
    }
  };
}

function buildImageNode(image: SVGImage): TreeItem {
  const imageName = truncateUrl(image.href);
  
  return {
    id: image.id,
    name: `Image: ${imageName}`,
    type: 'image',
    elementType: 'SVGImage',
    locked: image.locked,
    children: [],
    metadata: {
      style: image.style,
      transform: image.transform,
      zIndex: getElementZIndex(image.id)
    }
  };
}

// Helper function to truncate URLs showing start...end
function truncateUrl(url: string, maxLength: number = 20): string {
  if (url.length <= maxLength) return url;
  
  // For data URLs, show just the type
  if (url.startsWith('data:')) {
    const typeMatch = url.match(/data:([^;]+)/);
    if (typeMatch) {
      return `data:${typeMatch[1]}...`;
    }
    return 'data:...';
  }
  
  // For regular URLs, show start...end
  const start = url.substring(0, Math.floor(maxLength / 2) - 1);
  const end = url.substring(url.length - Math.floor(maxLength / 2) + 2);
  return `${start}...${end}`;
}

function buildSymbolNode(symbol: SVGSymbol, allElements: DocumentElements): TreeItem {
  const children: TreeItem[] = [];

  // Add symbol children (similar to group)
  symbol.children.forEach(child => {
    switch (child.type) {
      case 'path':
        const path = allElements.paths.find(p => p.id === child.id);
        if (path) {
          children.push(buildPathNode(path));
        }
        break;
      case 'text':
      case 'textPath':
        const text = allElements.texts.find(t => t.id === child.id);
        if (text) {
          children.push(buildTextNode(text));
        }
        break;
    }
  });

  return {
    id: symbol.id,
    name: `Symbol ${symbol.id.slice(-4)}`,  // SVGSymbol doesn't have a title property
    type: 'symbol',
    elementType: 'SVGSymbol',
    locked: symbol.locked,
    children,
    metadata: {
      childCount: children.length
    }
  };
}

function buildUseNode(use: SVGUse): TreeItem {
  return {
    id: use.id,
    name: `Use → ${use.href.replace('#', '')}`,
    type: 'use',
    elementType: 'SVGUse',
    locked: use.locked,
    children: [],
    metadata: {
      style: use.style,
      transform: use.transform,
      zIndex: getElementZIndex(use.id)
    }
  };
}

// Helper function to get text content from any text element type
function getTextContent(text: TextElementType): string {
  if (text.type === 'text') {
    return text.content || '';
  } else if (text.type === 'multiline-text') {
    return text.spans.map(span => span.content).join(' ') || '';
  }
  return '';
}

// Helper function to check if an element is contained in a group
function isElementInGroup(elementId: string, groups: SVGGroup[], elementType: string): boolean {
  return groups.some(group => 
    group.children.some(child => 
      child.id === elementId && child.type === elementType
    )
  );
}