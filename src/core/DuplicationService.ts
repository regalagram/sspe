/**
 * Centralized Duplication Service
 * 
 * Consolidates all duplication logic across the application to eliminate
 * duplicated patterns and provide consistent duplication algorithms.
 */

import { SVGPath, TextElementType, SVGGroup, Point, EditorState } from '../types';
import { generateId } from '../utils/id-utils';

/**
 * Duplication configuration options
 */
export interface DuplicationOptions {
  // Positioning
  offset?: Point;
  smartPositioning?: boolean;
  gridSnap?: boolean;
  
  // Naming
  namePattern?: string; // Pattern like "Copy {n} of {name}"
  preserveHierarchy?: boolean;
  
  // Selection behavior
  selectOriginal?: boolean;
  selectDuplicated?: boolean;
  
  // Advanced options
  deepCopy?: boolean;
  preserveRelationships?: boolean;
  
  // Count
  count?: number; // Number of duplicates to create
}

/**
 * Default duplication configuration
 */
export const DEFAULT_DUPLICATION_OPTIONS: DuplicationOptions = {
  offset: { x: 20, y: 20 },
  smartPositioning: true,
  gridSnap: false,
  namePattern: 'Copy of {name}',
  preserveHierarchy: true,
  selectOriginal: false,
  selectDuplicated: true,
  deepCopy: true,
  preserveRelationships: true,
  count: 1
};

/**
 * Duplication result interface
 */
export interface DuplicationResult<T> {
  success: boolean;
  originals: T[];
  duplicates: T[];
  errors: string[];
  warnings: string[];
  metadata: {
    totalDuplicated: number;
    preservedRelationships: number;
    appliedOffset: Point;
  };
}

/**
 * Position calculation strategy
 */
export interface PositionStrategy {
  name: string;
  calculate: (
    originalBounds: { x: number; y: number; width: number; height: number },
    index: number,
    total: number,
    options: DuplicationOptions
  ) => Point;
}

/**
 * Built-in position strategies
 */
export const POSITION_STRATEGIES: Record<string, PositionStrategy> = {
  offset: {
    name: 'Simple Offset',
    calculate: (bounds, index, total, options) => ({
      x: (options.offset?.x || 20) * (index + 1),
      y: (options.offset?.y || 20) * (index + 1)
    })
  },
  
  grid: {
    name: 'Grid Layout',
    calculate: (bounds, index, total, options) => {
      const cols = Math.ceil(Math.sqrt(total + 1));
      const row = Math.floor((index + 1) / cols);
      const col = (index + 1) % cols;
      const spacing = options.offset || { x: bounds.width + 20, y: bounds.height + 20 };
      
      return {
        x: col * spacing.x,
        y: row * spacing.y
      };
    }
  },
  
  line: {
    name: 'Linear Layout',
    calculate: (bounds, index, total, options) => {
      const spacing = options.offset || { x: bounds.width + 20, y: 0 };
      return {
        x: spacing.x * (index + 1),
        y: spacing.y * (index + 1)
      };
    }
  },
  
  circle: {
    name: 'Circular Layout',
    calculate: (bounds, index, total, options) => {
      const radius = Math.max(bounds.width, bounds.height) * 2;
      const angle = (2 * Math.PI * (index + 1)) / (total + 1);
      
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    }
  }
};

/**
 * Main duplication service class
 */
export class DuplicationService {
  private positionStrategies = POSITION_STRATEGIES;
  
  /**
   * Duplicate SVG paths
   */
  async duplicatePaths(
    paths: SVGPath[],
    options: Partial<DuplicationOptions> = {}
  ): Promise<DuplicationResult<SVGPath>> {
    const config = { ...DEFAULT_DUPLICATION_OPTIONS, ...options };
    const result: DuplicationResult<SVGPath> = {
      success: false,
      originals: [...paths],
      duplicates: [],
      errors: [],
      warnings: [],
      metadata: {
        totalDuplicated: 0,
        preservedRelationships: 0,
        appliedOffset: config.offset || { x: 0, y: 0 }
      }
    };
    
    try {
      for (const originalPath of paths) {
        for (let i = 0; i < (config.count || 1); i++) {
          const duplicatedPath = this.clonePath(originalPath, config, i);
          
          if (duplicatedPath) {
            // Apply positioning
            const bounds = this.calculatePathBounds(originalPath);
            const strategy = this.positionStrategies.offset;
            const offset = strategy.calculate(bounds, i, config.count || 1, config);
            
            this.applyOffsetToPath(duplicatedPath, offset);
            
            result.duplicates.push(duplicatedPath);
            result.metadata.totalDuplicated++;
          }
        }
      }
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(`Path duplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Duplicate text elements
   */
  async duplicateTexts(
    texts: TextElementType[],
    options: Partial<DuplicationOptions> = {}
  ): Promise<DuplicationResult<TextElementType>> {
    const config = { ...DEFAULT_DUPLICATION_OPTIONS, ...options };
    const result: DuplicationResult<TextElementType> = {
      success: false,
      originals: [...texts],
      duplicates: [],
      errors: [],
      warnings: [],
      metadata: {
        totalDuplicated: 0,
        preservedRelationships: 0,
        appliedOffset: config.offset || { x: 0, y: 0 }
      }
    };
    
    try {
      for (const originalText of texts) {
        for (let i = 0; i < (config.count || 1); i++) {
          const duplicatedText = this.cloneText(originalText, config, i);
          
          if (duplicatedText) {
            // Apply positioning
            const offset = config.offset || { x: 20, y: 20 };
            duplicatedText.x += offset.x * (i + 1);
            duplicatedText.y += offset.y * (i + 1);
            
            result.duplicates.push(duplicatedText);
            result.metadata.totalDuplicated++;
          }
        }
      }
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(`Text duplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Duplicate groups with hierarchy preservation
   */
  async duplicateGroups(
    groups: SVGGroup[],
    editorState: EditorState,
    options: Partial<DuplicationOptions> = {}
  ): Promise<DuplicationResult<SVGGroup>> {
    const config = { ...DEFAULT_DUPLICATION_OPTIONS, ...options };
    const result: DuplicationResult<SVGGroup> = {
      success: false,
      originals: [...groups],
      duplicates: [],
      errors: [],
      warnings: [],
      metadata: {
        totalDuplicated: 0,
        preservedRelationships: 0,
        appliedOffset: config.offset || { x: 0, y: 0 }
      }
    };
    
    try {
      const idMap = new Map<string, string>();
      
      for (const originalGroup of groups) {
        for (let i = 0; i < (config.count || 1); i++) {
          const duplicatedGroup = await this.cloneGroupDeep(
            originalGroup,
            editorState,
            config,
            i,
            idMap
          );
          
          if (duplicatedGroup) {
            result.duplicates.push(duplicatedGroup);
            result.metadata.totalDuplicated++;
            
            if (config.preserveHierarchy) {
              result.metadata.preservedRelationships++;
            }
          }
        }
      }
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(`Group duplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Duplicate mixed selection (paths, texts, groups)
   */
  async duplicateMixed(
    selection: {
      paths: SVGPath[];
      texts: TextElementType[];
      groups: SVGGroup[];
    },
    editorState: EditorState,
    options: Partial<DuplicationOptions> = {}
  ): Promise<{
    paths: DuplicationResult<SVGPath>;
    texts: DuplicationResult<TextElementType>;
    groups: DuplicationResult<SVGGroup>;
  }> {
    const [pathResult, textResult, groupResult] = await Promise.all([
      this.duplicatePaths(selection.paths, options),
      this.duplicateTexts(selection.texts, options),
      this.duplicateGroups(selection.groups, editorState, options)
    ]);
    
    return {
      paths: pathResult,
      texts: textResult,
      groups: groupResult
    };
  }
  
  /**
   * Clone a single path with deep copy
   */
  private clonePath(
    original: SVGPath,
    options: DuplicationOptions,
    index: number
  ): SVGPath | null {
    try {
      const cloned: SVGPath = {
        id: generateId(),
        subPaths: original.subPaths.map(subPath => ({
          id: generateId(),
          commands: subPath.commands.map(cmd => ({
            ...cmd,
            id: generateId()
          })),
          locked: subPath.locked
        })),
        style: { ...original.style },
        locked: original.locked,
        zIndex: original.zIndex
      };
      
      return cloned;
      
    } catch (error) {
      console.error('Path cloning failed:', error);
      return null;
    }
  }
  
  /**
   * Clone a single text element (handles both TextElement and MultilineTextElement)
   */
  private cloneText(
    original: TextElementType,
    options: DuplicationOptions,
    index: number
  ): TextElementType | null {
    try {
      if (original.type === 'text') {
        const textOriginal = original as any; // Cast to access content
        const name = this.generateDuplicateName(textOriginal.content || 'Text', options, index);
        
        const cloned = {
          id: generateId(),
          type: 'text' as const,
          content: name,
          x: original.x,
          y: original.y,
          fontSize: original.fontSize,
          fontFamily: original.fontFamily,
          rotation: original.rotation,
          transform: original.transform,
          style: { ...original.style },
          locked: original.locked,
          zIndex: original.zIndex
        };
        
        return cloned;
      } else if (original.type === 'multiline-text') {
        const multilineOriginal = original as any; // Cast to access spans
        
        const cloned = {
          id: generateId(),
          type: 'multiline-text' as const,
          x: original.x,
          y: original.y,
          fontSize: original.fontSize,
          fontFamily: original.fontFamily,
          rotation: original.rotation,
          transform: original.transform,
          spans: multilineOriginal.spans.map((span: any) => ({
            ...span,
            id: generateId()
          })),
          style: { ...original.style },
          locked: original.locked,
          zIndex: original.zIndex
        };
        
        return cloned;
      }
      
      return null;
      
    } catch (error) {
      console.error('Text cloning failed:', error);
      return null;
    }
  }
  
  /**
   * Clone a group with deep hierarchy preservation
   */
  private async cloneGroupDeep(
    original: SVGGroup,
    editorState: EditorState,
    options: DuplicationOptions,
    index: number,
    idMap: Map<string, string>
  ): Promise<SVGGroup | null> {
    try {
      const newGroupId = generateId();
      idMap.set(original.id, newGroupId);
      
      const name = this.generateDuplicateName(original.name || 'Group', options, index);
      
      // Clone children with preserved relationships
      const clonedChildren = [];
      
      for (const child of original.children) {
        let childId: string;
        
        if (idMap.has(child.id)) {
          childId = idMap.get(child.id)!;
        } else {
          childId = generateId();
          idMap.set(child.id, childId);
          
          // Clone the actual child element based on type
          switch (child.type) {
            case 'path':
              const originalPath = editorState.paths.find(p => p.id === child.id);
              if (originalPath) {
                const clonedPath = this.clonePath(originalPath, options, index);
                if (clonedPath) {
                  clonedPath.id = childId;
                }
              }
              break;
              
            case 'text':
              const originalText = editorState.texts.find(t => t.id === child.id);
              if (originalText) {
                const clonedText = this.cloneText(originalText, options, index);
                if (clonedText) {
                  clonedText.id = childId;
                }
              }
              break;
              
            case 'group':
              const originalSubGroup = editorState.groups.find(g => g.id === child.id);
              if (originalSubGroup) {
                const clonedSubGroup = await this.cloneGroupDeep(
                  originalSubGroup,
                  editorState,
                  options,
                  index,
                  idMap
                );
                if (clonedSubGroup) {
                  clonedSubGroup.id = childId;
                }
              }
              break;
          }
        }
        
        clonedChildren.push({
          type: child.type,
          id: childId
        });
      }
      
      const cloned: SVGGroup = {
        id: newGroupId,
        name,
        children: clonedChildren,
        visible: original.visible,
        locked: original.locked,
        lockLevel: original.lockLevel,
        transform: original.transform
      };
      
      return cloned;
      
    } catch (error) {
      console.error('Group cloning failed:', error);
      return null;
    }
  }
  
  /**
   * Generate duplicate name based on pattern
   */
  private generateDuplicateName(
    originalName: string,
    options: DuplicationOptions,
    index: number
  ): string {
    const pattern = options.namePattern || 'Copy of {name}';
    
    if (index === 0) {
      return pattern.replace('{name}', originalName);
    } else {
      return pattern.replace('{name}', originalName) + ` (${index + 1})`;
    }
  }
  
  /**
   * Calculate bounds for positioning
   */
  private calculatePathBounds(path: SVGPath): { x: number; y: number; width: number; height: number } {
    // Simplified bounds calculation - in real implementation would need proper path bounds calculation
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  
  /**
   * Apply offset to path
   */
  private applyOffsetToPath(path: SVGPath, offset: Point): void {
    // Apply offset to all commands in all subpaths
    path.subPaths.forEach(subPath => {
      subPath.commands.forEach(cmd => {
        if (cmd.x !== undefined) cmd.x += offset.x;
        if (cmd.y !== undefined) cmd.y += offset.y;
        if (cmd.x1 !== undefined) cmd.x1 += offset.x;
        if (cmd.y1 !== undefined) cmd.y1 += offset.y;
        if (cmd.x2 !== undefined) cmd.x2 += offset.x;
        if (cmd.y2 !== undefined) cmd.y2 += offset.y;
      });
    });
  }
  
  /**
   * Register custom position strategy
   */
  registerPositionStrategy(name: string, strategy: PositionStrategy): void {
    this.positionStrategies[name] = strategy;
  }
  
  /**
   * Get available position strategies
   */
  getAvailableStrategies(): string[] {
    return Object.keys(this.positionStrategies);
  }
  
  /**
   * Batch duplicate with different strategies
   */
  async batchDuplicate<T>(
    items: T[],
    strategies: string[],
    duplicateFunction: (items: T[], options: DuplicationOptions) => Promise<DuplicationResult<T>>,
    baseOptions: Partial<DuplicationOptions> = {}
  ): Promise<Record<string, DuplicationResult<T>>> {
    const results: Record<string, DuplicationResult<T>> = {};
    
    for (const strategyName of strategies) {
      if (this.positionStrategies[strategyName]) {
        const options = {
          ...baseOptions,
          // Apply strategy-specific options here
        };
        
        results[strategyName] = await duplicateFunction(items, options);
      }
    }
    
    return results;
  }
}

/**
 * Utility functions for duplication operations
 */
export class DuplicationUtils {
  /**
   * Calculate smart offset based on element bounds and canvas state
   */
  static calculateSmartOffset(
    elements: any[],
    canvasState: any
  ): Point {
    // Implementation would analyze canvas state and element positions
    // to find optimal placement for duplicates
    return { x: 20, y: 20 };
  }
  
  /**
   * Detect duplication conflicts (overlapping elements)
   */
  static detectConflicts(
    originals: any[],
    duplicates: any[]
  ): string[] {
    const conflicts: string[] = [];
    
    // Implementation would check for overlapping bounds, duplicate names, etc.
    
    return conflicts;
  }
  
  /**
   * Optimize duplication performance for large sets
   */
  static optimizeForLargeSet<T>(
    items: T[],
    options: DuplicationOptions
  ): DuplicationOptions {
    if (items.length > 100) {
      return {
        ...options,
        deepCopy: false, // Shallow copy for performance
        smartPositioning: false // Simple offset for speed
      };
    }
    
    return options;
  }
  
  /**
   * Validate duplication options
   */
  static validateOptions(options: DuplicationOptions): string[] {
    const errors: string[] = [];
    
    if (options.count && options.count < 1) {
      errors.push('Count must be at least 1');
    }
    
    if (options.count && options.count > 1000) {
      errors.push('Count cannot exceed 1000 for performance reasons');
    }
    
    return errors;
  }
}

/**
 * Default duplication service instance
 */
export const duplicationService = new DuplicationService();
