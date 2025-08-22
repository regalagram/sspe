import { useEffect } from 'react'

/**
 * Hook para prevenir gestures de navegación del navegador en dispositivos móviles
 * Específicamente diseñado para aplicaciones de dibujo que necesitan detectar
 * toques en los bordes de la pantalla
 */
export function usePreventNavGestures() {
  useEffect(() => {
    // Solo prevenir gestures cuando se toca específicamente el canvas
    const preventNavGestures = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      
      // Solo aplicar si el toque es en el SVG/canvas específicamente
      if (!target || (!target.closest('.svg-editor') && target.tagName.toLowerCase() !== 'svg')) {
        return
      }

      // Solo procesar si hay exactamente un toque
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const { clientX, clientY } = touch
        
        // Definir zonas de borde donde pueden ocurrir gestures de navegación
        const edgeThreshold = 25 // píxeles desde el borde
        const isLeftEdge = clientX < edgeThreshold
        const isTopEdge = clientY < edgeThreshold
        
        // Solo prevenir en bordes críticos para el gesto de "back"
        if (isLeftEdge || isTopEdge) {
          e.preventDefault()
        }
      }
    }

    // Función para prevenir el menú contextual solo en el canvas
    const preventContextMenu = (e: Event) => {
      const target = e.target as HTMLElement
      
      // Solo prevenir context menu en el canvas específicamente
      if (!target || (!target.closest('.svg-editor') && target.tagName.toLowerCase() !== 'svg')) {
        return
      }
      
      e.preventDefault()
    }

    // Función para prevenir el zoom con gestures (Safari) - solo en canvas
    const preventZoom = (e: Event) => {
      const target = e.target as HTMLElement
      if (!target || (!target.closest('.svg-editor') && target.tagName.toLowerCase() !== 'svg')) {
        return
      }
      e.preventDefault()
    }

    // Agregar listeners con passive: false para poder usar preventDefault
    const options = { passive: false }
    
    // Solo eventos críticos para prevenir gestures de navegación
    document.addEventListener('touchstart', preventNavGestures, options)
    document.addEventListener('touchmove', preventNavGestures, options)
    document.addEventListener('contextmenu', preventContextMenu)

    // Eventos de gesture para Safari (solo en canvas)
    document.addEventListener('gesturestart', preventZoom, options)
    document.addEventListener('gesturechange', preventZoom, options)

    // Cleanup function
    return () => {
      document.removeEventListener('touchstart', preventNavGestures)
      document.removeEventListener('touchmove', preventNavGestures)
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('gesturestart', preventZoom)
      document.removeEventListener('gesturechange', preventZoom)
    }
  }, [])
}