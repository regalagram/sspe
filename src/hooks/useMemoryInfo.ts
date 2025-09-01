import { useState, useEffect, useCallback, useRef } from 'react';

interface MemoryBreakdown {
  domNodes: number;
  jsEventListeners: number;
  jsHeapSize: number;
  documents: number;
  frames: number;
  estimatedDOMSize: number;
  estimatedEventListenersSize: number;
}

interface MemoryTrend {
  timestamp: number;
  used: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  growthRate: number; // bytes per second
}

interface MemoryInfo {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  formatted: {
    used: string;
    total: string;
    limit: string;
    domSize: string;
    listenersSize: string;
  };
  percentage: number;
  available: boolean;
  breakdown: MemoryBreakdown;
  trend: MemoryTrend;
  recommendations: string[];
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
};

const analyzeMemoryBreakdown = (): MemoryBreakdown => {
  // Contar nodos DOM
  const domNodes = document.querySelectorAll('*').length;
  
  // Estimar listeners de eventos (aproximación)
  const jsEventListeners = (() => {
    let count = 0;
    // Buscar elementos con atributos de eventos comunes
    const eventAttributes = ['onclick', 'onload', 'onchange', 'onsubmit', 'onmouseover'];
    eventAttributes.forEach(attr => {
      count += document.querySelectorAll(`[${attr}]`).length;
    });
    return count;
  })();
  
  // Información del heap de JS
  const jsHeapSize = window.performance?.memory?.usedJSHeapSize || 0;
  
  // Contar documentos y frames
  const documents = document.querySelectorAll('iframe').length + 1; // +1 para el documento principal
  const frames = window.frames.length;
  
  // Estimaciones de tamaño más precisas
  const estimatedDOMSize = domNodes * 200; // ~200 bytes por nodo DOM (más realista)
  const estimatedEventListenersSize = jsEventListeners * 80; // ~80 bytes por listener
  
  return {
    domNodes,
    jsEventListeners,
    jsHeapSize,
    documents,
    frames,
    estimatedDOMSize,
    estimatedEventListenersSize
  };
};

const calculateTrend = (currentUsed: number, previousTrend?: MemoryTrend): MemoryTrend => {
  const timestamp = Date.now();
  
  if (!previousTrend) {
    return {
      timestamp,
      used: currentUsed,
      trend: 'stable',
      growthRate: 0
    };
  }
  
  const timeDiff = (timestamp - previousTrend.timestamp) / 1000; // segundos
  const memoryDiff = currentUsed - previousTrend.used;
  const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;
  
  let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
  if (Math.abs(growthRate) > 1024) { // Cambio significativo > 1KB/s
    trend = growthRate > 0 ? 'increasing' : 'decreasing';
  }
  
  return {
    timestamp,
    used: currentUsed,
    trend,
    growthRate
  };
};

const generateRecommendations = (memoryInfo: Partial<MemoryInfo>, breakdown: MemoryBreakdown): string[] => {
  const recommendations: string[] = [];
  
  if (breakdown.domNodes > 5000) {
    recommendations.push(`Alto número de nodos DOM (${breakdown.domNodes}). Considera virtualización.`);
  }
  
  if (breakdown.jsEventListeners > 1000) {
    recommendations.push(`Muchos event listeners (${breakdown.jsEventListeners}). Revisa delegación de eventos.`);
  }
  
  if (memoryInfo.percentage && memoryInfo.percentage > 75) {
    recommendations.push('Uso de memoria alto. Ejecuta GC o limpia variables no utilizadas.');
  }
  
  if (breakdown.frames > 10) {
    recommendations.push(`Múltiples frames (${breakdown.frames}). Considera optimizar iframes.`);
  }
  
  if (breakdown.estimatedDOMSize > 1024 * 1024) { // > 1MB
    recommendations.push('DOM grande detectado. Considera lazy loading o paginación.');
  }
  
  return recommendations;
};

export const useMemoryInfo = () => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({
    formatted: {
      used: 'N/A',
      total: 'N/A',
      limit: 'N/A',
      domSize: 'N/A',
      listenersSize: 'N/A'
    },
    percentage: 0,
    available: false,
    breakdown: {
      domNodes: 0,
      jsEventListeners: 0,
      jsHeapSize: 0,
      documents: 0,
      frames: 0,
      estimatedDOMSize: 0,
      estimatedEventListenersSize: 0
    },
    trend: {
      timestamp: Date.now(),
      used: 0,
      trend: 'stable',
      growthRate: 0
    },
    recommendations: []
  });

  // Usar ref para mantener la referencia del trend anterior sin triggear re-renders
  const previousTrendRef = useRef<MemoryTrend | undefined>(undefined);

  const updateMemoryInfo = useCallback(() => {
    const breakdown = analyzeMemoryBreakdown();
    
    if (window.performance?.memory) {
      const memory = window.performance.memory;
      const percentage = memory.jsHeapSizeLimit > 0 
        ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 
        : 0;

      const trend = calculateTrend(memory.usedJSHeapSize, previousTrendRef.current);
      previousTrendRef.current = trend;
      
      const newMemoryInfo: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        formatted: {
          used: formatBytes(memory.usedJSHeapSize),
          total: formatBytes(memory.totalJSHeapSize),
          limit: formatBytes(memory.jsHeapSizeLimit),
          domSize: formatBytes(breakdown.estimatedDOMSize),
          listenersSize: formatBytes(breakdown.estimatedEventListenersSize)
        },
        percentage,
        available: true,
        breakdown,
        trend,
        recommendations: generateRecommendations({ percentage }, breakdown)
      };
      
      setMemoryInfo(newMemoryInfo);
    } else {
      const trend = calculateTrend(0, previousTrendRef.current);
      previousTrendRef.current = trend;
      
      setMemoryInfo({
        formatted: {
          used: 'N/A',
          total: 'N/A',
          limit: 'N/A',
          domSize: formatBytes(breakdown.estimatedDOMSize),
          listenersSize: formatBytes(breakdown.estimatedEventListenersSize)
        },
        percentage: 0,
        available: false,
        breakdown,
        trend,
        recommendations: generateRecommendations({}, breakdown)
      });
    }
  }, []); // Sin dependencias para evitar bucles infinitos

  const forceGarbageCollection = useCallback(() => {
    // @ts-ignore - gc is a Chrome DevTools specific function
    if (typeof window.gc === 'function') {
      window.gc();
      // Actualizar información después del GC
      setTimeout(updateMemoryInfo, 100);
      return true;
    }
    return false;
  }, [updateMemoryInfo]);

  const getDetailedMemoryAnalysis = useCallback(() => {
    // Calcular estimación total de memoria
    const calculateTotalMemoryEstimate = () => {
      const jsHeap = window.performance?.memory?.usedJSHeapSize || 0;
      const domEstimate = memoryInfo.breakdown.estimatedDOMSize;
      const listenersEstimate = memoryInfo.breakdown.estimatedEventListenersSize;
      
      // Estimar otros componentes
      const stylesheets = document.styleSheets.length;
      const scripts = document.scripts.length;
      const images = document.images.length;
      
      // Estimaciones conservadoras
      const stylesheetsSize = stylesheets * 10000; // ~10KB por stylesheet
      const scriptsSize = scripts * 50000; // ~50KB por script
      const imagesSize = images * 100000; // ~100KB por imagen (conservador)
      
      const estimatedBrowserOverhead = jsHeap * 0.5; // 50% del heap como overhead del navegador
      
      const totalEstimate = jsHeap + domEstimate + listenersEstimate + 
                           stylesheetsSize + scriptsSize + imagesSize + estimatedBrowserOverhead;
      
      return {
        jsHeap,
        domEstimate,
        listenersEstimate,
        stylesheetsSize,
        scriptsSize,
        imagesSize,
        estimatedBrowserOverhead,
        totalEstimate,
        formatted: {
          jsHeap: formatBytes(jsHeap),
          domEstimate: formatBytes(domEstimate),
          stylesheetsSize: formatBytes(stylesheetsSize),
          scriptsSize: formatBytes(scriptsSize),
          imagesSize: formatBytes(imagesSize),
          browserOverhead: formatBytes(estimatedBrowserOverhead),
          totalEstimate: formatBytes(totalEstimate)
        }
      };
    };
    
    const memoryEstimate = calculateTotalMemoryEstimate();
    
    const analysis = {
      timestamp: new Date().toISOString(),
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        memory: window.performance?.memory
      },
      domAnalysis: memoryInfo.breakdown,
      memoryTrend: memoryInfo.trend,
      recommendations: memoryInfo.recommendations,
      customMetrics: {
        totalElements: document.querySelectorAll('*').length,
        totalTextNodes: document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        ).nextNode() ? 'Available' : 'N/A',
        stylesheets: document.styleSheets.length,
        scripts: document.scripts.length,
        images: document.images.length
      },
      memoryEstimate
    };
    
    console.group('🔍 Análisis Detallado de Memoria');
    console.table(analysis.domAnalysis);
    console.log('📊 Tendencia:', analysis.memoryTrend);
    console.log('💡 Recomendaciones:', analysis.recommendations);
    console.log('📋 Métricas Personalizadas:', analysis.customMetrics);
    console.group('🧮 Estimación Total de Memoria');
    console.log('📊 Desglose detallado:', memoryEstimate);
    console.log(`
🔍 EXPLICACIÓN DE LA DIFERENCIA CON CHROME:

Chrome Task Manager (~${window.performance?.memory ? Math.round(window.performance.memory.usedJSHeapSize * 3.5 / 1024 / 1024) : 'N/A'}MB estimado):
├── JavaScript Heap: ${memoryEstimate.formatted.jsHeap} (${window.performance?.memory ? Math.round((window.performance.memory.usedJSHeapSize / (window.performance.memory.usedJSHeapSize * 3.5)) * 100) : 'N/A'}%)
├── DOM + CSS: ${memoryEstimate.formatted.domEstimate} + ${memoryEstimate.formatted.stylesheetsSize}
├── Scripts: ${memoryEstimate.formatted.scriptsSize}
├── Imágenes: ${memoryEstimate.formatted.imagesSize}
├── Browser Overhead: ${memoryEstimate.formatted.browserOverhead}
└── Total Estimado: ${memoryEstimate.formatted.totalEstimate}

⚠️  La diferencia se debe a:
• Chrome incluye buffers, cache, overhead del proceso
• Compiladores JIT (V8), garbage collector overhead
• WebGL contexts, Canvas buffers
• Network cache, DNS cache
• DevTools (si están abiertos)
• Extensiones del navegador
    `);
    console.groupEnd();
    console.groupEnd();
    
    return analysis;
  }, [memoryInfo]);

  useEffect(() => {
    updateMemoryInfo();
    
    // Actualizar cada 3 segundos (reducido para mejor análisis de tendencias)
    const interval = setInterval(updateMemoryInfo, 3000);
    
    return () => clearInterval(interval);
  }, [updateMemoryInfo]);

  return {
    memoryInfo,
    forceGarbageCollection,
    updateMemoryInfo,
    getDetailedMemoryAnalysis
  };
};
