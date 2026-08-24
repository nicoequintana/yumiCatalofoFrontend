import { useEffect, useRef } from "react";

/**
 * Guarda de salida para pantallas con trabajo sin guardar.
 *
 * Centraliza las cuatro vías por las que se puede abandonar un editor sucio:
 * cerrar/recargar la pestaña (`beforeunload`), tocar un `<Link>` de react-router
 * (interceptado en fase de captura), el botón Atrás del navegador (`popstate`,
 * con una entrada centinela en el historial) y los botones propios de la
 * pantalla (Cancelar, Volver), que llaman a `confirmarSalida` a mano.
 *
 * Devuelve `confirmarSalida`: `true` si se puede salir, `false` si el usuario
 * canceló. Es la puerta única de toda salida del editor.
 *
 * @param {boolean} sucio Hay cambios sin guardar.
 * @returns {() => boolean}
 */
export default function useGuardaSalida(sucio) {
  // `true` mientras el próximo `popstate` es nuestro propio `history.back()`
  // (el que consume la entrada real tras confirmar la salida): ese no hay que
  // interceptarlo, lo tiene que procesar react-router.
  const ignorarProximoPopRef = useRef(false);
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

  // El botón Atrás del navegador navega dentro de la SPA sin click ni
  // `beforeunload`: esquivaba a las otras tres vías y descartaba todo en
  // silencio. Sin data router no hay `useBlocker`, así que el patrón viable es
  // una entrada CENTINELA: al ensuciarse el formulario se duplica la entrada
  // actual del historial (misma URL, así que no se ve nada). Atrás cae en la
  // entrada real —de nuevo misma URL, react-router no mueve nada— y dispara
  // `popstate`: si el usuario cancela, se re-empuja el centinela y se queda;
  // si confirma, otro `history.back()` consume la entrada real y react-router
  // navega de verdad.
  //
  // Es imperfecto por naturaleza: el navegador ya "navegó" cuando nos
  // enteramos. El centinela absorbe UN Atrás simple; un salto multi-entrada
  // se detecta por el cambio de pathname y se deja pasar sin preguntar
  // (pérdida silenciosa, nunca un diálogo cuya respuesta se ignora). El
  // resto de los límites está documentado en el reporte de la task.
  useEffect(() => {
    if (!sucio) return;

    // Conservar el estado de la entrada actual: react-router guarda ahí sus
    // claves internas y un centinela con estado propio lo desincronizaría.
    window.history.pushState(window.history.state, "");
    // Pathname del centinela: si al llegar un `popstate` la URL ya es otra,
    // fue un salto MULTI-entrada (long-press Atrás / dropdown de historial).
    const rutaCentinela = window.location.pathname;

    function interceptarPop() {
      if (ignorarProximoPopRef.current) {
        ignorarProximoPopRef.current = false;
        return;
      }

      // Salto multi-entrada: el navegador ya trasladó a otra URL y el router
      // ya navegó. Preguntar acá es un diálogo mentiroso — cancelar no
      // cancela (el pushState duplicaría la entrada DESTINO y el editor se
      // desmonta igual) y confirmar hace un back() de más (overshoot). Se
      // acepta la pérdida silenciosa, igual que antes de existir esta vía.
      if (window.location.pathname !== rutaCentinela) return;

      if (confirmarSalida()) {
        // El centinela ya se consumió con el Atrás del usuario; este segundo
        // back consume la entrada real y deja que react-router procese la
        // navegación que el usuario pidió.
        ignorarProximoPopRef.current = true;
        window.history.back();
        return;
      }

      window.history.pushState(window.history.state, "");
    }

    window.addEventListener("popstate", interceptarPop);
    return () => window.removeEventListener("popstate", interceptarPop);
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
