import { useEffect } from "react";

/**
 * Guarda de salida para pantallas con trabajo sin guardar.
 *
 * Centraliza las tres vías por las que se puede abandonar un editor sucio:
 * cerrar/recargar la pestaña (`beforeunload`), tocar un `<Link>` de react-router
 * (interceptado en fase de captura) y los botones propios de la pantalla
 * (Cancelar, Volver), que llaman a `confirmarSalida` a mano.
 *
 * Devuelve `confirmarSalida`: `true` si se puede salir, `false` si el usuario
 * canceló. Es la puerta única de toda salida del editor.
 *
 * @param {boolean} sucio Hay cambios sin guardar.
 * @returns {() => boolean}
 */
export default function useGuardaSalida(sucio) {
  // Cerrar la pestaña o recargar esquiva a React Router por completo — el
  // único gancho posible ahí es `beforeunload`.
  useEffect(() => {
    if (!sucio) return;

    function avisar(event) {
      event.preventDefault();
      // Requerido por navegadores viejos; los actuales ignoran el texto y
      // muestran su propio diálogo.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  // Los <Link> de react-router navegan sin recargar, así que esquivan tanto
  // `beforeunload` como el botón Cancelar: tocar "Órdenes" en el sidebar
  // descartaba todo en silencio. La app usa `BrowserRouter`, no un data
  // router, así que `useBlocker` no está disponible; migrar todo el ruteo
  // por esto sería desproporcionado. Se intercepta el click en fase de
  // captura, antes de que react-router lo procese.
  useEffect(() => {
    if (!sucio) return;

    function interceptar(event) {
      // Solo click izquierdo sin modificadores: ctrl/cmd/shift abren en otra
      // pestaña y no descartan nada de esta.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const enlace = event.target.closest?.("a[href]");
      if (!enlace) return;
      // Un enlace a otra pestaña del navegador no descarta este formulario.
      if (enlace.target && enlace.target !== "_self") return;
      // Anclas internas de la misma página tampoco navegan a ningún lado.
      if (enlace.getAttribute("href")?.startsWith("#")) return;

      if (confirmarSalida()) return;

      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("click", interceptar, true);
    return () => document.removeEventListener("click", interceptar, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucio]);

  /**
   * Puerta única para toda salida del editor. El badge "Cambios sin guardar"
   * promete que lo cargado importa; irse en silencio rompería esa promesa
   * justo después de veinte minutos de carga.
   */
  function confirmarSalida() {
    if (!sucio) return true;
    return window.confirm("Tenés cambios sin guardar. Si salís ahora se pierden. ¿Salir igual?");
  }

  return confirmarSalida;
}
