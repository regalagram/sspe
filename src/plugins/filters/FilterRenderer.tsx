import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { FilterPrimitiveType } from '../../types';

export const FilterRenderer: React.FC = () => {
  const { filters } = useEditorStore();

  if (filters.length === 0) return null;

  const renderFilterPrimitive = (primitive: FilterPrimitiveType, index: number) => {
    const commonProps = {
      result: 'result' in primitive ? primitive.result || `effect${index}` : `effect${index}`,
      in: 'in' in primitive ? primitive.in || (index === 0 ? 'SourceGraphic' : `effect${index - 1}`) : (index === 0 ? 'SourceGraphic' : `effect${index - 1}`),
    };

    switch (primitive.type) {
      case 'feGaussianBlur':
        return (
          <feGaussianBlur
            key={index}
            {...commonProps}
            stdDeviation={primitive.stdDeviation}
          />
        );

      case 'feOffset':
        return (
          <feOffset
            key={index}
            {...commonProps}
            dx={primitive.dx}
            dy={primitive.dy}
          />
        );

      case 'feFlood':
        return (
          <feFlood
            key={index}
            {...commonProps}
            floodColor={primitive.floodColor}
            floodOpacity={primitive.floodOpacity}
          />
        );

      case 'feComposite':
        return (
          <feComposite
            key={index}
            {...commonProps}
            operator={primitive.operator}
            in2={'in2' in primitive ? primitive.in2 || 'SourceGraphic' : 'SourceGraphic'}
          />
        );

      case 'feColorMatrix':
        return (
          <feColorMatrix
            key={index}
            {...commonProps}
            values={primitive.values}
          />
        );

      case 'feDropShadow':
        return (
          <feDropShadow
            key={index}
            {...commonProps}
            dx={primitive.dx}
            dy={primitive.dy}
            stdDeviation={primitive.stdDeviation}
            floodColor={primitive.floodColor}
            floodOpacity={primitive.floodOpacity}
          />
        );

      case 'feBlend':
        return (
          <feBlend
            key={index}
            {...commonProps}
            mode={primitive.mode}
            in2={'in2' in primitive ? primitive.in2 || 'SourceGraphic' : 'SourceGraphic'}
          />
        );

      case 'feMorphology':
        return (
          <feMorphology
            key={index}
            {...commonProps}
            operator={primitive.operator}
            radius={primitive.radius}
          />
        );

      default:
        return null;
    }
  };

  return (
    <defs>
      {filters.map((filter) => (
        <filter
          key={filter.id}
          id={filter.id}
          x={filter.x || '-20%'}
          y={filter.y || '-20%'}
          width={filter.width || '140%'}
          height={filter.height || '140%'}
          filterUnits={filter.filterUnits || 'objectBoundingBox'}
          primitiveUnits={filter.primitiveUnits || 'userSpaceOnUse'}
        >
          {filter.primitives.map((primitive, index) => renderFilterPrimitive(primitive, index))}
        </filter>
      ))}
    </defs>
  );
};