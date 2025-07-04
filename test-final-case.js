// Test específico para el caso del usuario
console.log('=== Test para el caso específico del usuario ===');

// Punto a normalizar: L 450 405 (entre L 405 495 y L 495 495)
const testCase = {
  command: { x: 450, y: 405 },
  prevCommand: { x: 405, y: 495 },
  nextCommand: { x: 495, y: 495 }
};

console.log('Path original:');
console.log('M 360 405 L 405 495 L 450 405 L 495 495 C 520 385 560 425 540 405');

console.log('\nPunto seleccionado:', testCase.command);

// Simular el algoritmo simplificado
const { command } = testCase;
const controlDistance = 20;

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

console.log('\nResultado esperado:');
console.log('M 360 405 L 405 495 C 416 473 430 405 450 405 C 470 405 484 473 495 495 C 520 385 560 425 540 405');

console.log('\nResultado que debería generar el algoritmo:');
console.log(`M 360 405 L 405 495 C [calculado automáticamente] ${incomingControlPoint.x} ${incomingControlPoint.y} ${command.x} ${command.y} C ${outgoingControlPoint.x} ${outgoingControlPoint.y} [calculado automáticamente] ${testCase.nextCommand.x} ${testCase.nextCommand.y} C 520 385 560 425 540 405`);

console.log('\nVerificación:');
console.log(`- Punto de control entrante esperado: (430, 405)`);
console.log(`- Punto de control entrante calculado: (${incomingControlPoint.x}, ${incomingControlPoint.y})`);
console.log(`- ¿Coincide? ${incomingControlPoint.x === 430 && incomingControlPoint.y === 405}`);

console.log(`- Punto de control saliente esperado: (470, 405)`);
console.log(`- Punto de control saliente calculado: (${outgoingControlPoint.x}, ${outgoingControlPoint.y})`);
console.log(`- ¿Coincide? ${outgoingControlPoint.x === 470 && outgoingControlPoint.y === 405}`);

console.log('\n=== Test completo ===');
