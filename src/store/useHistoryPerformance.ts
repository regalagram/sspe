import { useRef, useEffect } from 'react';
import { useHistoryDebug } from './useEditorHistory';
import { getCurrentDiffConfig } from './diffConfig';
import { useEditorStore } from './editorStore';

// Estado global para controlar los logs de performance
let performanceLoggingEnabled = false;

export const setPerformanceLogging = (enabled: boolean) => {
  performanceLoggingEnabled = enabled;
};

export const isPerformanceLoggingEnabled = () => performanceLoggingEnabled;

interface MemoryMetrics {
  currentStateSize: number;
  totalStatesSize: number;
  memoryUsagePercentage: number;
  avgStateSize: number;
  cooloffActivePeriods: number;
  warnings: string[];
  performanceScore: number;
  memoryLeakDiagnostic: MemoryLeakDiagnostic;
}

interface MemoryLeakDiagnostic {
  detected: boolean;
  confidence: 'low' | 'medium' | 'high';
  patterns: string[];
  recommendations: string[];
  growth: {
    rate: number; // bytes/second
    consistency: number; // 0-1
    timeWindow: string;
  };
  suspiciousAreas: string[];
}

const MB = 1024 * 1024;
const MEMORY_THRESHOLD_WARNING = 50 * MB; // 50MB
const MEMORY_THRESHOLD_CRITICAL = 100 * MB; // 100MB
const LEAK_DETECTION_SAMPLES = 10;
const LEAK_GROWTH_THRESHOLD = 10 * 1024; // 10KB growth per sample

/**
 * Calcula el tamaño aproximado de un objeto en bytes
 */
function calculateObjectSize(obj: any): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (e) {
    // Fallback para objetos que no se pueden serializar
    if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj).length * 100; // Estimación rough
    }
    return 0;
  }
}

/**
 * Calcula métricas de performance del historial
 */
function calculateMemoryMetrics(
  pastStates: any[],
  futureStates: any[],
  currentState: any,
  cooloffActivePeriods: number,
  previousMetrics?: MemoryMetrics
): MemoryMetrics {
  const currentStateSize = calculateObjectSize(currentState);
  const totalStatesSize = 
    [...pastStates, ...futureStates].reduce((total, state) => total + calculateObjectSize(state), 0) + 
    currentStateSize;
  
  const totalStates = pastStates.length + futureStates.length + 1;
  const avgStateSize = totalStates > 0 ? totalStatesSize / totalStates : 0;
  
  // Memoria total estimada del sistema (esto es una aproximación)
  const estimatedSystemMemory = 4 * 1024 * MB; // 4GB default
  const memoryUsagePercentage = (totalStatesSize / estimatedSystemMemory) * 100;
  
  const warnings: string[] = [];
  
  // Detectar problemas de memoria
  if (totalStatesSize > MEMORY_THRESHOLD_CRITICAL) {
    warnings.push(`⚠️ Uso crítico de memoria: ${(totalStatesSize / MB).toFixed(1)}MB`);
  } else if (totalStatesSize > MEMORY_THRESHOLD_WARNING) {
    warnings.push(`⚠️ Alto uso de memoria: ${(totalStatesSize / MB).toFixed(1)}MB`);
  }
  
  if (pastStates.length > 40) {
    warnings.push('📈 Muchos estados en historial (>40)');
  }
  
  if (avgStateSize > 1 * MB) {
    warnings.push(`📦 Estados muy grandes: ${(avgStateSize / 1024).toFixed(1)}KB promedio`);
  }
  
  if (cooloffActivePeriods > 5) {
    warnings.push('🔄 Cooloff period activado frecuentemente');
  }
  
  // Calcular score de performance (0-100)
  let performanceScore = 100;
  performanceScore -= Math.min(memoryUsagePercentage, 50); // Penalizar uso de memoria
  performanceScore -= Math.min(pastStates.length, 20); // Penalizar muchos estados
  performanceScore -= Math.min(avgStateSize / (100 * 1024), 30); // Penalizar estados grandes
  performanceScore = Math.max(0, performanceScore);
  
  // Análisis de memory leak
  const memoryHistory = previousMetrics ? 
    [...(previousMetrics.memoryLeakDiagnostic?.growth ? [previousMetrics.memoryLeakDiagnostic.growth.rate] : []), totalStatesSize] :
    [totalStatesSize];
  
  const now = Date.now();
  const timestampHistory = previousMetrics?.memoryLeakDiagnostic ? 
    [...(previousMetrics.memoryLeakDiagnostic.growth ? [now - 1000] : []), now] :
    [now];
  
  const memoryLeakDiagnostic = analyzeMemoryLeak(
    memoryHistory.slice(-LEAK_DETECTION_SAMPLES),
    timestampHistory.slice(-LEAK_DETECTION_SAMPLES),
    { currentMemory: totalStatesSize, stateCount: totalStates, avgStateSize }
  );
  
  if (memoryLeakDiagnostic.detected) {
    warnings.push(`🚨 Posible memory leak detectado (${memoryLeakDiagnostic.confidence} confidence)`);
  }
  
  return {
    currentStateSize,
    totalStatesSize,
    memoryUsagePercentage,
    avgStateSize,
    cooloffActivePeriods,
    warnings,
    performanceScore,
    memoryLeakDiagnostic
  };
}

/**
 * Análisis avanzado de memory leak
 */
function analyzeMemoryLeak(
  samples: number[], 
  timestamps: number[], 
  context: { currentMemory: number; stateCount: number; avgStateSize: number }
): MemoryLeakDiagnostic {
  if (samples.length < 10) {
    return {
      detected: false,
      confidence: 'low',
      patterns: [],
      recommendations: [],
      growth: { rate: 0, consistency: 0, timeWindow: '0s' },
      suspiciousAreas: []
    };
  }
  
  // Calcular trend de crecimiento
  const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
  const memoryGrowth = samples[samples.length - 1] - samples[0];
  const growthRate = timeSpan > 0 ? (memoryGrowth / timeSpan) * 1000 : 0; // bytes/second
  
  // Calcular consistencia del crecimiento
  let consistentGrowthCount = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] > samples[i - 1]) {
      consistentGrowthCount++;
    }
  }
  const consistency = consistentGrowthCount / (samples.length - 1);
  
  // Detectar patrones
  const patterns: string[] = [];
  const recommendations: string[] = [];
  const suspiciousAreas: string[] = [];
  
  // Crecimiento constante
  if (consistency > 0.7 && growthRate > LEAK_GROWTH_THRESHOLD) {
    patterns.push('Crecimiento de memoria constante');
    recommendations.push('Revisar lógica de limpieza del historial');
    suspiciousAreas.push('Sistema de historial');
  }
  
  // Estados muy grandes
  if (context.avgStateSize > 1 * MB) {
    patterns.push('Estados individuales muy grandes');
    recommendations.push('Implementar partialización más agresiva');
    suspiciousAreas.push('Tamaño del estado');
  }
  
  // Muchos estados
  if (context.stateCount > 45) {
    patterns.push('Acumulación excesiva de estados');
    recommendations.push('Reducir límite de historial o cooloff period');
    suspiciousAreas.push('Límites del historial');
  }
  
  // Determinar confianza
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (consistency > 0.8 && growthRate > LEAK_GROWTH_THRESHOLD * 2) {
    confidence = 'high';
  } else if (consistency > 0.6 && growthRate > LEAK_GROWTH_THRESHOLD) {
    confidence = 'medium';
  }
  
  const detected = patterns.length > 0 && confidence !== 'low';
  
  return {
    detected,
    confidence,
    patterns,
    recommendations,
    growth: {
      rate: growthRate,
      consistency,
      timeWindow: `${(timeSpan / 1000).toFixed(1)}s`
    },
    suspiciousAreas
  };
}

/**
 * Hook para obtener métricas completas en el formato esperado por ZundoDebugPanel
 */
export const useHistoryPerformanceMonitor = () => {
  const { pastStates, futureStates } = useHistoryDebug();
  const currentState = useEditorStore.getState();
  const metricsRef = useRef<MemoryMetrics>({
    currentStateSize: 0,
    totalStatesSize: 0,
    memoryUsagePercentage: 0,
    avgStateSize: 0,
    cooloffActivePeriods: 0,
    warnings: [],
    performanceScore: 100,
    memoryLeakDiagnostic: {
      detected: false,
      confidence: 'low',
      patterns: [],
      recommendations: [],
      growth: { rate: 0, consistency: 0, timeWindow: '0s' },
      suspiciousAreas: []
    }
  });
  
  const cooloffPeriodsRef = useRef(0);
  
  useEffect(() => {
    // Si el historial futuro está vacío después de tener estados, incrementar cooloff
    if (futureStates.length === 0 && metricsRef.current.totalStatesSize > 0) {
      cooloffPeriodsRef.current++;
    }
    
    const newMetrics = calculateMemoryMetrics(
      pastStates,
      futureStates,
      currentState,
      cooloffPeriodsRef.current,
      metricsRef.current
    );
    
    metricsRef.current = newMetrics;
    
    // Logging detallado si hay problemas Y si está habilitado
    if (newMetrics.warnings.length > 0 && performanceLoggingEnabled) {
      console.group('🔍 Zundo Performance Monitor');
      console.warn('Advertencias detectadas:', newMetrics.warnings);
      console.log('Métricas actuales:', {
        totalMemory: `${(newMetrics.totalStatesSize / MB).toFixed(2)}MB`,
        avgStateSize: `${(newMetrics.avgStateSize / 1024).toFixed(1)}KB`,
        stateCount: pastStates.length + futureStates.length + 1,
        performanceScore: `${newMetrics.performanceScore.toFixed(1)}/100`
      });
      
      if (newMetrics.memoryLeakDiagnostic.detected) {
        console.error('⚠️ Memory Leak Diagnostic:', newMetrics.memoryLeakDiagnostic);
      }
      
      console.groupEnd();
    }
  }, [pastStates, futureStates, currentState]);
  
  return {
    metrics: metricsRef.current,
    hasWarnings: metricsRef.current.warnings.length > 0,
    isHealthy: metricsRef.current.memoryUsagePercentage < 70 && metricsRef.current.warnings.length === 0,
    memoryLeakDiagnostic: metricsRef.current.memoryLeakDiagnostic
  };
};

/**
 * Hook para obtener recomendaciones de optimización
 */
export const useHistoryOptimizationTips = () => {
  const { memory, pastStatesCount, futureStatesCount } = useHistoryDebug();
  const diffConfig = getCurrentDiffConfig();
  
  const tips: string[] = [];
  
  if (memory.memoryUsagePercentage > 80) {
    tips.push('Considera reducir el límite de historial de 50 a 30 estados');
    
    if (diffConfig.mode === 'full') {
      tips.push('💡 Activar modo DIFF puede reducir significativamente el uso de memoria');
    }
  }
  
  if (memory.avgStateSize > 512 * 1024) { // > 512KB por estado
    tips.push('Los estados son grandes. Mejora la partialización para excluir más campos');
    
    if (diffConfig.mode === 'full') {
      tips.push('🎯 Modo DIFF especialmente útil para estados grandes');
    }
  }
  
  if (pastStatesCount + futureStatesCount > 45) {
    tips.push('Cerca del límite. El cool-off period podría ser muy corto');
  }
  
  if (memory.currentStateSize > 1024 * 1024) { // > 1MB estado actual
    tips.push('Estado actual muy grande. Revisa si hay datos innecesarios');
  }
  
  // Tips específicos sobre diff mode
  if (diffConfig.mode === 'diff' && memory.memoryUsagePercentage > 70) {
    tips.push('🔍 Modo DIFF activo pero memoria alta: verifica efectividad de los diffs');
  }
  
  if (diffConfig.mode === 'full' && memory.avgStateSize > 256 * 1024) {
    tips.push('🔄 Estados > 256KB: considera probar modo DIFF');
  }
  
  return tips;
};

/**
 * Función para generar reportes manuales de performance (ignora el flag de logging)
 * Útil para reportes on-demand desde botones del debug panel
 */
export const generatePerformanceReport = (pastStates: any[], futureStates: any[], currentState: any) => {
  const metrics = calculateMemoryMetrics(pastStates, futureStates, currentState, 0);
  
  console.group('🔍 Manual Performance Report');
  console.log('Métricas actuales:', {
    totalMemory: `${(metrics.totalStatesSize / (1024 * 1024)).toFixed(2)}MB`,
    avgStateSize: `${(metrics.avgStateSize / 1024).toFixed(1)}KB`,
    stateCount: pastStates.length + futureStates.length + 1,
    performanceScore: `${metrics.performanceScore.toFixed(1)}/100`,
    warnings: metrics.warnings
  });
  
  if (metrics.memoryLeakDiagnostic.detected) {
    console.error('⚠️ Memory Leak Diagnostic:', metrics.memoryLeakDiagnostic);
  }
  
  console.groupEnd();
  
  return metrics;
};

