import { useCallback, useEffect, useReducer, useRef } from "react";
import { getOrdenes } from "../api/ordenes.js";

/**
 * Estado de datos del tablero de órdenes: una columna por estado, cada una con
 * sus órdenes, su total real y su propia paginación.
 *
 * **Por qué `useReducer` y no cuatro `useState`.** Confirmar un movimiento toca
 * DOS columnas a la vez —saca la orden del origen, la inserta en el destino, y
 * ajusta los dos contadores— y eso son cuatro escrituras que tienen que ocurrir
 * juntas o ninguna. Con setters sueltos el estado puede quedar a medias: una
 * orden en las dos columnas, o en ninguna.
 *
 * **La carga inicial va con `Promise.allSettled`, JAMÁS con `Promise.all`.**
 * Con `all`, una sola columna que falla blanquea el tablero entero y el admin
 * se queda sin pantalla; con `allSettled` cada columna dibuja su propio error
 * con su propio reintento y las otras tres siguen usables. El tablero reemplazó
 * a una tabla que funcionaba: no puede ser más frágil que ella.
 */

/**
 * Cuántas órdenes trae cada columna por tanda.
 *
 * Explícito y no heredado del default del backend (20): son CUATRO columnas, y
 * 4 × 20 = 80 tarjetas en el primer pintado es mucho DOM para una pantalla que
 * además monta un `DndContext` con sus sensores y su medición de droppables.
 */
export const ORDENES_POR_COLUMNA = 15;

function columnaVacia() {
  return {
    ordenes: [],
    total: 0,
    page: 1,
    cargando: true,
    error: null,
    /** Error de "cargar más", separado del de la carga inicial: NO vacía la columna. */
    errorPagina: null,
    cargandoPagina: false,
  };
}

function estadoInicial(estados) {
  return {
    columnas: Object.fromEntries(estados.map(({ valor }) => [valor, columnaVacia()])),
    cargando: estados.length > 0,
  };
}

/** Aplica un cambio a UNA columna sin tocar las demás. */
function conColumna(estado, clave, cambios) {
  const actual = estado.columnas[clave];
  if (!actual) return estado;
  return { ...estado, columnas: { ...estado.columnas, [clave]: { ...actual, ...cambios } } };
}

function reducer(estado, accion) {
  switch (accion.tipo) {
    case "REINICIAR":
      return estadoInicial(accion.estados);

    case "COLUMNA_CARGADA":
      return conColumna(estado, accion.clave, {
        ordenes: accion.ordenes,
        total: accion.total,
        page: 1,
        cargando: false,
        error: null,
        errorPagina: null,
      });

    case "COLUMNA_ERROR":
      return conColumna(estado, accion.clave, {
        ordenes: [],
        total: 0,
        cargando: false,
        error: accion.error,
      });

    case "CARGA_TERMINADA":
      return { ...estado, cargando: false };

    case "PAGINA_PEDIDA":
      return conColumna(estado, accion.clave, { cargandoPagina: true, errorPagina: null });

    case "PAGINA_AGREGADA": {
      const actual = estado.columnas[accion.clave];
      if (!actual) return estado;
      // Se deduplica por id: entre una tanda y la siguiente el catálogo se
      // pudo mover (un alta corre las páginas, o una orden aterrizó acá por un
      // movimiento del tablero). Dos keys iguales rompen la reconciliación de
      // React sin dar error.
      const vistos = new Set(actual.ordenes.map((o) => o.id));
      const nuevas = accion.ordenes.filter((o) => !vistos.has(o.id));
      return conColumna(estado, accion.clave, {
        ordenes: [...actual.ordenes, ...nuevas],
        total: accion.total,
        page: accion.page,
        cargandoPagina: false,
        errorPagina: null,
      });
    }

    case "PAGINA_ERROR":
      // Lo ya cargado se QUEDA: el aviso va pegado al botón y reintentar es
      // volver a tocarlo. Vaciar la columna castigaría al admin por un error
      // de red con la pérdida de todo lo que ya estaba viendo.
      return conColumna(estado, accion.clave, { cargandoPagina: false, errorPagina: accion.error });

    case "ORDEN_MOVIDA": {
      const { ordenId, origen, destino, respuesta } = accion;
      const colOrigen = estado.columnas[origen];
      const colDestino = estado.columnas[destino];
      if (!colOrigen || !colDestino) return estado;

      const movida = colOrigen.ordenes.find((o) => o.id === ordenId);
      if (!movida) return estado;

      // ⚠️ Se pisan SOLO los campos que el cambio de estado modifica, nunca la
      // respuesta entera. El PATCH devuelve la forma DETALLE: trae `items`,
      // pero NO `total`, `resumen` ni `cantidadItems`, que son campos del
      // listado. Reemplazar la tarjeta con esa respuesta le arrancaría el monto
      // y el hover, sin ningún error. Y no hace falta re-derivarlos: el monto
      // de una orden no cambia porque cambie su estado.
      const actualizada = {
        ...movida,
        estado: respuesta?.estado ?? destino,
        estadoEtiqueta: respuesta?.estadoEtiqueta ?? movida.estadoEtiqueta,
        ...(respuesta?.updatedAt ? { updatedAt: respuesta.updatedAt } : {}),
      };

      const ordenesDestino = [...colDestino.ordenes, actualizada].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      return {
        ...estado,
        columnas: {
          ...estado.columnas,
          [origen]: {
            ...colOrigen,
            ordenes: colOrigen.ordenes.filter((o) => o.id !== ordenId),
            total: Math.max(0, colOrigen.total - 1),
          },
          [destino]: { ...colDestino, ordenes: ordenesDestino, total: colDestino.total + 1 },
        },
      };
    }

    default:
      return estado;
  }
}

/**
 * @param {Array<{valor: string, etiqueta: string, terminal: boolean}>} estados
 *   Los estados que devuelve `GET /ordenes/estados` — definen las columnas.
 * @param {{dni?: string, refresco?: number}} filtros
 */
export default function useColumnasOrdenes(estados, { dni, refresco } = {}) {
  const [estado, dispatch] = useReducer(reducer, estados, estadoInicial);

  // Los estados llegan de un fetch, así que la primera vez el array está vacío
  // y hay que reconstruir las columnas cuando aparecen. Se compara por las
  // CLAVES y no por identidad de array: `listaDeEstados()` devuelve objetos
  // nuevos en cada llamada, así que la identidad cambiaría siempre.
  const claves = estados.map((e) => e.valor).join(",");

  // Los filtros se leen por ref dentro de `cargarMas` para que la función sea
  // estable entre renders: si dependiera de ellos, cada tecla del buscador
  // remontaría los efectos de quien la consuma.
  const filtrosRef = useRef({ dni });
  filtrosRef.current = { dni };

  useEffect(() => {
    if (claves === "") return undefined;
    let activo = true;
    const lista = claves.split(",");

    dispatch({ tipo: "REINICIAR", estados: lista.map((valor) => ({ valor })) });

    Promise.allSettled(
      lista.map((valor) =>
        getOrdenes({ estado: valor, dni: dni || undefined, page: 1, pageSize: ORDENES_POR_COLUMNA }),
      ),
    ).then((resultados) => {
      if (!activo) return;
      resultados.forEach((resultado, i) => {
        const clave = lista[i];
        if (resultado.status === "fulfilled") {
          dispatch({
            tipo: "COLUMNA_CARGADA",
            clave,
            ordenes: resultado.value.data ?? [],
            total: resultado.value.total ?? 0,
          });
        } else {
          dispatch({
            tipo: "COLUMNA_ERROR",
            clave,
            error: resultado.reason?.message ?? "No se pudieron cargar las órdenes.",
          });
        }
      });
      dispatch({ tipo: "CARGA_TERMINADA" });
    });

    return () => {
      activo = false;
    };
  }, [claves, dni, refresco]);

  // Espejo del estado vigente, para que `cargarMas` lea la página actual sin
  // tener que depender de `estado` y volverse inestable entre renders. Mismo
  // criterio que el ref de `onCerrar` en `useDialogo`.
  const columnasRef = useRef(estado.columnas);
  columnasRef.current = estado.columnas;

  const cargarMas = useCallback(async (clave) => {
    const siguiente = (columnasRef.current[clave]?.page ?? 1) + 1;
    dispatch({ tipo: "PAGINA_PEDIDA", clave });
    try {
      const respuesta = await getOrdenes({
        estado: clave,
        dni: filtrosRef.current.dni || undefined,
        page: siguiente,
        pageSize: ORDENES_POR_COLUMNA,
      });
      dispatch({
        tipo: "PAGINA_AGREGADA",
        clave,
        ordenes: respuesta.data ?? [],
        total: respuesta.total ?? 0,
        page: siguiente,
      });
    } catch (err) {
      dispatch({
        tipo: "PAGINA_ERROR",
        clave,
        error: err?.message ?? "No se pudo cargar la página siguiente.",
      });
    }
  }, []);

  const moverOrden = useCallback((datos) => {
    dispatch({ tipo: "ORDEN_MOVIDA", ...datos });
  }, []);

  return { columnas: estado.columnas, cargando: estado.cargando, cargarMas, moverOrden };
}
