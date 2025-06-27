// Test para verificar el cálculo de posiciones con múltiples subpaths

const testPath = {
  id: 'path1',
  subPaths: [
    {
      id: 'subpath1',
      commands: [
        { id: 'cmd1', command: 'M', x: 100, y: 100 },
        { id: 'cmd2', command: 'L', x: 200, y: 100 },
        { id: 'cmd3', command: 'L', x: 200, y: 200 }
      ]
    },
    {
      id: 'subpath2', 
      commands: [
        { id: 'cmd4', command: 'M', x: 50, y: 50 },
        { id: 'cmd5', command: 'l', x: 100, y: 0 },
        { id: 'cmd6', command: 'l', x: 0, y: 100 }
      ]
    }
  ]
};

console.log('=== Test con Múltiples SubPaths ===');

// Simular getSubPathFinalPosition 
function getSubPathFinalPosition(subPath, startPoint = { x: 0, y: 0 }) {
  let currentPoint = { ...startPoint };
  
  for (const command of subPath.commands) {
    const isRelative = command.command === command.command.toLowerCase() && command.command !== 'z';
    
    if (command.x !== undefined && command.y !== undefined) {
      if (isRelative) {
        currentPoint.x += command.x;
        currentPoint.y += command.y;
      } else {
        currentPoint.x = command.x;
        currentPoint.y = command.y;
      }
    }
  }
  
  return currentPoint;
}

// Simular getAbsoluteCommandPosition
function getAbsoluteCommandPosition(command, subPath, allSubPaths) {
  if (command.x === undefined || command.y === undefined) return null;
  
  const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
  if (commandIndex === -1) return null;
  
  // Calcular posición inicial del subpath
  let pathStartPosition = { x: 0, y: 0 };
  
  if (allSubPaths) {
    const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
    if (subPathIndex > 0) {
      for (let i = 0; i < subPathIndex; i++) {
        pathStartPosition = getSubPathFinalPosition(allSubPaths[i], pathStartPosition);
      }
    }
  }
  
  console.log(`SubPath ${subPath.id} starts at:`, pathStartPosition);
  
  // Calcular posición del comando
  let currentX = pathStartPosition.x;
  let currentY = pathStartPosition.y;
  
  for (let i = 0; i <= commandIndex; i++) {
    const cmd = subPath.commands[i];
    const isRelative = cmd.command === cmd.command.toLowerCase() && cmd.command !== 'z';
    
    if (cmd.x !== undefined && cmd.y !== undefined) {
      if (isRelative) {
        currentX += cmd.x;
        currentY += cmd.y;
      } else {
        currentX = cmd.x;
        currentY = cmd.y;
      }
    }
  }
  
  return { x: currentX, y: currentY };
}

// Probar todos los comandos
console.log('\nTesting all commands:');
for (const subPath of testPath.subPaths) {
  console.log(`\n--- SubPath ${subPath.id} ---`);
  for (const command of subPath.commands) {
    const position = getAbsoluteCommandPosition(command, subPath, testPath.subPaths);
    console.log(`${command.command} ${command.x},${command.y} -> (${position.x}, ${position.y})`);
  }
}
