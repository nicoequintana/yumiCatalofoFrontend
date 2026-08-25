import { useCallback, useRef, useState } from "react";
import Toast from "../components/Toast.jsx";
import { ToastContext } from "./useToast.js";

const DURACION_MS = 4000;

/**
 * Sistema de toast global de la app — Context + Provider, montado una única
 * vez en App.jsx. Cualquier componente llama `useToast().mostrarToast(...)`
 * sin necesidad de pasar props ni conocer dónde se renderiza el toast en sí.
 *
 * Un solo toast visible a la vez (mismo criterio que la mayoría de UIs: un
 * segundo `mostrarToast` mientras el anterior sigue en pantalla lo reemplaza
 * en vez de apilar varios). `id` incrementa en cada llamado para que el
 * `setTimeout` de un toast viejo nunca cierre uno más nuevo que lo reemplazó.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const idRef = useRef(0);
  const timeoutRef = useRef(null);

  const mostrarToast = useCallback((mensaje, { tipo = "info" } = {}) => {
    idRef.current += 1;
    const id = idRef.current;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setToast({ id, mensaje, tipo });
    timeoutRef.current = setTimeout(() => {
      setToast((actual) => (actual?.id === id ? null : actual));
    }, DURACION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {toast ? <Toast mensaje={toast.mensaje} tipo={toast.tipo} onCerrar={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

// El hook `useToast` vive en `./useToast.js` — ver el comment ahí sobre Fast
// Refresh. Este archivo exporta SOLO el componente a propósito; un re-export
// del hook acá reintroduce el warning que motivó la separación.
