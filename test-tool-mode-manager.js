/**
 * Test Script para verificar la funcionalidad del ToolModeManager
 * 
 * Este script debe ejecutarse en la consola del navegador para verificar
 * que el sistema de modos exclusivos funciona correctamente.
 */

// Función para probar el cambio de modos
function testToolModeManager() {
  console.log('🧪 Iniciando pruebas del ToolModeManager');
  
  // Acceder al toolModeManager desde el contexto global
  const { toolModeManager } = window;
  
  if (!toolModeManager) {
    console.error('❌ ToolModeManager no está disponible en el contexto global');
    return;
  }
  
  console.log('✅ ToolModeManager encontrado');
  
  // Test 1: Verificar modo inicial
  console.log('\n📋 Test 1: Verificar modo inicial');
  console.log('Modo inicial:', toolModeManager.getActiveMode());
  console.log('¿Es select?:', toolModeManager.isActive('select'));
  
  // Test 2: Cambiar a curves
  console.log('\n📋 Test 2: Cambiar a curves');
  toolModeManager.setMode('curves');
  console.log('Modo después de setMode(curves):', toolModeManager.getActiveMode());
  console.log('¿Es curves?:', toolModeManager.isActive('curves'));
  
  // Test 3: Cambiar a shapes
  console.log('\n📋 Test 3: Cambiar a shapes');
  toolModeManager.setMode('shapes', { shapeId: 'circle' });
  console.log('Modo después de setMode(shapes):', toolModeManager.getActiveMode());
  console.log('Estado completo:', toolModeManager.getState());
  
  // Test 4: Cambiar a pencil
  console.log('\n📋 Test 4: Cambiar a pencil');
  toolModeManager.setMode('pencil');
  console.log('Modo después de setMode(pencil):', toolModeManager.getActiveMode());
  
  // Test 5: Cambiar a creation
  console.log('\n📋 Test 5: Cambiar a creation');
  toolModeManager.setMode('creation', { commandType: 'L' });
  console.log('Modo después de setMode(creation):', toolModeManager.getActiveMode());
  console.log('Estado completo:', toolModeManager.getState());
  
  // Test 6: Volver a select
  console.log('\n📋 Test 6: Volver a select');
  toolModeManager.setMode('select');
  console.log('Modo después de setMode(select):', toolModeManager.getActiveMode());
  
  console.log('\n🎉 Pruebas completadas');
  console.log('Debug info:', toolModeManager.getDebugInfo());
}

// Función para probar shortcuts
function testShortcuts() {
  console.log('\n🎹 Probando shortcuts...');
  console.log('Presiona las siguientes teclas para probar:');
  console.log('- "c" para curves');
  console.log('- "p" para pencil');  
  console.log('- "m" para creation (move)');
  console.log('- "l" para creation (line)');
  console.log('- "v" para selection');
  console.log('- "Escape" para volver a select');
}

// Exportar funciones para uso en consola
window.testToolModeManager = testToolModeManager;
window.testShortcuts = testShortcuts;

console.log('🔧 Test scripts cargados. Usa testToolModeManager() y testShortcuts() en la consola.');
