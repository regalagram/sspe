#!/usr/bin/env node

/**
 * Script para encontrar y reportar todas las llamadas a pushToHistory
 * que pueden ser eliminadas al usar Zundo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../../src');
const excludeDirs = ['node_modules', 'dist', '.git'];

function findPushToHistoryCalls(dir, results = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        findPushToHistoryCalls(filePath, results);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('pushToHistory')) {
          results.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            content: line.trim(),
            context: getContext(lines, index)
          });
        }
      });
    }
  }

  return results;
}

function getContext(lines, lineIndex) {
  const start = Math.max(0, lineIndex - 2);
  const end = Math.min(lines.length, lineIndex + 3);
  
  return lines.slice(start, end).map((line, idx) => ({
    lineNumber: start + idx + 1,
    content: line,
    isTarget: start + idx === lineIndex
  }));
}

function generateReport() {
  console.log('🔍 Buscando llamadas a pushToHistory...\n');
  
  const calls = findPushToHistoryCalls(sourceDir);
  
  if (calls.length === 0) {
    console.log('✅ No se encontraron llamadas a pushToHistory');
    return;
  }

  console.log(`📋 Encontradas ${calls.length} llamadas a pushToHistory:\n`);
  
  calls.forEach((call, index) => {
    console.log(`${index + 1}. ${call.file}:${call.line}`);
    console.log(`   ${call.content}`);
    
    if (process.argv.includes('--verbose')) {
      console.log('   Contexto:');
      call.context.forEach(ctx => {
        const marker = ctx.isTarget ? '>>>' : '   ';
        console.log(`   ${marker} ${ctx.lineNumber}: ${ctx.content}`);
      });
    }
    console.log('');
  });

  console.log(`\n📊 Resumen:`);
  console.log(`   - Total de llamadas: ${calls.length}`);
  
  const fileGroups = calls.reduce((acc, call) => {
    const dir = path.dirname(call.file);
    acc[dir] = (acc[dir] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`   - Archivos afectados: ${Object.keys(fileGroups).length}`);
  console.log(`   - Por directorio:`);
  Object.entries(fileGroups).forEach(([dir, count]) => {
    console.log(`     * ${dir}: ${count} llamadas`);
  });

  console.log(`\n💡 Próximos pasos:`);
  console.log(`   1. Verificar que Zundo esté rastreando cambios automáticamente`);
  console.log(`   2. Eliminar gradualmente las llamadas a pushToHistory()`);
  console.log(`   3. Testear cada eliminación para confirmar que el historial funciona`);
  console.log(`   4. Una vez eliminadas todas, remover pushToHistory del interface`);
}

generateReport();
