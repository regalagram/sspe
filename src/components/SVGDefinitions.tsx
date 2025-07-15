import React from 'react';
import { GradientOrPattern, LinearGradient, RadialGradient, Pattern } from '../types';

interface SVGDefinitionsProps {
  gradients: GradientOrPattern[];
}

const LinearGradientElement: React.FC<{ gradient: LinearGradient }> = ({ gradient }) => (
  <linearGradient
    id={gradient.id}
    x1={gradient.x1}
    y1={gradient.y1}
    x2={gradient.x2}
    y2={gradient.y2}
    gradientUnits={gradient.gradientUnits || 'objectBoundingBox'}
  >
    {gradient.stops.map(stop => (
      <stop
        key={stop.id}
        offset={`${stop.offset}%`}
        stopColor={stop.color}
        stopOpacity={stop.opacity}
      />
    ))}
  </linearGradient>
);

const RadialGradientElement: React.FC<{ gradient: RadialGradient }> = ({ gradient }) => (
  <radialGradient
    id={gradient.id}
    cx={gradient.cx}
    cy={gradient.cy}
    r={gradient.r}
    fx={gradient.fx !== undefined && gradient.fx !== gradient.cx ? gradient.fx : undefined}
    fy={gradient.fy !== undefined && gradient.fy !== gradient.cy ? gradient.fy : undefined}
    gradientUnits={gradient.gradientUnits || 'objectBoundingBox'}
  >
    {gradient.stops.map(stop => (
      <stop
        key={stop.id}
        offset={`${stop.offset}%`}
        stopColor={stop.color}
        stopOpacity={stop.opacity}
      />
    ))}
  </radialGradient>
);

const PatternElement: React.FC<{ pattern: Pattern }> = ({ pattern }) => (
  <pattern
    id={pattern.id}
    width={pattern.width}
    height={pattern.height}
    patternUnits={pattern.patternUnits || 'userSpaceOnUse'}
    patternContentUnits={pattern.patternContentUnits}
    patternTransform={pattern.patternTransform}
  >
    <g dangerouslySetInnerHTML={{ __html: pattern.content }} />
  </pattern>
);

export const SVGDefinitions: React.FC<SVGDefinitionsProps> = ({ gradients }) => {
  if (gradients.length === 0) {
    return null;
  }

  return (
    <defs>
      {gradients.map(gradient => {
        switch (gradient.type) {
          case 'linear':
            return <LinearGradientElement key={gradient.id} gradient={gradient} />;
          case 'radial':
            return <RadialGradientElement key={gradient.id} gradient={gradient} />;
          case 'pattern':
            return <PatternElement key={gradient.id} pattern={gradient} />;
          default:
            return null;
        }
      })}
    </defs>
  );
};