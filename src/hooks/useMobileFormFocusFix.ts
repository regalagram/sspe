import { useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

/**
 * Hook específico para manejar el focus en dispositivos móviles (iOS y Android)
 * Soluciona problemas donde los elementos de formulario no pueden obtener focus
 * Versión mejorada que NO interfiere con checkboxes
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
    console.log(`${deviceType} detected - applying SAFE form focus fixes`);

    // Crear una función más segura para manejar el focus
    const applySafeFormElementFocus = () => {
      console.log(`${deviceType}: Setting up SAFE form element focus handlers`);
      
      // Buscar solo elementos que necesitan ayuda con el focus (NO checkboxes)
      const textFormElements = document.querySelectorAll(`
        .accordion-sidebar input[type="text"],
        .accordion-sidebar input[type="number"],
        .accordion-sidebar input[type="range"],
        .accordion-sidebar input[type="color"],
        .accordion-sidebar textarea,
        .accordion-sidebar select,
        .accordion-panel-content input[type="text"],
        .accordion-panel-content input[type="number"],
        .accordion-panel-content input[type="range"],
        .accordion-panel-content input[type="color"],
        .accordion-panel-content textarea,
        .accordion-panel-content select
      `);

      console.log(`${deviceType}: Found`, textFormElements.length, 'text form elements (excluding checkboxes)');

      textFormElements.forEach((element, index) => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          console.log(`${deviceType}: Setting up element ${index}:`, element.tagName, (element as any).type);
          
          // Para Android, usar un delay ligeramente más largo
          const focusDelay = isAndroid ? 50 : 0;
          
          // IMPORTANTE: Solo manejar eventos para elementos que NO son checkboxes
          if (element instanceof HTMLInputElement && element.type === 'checkbox') {
            console.log(`${deviceType}: ❌ Skipping checkbox - handled natively`);
            return; // Saltar checkboxes completamente
          }
          
          // Agregar event listeners solo para elementos de texto/select
          const handleTextElementTouch = (e: Event) => {
            // Para elementos de texto/número/select, usar el comportamiento de focus
            e.stopPropagation();
            console.log(`${deviceType}: Text form element touched:`, element.tagName, (element as any).type);
            
            // Forzar focus
            setTimeout(() => {
              console.log(`${deviceType}: Attempting focus on text element:`, element.tagName);
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

          // Remover listeners existentes primero para evitar duplicados
          element.removeEventListener('touchstart', handleTextElementTouch);
          element.removeEventListener('click', handleTextElementTouch);

          // Agregar listeners solo para elementos de texto
          element.addEventListener('touchstart', handleTextElementTouch, { passive: false });
          element.addEventListener('click', handleTextElementTouch, { passive: false });
          
          // También agregar atributos específicos para móviles
          element.setAttribute('data-mobile-focus-fix', 'true');
          element.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
        }
      });
    };

    // NUEVO: Hook específico para checkboxes que NO interfiere con su funcionamiento
    const setupCheckboxSupport = () => {
      console.log(`${deviceType}: Setting up NON-INVASIVE checkbox support`);
      
      const checkboxes = document.querySelectorAll(`
        .accordion-sidebar input[type="checkbox"],
        .accordion-panel-content input[type="checkbox"]
      `);

      console.log(`${deviceType}: Found`, checkboxes.length, 'checkboxes');

      checkboxes.forEach((checkbox, index) => {
        if (checkbox instanceof HTMLInputElement && checkbox.type === 'checkbox') {
          console.log(`${deviceType}: ✅ Setting up checkbox ${index} - NON-INVASIVE mode`);
          
          // Solo agregar atributos, NO event listeners que interfieran
          checkbox.setAttribute('data-mobile-checkbox', 'true');
          checkbox.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
          
          // Asegurar que tenga los estilos correctos para touch
          if (!checkbox.style.minWidth) {
            checkbox.style.minWidth = '44px';
            checkbox.style.minHeight = '44px';
          }
        }
      });
    };

    // Aplicar fixes inmediatamente
    applySafeFormElementFocus();
    setupCheckboxSupport();

    // Reaplicar cuando el DOM cambie (cuando se abra/cierre acordeón)
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        applySafeFormElementFocus();
        setupCheckboxSupport();
      }, 100);
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
