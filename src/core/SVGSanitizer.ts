/**
 * SVG Import Sanitization System
 * 
 * Provides comprehensive sanitization and validation for external SVG imports
 * to prevent XSS attacks, malicious code injection, and ensure data integrity.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration for SVG sanitization
 */
export interface SVGSanitizationConfig {
  // Security settings
  allowScripts: boolean;
  allowLinks: boolean;
  allowForeignObjects: boolean;
  allowAnimation: boolean;
  
  // Size limits
  maxFileSize: number; // in bytes
  maxDimensions: { width: number; height: number };
  maxComplexity: number; // max number of elements
  
  // Element whitelist
  allowedElements: string[];
  allowedAttributes: string[];
  
  // Content restrictions
  stripComments: boolean;
  stripMetadata: boolean;
  normalizeWhitespace: boolean;
}

/**
 * Default secure configuration
 */
export const DEFAULT_SVG_CONFIG: SVGSanitizationConfig = {
  // Security - very restrictive by default
  allowScripts: false,
  allowLinks: false,
  allowForeignObjects: false,
  allowAnimation: true,
  
  // Size limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxDimensions: { width: 10000, height: 10000 },
  maxComplexity: 10000,
  
  // Element whitelist - comprehensive SVG elements
  allowedElements: [
    'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect',
    'text', 'tspan', 'textPath', 'defs', 'use', 'symbol', 'marker', 'clipPath',
    'mask', 'pattern', 'image', 'linearGradient', 'radialGradient', 'stop',
    'filter', 'feGaussianBlur', 'feColorMatrix', 'feOffset', 'feMerge', 'feMergeNode',
    'feFlood', 'feComposite', 'feDropShadow', 'feTurbulence', 'feConvolveMatrix',
    'animate', 'animateTransform', 'animateMotion', 'mpath', 'set', 'title', 'desc'
  ],
  
  // Attribute whitelist - essential attributes only
  allowedAttributes: [
    'id', 'class', 'style', 'transform', 'fill', 'stroke', 'stroke-width', 'opacity',
    'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points',
    'x1', 'y1', 'x2', 'y2', 'viewBox', 'preserveAspectRatio', 'xmlns',
    'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
    'stroke-dasharray', 'stroke-dashoffset', 'marker-start', 'marker-mid', 'marker-end',
    'clip-path', 'mask', 'filter', 'href', 'xlink:href', 'gradientUnits',
    'spreadMethod', 'gradientTransform', 'offset', 'stop-color', 'stop-opacity',
    'patternUnits', 'patternTransform', 'font-family', 'font-size', 'font-weight',
    'text-anchor', 'dominant-baseline', 'alignment-baseline', 'visibility',
    'display', 'overflow', 'clip-rule', 'fill-rule'
  ],
  
  // Content processing
  stripComments: true,
  stripMetadata: true,
  normalizeWhitespace: true
};

/**
 * SVG Import validation result
 */
export interface SVGValidationResult {
  isValid: boolean;
  sanitizedContent?: string;
  warnings: string[];
  errors: string[];
  metadata: {
    originalSize: number;
    sanitizedSize: number;
    elementCount: number;
    dimensions: { width: number; height: number };
    hasAnimations: boolean;
    hasGradients: boolean;
    hasFilters: boolean;
  };
}

/**
 * Main SVG Sanitizer class
 */
export class SVGSanitizer {
  private config: SVGSanitizationConfig;
  
  constructor(config: Partial<SVGSanitizationConfig> = {}) {
    this.config = { ...DEFAULT_SVG_CONFIG, ...config };
  }
  
  /**
   * Sanitize and validate SVG content
   */
  async sanitizeSVG(
    content: string,
    filename?: string
  ): Promise<SVGValidationResult> {
    const result: SVGValidationResult = {
      isValid: false,
      warnings: [],
      errors: [],
      metadata: {
        originalSize: content.length,
        sanitizedSize: 0,
        elementCount: 0,
        dimensions: { width: 0, height: 0 },
        hasAnimations: false,
        hasGradients: false,
        hasFilters: false
      }
    };
    
    try {
      // 1. Basic validation
      if (!this.validateBasicFormat(content, result)) {
        return result;
      }
      
      // 2. Size validation
      if (!this.validateSize(content, result)) {
        return result;
      }
      
      // 3. Parse and validate XML structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        result.errors.push('Invalid XML structure');
        return result;
      }
      
      const svgElement = doc.querySelector('svg');
      if (!svgElement) {
        result.errors.push('No SVG root element found');
        return result;
      }
      
      // 4. Security validation
      if (!this.validateSecurity(doc, result)) {
        return result;
      }
      
      // 5. Complexity validation
      if (!this.validateComplexity(doc, result)) {
        return result;
      }
      
      // 6. Extract metadata
      this.extractMetadata(doc, result);
      
      // 7. Sanitize content
      const sanitizedContent = this.performSanitization(content, result);
      if (!sanitizedContent) {
        result.errors.push('Sanitization failed');
        return result;
      }
      
      result.sanitizedContent = sanitizedContent;
      result.metadata.sanitizedSize = sanitizedContent.length;
      result.isValid = true;
      
    } catch (error) {
      result.errors.push(`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Validate basic format requirements
   */
  private validateBasicFormat(content: string, result: SVGValidationResult): boolean {
    // Check if content is not empty
    if (!content || content.trim().length === 0) {
      result.errors.push('Empty content');
      return false;
    }
    
    // Check if it looks like SVG
    if (!content.includes('<svg')) {
      result.errors.push('Content does not appear to be SVG');
      return false;
    }
    
    // Check for obvious malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // event handlers
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        result.errors.push(`Potentially malicious content detected: ${pattern.source}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate file size
   */
  private validateSize(content: string, result: SVGValidationResult): boolean {
    if (content.length > this.config.maxFileSize) {
      result.errors.push(`File size exceeds limit: ${content.length} > ${this.config.maxFileSize}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate security aspects
   */
  private validateSecurity(doc: Document, result: SVGValidationResult): boolean {
    // Check for scripts
    if (!this.config.allowScripts) {
      const scripts = doc.querySelectorAll('script');
      if (scripts.length > 0) {
        result.errors.push('Scripts are not allowed');
        return false;
      }
    }
    
    // Check for external links
    if (!this.config.allowLinks) {
      const links = doc.querySelectorAll('a[href^="http"], a[href^="//"]');
      if (links.length > 0) {
        result.warnings.push('External links found and will be removed');
      }
    }
    
    // Check for foreign objects
    if (!this.config.allowForeignObjects) {
      const foreignObjects = doc.querySelectorAll('foreignObject');
      if (foreignObjects.length > 0) {
        result.errors.push('Foreign objects are not allowed');
        return false;
      }
    }
    
    // Check for data URLs that might contain scripts
    const dataUrls = doc.querySelectorAll('[href^="data:"], [src^="data:"]');
    for (const element of dataUrls) {
      const href = element.getAttribute('href') || element.getAttribute('src') || '';
      if (href.includes('javascript:') || href.includes('data:text/html')) {
        result.errors.push('Suspicious data URLs detected');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate complexity limits
   */
  private validateComplexity(doc: Document, result: SVGValidationResult): boolean {
    const allElements = doc.querySelectorAll('*');
    result.metadata.elementCount = allElements.length;
    
    if (allElements.length > this.config.maxComplexity) {
      result.errors.push(`SVG too complex: ${allElements.length} elements > ${this.config.maxComplexity}`);
      return false;
    }
    
    // Check dimensions
    const svgElement = doc.querySelector('svg');
    if (svgElement) {
      const width = parseFloat(svgElement.getAttribute('width') || '0');
      const height = parseFloat(svgElement.getAttribute('height') || '0');
      
      if (width > this.config.maxDimensions.width || height > this.config.maxDimensions.height) {
        result.errors.push(`Dimensions too large: ${width}x${height}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Extract metadata from SVG
   */
  private extractMetadata(doc: Document, result: SVGValidationResult): void {
    const svgElement = doc.querySelector('svg');
    if (svgElement) {
      result.metadata.dimensions.width = parseFloat(svgElement.getAttribute('width') || '0');
      result.metadata.dimensions.height = parseFloat(svgElement.getAttribute('height') || '0');
    }
    
    result.metadata.hasAnimations = doc.querySelectorAll('animate, animateTransform, animateMotion').length > 0;
    result.metadata.hasGradients = doc.querySelectorAll('linearGradient, radialGradient').length > 0;
    result.metadata.hasFilters = doc.querySelectorAll('filter').length > 0;
  }
  
  /**
   * Perform actual sanitization using DOMPurify
   */
  private performSanitization(content: string, result: SVGValidationResult): string | null {
    try {
      const sanitized = DOMPurify.sanitize(content, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ALLOWED_TAGS: this.config.allowedElements,
        ALLOWED_ATTR: this.config.allowedAttributes,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SANITIZE_DOM: true,
        KEEP_CONTENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        WHOLE_DOCUMENT: false
      });
      
      if (this.config.stripComments) {
        return sanitized.replace(/<!--[\s\S]*?-->/g, '');
      }
      
      return sanitized;
      
    } catch (error) {
      result.errors.push(`DOMPurify sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  /**
   * Create a permissive configuration for trusted sources
   */
  static createPermissiveConfig(): SVGSanitizationConfig {
    return {
      ...DEFAULT_SVG_CONFIG,
      allowAnimation: true,
      allowLinks: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxComplexity: 50000
    };
  }
  
  /**
   * Create a strict configuration for untrusted sources
   */
  static createStrictConfig(): SVGSanitizationConfig {
    return {
      ...DEFAULT_SVG_CONFIG,
      allowAnimation: false,
      allowLinks: false,
      maxFileSize: 1 * 1024 * 1024, // 1MB
      maxComplexity: 1000,
      allowedElements: ['svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'text'],
      allowedAttributes: ['id', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height']
    };
  }
}

/**
 * Utility functions for SVG validation
 */
export class SVGValidationUtils {
  /**
   * Quick validation for SVG content without full sanitization
   */
  static isValidSVG(content: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      return !doc.querySelector('parsererror') && !!doc.querySelector('svg');
    } catch {
      return false;
    }
  }
  
  /**
   * Extract SVG dimensions safely
   */
  static getSVGDimensions(content: string): { width: number; height: number } | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      
      if (!svgElement) return null;
      
      const width = parseFloat(svgElement.getAttribute('width') || '0');
      const height = parseFloat(svgElement.getAttribute('height') || '0');
      
      return { width, height };
    } catch {
      return null;
    }
  }
  
  /**
   * Count SVG elements safely
   */
  static countSVGElements(content: string): number {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      return doc.querySelectorAll('*').length;
    } catch {
      return 0;
    }
  }
}
