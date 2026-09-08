import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTablaAdmin } from "../../hooks/useTablaAdmin.js";
import { MENSAJE_ERROR_CARGA } from "../../hooks/useOfertas.js";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import BadgeEstado from "../../components/admin/BadgeEstado.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import AvisoPeriodoRecortado from "../../components/admin/AvisoPeriodoRecortado.jsx";
import DialogoNotificarEstado from "../../components/admin/DialogoNotificarEstado.jsx";
import FiltroPeriodoOrdenes from "../../components/admin/ordenes/FiltroPeriodoOrdenes.jsx";
import ResumenOrden from "../../components/admin/ordenes/ResumenOrden.jsx";
import { claseToggleOrdenes } from "../../components/admin/ordenes/claseToggleOrdenes.js";
import { AREA_TACTIL_ICONO } from "../../utils/areaTactil.js";
import { claseEncabezado, claseTablaApilada } from "../../components/admin/clasesTabla.js";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Paginador from "../../components/Paginador.jsx";
import Spinner from "../../components/Spinner.jsx";
import {
  actualizarEstadoOrden,
  getConteoOrdenesPorEstado,
  getEstadosOrden,
  getOrdenes,
} from "../../api/ordenes.js";
import { formatFecha, formatPrecio } from "../../utils/formato.js";

/**
 * Filas por página de ESTA pantalla.
 *
 * Se manda explícito, mismo criterio que `AdminProductos`: el default del
 * backend puede cambiar por otro consumidor y este listado no tiene por qué
 * enterarse. 20 es además el `DEFAULT_PAGE_SIZE` de los listados paginados,
 * así que hoy no cambia nada — lo que cambia es de quién depende el número.
 */
const ORDENES_POR_PAGINA = 20;

/**
 * Las ocho columnas de la grilla, en orden. El texto es contrato con la tabla
 * apilada: `data-label` tiene que coincidir letra por letra con el `<th>`.
 *
 * ⚠️ La primera columna se llama **"Nº"** y no "Orden". En este repo `orden` ya
 * significa el criterio de ordenamiento de un listado (`?orden=`,
 * `ORDENES_LISTADO`, `ThOrdenable`) y la columna `orden` de anuncios y fotos:
 * un encabezado con ese texto arriba de una tabla se lee como "ordenable", que
 * es justo lo que esta pantalla NO tiene.
 */
const COLUMNAS = ["Nº", "Cliente", "DNI", "Items", "Total", "Estado", "Fecha", "Acciones"];

/**
 * Cuánto dura el despliegue del resumen de una orden.
 *
 * ⚠️ **Espeja la clase `duration-200` del envoltorio animado.** Es el tiempo
 * que la fila del resumen tiene que seguir montada después de cerrarse para
 * que se la vea colapsar: si este número queda por debajo, el nodo se desmonta
 * a mitad de la animación y el bloque desaparece de un salto.
 */
const MS_DESPLIEGUE = 200;

/**
 * `/catalogo/admin/ordenes` — la grilla paginada de órdenes.
 *
 * **Volvió a ser una tabla, después de haber sido un tablero Kanban.** El
 * tablero mostraba cuatro columnas de a 15 tarjetas y no tenía forma de acotar
 * el histórico: con miles de entregadas, la única pregunta que la operación
 * hace todos los días —"qué entró en estos días"— no se podía contestar. La
 * grilla la contesta con el filtro de período, y paginando en vez de cargando
 * de a tandas por columna.
 *
 * **Todos los filtros viven en la URL** (`?page`, `?estado`, `?dni`, `?search`,
 * `?desde`, `?hasta`, `?dias`): un listado filtrado se comparte y se recarga, y
 * volver del detalle de una orden cae en la misma vista.
 *
 * ⚠️ **`?estado=` cambió de significado pero NO de nombre.** En el tablero era
 * el tab visible; acá vuelve a ser el filtro del listado, que es lo que era
 * antes del Kanban. Renombrarlo rompería los links guardados. `?dni=` llega
 * desde `AdminOrdenDetalle` y sigue funcionando igual.
 *
 * **No hay encabezados ordenables**: `GET /ordenes` no acepta `?orden=` y su
 * `orderBy` es fijo (`createdAt desc`). Un `ThOrdenable` acá sería un control
 * que no hace nada.
 */
function AdminOrdenes() {
  // `useTablaAdmin` sin `ordenPorDefecto`: el backend ordena fijo, así que esta
  // pantalla usa solo su página y su búsqueda con debounce. La selección
  // múltiple del hook queda sin usar — no hay acciones masivas sobre órdenes.
  const { pagina, busqueda, busquedaInput, setBusquedaInput, irAPagina, searchParams, setSearchParams } =
    useTablaAdmin();

  const estado = searchParams.get("estado") ?? "";
  const dni = searchParams.get("dni") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const dias = searchParams.get("dias") ?? "";

  const [ordenes, setOrdenes] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [periodo, setPeriodo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [refresco, setRefresco] = useState(0);

  const [estadosOrden, setEstadosOrden] = useState([]);
  const [conteosPorEstado, setConteosPorEstado] = useState(null);

  const [resumenAbierto, setResumenAbierto] = useState(null);

  const [movimientoPendiente, setMovimientoPendiente] = useState(null);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState(null);
  const [advertencias, setAdvertencias] = useState([]);
  const [avisoNotificacion, setAvisoNotificacion] = useState(null);

  // Los estados con sus etiquetas vienen del backend, cacheados por sesión.
  //
  // ⚠️ **Depende de `refresco`, y ese es el punto.** Un fallo se sigue tragando
  // en silencio —sin estados quedan los chips en "Todos" y la grilla, que es lo
  // que esta pantalla existe para mostrar, sigue andando—, pero la grilla
  // absorbió el camino de ESCRITURA que antes tenía el tablero: sin esta lista
  // el `<select>` de cada fila cae a una sola opción y no se puede mover
  // NINGUNA orden. Con las deps en `[]`, el botón que la persona va a apretar
  // (Actualizar) no arreglaba eso nunca.
  useEffect(() => {
    let activo = true;
    getEstadosOrden()
      .then((lista) => activo && setEstadosOrden(lista))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [refresco]);

  // Los filtros como UN objeto memoizado, y no un objeto suelto más una clave
  // primitiva armada a mano.
  //
  // ⚠️ La clave escrita a mano era una sincronización de tres puntas con falla
  // MUDA: sumar un séptimo filtro y olvidarse de agregarlo al string hacía que
  // viajara en el fetch pero no volviera a disparar el efecto, y la tabla se
  // quedaba con el resultado anterior sin ningún error. Acá el propio
  // `exhaustive-deps` es el guard: un filtro nuevo que no entre en estas deps
  // lo marca el linter.
  const filtros = useMemo(
    () => ({
      estado: estado || undefined,
      dni: dni || undefined,
      nombre: busqueda || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      dias: dias || undefined,
    }),
    [estado, dni, busqueda, desde, hasta, dias],
  );

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getOrdenes({ ...filtros, page: pagina, pageSize: ORDENES_POR_PAGINA })
      .then((respuesta) => {
        if (!activo) return;
        setOrdenes(respuesta.data ?? []);
        setTotalPaginas(
          Math.max(1, Math.ceil((respuesta.total ?? 0) / (respuesta.pageSize ?? ORDENES_POR_PAGINA))),
        );
        // `periodo` viaja SOLO cuando se pidió una ventana. Sin filtro de fecha
        // se limpia, o el aviso de recorte quedaría pegado de una consulta vieja.
        setPeriodo(respuesta.periodo ?? null);
        // Un fetch exitoso limpia el error anterior: sin esto, un backend que
        // se recupera sigue mostrando "no se pudieron cargar" sobre una tabla
        // que ya tiene datos.
        setErrorCarga(null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        // Esta pantalla RESPONDE "¿hay órdenes?": un catch que solo vacía la
        // lista le afirma al admin que no entró ningún pedido cuando lo que
        // pasó es que el backend no contestó.
        setErrorCarga(MENSAJE_ERROR_CARGA);
        setOrdenes([]);
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [filtros, pagina, refresco]);

  // Guardas del refetch de conteos, que a diferencia de los otros tres se
  // dispara también fuera de un efecto (después del PATCH de estado) y por eso
  // no puede apoyarse en el `activo` de una limpieza.
  const conteoVigente = useRef(0);
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /**
   * Vuelve a pedir los conteos de los chips.
   *
   * `filtros` viaja ENTERO: la regla "los mismos filtros que el listado menos
   * `estado`" tiene una sola casa, y es `getConteoOrdenesPorEstado` en
   * `api/ordenes.js`, que lo descarta por destructuring. Mandar acá un
   * `estado: undefined` sería defensa muerta.
   *
   * ⚠️ El token de pedido no es opcional: la respuesta de un filtro VIEJO que
   * llega tarde pisaría los conteos del nuevo y dejaría un chip contradiciendo
   * a la tabla de abajo. Y el `montado` evita el `setState` sobre un componente
   * ya desmontado cuando el admin se va al detalle de la orden.
   */
  const refrescarConteos = useCallback(() => {
    const pedido = ++conteoVigente.current;
    const aplicar = (datos) => {
      if (!montado.current || pedido !== conteoVigente.current) return;
      setConteosPorEstado(datos);
    };
    // Falla blanda: sin conteos los chips siguen filtrando, solo pierden el
    // número. Juntar este pedido con los otros dos en un `Promise.all` haría
    // que un 500 acá blanquee la pantalla entera.
    return getConteoOrdenesPorEstado(filtros).then(
      (datos) => aplicar(datos ?? null),
      () => aplicar(null),
    );
  }, [filtros]);

  useEffect(() => {
    refrescarConteos();
  }, [refrescarConteos, refresco]);

  // Una página fuera de rango (un `?page=99` guardado, o un filtro que achicó
  // el resultado) deja la tabla vacía, y ahí el estado vacío afirmaría que no
  // hay órdenes sobre un listado que sí las tiene. Se retrocede a la última.
  // `replace`: la página que no existe no debe volver por "atrás".
  useEffect(() => {
    if (cargando || errorCarga || pagina <= totalPaginas) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (totalPaginas <= 1) next.delete("page");
        else next.set("page", String(totalPaginas));
        return next;
      },
      { replace: true },
    );
  }, [cargando, errorCarga, pagina, totalPaginas, setSearchParams]);

  // Cerrar el resumen al cambiar lo que se ve: quedaría abierto sobre una fila
  // que ya no es la misma orden.
  useEffect(() => {
    setResumenAbierto(null);
  }, [filtros, pagina, refresco]);

  /**
   * El rango que el backend REALMENTE consultó, cuando no es el que la pantalla
   * pidió.
   *
   * ⚠️ **La pantalla que responde "¿qué entró estos días?" no puede mostrar una
   * ventana distinta de la que el admin cree estar mirando.** Cargar solo
   * "Hasta" y dejar "Desde" vacío hace que el backend complete el inicio con su
   * ventana por defecto (30 días) y responda `recortado: false`: el input sigue
   * vacío en pantalla y nada avisa que se está viendo un mes en vez del
   * histórico. Un `?desde=basura` en la URL hace exactamente lo mismo.
   *
   * Se muestra el rango efectivo en vez de escribirlo en los inputs a propósito:
   * pisar el input convertiría una ventana que el backend eligió en un filtro
   * que el admin parece haber elegido, y encima cambiaría la URL que compartió.
   *
   * Con `recortado: true` calla: ese caso ya tiene su propio aviso, que dice el
   * mismo rango y además explica qué quedó afuera.
   */
  const rangoEfectivo = useMemo(() => {
    if (periodo?.recortado === true) return null;
    if (!periodo?.desde || !periodo?.hasta) return null;
    const desdeReal = String(periodo.desde).slice(0, 10);
    const hastaReal = String(periodo.hasta).slice(0, 10);
    if (desdeReal === desde && hastaReal === hasta) return null;
    return { desde: desdeReal, hasta: hastaReal };
  }, [periodo, desde, hasta]);

  /**
   * Escribe filtros en la URL. `null` borra el parámetro.
   *
   * Siempre vuelve a la página 1 (la página 3 del listado completo puede no
   * existir en el resultado filtrado) y siempre con `replace`: refinar es
   * seguir en el mismo lugar, no navegar.
   */
  function cambiarFiltros(cambios) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor === null || valor === "") next.delete(clave);
          else next.set(clave, valor);
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  /**
   * Escape cierra el resumen abierto y devuelve el foco a su disparador.
   *
   * Vive en el contenedor de la tabla y no en cada fila: el evento burbujea, y
   * un handler por fila serían tantos listeners como órdenes en pantalla. El
   * disparador se recupera por id en vez de por ref porque hay uno por fila y
   * guardar un mapa de refs para esto sería más código del que resuelve.
   */
  function escaparResumen(evento) {
    if (evento.key !== "Escape" || resumenAbierto === null) return;
    evento.stopPropagation();
    const disparador = document.getElementById(idBotonResumen(resumenAbierto));
    setResumenAbierto(null);
    disparador?.focus();
  }

  /**
   * La ÚNICA puerta de escritura de estado de la pantalla: el select de una
   * fila abre acá, y de acá sale el diálogo de notificación.
   */
  function abrirMovimiento(movimiento) {
    setErrorEstado(null);
    setMovimientoPendiente(movimiento);
  }

  async function confirmarMovimiento(notificar) {
    const { ordenId, destino } = movimientoPendiente;

    setErrorEstado(null);
    setAvisoNotificacion(null);
    setAdvertencias([]);
    setGuardandoEstado(true);

    try {
      const respuesta = await actualizarEstadoOrden(ordenId, destino, notificar);

      // ⚠️⚠️ SE PISAN SOLO TRES CAMPOS, NUNCA LA RESPUESTA ENTERA.
      // `PATCH /ordenes/:id/estado` responde con la forma DETALLE: trae
      // `items`, pero NO `total`, `resumen` ni `cantidadItems`, que son campos
      // del LISTADO. Un `setOrden(respuesta)` le arrancaría el monto y el
      // resumen a la fila sin ningún error y sin test rojo. Y no hace falta
      // re-derivarlos: el monto de una orden no cambia porque cambie su estado.
      setOrdenes((actuales) =>
        actuales.map((o) =>
          o.id === ordenId
            ? {
                ...o,
                estado: respuesta?.estado ?? destino,
                estadoEtiqueta: respuesta?.estadoEtiqueta ?? o.estadoEtiqueta,
                ...(respuesta?.updatedAt ? { updatedAt: respuesta.updatedAt } : {}),
              }
            : o,
        ),
      );

      // La fila se QUEDA aunque ya no matchee el filtro de estado activo:
      // hacerla desaparecer bajo el cursor del admin, justo después de que él
      // mismo la movió, esconde la confirmación de lo que acaba de hacer. La
      // próxima carga la reacomoda.
      //
      // Los conteos sí cambiaron, así que se vuelven a pedir.
      setConteosPorEstado(null);
      refrescarConteos();

      // El backend avisa acá cuando el descuento de stock se apoyó en cero: se
      // tomaron MENOS unidades de las que el cliente pidió. Es un faltante real
      // de depósito.
      setAdvertencias(respuesta.advertencias ?? []);
      if (respuesta.notificacion && respuesta.notificacion.enviada === false) {
        setAvisoNotificacion(respuesta.notificacion);
      }
      setMovimientoPendiente(null);
    } catch (err) {
      setErrorEstado(err.message ?? "No se pudo actualizar el estado de la orden.");
      // Se cierra el diálogo a propósito, mismo criterio que en el detalle:
      // `DialogoNotificarEstado` no tiene prop de error y el mensaje quedaría
      // tapado por el modal.
      setMovimientoPendiente(null);
    } finally {
      setGuardandoEstado(false);
    }
  }

  const ordenDelMovimiento = movimientoPendiente
    ? ordenes.find((o) => o.id === movimientoPendiente.ordenId)
    : null;

  const etiquetaDe = (valor) => estadosOrden.find((e) => e.valor === valor)?.etiqueta ?? valor;

  const hayFiltro = Boolean(estado || dni || busqueda || desde || hasta || dias);
  const totalDeConteos = conteosPorEstado
    ? Object.values(conteosPorEstado).reduce((suma, n) => suma + (Number(n) || 0), 0)
    : null;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Órdenes</h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {/* La pantalla donde más rinde: los pedidos entran mientras se la
              mira. Conserva los filtros, la búsqueda y la página. */}
          <BotonActualizar onActualizar={() => setRefresco((n) => n + 1)} actualizando={cargando} />
          <Link
            to="/catalogo/admin/ordenes/productos-solicitados"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              inventory_2
            </span>
            Productos solicitados
          </Link>
        </div>
      </div>

      {advertencias.length > 0 ? (
        <Advertencia titulo="Stock insuficiente" icono="inventory" testId="advertencias-stock">
          <ul className="font-body-md text-body-md flex list-disc flex-col gap-1 pl-5 text-on-surface">
            {advertencias.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Advertencia>
      ) : null}

      {avisoNotificacion ? (
        <Advertencia titulo="El cliente no fue notificado" icono="mark_email_unread">
          <p className="font-body-md text-body-md text-on-surface">
            El estado de la orden se guardó correctamente, pero no se pudo notificar al cliente
            {avisoNotificacion.error ? `: ${avisoNotificacion.error}` : "."}
          </p>
        </Advertencia>
      ) : null}

      <AvisoPeriodoRecortado periodo={periodo} />

      {errorEstado ? (
        <div className="mb-6 rounded-xl bg-error-container px-4 py-3">
          <p className="font-body-md text-body-md text-on-error-container">{errorEstado}</p>
        </div>
      ) : null}

      {/* BARRA DE FILTROS — tres filas, cada una con su rótulo. Los rótulos van
          ARRIBA de cada control: al costado comen ancho y se pisan entre sí en
          anchos medios, mismo criterio que el listado de productos. */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-col gap-2">
          <span
            id="rotulo-filtro-estado"
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Estado
          </span>
          {/* Botones con `aria-pressed` dentro de un `role="group"`, NUNCA un
              `role="tablist"`: un tablist de verdad obliga a roving tabindex,
              flechas, Home/End y una relación tabpanel, y acá el "panel" es el
              contenido principal de la pantalla. Mismo criterio que los tabs
              que tenía el tablero y que `SelectorPeriodo`. */}
          <div
            role="group"
            // El nombre accesible sale del rótulo VISIBLE ("Estado"), no de un
            // `aria-label` propio: con los dos puestos, `aria-labelledby` gana
            // y el `aria-label` queda muerto — un nombre escrito que nadie oye.
            aria-labelledby="rotulo-filtro-estado"
            className="flex flex-wrap gap-2"
          >
            <ChipEstado
              etiqueta="Todos"
              conteo={totalDeConteos}
              activo={estado === ""}
              onElegir={() => cambiarFiltros({ estado: null })}
            />
            {estadosOrden.map((e) => (
              <ChipEstado
                key={e.valor}
                etiqueta={e.etiqueta}
                conteo={conteosPorEstado?.[e.valor] ?? null}
                activo={estado === e.valor}
                onElegir={() => cambiarFiltros({ estado: e.valor })}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span
            id="rotulo-filtro-periodo"
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Período
          </span>
          <FiltroPeriodoOrdenes
            idRotulo="rotulo-filtro-periodo"
            dias={dias}
            desde={desde}
            hasta={hasta}
            onCambiar={cambiarFiltros}
          />
          {rangoEfectivo ? (
            <p
              data-testid="periodo-efectivo"
              className="font-body-md text-body-md text-on-surface-variant"
            >
              Estás viendo las órdenes del {formatFecha(rangoEfectivo.desde)} al{" "}
              {formatFecha(rangoEfectivo.hasta)}.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
            <label
              htmlFor="buscar-ordenes"
              className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
            >
              Buscar por nombre de cliente
            </label>
            <div className="relative w-full">
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                aria-hidden="true"
              >
                search
              </span>
              <input
                id="buscar-ordenes"
                type="search"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Nombre del cliente…"
                className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-11 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* El chip de DNI no es un campo: llega por link desde el detalle de
              una orden ("ver historial del cliente") y solo se puede quitar. */}
          {dni ? (
            <span className="font-body-md text-body-md flex min-h-11 items-center gap-2 rounded-lg bg-surface-container-high px-3 py-2 text-on-surface-variant">
              DNI: {dni}
              <button
                type="button"
                onClick={() => cambiarFiltros({ dni: null })}
                aria-label="Quitar filtro por DNI"
                // Área táctil: el `<span>` de arriba ya declaraba `min-h-11`,
                // pero el CONTROL es este `<button>`, que era un glifo de 16px
                // sin caja propia (~16×16). ⚠️ No lo vio el barrido de la
                // auditoría del 07/09/2026 porque el chip solo se renderiza
                // con `?dni=` en la URL. Pseudo-elemento: lo único a menos de
                // 44px es el texto "DNI: N" del propio chip, que NO es un
                // control, así que no hay dos áreas que se roben entre sí; y
                // el glifo no crece porque un disco de 44 dentro de un chip de
                // 44 lo llenaría entero.
                className={`material-symbols-outlined text-[16px] hover:text-on-surface ${AREA_TACTIL_ICONO}`}
              >
                close
              </button>
            </span>
          ) : null}
        </div>
      </div>

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando órdenes…</p>
        </div>
      ) : errorCarga ? (
        <EstadoVacio
          icono="cloud_off"
          titulo="No se pudieron cargar las órdenes"
          mensaje={errorCarga}
        />
      ) : ordenes.length === 0 ? (
        // "Todavía no hay órdenes" sería falso con un filtro activo: las
        // órdenes están, el filtro no las alcanza. Decir lo contrario manda al
        // admin a buscar un problema que no existe.
        hayFiltro ? (
          <EstadoVacio
            icono="search_off"
            titulo="Sin resultados"
            mensaje="Ninguna orden coincide con los filtros elegidos. Probá quitando alguno o ampliando el período."
          />
        ) : (
          <EstadoVacio
            icono="receipt_long"
            titulo="Todavía no hay órdenes"
            mensaje="Cuando un cliente termine un checkout, su pedido aparece acá."
          />
        )
      ) : (
        <div
          onKeyDown={escaparResumen}
          className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient"
        >
          {/* Roles ARIA explícitos en TODOS los nodos: Chrome y Safari
              descartan los implícitos en cuanto `display` deja de ser
              `table-*` (la tabla apilada de mobile), y jsdom no reproduce ese
              descarte — un test apoyado en el rol implícito pasa en verde y
              falla en el navegador. */}
          <table role="table" className={`${claseTablaApilada} w-full min-w-[860px] text-left`}>
            <thead role="rowgroup">
              <tr role="row" className="border-b border-outline-variant">
                {COLUMNAS.map((columna) => (
                  <th key={columna} role="columnheader" className={claseEncabezado}>
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {ordenes.map((orden) => (
                <FilaOrden
                  key={orden.id}
                  orden={orden}
                  estadosOrden={estadosOrden}
                  guardandoEstado={guardandoEstado}
                  abierto={resumenAbierto === orden.id}
                  onAlternarResumen={() =>
                    setResumenAbierto((actual) => (actual === orden.id ? null : orden.id))
                  }
                  onCambiarEstado={(destino) =>
                    abrirMovimiento({ ordenId: orden.id, origen: orden.estado, destino })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && !errorCarga && ordenes.length > 0 ? (
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={irAPagina}
          etiqueta="Paginación de órdenes"
        />
      ) : null}

      {movimientoPendiente ? (
        <DialogoNotificarEstado
          ordenId={movimientoPendiente.ordenId}
          estadoAnterior={movimientoPendiente.origen}
          etiquetaAnterior={etiquetaDe(movimientoPendiente.origen)}
          estadoNuevo={movimientoPendiente.destino}
          etiquetaNueva={etiquetaDe(movimientoPendiente.destino)}
          emailCliente={ordenDelMovimiento?.cliente?.email ?? null}
          guardando={guardandoEstado}
          onConfirmar={confirmarMovimiento}
          onCancelar={() => setMovimientoPendiente(null)}
        />
      ) : null}
    </main>
  );
}

/**
 * Un chip de filtro por estado, con su conteo.
 *
 * El conteo `null` (todavía no llegó, o el pedido falló) NO se dibuja como
 * `0`: un cero afirma que no hay ninguna orden en ese estado, que es un dato
 * distinto y falso. Sin número, el chip sigue filtrando igual.
 *
 * Comparte el aspecto con los presets de período (`claseToggleOrdenes`): son
 * dos grupos de toggles apilados en la misma caja de filtros y con dos pintas
 * distintas se leían como dos controles de naturaleza distinta.
 */
function ChipEstado({ etiqueta, conteo, activo, onElegir }) {
  return (
    <button type="button" aria-pressed={activo} onClick={onElegir} className={claseToggleOrdenes(activo)}>
      {conteo === null || conteo === undefined ? etiqueta : `${etiqueta} (${conteo})`}
    </button>
  );
}

/** El id del disparador del resumen de una orden — ver `escaparResumen`. */
function idBotonResumen(ordenId) {
  return `resumen-orden-${ordenId}`;
}

/** El id del panel de resumen de una orden. */
function idPanelResumen(ordenId) {
  return `resumen-orden-panel-${ordenId}`;
}

/**
 * El ciclo de vida del despliegue: si la fila del resumen está en el DOM y si
 * está desplegada.
 *
 * Son DOS estados y no uno porque cada uno resuelve un problema distinto:
 *
 * - **`montado` va un paso por detrás al CERRAR.** Desmontar la fila en el
 *   mismo tick que se cierra deja el bloque desapareciendo de golpe: no hay
 *   animación de salida posible sobre un nodo que ya no está.
 * - **`desplegado` va un frame por detrás al ABRIR.** Si el navegador ve el
 *   valor final en el primer estilo calculado del nodo recién montado, no hay
 *   nada que interpolar y el panel aparece de golpe igual. Ese frame de `0fr`
 *   es lo único que hace que la transición exista.
 *
 * El cierre se cronometra con un `setTimeout` y no con `transitionend`: el
 * evento no llega nunca cuando `prefers-reduced-motion` anula la transición, y
 * ahí la fila se quedaría montada para siempre.
 */
function useDespliegue(abierto) {
  const [montado, setMontado] = useState(false);
  const [desplegado, setDesplegado] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMontado(true);
      const cuadro = requestAnimationFrame(() => setDesplegado(true));
      return () => cancelAnimationFrame(cuadro);
    }
    setDesplegado(false);
    const reloj = setTimeout(() => setMontado(false), MS_DESPLIEGUE);
    return () => clearTimeout(reloj);
  }, [abierto]);

  return { montado, desplegado };
}

/**
 * Una fila de la grilla, más su fila de resumen cuando está abierta.
 *
 * **El resumen va en una `<tr>` extra con `colSpan`, no en un panel flotante.**
 * En la tarjeta del tablero el panel se superponía porque no había dónde
 * crecer; en una tabla la fila siguiente sí existe, y empujar el contenido es
 * más predecible que taparlo.
 *
 * **Las dos filas se leen como UN cuadrante.** Mientras el resumen está
 * montado, la fila de la orden NO lleva borde inferior: el borde va recién al
 * final del bloque. Sin eso —y con el panel dibujando su propio marco— el
 * resultado se leía como "la orden #4198 y abajo un cartel" en vez de como "la
 * orden #4198 desplegada".
 *
 * ⚠️ **La animación es `grid-template-rows: 0fr → 1fr`, y la técnica no es un
 * detalle.** No se puede animar `height` de una `<tr>` ni de un `<td>` de forma
 * confiable, y un `max-height` con un valor fijo falla de las dos puntas: con
 * siete productos corta el contenido, con uno tarda de más animando un espacio
 * vacío. El grid anima hasta la altura REAL sin conocerla, y por eso el `<td>`
 * va con `padding: 0` (cualquier padding suyo sobrevive al `0fr` y deja el
 * bloque cerrado con altura) y el contenido cuelga de un hijo con
 * `overflow-hidden`, que es lo que recorta mientras la caja crece.
 *
 * ⚠️ Esa fila extra es la única de la tabla que NO cumple el contrato de la
 * tabla apilada (un `<td>` con `colSpan` no tiene `<th>` propio contra el cual
 * rotularse). Es deliberado y por eso `esperarTablaApilada` se corre sobre la
 * tabla con todos los resúmenes cerrados, que es su estado de reposo. Lleva
 * `data-fila="expansion"` para que el CSS de mobile la pegue a la tarjeta de su
 * orden en vez de dibujarla como una tarjeta más.
 */
function FilaOrden({ orden, estadosOrden, guardandoEstado, abierto, onAlternarResumen, onCambiarEstado }) {
  // `total`, `cantidadItems` y `resumen` caen JUNTOS: salen de la misma rama
  // del mapper. `null` significa "no se puede saber", nunca "$ 0" ni "0" —
  // mismo guion largo que usan las pantallas de analytics.
  const sinMonto = orden.total === null || orden.total === undefined;
  const montoFormateado = sinMonto ? "—" : formatPrecio(orden.total);
  const cantidadDeItems = orden.cantidadItems ?? null;

  const { montado, desplegado } = useDespliegue(abierto);

  return (
    <>
      <tr
        role="row"
        className={montado ? undefined : "border-b border-outline-variant last:border-b-0"}
      >
        <td
          role="cell"
          data-celda="identidad"
          className="font-body-md text-body-md px-4 py-3 text-on-surface"
        >
          #{orden.id}
        </td>
        <td
          role="cell"
          data-label="Cliente"
          className="font-body-md text-body-md px-4 py-3 text-on-surface"
        >
          {orden.cliente?.nombre ?? "Sin cliente"}
        </td>
        <td
          role="cell"
          data-label="DNI"
          className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface-variant"
        >
          {orden.cliente?.dni ?? "—"}
        </td>
        <td role="cell" data-label="Items" className="px-4 py-3">
          {/* Disclosure: `aria-expanded` + `aria-controls`, no un tooltip (que
              es para texto corto y aplana el contenido estructurado) ni un
              diálogo (atrapar el foco acá sería incorrecto). */}
          <button
            id={idBotonResumen(orden.id)}
            type="button"
            aria-expanded={abierto}
            aria-controls={idPanelResumen(orden.id)}
            // ⚠️ Sin cantidad, el nombre accesible NO dice "0 productos". El
            // texto visible ya cae al guion largo por la misma razón: un cero
            // afirma que la orden no tiene nada, que es otro dato y es falso.
            // Que la mentira sea audible en vez de visible no la mejora.
            aria-label={
              cantidadDeItems === null
                ? `Ver los productos de la orden #${orden.id}`
                : `Ver los ${cantidadDeItems} productos de la orden #${orden.id}`
            }
            onClick={onAlternarResumen}
            // `min-h-11 min-w-11` (44px) va ADEMÁS del `h-9`, nunca en lugar
            // de él: el mínimo táctil de WCAG 2.5.8 es un PISO y el `h-9` es lo
            // que iguala este botón con el resto de los controles de la fila
            // (mismo criterio que `SelectorCantidad.jsx`). Medido en navegador
            // el 07/09/2026 con `elementFromPoint` —área EFECTIVA, no la caja
            // declarada—: 44×37 a 1280 y 174×37 a 390, donde la tabla apilada
            // le da el ancho de la tarjeta. O sea que en los DOS anchos lo
            // único que falta es el alto; el `min-w-11` queda igual porque a
            // 1280 el ancho llega JUSTO a 44 y nada lo sostiene.
            // Sin `justify-center`: en la tabla apilada de mobile la celda
            // estira este botón a los 174px de la tarjeta, y centrar el
            // contenido lo movería del margen izquierdo donde está hoy.
            className="inline-flex h-9 min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-on-surface-variant hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {abierto ? "expand_less" : "list_alt"}
            </span>
            <span className="font-label-sm text-label-sm">{cantidadDeItems ?? "—"}</span>
          </button>
        </td>
        <td
          role="cell"
          data-label="Total"
          className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface"
        >
          {montoFormateado}
        </td>
        <td role="cell" data-celda="control" className="px-4 py-3">
          <BadgeEstado estado={orden.estado} etiqueta={orden.estadoEtiqueta} />
        </td>
        <td
          role="cell"
          data-label="Fecha"
          className="font-body-md text-body-md whitespace-nowrap px-4 py-3 text-on-surface-variant"
        >
          {formatFecha(orden.createdAt)}
        </td>
        <td role="cell" data-celda="acciones" className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* El MISMO control que el detalle de la orden: un `<select>` con
                los estados que sirve el backend. Cambiarlo no guarda nada —
                abre el diálogo de notificación, que es la única puerta de
                escritura. */}
            <select
              value={orden.estado}
              onChange={(e) => onCambiarEstado(e.target.value)}
              disabled={guardandoEstado}
              aria-label={`Cambiar estado de la orden #${orden.id}`}
              className="font-body-md text-body-md min-h-11 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none disabled:opacity-60"
            >
              {estadosOrden.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
              {/* Sin la lista de estados (su fetch falló) el select se queda
                  con el estado actual como única opción, en vez de vacío. */}
              {estadosOrden.length === 0 ? (
                <option value={orden.estado}>{orden.estadoEtiqueta ?? orden.estado}</option>
              ) : null}
            </select>

            {/* El acceso al detalle aparece hasta 12 veces por página y medía
                31×17 px, menos de la mitad del mínimo táctil. El área se
                agranda con `min-h-11`/`min-w-11` (44px) más padding — NUNCA
                subiendo el tamaño del texto: la fila de la tabla tiene que
                seguir midiendo lo mismo. El margen negativo compensa ese
                padding para que el link no empuje al `<select>` de al lado. */}
            <Link
              to={`/catalogo/admin/ordenes/${orden.id}`}
              aria-label={`Ver la orden #${orden.id}`}
              className="font-label-md text-label-md -my-2 inline-flex min-h-11 min-w-11 items-center justify-center px-3 py-2 uppercase tracking-widest text-secondary hover:underline"
            >
              Ver
            </Link>
          </div>
        </td>
      </tr>

      {montado ? (
        <tr
          role="row"
          data-fila="expansion"
          className="border-b border-outline-variant last:border-b-0"
        >
          <td role="cell" colSpan={COLUMNAS.length} className="p-0">
            <div
              data-despliegue={desplegado ? "abierto" : "cerrado"}
              className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                desplegado ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                {/* El fundido acompaña al alto: sin él, el texto se lee entero
                    desde el primer píxel de apertura y la caja parece llegar
                    tarde. */}
                <div
                  className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    desplegado ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <ResumenOrden
                    id={idPanelResumen(orden.id)}
                    resumen={orden.resumen}
                    cantidadItems={orden.cantidadItems}
                    montoFormateado={montoFormateado}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default AdminOrdenes;
