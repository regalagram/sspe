// Test para validar el algoritmo de normalización final
console.log('=== Test del algoritmo de normalización final ===');

// Caso de prueba basado en el ejemplo del usuario
const testCase = {
  // Punto a normalizar: L 450 405 (entre L 405 495 y L 495 495)
  command: { x: 450, y: 405 },
  prevCommand: { x: 405, y: 495 },
  nextCommand: { x: 495, y: 495 }
};

console.log('Datos de entrada:');
console.log('- Punto anterior:', testCase.prevCommand);
console.log('- Punto a normalizar:', testCase.command);
console.log('- Punto siguiente:', testCase.nextCommand);

// Simular el algoritmo final
const { command, prevCommand, nextCommand } = testCase;

// Calcular las distancias a los puntos adyacentes
const distToPrev = Math.sqrt(
  Math.pow((prevCommand.x || 0) - command.x, 2) + 
  Math.pow((prevCommand.y || 0) - command.y, 2)
);

const distToNext = Math.sqrt(
  Math.pow((nextCommand.x || 0) - command.x, 2) + 
  Math.pow((nextCommand.y || 0) - command.y, 2)
);

console.log('\nDistancias:');
console.log('- Distancia al punto anterior:', distToPrev);
console.log('- Distancia al punto siguiente:', distToNext);

// Usar aproximadamente 1/5 de la distancia más pequeña para los puntos de control
const baseDistance = Math.min(distToPrev, distToNext) / 5;
const controlDistance = Math.max(15, Math.min(25, baseDistance));

console.log('\nCálculo de distancia de control:');
console.log('- Distancia base (min/3):', baseDistance);
console.log('- Distancia de control final:', controlDistance);

// Los puntos de control deben estar horizontalmente alineados
const incomingControlPoint = {
  x: command.x - controlDistance,
  y: command.y  // Misma Y para alineación horizontal perfecta
};

const outgoingControlPoint = {
  x: command.x + controlDistance,
  y: command.y  // Misma Y para alineación horizontal perfecta
};

console.log('\nPuntos de control calculados:');
console.log('- Punto de control entrante:', incomingControlPoint);
console.log('- Punto de control saliente:', outgoingControlPoint);

// Resultado esperado según el ejemplo del usuario:
console.log('\n=== Comparación con resultado esperado ===');
console.log('Path original:');
console.log('M 360 405 L 405 495 L 450 405 L 495 495');

console.log('\nResultado esperado del usuario:');
console.log('M 360 405 L 405 495 C 416 473 430 405 450 405 C 470 405 484 473 495 495');

console.log('\nResultado calculado:');
console.log(`- Punto de control entrante: (${incomingControlPoint.x}, ${incomingControlPoint.y})`);
console.log(`- Punto de control saliente: (${outgoingControlPoint.x}, ${outgoingControlPoint.y})`);

// Verificar que los puntos estén alineados horizontalmente
console.log('\n=== Verificación de alineación horizontal ===');
console.log('Y del punto entrante:', incomingControlPoint.y);
console.log('Y del punto central:', command.y);
console.log('Y del punto saliente:', outgoingControlPoint.y);
console.log('¿Están horizontalmente alineados?', 
  incomingControlPoint.y === command.y && 
  outgoingControlPoint.y === command.y
);

// Verificar distancias
const incomingDistance = Math.abs(incomingControlPoint.x - command.x);
const outgoingDistance = Math.abs(outgoingControlPoint.x - command.x);

console.log('\nDistancia del punto entrante al centro:', incomingDistance);
console.log('Distancia del punto saliente al centro:', outgoingDistance);
console.log('¿Están equidistantes?', incomingDistance === outgoingDistance);

// Comparar con el resultado esperado
console.log('\n=== Análisis del resultado esperado ===');
console.log('Del ejemplo esperado: C 416 473 430 405 450 405 C 470 405 484 473 495 495');
console.log('- Punto de control entrante esperado: (430, 405)');
console.log('- Punto de control saliente esperado: (470, 405)');
console.log('- Distancia esperada: 20 unidades');

console.log('\nComparación:');
console.log(`- Calculado: entrante (${incomingControlPoint.x}, ${incomingControlPoint.y}), saliente (${outgoingControlPoint.x}, ${outgoingControlPoint.y})`);
console.log(`- Esperado: entrante (430, 405), saliente (470, 405)`);
console.log(`- Diferencia X entrante: ${Math.abs(incomingControlPoint.x - 430)}`);
console.log(`- Diferencia X saliente: ${Math.abs(outgoingControlPoint.x - 470)}`);

console.log('\n=== Test completo ===');
