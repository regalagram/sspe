import { useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

/**
 * Hook NO INVASIVO para mejorar la UX de checkboxes en móviles
 * Solo mejora la experiencia visual y táctil SIN interferir con la funcionalidad
 */
export const useMobileCheckboxEnhancement = () => {
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    // Solo aplicar en dispositivos móviles
    if (!isMobile) return;

    // Detectar si es iOS o Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (!isIOS && !isAndroid) return;

    const deviceType = isIOS ? '🍎 iOS' : '🤖 Android';
    console.log(`${deviceType} detected - applying NON-INVASIVE checkbox enhancements`);

    const enhanceCheckboxes = () => {
      console.log(`${deviceType}: Enhancing checkboxes (non-invasive mode)`);
      
      // Buscar checkboxes en el acordeón
      const checkboxes = document.querySelectorAll(`
        .accordion-sidebar input[type="checkbox"],
        .accordion-panel-content input[type="checkbox"]
      `);

      console.log(`${deviceType}: Found`, checkboxes.length, 'checkboxes to enhance');

      checkboxes.forEach((checkbox, index) => {
        if (checkbox instanceof HTMLInputElement && checkbox.type === 'checkbox') {
          // Verificar si ya fue procesado
          if (checkbox.hasAttribute('data-mobile-enhanced')) {
            return;
          }

          console.log(`${deviceType}: ✅ Enhancing checkbox ${index} (non-invasive)`);
          
          // Marcar como procesado
          checkbox.setAttribute('data-mobile-enhanced', 'true');
          checkbox.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
          
          // FORZAR estilos críticos directamente para asegurar visibilidad
          checkbox.style.width = '24px';
          checkbox.style.height = '24px';
          checkbox.style.minWidth = '24px';
          checkbox.style.minHeight = '24px';
          checkbox.style.border = '2px solid #007acc';
          checkbox.style.borderRadius = '4px';
          checkbox.style.background = checkbox.checked ? '#007acc' : 'white';
          checkbox.style.cursor = 'pointer';
          checkbox.style.margin = '0 8px 0 0';
          checkbox.style.flexShrink = '0';
          checkbox.style.position = 'relative';
          
          // Listener para actualizar visual cuando cambie el estado
          const updateCheckboxVisual = () => {
            checkbox.style.background = checkbox.checked ? '#007acc' : 'white';
            checkbox.style.borderColor = '#007acc';
            console.log(`${deviceType}: ✅ Updated checkbox visual, checked: ${checkbox.checked}`);
          };
          
          // Remover listeners existentes para evitar duplicados
          checkbox.removeEventListener('change', updateCheckboxVisual);
          checkbox.addEventListener('change', updateCheckboxVisual);
          
          // Aplicar visual inicial
          updateCheckboxVisual();
          
          // Mejorar el label asociado también
          const label = checkbox.closest('label');
          if (label) {
            label.style.cursor = 'pointer';
            label.style.userSelect = 'none'; // Prevenir selección accidental de texto
            label.setAttribute('data-mobile-label-enhanced', 'true');
            
            // Mejorar el área táctil del label también
            const labelStyle = window.getComputedStyle(label);
            const labelPadding = parseFloat(labelStyle.paddingTop) + parseFloat(labelStyle.paddingBottom);
            
            if (labelPadding < 12) {
              label.style.padding = '6px 8px';
              console.log(`${deviceType}: ✅ Enhanced label touch area`);
            }
          }
          
          // Agregar feedback visual opcional (solo CSS, no JS)
          if (isAndroid) {
            // Para Android, usar la clase que ya está en CSS para feedback
            checkbox.classList.add('mobile-enhanced');
          }
        }
      });
    };

    // NUEVO: Hook específico para range sliders que NO se ven en móviles
    const setupRangeSliderSupport = () => {
      console.log(`${deviceType}: Setting up ENHANCED range slider support`);
      
      const rangeSliders = document.querySelectorAll(`
        .accordion-sidebar input[type="range"],
        .accordion-panel-content input[type="range"]
      `);

      console.log(`${deviceType}: Found`, rangeSliders.length, 'range sliders');

      rangeSliders.forEach((slider, index) => {
        if (slider instanceof HTMLInputElement && slider.type === 'range') {
          console.log(`${deviceType}: 🎚️ Setting up range slider ${index} - ENHANCED mode`);
          
          // Marcar como procesado
          slider.setAttribute('data-mobile-range', 'true');
          slider.setAttribute('data-device-type', isIOS ? 'ios' : 'android');
          
          // FORZAR estilos críticos directamente para asegurar visibilidad
          slider.style.height = '44px';
          slider.style.width = '100%';
          slider.style.margin = '12px 0';
          slider.style.padding = '0';
          slider.style.webkitAppearance = 'none';
          slider.style.appearance = 'none';
          slider.style.background = 'transparent';
          slider.style.border = 'none';
          slider.style.outline = 'none';
          slider.style.cursor = 'pointer';
          slider.style.position = 'relative';
          slider.style.zIndex = '1';
          
          // Para algunos navegadores móviles que no respetan los pseudo-elementos
          // agregar un background visible como fallback
          if (isAndroid) {
            slider.style.background = 'linear-gradient(to right, #ddd 0%, #ddd 100%)';
            slider.style.borderRadius = '22px';
            slider.style.border = '2px solid #007acc';
          }
          
          console.log(`${deviceType}: 🎚️ Range slider ${index} enhanced with forced styles`);
        }
      });
    };

    // Aplicar enhancements inmediatamente
    enhanceCheckboxes();
    setupRangeSliderSupport();

    // Reaplicar cuando el DOM cambie (cuando se abra/cierre acordeón)
    const observer = new MutationObserver(() => {
      setTimeout(() => {
        enhanceCheckboxes();
        setupRangeSliderSupport();
      }, 50);
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
