import { useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

/**
 * Hook para mejorar la experiencia táctil en Android
 * Agrega feedback haptic y optimizaciones específicas
 */
export const useAndroidTouchEnhancements = () => {
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    // Solo aplicar en dispositivos móviles Android
    if (!isMobile) return;

    const isAndroid = /Android/.test(navigator.userAgent);
    if (!isAndroid) return;

    console.log('🤖 Android detected - applying touch enhancements');

    // Función para proporcionar feedback haptic si está disponible
    const provideHapticFeedback = () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(10); // Vibración muy corta para feedback
      }
    };

    // Mejorar feedback para botones y elementos interactivos
    const enhanceAndroidTouchFeedback = () => {
      const interactiveElements = document.querySelectorAll(`
        .accordion-sidebar button,
        .accordion-sidebar [data-clickable],
        .accordion-sidebar [data-accordion-panel-header],
        .accordion-panel-content button,
        .accordion-panel-content [data-clickable],
        .accordion-panel-content input[type="checkbox"],
        .accordion-panel-content input[type="color"]
      `);

      interactiveElements.forEach((element) => {
        const handleAndroidTouch = (e: Event) => {
          // Feedback haptic suave
          provideHapticFeedback();
          
          // Feedback visual temporal
          const htmlElement = element as HTMLElement;
          const originalBackground = htmlElement.style.backgroundColor;
          
          htmlElement.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
          htmlElement.style.transition = 'background-color 0.1s ease';
          
          setTimeout(() => {
            htmlElement.style.backgroundColor = originalBackground;
          }, 150);
        };

        // Remover listeners existentes
        element.removeEventListener('touchstart', handleAndroidTouch);
        
        // Agregar listener para Android
        element.addEventListener('touchstart', handleAndroidTouch, { passive: true });
        
        // Marcar como mejorado para Android
        element.setAttribute('data-android-enhanced', 'true');
      });
    };

    // Mejorar inputs específicamente para Android
    const enhanceAndroidInputs = () => {
      const inputs = document.querySelectorAll(`
        .accordion-sidebar input,
        .accordion-sidebar textarea,
        .accordion-sidebar select,
        .accordion-panel-content input,
        .accordion-panel-content textarea,
        .accordion-panel-content select
      `) as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

      inputs.forEach((input) => {
        // Agregar feedback para focus
        const handleFocus = () => {
          console.log('🤖 Android: Input focused');
          provideHapticFeedback();
        };

        // Agregar feedback para cambios de valor
        const handleChange = () => {
          console.log('🤖 Android: Input value changed');
          provideHapticFeedback();
        };

        input.addEventListener('focus', handleFocus);
        input.addEventListener('change', handleChange);
        
        // Para range sliders, agregar feedback durante el drag
        if (input instanceof HTMLInputElement && input.type === 'range') {
          let isDragging = false;
          
          const handleRangeStart = () => {
            isDragging = true;
            provideHapticFeedback();
          };
          
          const handleRangeMove = () => {
            if (isDragging) {
              // Feedback más suave durante el drag
              if ('vibrate' in navigator) {
                navigator.vibrate(5);
              }
            }
          };
          
          const handleRangeEnd = () => {
            if (isDragging) {
              isDragging = false;
              provideHapticFeedback();
            }
          };

          input.addEventListener('touchstart', handleRangeStart);
          input.addEventListener('touchmove', handleRangeMove);
          input.addEventListener('touchend', handleRangeEnd);
        }
      });
    };

    // Aplicar mejoras inmediatamente
    enhanceAndroidTouchFeedback();
    enhanceAndroidInputs();

    // Reaplicar cuando el DOM cambie
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        enhanceAndroidTouchFeedback();
        enhanceAndroidInputs();
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
