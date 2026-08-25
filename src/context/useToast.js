import { createContext, useContext } from "react";

/**
 * Contexto del sistema de toasts. Vive acá (y no en `ToastContext.jsx`) para
 * que el archivo del Provider exporte SOLO el componente: un archivo que
 * mezcla componente y hook rompe Fast Refresh — cada edición del Provider
 * recargaba la página entera en desarrollo en vez de refrescar en caliente.
 */
export const ToastContext = createContext(null);

/** @returns {{ mostrarToast: (mensaje: string, opciones?: { tipo?: "info"|"error"|"exito" }) => void }} */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider.");
  }
  return context;
}
