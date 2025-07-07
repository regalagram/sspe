/**
 * Test Script actualizado para verificar las correcciones del ToolModeManager
 * 
 * Pruebas específicas para los problemas reportados:
 * 1) Creation mode no se desactiva al cambiar a curves/pencil
 * 2) Curves no se desactiva al cambiar a pencil/creation
 * 3) Shape buttons se desactivan inmediatamente
 */

// Función para probar los problemas específicos reportados
function testFixedIssues() {
  console.log('🧪 Probando las correcciones específicas del ToolModeManager');
  
  const { toolModeManager } = window;
  
  if (!toolModeManager) {
    console.error('❌ ToolModeManager no está disponible');
    return;
  }
  
  console.log('✅ ToolModeManager encontrado, iniciando pruebas...');
  
  // Test 1: Creation mode -> Curves mode
  console.log('\n📋 Test 1: Creation (M) -> Curves');
  toolModeManager.setMode('creation', { commandType: 'M' });
  console.log('Después de setMode(creation, M):', toolModeManager.getActiveMode());
  
  setTimeout(() => {
    toolModeManager.setMode('curves');
    console.log('Después de setMode(curves):', toolModeManager.getActiveMode());
    console.log('¿Creation desactivado?', !toolModeManager.isActive('creation'));
    
    // Test 2: Curves -> Pencil
    console.log('\n📋 Test 2: Curves -> Pencil');
    setTimeout(() => {
      toolModeManager.setMode('pencil');
      console.log('Después de setMode(pencil):', toolModeManager.getActiveMode());
      console.log('¿Curves desactivado?', !toolModeManager.isActive('curves'));
      
      // Test 3: Pencil -> Shapes
      console.log('\n📋 Test 3: Pencil -> Shapes');
      setTimeout(() => {
        toolModeManager.setMode('shapes', { shapeId: 'circle' });
        console.log('Después de setMode(shapes):', toolModeManager.getActiveMode());
        console.log('Estado completo:', toolModeManager.getState());
        console.log('¿Pencil desactivado?', !toolModeManager.isActive('pencil'));
        
        // Test 4: Shapes -> Select
        console.log('\n📋 Test 4: Shapes -> Select');
        setTimeout(() => {
          toolModeManager.setMode('select');
          console.log('Después de setMode(select):', toolModeManager.getActiveMode());
          console.log('¿Shapes desactivado?', !toolModeManager.isActive('shapes'));
          
          console.log('\n🎉 Pruebas completadas');
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}

// Función para probar la exclusividad rápida
function testExclusivity() {
  console.log('\n🔄 Probando cambios rápidos de modo...');
  
  const { toolModeManager } = window;
  
  // Cambios rápidos para verificar que no hay estados intermedios
  toolModeManager.setMode('creation', { commandType: 'L' });
  toolModeManager.setMode('curves');
  toolModeManager.setMode('pencil');
  toolModeManager.setMode('shapes', { shapeId: 'rectangle' });
  toolModeManager.setMode('select');
  
  console.log('Estado final después de cambios rápidos:', toolModeManager.getActiveMode());
  console.log('¿Es select?', toolModeManager.isActive('select'));
}

// Función para probar los botones de shapes específicamente
function testShapeButtons() {
  console.log('\n🔷 Probando botones de shapes...');
  
  const { toolModeManager } = window;
  
  console.log('Estado inicial:', toolModeManager.getActiveMode());
  
  // Simular click en botón de círculo
  console.log('Activando círculo...');
  toolModeManager.setMode('shapes', { shapeId: 'circle' });
  console.log('Después de activar círculo:', toolModeManager.getActiveMode());
  console.log('Estado completo:', toolModeManager.getState());
  
  // Esperar un poco y verificar que sigue activo
  setTimeout(() => {
    console.log('Después de 2 segundos, ¿sigue activo?', toolModeManager.isActive('shapes'));
    console.log('Estado actual:', toolModeManager.getActiveMode());
  }, 2000);
}

// Función para verificar que Escape funciona desde cualquier modo
function testEscapeKey() {
  console.log('\n⌨️ Probando funcionalidad de Escape...');
  
  const { toolModeManager } = window;
  
  // Activar cada modo y verificar que Escape vuelve a select
  const modes = [
    { mode: 'creation', options: { commandType: 'M' } },
    { mode: 'curves' },
    { mode: 'pencil' },
    { mode: 'shapes', options: { shapeId: 'triangle' } }
  ];
  
  modes.forEach((test, index) => {
    setTimeout(() => {
      console.log(`Probando Escape desde ${test.mode}...`);
      toolModeManager.setMode(test.mode, test.options);
      
      setTimeout(() => {
        // Simular Escape
        toolModeManager.setMode('select');
        console.log(`Después de Escape desde ${test.mode}:`, toolModeManager.getActiveMode());
      }, 500);
    }, index * 1500);
  });
}

// Exportar funciones para uso en consola
window.testFixedIssues = testFixedIssues;
window.testExclusivity = testExclusivity;
window.testShapeButtons = testShapeButtons;
window.testEscapeKey = testEscapeKey;

console.log('🔧 Test scripts actualizados cargados:');
console.log('- testFixedIssues() - Prueba los problemas específicos reportados');
console.log('- testExclusivity() - Prueba cambios rápidos de modo');
console.log('- testShapeButtons() - Prueba los botones de shapes');
console.log('- testEscapeKey() - Prueba la funcionalidad de Escape');
