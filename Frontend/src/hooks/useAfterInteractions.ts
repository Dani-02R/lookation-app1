// src/utils/useAfterInteractions.ts
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Ejecuta el callback *después* de que terminen las animaciones/gestos,
 * para no bloquear la transición de navegación.
 */
export function useAfterInteractions(
  fn: () => void | (() => void),
  deps: any[]
) {
  useEffect(() => {
    let cleanup: void | (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      cleanup = fn() || undefined;
    });
    return () => {
      task.cancel();
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
