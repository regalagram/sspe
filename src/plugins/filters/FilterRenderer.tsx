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
        const compositeProps = {
          ...commonProps,
          operator: primitive.operator,
          in2: primitive.in2 || 'SourceGraphic'
        };
        
        if (primitive.operator === 'arithmetic') {
          return (
            <feComposite
              key={index}
              {...compositeProps}
              k1={primitive.k1 || 0}
              k2={primitive.k2 || 0}
              k3={primitive.k3 || 0}
              k4={primitive.k4 || 0}
            />
          );
        }
        
        return (
          <feComposite
            key={index}
            {...compositeProps}
          />
        );

      case 'feColorMatrix':
        const colorMatrixProps = {
          ...commonProps,
          type: primitive.colorMatrixType || 'matrix',
          values: primitive.values
        };
        
        return (
          <feColorMatrix
            key={index}
            {...colorMatrixProps}
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
            in2={primitive.in2 || 'SourceGraphic'}
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

      case 'feConvolveMatrix':
        return (
          <feConvolveMatrix
            key={index}
            {...commonProps}
            order={primitive.order}
            kernelMatrix={primitive.kernelMatrix}
            divisor={primitive.divisor}
            bias={primitive.bias || 0}
            targetX={primitive.targetX}
            targetY={primitive.targetY}
            edgeMode={primitive.edgeMode || 'duplicate'}
            preserveAlpha={primitive.preserveAlpha || false}
          />
        );

      case 'feComponentTransfer':
        return (
          <feComponentTransfer
            key={index}
            {...commonProps}
          >
            {primitive.funcR && (
              <feFuncR
                type={primitive.funcR.funcType || 'identity'}
                tableValues={primitive.funcR.tableValues}
                slope={primitive.funcR.slope}
                intercept={primitive.funcR.intercept}
                amplitude={primitive.funcR.amplitude}
                exponent={primitive.funcR.exponent}
                offset={primitive.funcR.offset}
              />
            )}
            {primitive.funcG && (
              <feFuncG
                type={primitive.funcG.funcType || 'identity'}
                tableValues={primitive.funcG.tableValues}
                slope={primitive.funcG.slope}
                intercept={primitive.funcG.intercept}
                amplitude={primitive.funcG.amplitude}
                exponent={primitive.funcG.exponent}
                offset={primitive.funcG.offset}
              />
            )}
            {primitive.funcB && (
              <feFuncB
                type={primitive.funcB.funcType || 'identity'}
                tableValues={primitive.funcB.tableValues}
                slope={primitive.funcB.slope}
                intercept={primitive.funcB.intercept}
                amplitude={primitive.funcB.amplitude}
                exponent={primitive.funcB.exponent}
                offset={primitive.funcB.offset}
              />
            )}
            {primitive.funcA && (
              <feFuncA
                type={primitive.funcA.funcType || 'identity'}
                tableValues={primitive.funcA.tableValues}
                slope={primitive.funcA.slope}
                intercept={primitive.funcA.intercept}
                amplitude={primitive.funcA.amplitude}
                exponent={primitive.funcA.exponent}
                offset={primitive.funcA.offset}
              />
            )}
          </feComponentTransfer>
        );

      case 'feDiffuseLighting':
        return (
          <feDiffuseLighting
            key={index}
            {...commonProps}
            surfaceScale={primitive.surfaceScale || 1}
            diffuseConstant={primitive.diffuseConstant || 1}
            lightingColor={primitive.lightColor || '#ffffff'}
          >
            {primitive.lightSource.type === 'feDistantLight' && (
              <feDistantLight
                azimuth={primitive.lightSource.azimuth || 45}
                elevation={primitive.lightSource.elevation || 45}
              />
            )}
            {primitive.lightSource.type === 'fePointLight' && (
              <fePointLight
                x={primitive.lightSource.x || 0}
                y={primitive.lightSource.y || 0}
                z={primitive.lightSource.z || 0}
              />
            )}
            {primitive.lightSource.type === 'feSpotLight' && (
              <feSpotLight
                x={primitive.lightSource.x || 0}
                y={primitive.lightSource.y || 0}
                z={primitive.lightSource.z || 0}
                pointsAtX={primitive.lightSource.pointsAtX || 0}
                pointsAtY={primitive.lightSource.pointsAtY || 0}
                pointsAtZ={primitive.lightSource.pointsAtZ || 0}
                specularExponent={primitive.lightSource.specularExponent || 1}
                limitingConeAngle={primitive.lightSource.limitingConeAngle}
              />
            )}
          </feDiffuseLighting>
        );

      case 'feSpecularLighting':
        return (
          <feSpecularLighting
            key={index}
            {...commonProps}
            surfaceScale={primitive.surfaceScale || 1}
            specularConstant={primitive.specularConstant || 1}
            specularExponent={primitive.specularExponent || 20}
            lightingColor={primitive.lightColor || '#ffffff'}
          >
            {primitive.lightSource.type === 'feDistantLight' && (
              <feDistantLight
                azimuth={primitive.lightSource.azimuth || 45}
                elevation={primitive.lightSource.elevation || 45}
              />
            )}
            {primitive.lightSource.type === 'fePointLight' && (
              <fePointLight
                x={primitive.lightSource.x || 0}
                y={primitive.lightSource.y || 0}
                z={primitive.lightSource.z || 0}
              />
            )}
            {primitive.lightSource.type === 'feSpotLight' && (
              <feSpotLight
                x={primitive.lightSource.x || 0}
                y={primitive.lightSource.y || 0}
                z={primitive.lightSource.z || 0}
                pointsAtX={primitive.lightSource.pointsAtX || 0}
                pointsAtY={primitive.lightSource.pointsAtY || 0}
                pointsAtZ={primitive.lightSource.pointsAtZ || 0}
                specularExponent={primitive.lightSource.specularExponent || 1}
                limitingConeAngle={primitive.lightSource.limitingConeAngle}
              />
            )}
          </feSpecularLighting>
        );

      case 'feDisplacementMap':
        return (
          <feDisplacementMap
            key={index}
            {...commonProps}
            scale={primitive.scale || 0}
            xChannelSelector={primitive.xChannelSelector || 'R'}
            yChannelSelector={primitive.yChannelSelector || 'G'}
            in2={primitive.in2 || 'SourceGraphic'}
          />
        );

      case 'feTurbulence':
        return (
          <feTurbulence
            key={index}
            {...commonProps}
            baseFrequency={primitive.baseFrequency}
            numOctaves={primitive.numOctaves || 1}
            seed={primitive.seed || 0}
            stitchTiles={primitive.stitchTiles || 'noStitch'}
            type={primitive.turbulenceType || 'turbulence'}
          />
        );

      case 'feImage':
        return (
          <feImage
            key={index}
            {...commonProps}
            href={primitive.href}
            preserveAspectRatio={primitive.preserveAspectRatio || 'xMidYMid meet'}
            crossOrigin={primitive.crossorigin}
          />
        );

      case 'feTile':
        return (
          <feTile
            key={index}
            {...commonProps}
          />
        );

      case 'feMerge':
        return (
          <feMerge
            key={index}
            {...commonProps}
          >
            {primitive.feMergeNodes && primitive.feMergeNodes.map((node, nodeIndex) => (
              <feMergeNode key={nodeIndex} in={node.in} />
            ))}
          </feMerge>
        );

      case 'feFuncR':
        return (
          <feFuncR
            key={index}
            type={primitive.funcType || 'identity'}
            tableValues={primitive.tableValues}
            slope={primitive.slope}
            intercept={primitive.intercept}
            amplitude={primitive.amplitude}
            exponent={primitive.exponent}
            offset={primitive.offset}
          />
        );

      case 'feFuncG':
        return (
          <feFuncG
            key={index}
            type={primitive.funcType || 'identity'}
            tableValues={primitive.tableValues}
            slope={primitive.slope}
            intercept={primitive.intercept}
            amplitude={primitive.amplitude}
            exponent={primitive.exponent}
            offset={primitive.offset}
          />
        );

      case 'feFuncB':
        return (
          <feFuncB
            key={index}
            type={primitive.funcType || 'identity'}
            tableValues={primitive.tableValues}
            slope={primitive.slope}
            intercept={primitive.intercept}
            amplitude={primitive.amplitude}
            exponent={primitive.exponent}
            offset={primitive.offset}
          />
        );

      case 'feFuncA':
        return (
          <feFuncA
            key={index}
            type={primitive.funcType || 'identity'}
            tableValues={primitive.tableValues}
            slope={primitive.slope}
            intercept={primitive.intercept}
            amplitude={primitive.amplitude}
            exponent={primitive.exponent}
            offset={primitive.offset}
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
          colorInterpolationFilters={filter.colorInterpolationFilters || 'linearRGB'}
        >
          {filter.primitives.map((primitive, index) => renderFilterPrimitive(primitive, index))}
        </filter>
      ))}
    </defs>
  );
};