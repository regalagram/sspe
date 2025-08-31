import { GradientOrPattern, LinearGradient, RadialGradient, Pattern, GradientStop } from '../types';

export const generateGradientId = (): string => 
  `gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const generatePatternId = (): string => 
  `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const generateStopId = (): string => 
  `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createLinearGradient = (
  x1: number = 0, 
  y1: number = 0, 
  x2: number = 1, 
  y2: number = 0,
  stops: GradientStop[] = []
): LinearGradient => ({
  type: 'linear',
  id: generateGradientId(),
  x1,
  y1,
  x2,
  y2,
  stops,
  gradientUnits: 'objectBoundingBox'
});

export const createRadialGradient = (
  cx: number = 0.5,
  cy: number = 0.5,
  r: number = 0.5,
  stops: GradientStop[] = []
): RadialGradient => ({
  type: 'radial',
  id: generateGradientId(),
  cx,
  cy,
  r,
  stops,
  gradientUnits: 'objectBoundingBox'
});

export const createPattern = (
  width: number = 20,
  height: number = 20,
  content: string = ''
): Pattern => ({
  type: 'pattern',
  id: generatePatternId(),
  width,
  height,
  content,
  patternUnits: 'userSpaceOnUse'
});

export const createGradientStop = (
  offset: number,
  color: string,
  opacity?: number
): GradientStop => ({
  id: generateStopId(),
  offset,
  color,
  opacity
});

export const isGradientOrPattern = (value: any): value is GradientOrPattern => {
  return value && typeof value === 'object' && 
         ['linear', 'radial', 'pattern'].includes(value.type);
};

export const getStyleValue = (value: string | GradientOrPattern): string => {
  if (typeof value === 'string') {
    return value;
  }
  return `url(#${value.id})`;
};

export const extractGradientsFromPaths = (paths: any[]): GradientOrPattern[] => {
  const gradients: GradientOrPattern[] = [];
  
  paths.forEach(path => {
    if (path.style) {
      if (isGradientOrPattern(path.style.fill)) {
        gradients.push(path.style.fill);
      }
      if (isGradientOrPattern(path.style.stroke)) {
        gradients.push(path.style.stroke);
      }
    }
  });
  
  // Remove duplicates by id
  const uniqueGradients = gradients.filter((gradient, index, self) => 
    self.findIndex(g => g.id === gradient.id) === index
  );
  
  return uniqueGradients;
};

export const extractGradientsFromImages = (images: any[]): GradientOrPattern[] => {
  const gradients: GradientOrPattern[] = [];
  
  images.forEach(image => {
    if (image.style) {
      if (isGradientOrPattern(image.style.fill)) {
        gradients.push(image.style.fill);
      }
      if (isGradientOrPattern(image.style.stroke)) {
        gradients.push(image.style.stroke);
      }
    }
  });
  
  // Remove duplicates by id
  const uniqueGradients = gradients.filter((gradient, index, self) => 
    self.findIndex(g => g.id === gradient.id) === index
  );
  
  return uniqueGradients;
};

export const extractGradientsFromTexts = (texts: any[]): GradientOrPattern[] => {
  const gradients: GradientOrPattern[] = [];
  
  texts.forEach(text => {
    if (text.style) {
      if (isGradientOrPattern(text.style.fill)) {
        gradients.push(text.style.fill);
      }
      if (isGradientOrPattern(text.style.stroke)) {
        gradients.push(text.style.stroke);
      }
    }
    
    // Check multiline text spans
    if (text.type === 'multiline-text' && text.spans) {
      text.spans.forEach((span: any) => {
        if (span.style) {
          if (isGradientOrPattern(span.style.fill)) {
            gradients.push(span.style.fill);
          }
          if (isGradientOrPattern(span.style.stroke)) {
            gradients.push(span.style.stroke);
          }
        }
      });
    }
  });
  
  // Remove duplicates by id
  const uniqueGradients = gradients.filter((gradient, index, self) => 
    self.findIndex(g => g.id === gradient.id) === index
  );
  
  return uniqueGradients;
};

export const extractGradientsFromTextPaths = (textPaths: any[]): GradientOrPattern[] => {
  const gradients: GradientOrPattern[] = [];
  
  textPaths.forEach(textPath => {
    if (textPath.style) {
      if (isGradientOrPattern(textPath.style.fill)) {
        gradients.push(textPath.style.fill);
      }
      if (isGradientOrPattern(textPath.style.stroke)) {
        gradients.push(textPath.style.stroke);
      }
    }
  });
  
  // Remove duplicates by id
  const uniqueGradients = gradients.filter((gradient, index, self) => 
    self.findIndex(g => g.id === gradient.id) === index
  );
  
  return uniqueGradients;
};