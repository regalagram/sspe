// Test final del algoritmo corregido con separación balanceada
console.log('=== Test del algoritmo final corregido ===');

// Función del algoritmo corregido
function normalizeForUnhappyCase(pointInfo) {
  const { command, prevCommand, nextCommand } = pointInfo;
  
  if (!command.x || !command.y || !prevCommand || !nextCommand ||
      prevCommand.x === undefined || prevCommand.y === undefined ||
      nextCommand.x === undefined || nextCommand.y === undefined) {
    return null;
  }
  
  // Calcular las direcciones de las líneas entrante y saliente
  const incomingDirection = {
    x: command.x - prevCommand.x,
    y: command.y - prevCommand.y
  };
  
  const outgoingDirection = {
    x: nextCommand.x - command.x,
    y: nextCommand.y - command.y
  };
  
  // Normalizar las direcciones para obtener vectores unitarios
  const incomingLength = Math.sqrt(incomingDirection.x * incomingDirection.x + incomingDirection.y * incomingDirection.y);
  const outgoingLength = Math.sqrt(outgoingDirection.x * outgoingDirection.x + outgoingDirection.y * outgoingDirection.y);
  
  if (incomingLength === 0 || outgoingLength === 0) return null;
  
  const incomingUnit = {
    x: incomingDirection.x / incomingLength,
    y: incomingDirection.y / incomingLength
  };
  
  const outgoingUnit = {
    x: outgoingDirection.x / outgoingLength,
    y: outgoingDirection.y / outgoingLength
  };
  
  // Calcular la tangente promedio (bisectriz) para suavidad
  const tangentVector = {
    x: incomingUnit.x + outgoingUnit.x,
    y: incomingUnit.y + outgoingUnit.y
  };
  
  const tangentLength = Math.sqrt(tangentVector.x * tangentVector.x + tangentVector.y * tangentVector.y);
  
  let tangentUnit = { x: 0, y: 0 };
  if (tangentLength > 0) {
    tangentUnit = {
      x: tangentVector.x / tangentLength,
      y: tangentVector.y / tangentLength
    };
  } else {
    // Si las líneas son opuestas, usar la perpendicular
    tangentUnit = {
      x: -incomingUnit.y,
      y: incomingUnit.x
    };
  }
  
  // Factor de suavidad: controla el balance entre suavidad y separación
  const smoothnessFactor = 0.3; // 30% hacia la bisectriz
  
  // Mezclar cada dirección original con la bisectriz
  const incomingControlDirection = {
    x: incomingUnit.x * (1 - smoothnessFactor) + tangentUnit.x * smoothnessFactor,
    y: incomingUnit.y * (1 - smoothnessFactor) + tangentUnit.y * smoothnessFactor
  };
  
  const outgoingControlDirection = {
    x: outgoingUnit.x * (1 - smoothnessFactor) + tangentUnit.x * smoothnessFactor,
    y: outgoingUnit.y * (1 - smoothnessFactor) + tangentUnit.y * smoothnessFactor
  };
  
  // Normalizar las direcciones mezcladas
  const incomingControlLength = Math.sqrt(
    incomingControlDirection.x * incomingControlDirection.x + 
    incomingControlDirection.y * incomingControlDirection.y
  );
  
  const outgoingControlLength = Math.sqrt(
    outgoingControlDirection.x * outgoingControlDirection.x + 
    outgoingControlDirection.y * outgoingControlDirection.y
  );
  
  const incomingControlUnit = incomingControlLength > 0 ? {
    x: incomingControlDirection.x / incomingControlLength,
    y: incomingControlDirection.y / incomingControlLength
  } : { x: 0, y: 0 };
  
  const outgoingControlUnit = outgoingControlLength > 0 ? {
    x: outgoingControlDirection.x / outgoingControlLength,
    y: outgoingControlDirection.y / outgoingControlLength
  } : { x: 0, y: 0 };
  
  // Usar distancias proporcionales a la longitud de los segmentos
  const incomingControlDistance = Math.min(incomingLength * 0.3, 30);
  const outgoingControlDistance = Math.min(outgoingLength * 0.3, 30);
  
  // Los puntos de control mantienen separación y suavidad balanceadas
  const incomingControlPoint = {
    x: command.x - incomingControlUnit.x * incomingControlDistance,
    y: command.y - incomingControlUnit.y * incomingControlDistance
  };
  
  const outgoingControlPoint = {
    x: command.x + outgoingControlUnit.x * outgoingControlDistance,
    y: command.y + outgoingControlUnit.y * outgoingControlDistance
  };
  
  return {
    incomingControlPoint,
    outgoingControlPoint,
    incomingControlUnit,
    outgoingControlUnit,
    smoothnessFactor
  };
}

// Caso de prueba: path zigzag real
const testCase = {
  command: {
    x: 53,
    y: 104
  },
  prevCommand: {
    x: 8,
    y: 14
  },
  nextCommand: {
    x: 99,
    y: 14
  }
};

console.log('Caso de prueba: path zigzag');
console.log('  Punto anterior:', testCase.prevCommand.x, testCase.prevCommand.y);
console.log('  Punto actual:', testCase.command.x, testCase.command.y);
console.log('  Punto siguiente:', testCase.nextCommand.x, testCase.nextCommand.y);

const result = normalizeForUnhappyCase(testCase);

if (result) {
  console.log('\n=== Resultado del algoritmo final ===');
  console.log('Factor de suavidad:', result.smoothnessFactor);
  console.log('Dirección control entrante:', result.incomingControlUnit);
  console.log('Dirección control saliente:', result.outgoingControlUnit);
  console.log('Punto de control entrante:', result.incomingControlPoint);
  console.log('Punto de control saliente:', result.outgoingControlPoint);
  
  // Verificar separación
  const separation = Math.sqrt(
    Math.pow(result.outgoingControlPoint.x - result.incomingControlPoint.x, 2) + 
    Math.pow(result.outgoingControlPoint.y - result.incomingControlPoint.y, 2)
  );
  
  console.log('\n=== Verificación ===');
  console.log('Separación entre puntos de control:', separation.toFixed(2), 'unidades');
  
  // Verificar que los puntos están en lados opuestos pero no colapsados
  const centerX = testCase.command.x;
  const centerY = testCase.command.y;
  
  const cp1RelativeX = result.incomingControlPoint.x - centerX;
  const cp1RelativeY = result.incomingControlPoint.y - centerY;
  
  const cp2RelativeX = result.outgoingControlPoint.x - centerX;
  const cp2RelativeY = result.outgoingControlPoint.y - centerY;
  
  console.log('CP1 relativo al centro:', cp1RelativeX.toFixed(2), cp1RelativeY.toFixed(2));
  console.log('CP2 relativo al centro:', cp2RelativeX.toFixed(2), cp2RelativeY.toFixed(2));
  
  // Producto punto (negativo = direcciones opuestas, pero no completamente alineados)
  const dotProduct = cp1RelativeX * cp2RelativeX + cp1RelativeY * cp2RelativeY;
  console.log('Producto punto:', dotProduct.toFixed(2), '(negativo = buena separación)');
  
  // Path SVG resultante
  console.log('\n=== Path SVG resultante ===');
  const cp1X = result.incomingControlPoint.x;
  const cp1Y = result.incomingControlPoint.y;
  const cp2X = result.outgoingControlPoint.x;
  const cp2Y = result.outgoingControlPoint.y;
  
  console.log(`M ${testCase.prevCommand.x} ${testCase.prevCommand.y}`);
  console.log(`C ${cp1X.toFixed(2)} ${cp1Y.toFixed(2)}, ${cp2X.toFixed(2)} ${cp2Y.toFixed(2)}, ${testCase.command.x} ${testCase.command.y}`);
  console.log(`C ${cp2X.toFixed(2)} ${cp2Y.toFixed(2)}, ${testCase.nextCommand.x} ${testCase.nextCommand.y}, ${testCase.nextCommand.x} ${testCase.nextCommand.y}`);
}
