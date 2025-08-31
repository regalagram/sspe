/**
 * SVG Import Service
 * 
 * Handles secure SVG file imports with sanitization and validation
 */

import { SVGSanitizer, SVGValidationResult, SVGSanitizationConfig } from './SVGSanitizer';
import { generateId } from '../utils/id-utils';
import { SVGPath, EditorState, TextElement, SVGGroup } from '../types';

export interface SVGImportOptions {
  sanitizationConfig?: Partial<SVGSanitizationConfig>;
  importAsGroup?: boolean;
  preserveIds?: boolean;
  namePrefix?: string;
  position?: { x: number; y: number };
  scale?: number;
}

export interface SVGImportResult {
  success: boolean;
  data?: {
    paths: SVGPath[];
    texts: TextElement[];
    groups: SVGGroup[];
    rootGroupId?: string;
  };
  validation: SVGValidationResult;
  warnings: string[];
  errors: string[];
}

/**
 * SVG Import Service with comprehensive sanitization
 */
export class SVGImportService {
  private sanitizer: SVGSanitizer;
  
  constructor(config?: Partial<SVGSanitizationConfig>) {
    this.sanitizer = new SVGSanitizer(config);
  }
  
  /**
   * Import SVG from file content
   */
  async importFromContent(
    content: string,
    filename: string,
    options: SVGImportOptions = {}
  ): Promise<SVGImportResult> {
    const result: SVGImportResult = {
      success: false,
      warnings: [],
      errors: [],
      validation: {
        isValid: false,
        warnings: [],
        errors: [],
        metadata: {
          originalSize: 0,
          sanitizedSize: 0,
          elementCount: 0,
          dimensions: { width: 0, height: 0 },
          hasAnimations: false,
          hasGradients: false,
          hasFilters: false
        }
      }
    };
    
    try {
      // 1. Sanitize and validate
      const validation = await this.sanitizer.sanitizeSVG(content, filename);
      result.validation = validation;
      
      if (!validation.isValid || !validation.sanitizedContent) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        return result;
      }
      
      // 2. Parse sanitized SVG
      const parseResult = await this.parseSanitizedSVG(
        validation.sanitizedContent,
        options
      );
      
      if (!parseResult.success) {
        result.errors.push(...parseResult.errors);
        return result;
      }
      
      result.data = parseResult.data;
      result.warnings.push(...validation.warnings);
      result.warnings.push(...parseResult.warnings);
      result.success = true;
      
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Import SVG from File object
   */
  async importFromFile(
    file: File,
    options: SVGImportOptions = {}
  ): Promise<SVGImportResult> {
    try {
      // Basic file validation
      if (!file.type.includes('svg') && !file.name.toLowerCase().endsWith('.svg')) {
        return {
          success: false,
          warnings: [],
          errors: ['File does not appear to be an SVG'],
          validation: {
            isValid: false,
            warnings: [],
            errors: ['Invalid file type'],
            metadata: {
              originalSize: 0,
              sanitizedSize: 0,
              elementCount: 0,
              dimensions: { width: 0, height: 0 },
              hasAnimations: false,
              hasGradients: false,
              hasFilters: false
            }
          }
        };
      }
      
      const content = await this.readFileContent(file);
      return this.importFromContent(content, file.name, options);
      
    } catch (error) {
      return {
        success: false,
        warnings: [],
        errors: [`File reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        validation: {
          isValid: false,
          warnings: [],
          errors: ['File reading error'],
          metadata: {
            originalSize: 0,
            sanitizedSize: 0,
            elementCount: 0,
            dimensions: { width: 0, height: 0 },
            hasAnimations: false,
            hasGradients: false,
            hasFilters: false
          }
        }
      };
    }
  }
  
  /**
   * Parse sanitized SVG content into editor elements
   */
  private async parseSanitizedSVG(
    content: string,
    options: SVGImportOptions
  ): Promise<{
    success: boolean;
    data?: {
      paths: SVGPath[];
      texts: TextElement[];
      groups: SVGGroup[];
      rootGroupId?: string;
    };
    warnings: string[];
    errors: string[];
  }> {
    const parseResult = {
      success: false,
      data: {
        paths: [] as SVGPath[],
        texts: [] as TextElement[],
        groups: [] as SVGGroup[],
        rootGroupId: undefined as string | undefined
      },
      warnings: [] as string[],
      errors: [] as string[]
    };
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      
      if (!svgElement) {
        parseResult.errors.push('No SVG root element found after sanitization');
        return parseResult;
      }
      
      // Create ID mapping for preservation/generation
      const idMap = new Map<string, string>();
      const namePrefix = options.namePrefix || 'imported';
      
      // Process SVG elements
      await this.processElement(svgElement, parseResult.data, idMap, options, namePrefix);
      
      // Create root group if requested
      if (options.importAsGroup && (parseResult.data.paths.length > 0 || parseResult.data.texts.length > 0)) {
        const rootGroup = this.createRootGroup(parseResult.data, namePrefix);
        parseResult.data.groups.push(rootGroup);
        parseResult.data.rootGroupId = rootGroup.id;
      }
      
      // Apply positioning and scaling
      if (options.position || options.scale) {
        this.applyTransformations(parseResult.data, options);
      }
      
      parseResult.success = true;
      
    } catch (error) {
      parseResult.errors.push(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return parseResult;
  }
  
  /**
   * Process SVG element recursively
   */
  private async processElement(
    element: Element,
    data: { paths: SVGPath[]; texts: TextElement[]; groups: SVGGroup[] },
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): Promise<void> {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'path':
        const path = this.createPathFromElement(element, idMap, options, namePrefix);
        if (path) data.paths.push(path);
        break;
        
      case 'text':
        const text = this.createTextFromElement(element, idMap, options, namePrefix);
        if (text) data.texts.push(text);
        break;
        
      case 'g':
        const group = await this.createGroupFromElement(element, data, idMap, options, namePrefix);
        if (group) data.groups.push(group);
        break;
        
      case 'circle':
      case 'ellipse':
      case 'rect':
      case 'line':
      case 'polygon':
      case 'polyline':
        // Convert basic shapes to paths
        const convertedPath = this.convertShapeToPath(element, idMap, options, namePrefix);
        if (convertedPath) data.paths.push(convertedPath);
        break;
        
      default:
        // Process children for other elements
        for (const child of Array.from(element.children)) {
          await this.processElement(child, data, idMap, options, namePrefix);
        }
        break;
    }
  }
  
  /**
   * Create path from path element
   */
  private createPathFromElement(
    element: Element,
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): SVGPath | null {
    const d = element.getAttribute('d');
    if (!d) return null;
    
    const id = this.getOrCreateId(element, idMap, options, namePrefix);
    
    // Basic path creation - in a real implementation, you'd parse the path data properly
    const path: SVGPath = {
      id,
      subPaths: [{
        id: generateId(),
        commands: [] // Would need proper path parsing here
      }],
      style: {
        fill: element.getAttribute('fill') || '#000000',
        stroke: element.getAttribute('stroke') || 'none',
        strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1')
      }
    };
    
    return path;
  }
  
  /**
   * Create text from text element
   */
  private createTextFromElement(
    element: Element,
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): TextElement | null {
    const textContent = element.textContent;
    if (!textContent) return null;
    
    const id = this.getOrCreateId(element, idMap, options, namePrefix);
    
    const text: TextElement = {
      id,
      type: 'text',
      content: textContent,
      x: parseFloat(element.getAttribute('x') || '0'),
      y: parseFloat(element.getAttribute('y') || '0'),
      fontSize: parseFloat(element.getAttribute('font-size') || '16'),
      fontFamily: element.getAttribute('font-family') || 'Arial',
      style: {
        fill: element.getAttribute('fill') || '#000000'
      },
      transform: element.getAttribute('transform') || undefined
    };
    
    return text;
  }
  
  /**
   * Create group from g element
   */
  private async createGroupFromElement(
    element: Element,
    data: { paths: SVGPath[]; texts: TextElement[]; groups: SVGGroup[] },
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): Promise<SVGGroup | null> {
    const id = this.getOrCreateId(element, idMap, options, namePrefix);
    
    // Process children first
    const childrenBefore = {
      paths: data.paths.length,
      texts: data.texts.length,
      groups: data.groups.length
    };
    
    for (const child of Array.from(element.children)) {
      await this.processElement(child, data, idMap, options, namePrefix);
    }
    
    // Create group with references to new children
    const children = [];
    
    // Add new paths
    for (let i = childrenBefore.paths; i < data.paths.length; i++) {
      children.push({ type: 'path' as const, id: data.paths[i].id });
    }
    
    // Add new texts
    for (let i = childrenBefore.texts; i < data.texts.length; i++) {
      children.push({ type: 'text' as const, id: data.texts[i].id });
    }
    
    // Add new groups
    for (let i = childrenBefore.groups; i < data.groups.length; i++) {
      children.push({ type: 'group' as const, id: data.groups[i].id });
    }
    
    if (children.length === 0) return null;
    
    const group: SVGGroup = {
      id,
      name: element.getAttribute('id') || `${namePrefix}-group`,
      children,
      visible: true,
      locked: false,
      lockLevel: 'movement-sync',
      transform: element.getAttribute('transform') || undefined
    };
    
    return group;
  }
  
  /**
   * Convert basic shapes to path
   */
  private convertShapeToPath(
    element: Element,
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): SVGPath | null {
    const tagName = element.tagName.toLowerCase();
    let pathData = '';
    
    switch (tagName) {
      case 'circle':
        const cx = parseFloat(element.getAttribute('cx') || '0');
        const cy = parseFloat(element.getAttribute('cy') || '0');
        const r = parseFloat(element.getAttribute('r') || '0');
        pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
        break;
        
      case 'rect':
        const x = parseFloat(element.getAttribute('x') || '0');
        const y = parseFloat(element.getAttribute('y') || '0');
        const width = parseFloat(element.getAttribute('width') || '0');
        const height = parseFloat(element.getAttribute('height') || '0');
        pathData = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
        break;
        
      // Add other shape conversions as needed
      default:
        return null;
    }
    
    if (!pathData) return null;
    
    const id = this.getOrCreateId(element, idMap, options, namePrefix);
    
    const path: SVGPath = {
      id,
      subPaths: [{
        id: generateId(),
        commands: [] // Would need proper path parsing here
      }],
      style: {
        fill: element.getAttribute('fill') || '#000000',
        stroke: element.getAttribute('stroke') || 'none',
        strokeWidth: parseFloat(element.getAttribute('stroke-width') || '1')
      }
    };
    
    return path;
  }
  
  /**
   * Get existing ID or create new one
   */
  private getOrCreateId(
    element: Element,
    idMap: Map<string, string>,
    options: SVGImportOptions,
    namePrefix: string
  ): string {
    const originalId = element.getAttribute('id');
    
    if (options.preserveIds && originalId && !idMap.has(originalId)) {
      idMap.set(originalId, originalId);
      return originalId;
    }
    
    if (originalId && idMap.has(originalId)) {
      return idMap.get(originalId)!;
    }
    
    const newId = generateId();
    if (originalId) {
      idMap.set(originalId, newId);
    }
    
    return newId;
  }
  
  /**
   * Create root group for imported elements
   */
  private createRootGroup(
    data: { paths: SVGPath[]; texts: TextElement[]; groups: SVGGroup[] },
    namePrefix: string
  ): SVGGroup {
    const children = [
      ...data.paths.map(p => ({ type: 'path' as const, id: p.id })),
      ...data.texts.map(t => ({ type: 'text' as const, id: t.id })),
      ...data.groups.map(g => ({ type: 'group' as const, id: g.id }))
    ];
    
    return {
      id: generateId(),
      name: `${namePrefix}-import`,
      children,
      visible: true,
      locked: false,
      lockLevel: 'movement-sync'
    };
  }
  
  /**
   * Apply positioning and scaling transformations
   */
  private applyTransformations(
    data: { paths: SVGPath[]; texts: TextElement[]; groups: SVGGroup[] },
    options: SVGImportOptions
  ): void {
    // Implementation would apply position and scale transformations
    // This is a simplified version - real implementation would need proper transformation math
    
    if (options.position) {
      // Apply position offset to all elements
      data.texts.forEach(text => {
        text.x += options.position!.x;
        text.y += options.position!.y;
      });
    }
    
    if (options.scale && options.scale !== 1) {
      // Apply scaling - would need more complex transformation logic
    }
  }
  
  /**
   * Read file content as text
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

/**
 * Default import service instance
 */
export const svgImportService = new SVGImportService();
