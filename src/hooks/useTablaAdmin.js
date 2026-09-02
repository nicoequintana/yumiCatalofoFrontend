import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * El estado compartido de las tablas paginadas del panel: página, búsqueda,
 * orden y selección múltiple.
 *
 * POR QUÉ EXISTE. `AdminProductos.jsx` (1171 líneas) y `AdminPrecios.jsx`
 * (1135) repetían, cada una por su cuenta, la misma mecánica: filtros en la
 * URL, debounce de 350 ms, la guarda `ultimoCommit`, selección múltiple y
 * limpieza al paginar o buscar. Es la lógica más sutil del panel y estaba
 * escrita dos veces — un arreglo en una no llegaba a la otra.
 *
 * LOS FILTROS VIVEN EN LA URL, no en estado local. Un listado filtrado se
 * comparte y se recarga, y volver de editar un producto devuelve a la búsqueda
 * que lo encontró en vez de a la tabla completa.
 */

/**
 * Espera antes de escribir la búsqueda en la URL. Sin esto, cada tecla es un
 * request: un término de siete letras son siete pedidos y seis respuestas que
 * se descartan al llegar. Mismo valor que los filtros de `/coleccion`.
 */
export const DEBOUNCE_BUSQUEDA_MS = 350;

/**
 * @param {object} [opciones]
 * @param {string} [opciones.ordenPorDefecto=""] qué orden usar cuando la URL no
 *   trae ninguno. `AdminProductos` manda `catalogo`; `AdminPrecios` usa
 *   `nombre`, porque ahí se busca un producto conocido en vez de revisar altas.
 */
export function useTablaAdmin({ ordenPorDefecto = "" } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paginaUrl = Number(searchParams.get("page"));
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;
  const busqueda = searchParams.get("search") ?? "";
  const orden = searchParams.get("orden") ?? ordenPorDefecto;

  // Estado local para que cada tecla no escriba en la URL. Se inicializa desde
  // la URL: una caja vacía sobre una tabla filtrada se lee como un bug.
  const [busquedaInput, setBusquedaInput] = useState(busqueda);

  // Último valor que el input emitió o adoptó — mismo patrón que `CampoPrecio`
  // en `FiltrosCatalogo.jsx`. Comparar contra él distingue "el admin está
  // tipeando" de "la URL cambió por navegación" (el link del sidebar, Atrás).
  //
  // SIN ESTA GUARDA hay una regresión concreta y muda: navegar a la misma ruta
  // sin `?search=` NO desmonta el componente, así que el input conservaba el
  // término y el debounce lo reescribía en la URL 350 ms después, resucitando
  // un filtro que la persona acababa de limpiar.
  const ultimoCommit = useRef(busqueda);

  const [seleccionados, setSeleccionados] = useState(() => new Set());

  const limpiarSeleccion = useCallback(() => {
    setSeleccionados((actuales) => (actuales.size === 0 ? actuales : new Set()));
  }, []);

  const alternarSeleccion = useCallback((id) => {
    setSeleccionados((actuales) => {
      const siguiente = new Set(actuales);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }, []);

  const seleccionarTodos = useCallback((ids) => {
    setSeleccionados(new Set(ids));
  }, []);

  // La URL cambió por afuera del input: el input la adopta sin reescribirla.
  useEffect(() => {
    if (busqueda === ultimoCommit.current) return;
    ultimoCommit.current = busqueda;
    setBusquedaInput(busqueda);
  }, [busqueda]);

  // Debounce: commitea a la URL cuando el admin deja de tipear.
  useEffect(() => {
    if (busquedaInput === ultimoCommit.current) return;

    const timeoutId = setTimeout(() => {
      ultimoCommit.current = busquedaInput;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (busquedaInput) next.set("search", busquedaInput);
          else next.delete("search");
          // Buscar vuelve a la página 1: la página 3 del listado completo puede
          // no existir en el resultado filtrado.
          next.delete("page");
          return next;
        },
        // `replace` porque refinar una búsqueda es seguir en el mismo lugar, no
        // navegar. Sin esto, "atrás" necesitaría un click por letra tipeada
        // para salir de la pantalla.
        { replace: true },
      );
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => clearTimeout(timeoutId);
  }, [busquedaInput, setSearchParams]);

  // La selección se limpia cuando cambian las filas que se ven. Ejecutar una
  // acción masiva sobre lo que ya no está en pantalla es exactamente el
  // accidente que un checkbox puede causar.
  useEffect(() => {
    limpiarSeleccion();
  }, [pagina, busqueda, orden, limpiarSeleccion]);

  const irAPagina = useCallback(
    (siguiente) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        // La página 1 no se escribe: es el default y ensucia la URL.
        if (siguiente > 1) next.set("page", String(siguiente));
        else next.delete("page");
        return next;
      });
      // Ir a otra página SÍ apila historial (a diferencia de buscar): es ir a
      // otro lado, y "atrás" tiene que volver.
    },
    [setSearchParams],
  );

  const cambiarOrden = useCallback(
    (siguiente) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (siguiente && siguiente !== ordenPorDefecto) next.set("orden", siguiente);
          else next.delete("orden");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, ordenPorDefecto],
  );

  return {
    // Valores committeados: lo que la pantalla manda al backend.
    pagina,
    busqueda,
    orden,
    // Input controlado, con su propio debounce.
    busquedaInput,
    setBusquedaInput,
    // Navegación.
    irAPagina,
    cambiarOrden,
    // Selección múltiple.
    seleccionados,
    // Setter crudo además de los helpers: algunas pantallas arman la selección
    // con lógica propia (invertirla, tomar solo las filas de un chip de estado)
    // y forzarlas a pasar por `seleccionarTodos` las obligaría a recalcular el
    // conjunto entero en cada caso.
    setSeleccionados,
    alternarSeleccion,
    seleccionarTodos,
    limpiarSeleccion,
    // Escape hatch para los filtros propios de cada pantalla (categoría,
    // etiqueta, stock en `AdminProductos`). No se abstraen acá porque no los
    // comparten: `AdminPrecios` no tiene ninguno.
    searchParams,
    setSearchParams,
  };
}
