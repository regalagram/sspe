import { useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

/**
 * Hook específico para manejar el focus en dispositivos móviles (iOS y Android)
 * Soluciona problemas donde los elementos de formulario no pueden obtener focus
 */
export const useMobileFormFocusFix = () => {
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    // Solo aplicar en dispositivos móviles
    if (!isMobile) return;

    // Detectar si es iOS o Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (!isIOS && !isAndroid) return;

    const deviceType = isIOS ? '🍎 iOS' : '🤖 Android';
    console.log(`${deviceType} detected - applying form focus fixes`);

    // Crear una función más directa para manejar el focus
    const forceFormElementFocus = () => {
      console.log(`${deviceType}: Setting up form element focus handlers`);
      
      // Buscar todos los elementos de formulario en el acordeón
      const formElements = document.querySelectorAll(`
        .accordion-sidebar input,
        .accordion-sidebar textarea,
        .accordion-sidebar select,
        .accordion-panel-content input,
        .accordion-panel-content textarea,
        .accordion-panel-content select
      `);

      console.log(`${deviceType}: Found`, formElements.length, 'form elements');

      formElements.forEach((element, index) => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          console.log(`${deviceType}: Setting up element ${index}:`, element.tagName, (element as any).type);
          
          // Agregar event listeners directamente a cada elemento
          const handleTouch = (e: Event) => {
            e.stopPropagation();
            console.log(`${deviceType}: Form element touched directly:`, element.tagName, (element as any).type);
            
            // Para Android, usar un delay ligeramente más largo
            const focusDelay = isAndroid ? 50 : 0;
            
            // Forzar focus
            setTimeout(() => {
              console.log(`${deviceType}: Attempting focus on:`, element.tagName);
              element.focus();
              
              // Para inputs de texto, seleccionar contenido
              if (element instanceof HTMLInputElement && (element.type === 'text' || element.type === 'number')) {
                element.select();
                console.log(`${deviceType}: Selected text in input`);
              }
              if (element instanceof HTMLTextAreaElement) {
                element.select();
                console.log(`${deviceType}: Selected text in textarea`);
              }
            }, focusDelay);
          };

          // Remover listeners existentes primero
          element.removeEventListener('touchstart', handleTouch);
          element.removeEventListener('click', handleTouch);

          element.addEventListener('touchstart', handleTouch, { passive: false });
          element.addEventListener('click', handleTouch, { passive: false });
          
          // También agregar atributos específicos para móviles
          element.setAttribute('data-mobile-focus-fix', 'true');
          element.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
        }
      });
    };

    // Aplicar fix inmediatamente
    forceFormElementFocus();

    // Reaplicar cuando el DOM cambie (cuando se abra/cierre acordeón)
    const observer = new MutationObserver(() => {
      setTimeout(forceFormElementFocus, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [isMobile]);
};
