import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import Paginador from "../../components/Paginador.jsx";
import Advertencia from "../../components/admin/Advertencia.jsx";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import { claseTablaApilada } from "../../components/admin/clasesTabla.js";
import useDialogo from "../../hooks/useDialogo.js";
import { getProducts, aplicarPreciosMasivo, updateCosteo } from "../../api/products.js";
import {
  formatPrecio,
  formatearPrecioInput,
  formatearPrecioParaEdicion,
} from "../../utils/formato.js";
import {
  ESTADOS_PRECIO,
  ETIQUETA_ESTADO_PRECIO,
  calcularPrecio,
  estadoDePrecio,
} from "../../utils/precios.js";

/**
 * `/catalogo/admin/productos/precios` — costos, coeficiente y precio de venta.
 *
 * El precio se calcula como `costo × coeficiente`, redondeado al peso.
 *
 * El modelo de la pantalla, en una línea: **el precio se calcula pero se
 * ESCRIBE cuando el admin aplica**. Cambiar un costo no mueve el precio
 * publicado; queda marcado como "Difiere" hasta que alguien lo aplique. Eso es
 * lo que hace que el precio que ve un cliente sea siempre un número que una
 * persona aprobó, y lo que permite mostrar el redondeo antes de escribirlo en
 * vez de aplicarlo en silencio.
 *
 * Diseño: `docs/superpowers/specs/2026-08-29-costos-y-precios-admin-design.md`.
 *
 * **Pide 100 filas por página, no las 50 de `AdminProductos`.** La selección se
 * limpia al cambiar de página (aplicar sobre filas que no se ven es justo el
 * accidente que un checkbox puede causar), así que con páginas de 50 no se
 * podría seleccionar el catálogo entero — que es el caso de uso central de esta
 * pantalla. 100 es el techo del backend (`MAX_PAGE_SIZE`).
 */
const PRODUCTOS_POR_PAGINA = 100;

/** Pausa antes de mandar lo tipeado a la URL (y por lo tanto al backend). */
const DEBOUNCE_BUSQUEDA_MS = 350;

/**
 * Filtro de "todavía no tiene precio real": coeficiente en 1.
 *
 * **NO es un cuarto valor de `ESTADOS_PRECIO`, y la distinción no es cosmética.**
 * Los tres estados son derivados de la relación entre el precio publicado y el
 * calculado; esto es un filtro sobre una COLUMNA. Meterlo en el enum obligaría a
 * decidir qué gana cuando un producto es a la vez `AL_DIA` y coeficiente 1 — que
 * es siempre, porque `costo × 1 = costo`.
 *
 * Existe justamente por eso: el coeficiente arranca en 1 en toda alta, así que
 * un producto recién cargado figura `Al día` sin tener todavía un precio que
 * alguien haya pensado. Lo delata el coeficiente, no el estado.
 */
const SIN_PRECIO_REAL = "SIN_PRECIO_REAL";

/** Un producto con costo cargado al que nadie le puso margen todavía. */
function esSinPrecioReal(fila) {
  return fila.calculado !== null && Number(String(fila.coeficiente).replace(",", ".")) === 1;
}

/** Filtros de la barra superior. `null` = sin filtrar. */
const FILTROS = [
  { clave: null, etiqueta: "Todos" },
  { clave: ESTADOS_PRECIO.DIFIERE, etiqueta: "Difieren" },
  { clave: SIN_PRECIO_REAL, etiqueta: "Sin precio real" },
  { clave: ESTADOS_PRECIO.SIN_COSTO, etiqueta: "Sin costo" },
  { clave: ESTADOS_PRECIO.AL_DIA, etiqueta: "Al día" },
];

/**
 * Criterios del selector "Ordenar por", espejo de `ORDENES_LISTADO` en
 * `backend/src/controllers/products.controller.js`.
 *
 * **El orden lo resuelve la BASE, no esta pantalla.** La tabla está paginada:
 * un `sort()` sobre `productos` reordenaría las cien filas cargadas, no el
 * catálogo — y la pregunta que contesta este selector ("¿cuáles son los de
 * mayor costo?") es sobre el catálogo entero.
 *
 * El default de ESTA pantalla es `nombre`, no el `recientes` del backend: acá se
 * trabaja de corrido buscando productos por nombre, no revisando altas nuevas.
 *
 * Sincronización manual entre repos, igual que `ORDENES` en `AdminProductos`: un
 * valor que no exista allá cae al default sin error, así que un typo acá se ve
 * como "el orden no hace nada".
 */
const ORDENES = [
  { valor: "nombre", etiqueta: "Nombre: A → Z" },
  { valor: "nombre-desc", etiqueta: "Nombre: Z → A" },
  { valor: "costo-desc", etiqueta: "Costo: mayor a menor" },
  { valor: "costo-asc", etiqueta: "Costo: menor a mayor" },
  { valor: "coeficiente-asc", etiqueta: "Coeficiente: menor a mayor" },
  { valor: "coeficiente-desc", etiqueta: "Coeficiente: mayor a menor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "recientes", etiqueta: "Más recientes" },
];

const ORDEN_POR_DEFECTO = "nombre";

const CLASE_CHIP = {
  [ESTADOS_PRECIO.AL_DIA]: "bg-secondary-container text-on-secondary-container",
  [ESTADOS_PRECIO.DIFIERE]: "bg-tertiary-container text-on-tertiary-container",
  [ESTADOS_PRECIO.SIN_COSTO]: "bg-surface-container-high text-on-surface-variant",
};

/**
 * Mensaje de respaldo cuando el error no trae `message`.
 *
 * No es cosmético: el panel de informe decide qué rama renderizar por la
 * verdad de `informe.error`. Con un `throw` que no es `Error` —un string, un
 * objeto suelto— `err.message` queda `undefined`, la rama de error se lee como
 * falsa y la pantalla anuncia un éxito que no ocurrió: *"Se actualizaron
 * undefined precios."*
 */
const MENSAJE_ERROR_GUARDADO =
  "No se pudo guardar el costo. Revisá tu conexión e intentá de nuevo.";

/** El `message` del error, o el genérico si no hay ninguno utilizable. */
function mensajeDeError(err) {
  return err?.message || MENSAJE_ERROR_GUARDADO;
}

/**
 * Normaliza el costo que devuelve el servidor a dígitos pelados.
 *
 * **El costo vive SIEMPRE crudo en el estado de esta pantalla** — el borrador,
 * la comparación de "sin cambios" y el cuerpo del PATCH usan este valor; el
 * punto de miles se agrega recién al renderizar el input. Guardar el texto
 * formateado rompería `guardarCosteo`, que decide si mandar el PATCH comparando
 * el borrador contra lo que devolvió el servidor: `"1.500"` nunca es igual a
 * `"1500"`, así que cada blur escribiría un cambio que no cambia nada y
 * llenaría `AuditLog` de ruido.
 *
 * Va por `formatearPrecioParaEdicion` y NO por `formatearPrecioInput`, por el
 * bug de 100x que ese módulo documenta: `formatearPrecioInput` descarta todo lo
 * que no sea dígito, así que un `"1500.00"` legado quedaría en `"150000"`. Del
 * borrador en adelante ya es seguro — lo que guarda `editar` es dígitos pelados.
 */
function costoCrudo(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  return formatearPrecioParaEdicion(valor).crudo;
}

const claseEncabezado =
  "px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest";
const claseCelda = "px-2 py-2 align-middle xl:px-3 xl:py-3";
/**
 * `tabular-nums` en todas las columnas de plata. Con cinco columnas numéricas
 * una al lado de la otra, las cifras de ancho variable hacen que los miles no
 * queden alineados y comparar dos filas de un vistazo se vuelve imposible.
 */
const claseNumero = `${claseCelda} text-right tabular-nums`;

function ChipEstado({ estado }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${CLASE_CHIP[estado]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {ETIQUETA_ESTADO_PRECIO[estado]}
    </span>
  );
}

/**
 * Input compartido por las celdas de costo y coeficiente.
 *
 * Guarda al SALIR del campo (`blur`) y con Enter, nunca por tecla: un PATCH por
 * pulsación castigaría la base por nada y dejaría el valor a medio tipear
 * guardado en el catálogo.
 */
function CeldaEditable({ valor, onChange, onGuardar, etiqueta, ancho = "w-24 max-md:w-full" }) {
  return (
    <label className="flex items-center justify-end gap-1">
      <span className="sr-only">{etiqueta}</span>
      <input
        type="text"
        inputMode="decimal"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        onBlur={onGuardar}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") evento.currentTarget.blur();
        }}
        className={`${ancho} rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-right tabular-nums text-on-surface focus:border-primary focus:outline-none`}
      />
    </label>
  );
}

function AdminPrecios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paginaUrl = Number(searchParams.get("page"));
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;
  // Búsqueda y orden viven en la URL, igual que la página: un listado filtrado
  // se puede compartir y recargar. Mismo patrón que `AdminProductos`.
  const busqueda = searchParams.get("search") ?? "";
  const orden = searchParams.get("orden") ?? ORDEN_POR_DEFECTO;

  // Estado local para que cada tecla no escriba en la URL (y no dispare un
  // request). Se inicializa desde la URL: una caja vacía sobre una tabla
  // filtrada se lee como un bug.
  const [busquedaInput, setBusquedaInput] = useState(busqueda);
  // Último valor que el input emitió o adoptó. Comparar contra él distingue "el
  // admin está tipeando" de "la URL cambió por navegación" — sin eso, volver a
  // esta ruta sin `?search=` no desmonta el componente y el debounce reescribe
  // el término 350 ms después, resucitando un filtro que se acababa de limpiar.
  const ultimoCommit = useRef(busqueda);

  const [productos, setProductos] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);

  /**
   * Ediciones sin guardar, por id de producto: `{ [id]: { costo, coeficiente } }`.
   *
   * Vive aparte de `productos` y no mezclado con la fila del servidor: así se
   * sabe siempre qué está tocado y qué vino de la base, y recargar la página
   * descarta borradores sin tener que reconciliar nada.
   */
  const [borradores, setBorradores] = useState({});
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [filtro, setFiltro] = useState(null);
  const [coeficienteMasivo, setCoeficienteMasivo] = useState("");
  const [confirmacion, setConfirmacion] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [informe, setInforme] = useState(null);
  /** Ids con un PATCH de costeo en vuelo, para no disparar dos por el mismo campo. */
  const [guardando, setGuardando] = useState(() => new Set());

  // `useDialogo` DEVUELVE el ref (foco inicial, trampa de foco, Escape y
  // restauración al cerrar); no lo recibe.
  const dialogoRef = useDialogo({
    abierto: confirmacion !== null,
    onCerrar: () => setConfirmacion(null),
  });

  function irAPagina(numero, { reemplazar = false } = {}) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (numero <= 1) next.delete("page");
        else next.set("page", String(numero));
        return next;
      },
      { replace: reemplazar },
    );
  }

  /**
   * Escribe búsqueda u orden en la URL.
   *
   * Se borra `page` porque la página 3 del listado anterior puede no existir en
   * el nuevo, y quedarse ahí mostraría una tabla vacía como si el filtro no
   * encontrara nada. Va con `replace`: refinar una búsqueda es seguir en el
   * mismo lugar, no navegar a otro — sin eso, cada tecla comiteada apila una
   * entrada de historial y "atrás" necesitaría un click por letra para salir.
   */
  function escribirFiltro(clave, valor) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) next.set(clave, valor);
        else next.delete(clave);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  // La URL cambió por afuera del input (navegación, Atrás): el input la adopta.
  useEffect(() => {
    if (busqueda === ultimoCommit.current) return;
    ultimoCommit.current = busqueda;
    setBusquedaInput(busqueda);
  }, [busqueda]);

  // Debounce: el término llega a la URL —y al efecto de fetch— recién cuando el
  // admin deja de tipear. La guarda contra `ultimoCommit` evita el commit de
  // más del montaje y el rebote de un valor recién adoptado desde la URL.
  useEffect(() => {
    if (busquedaInput === ultimoCommit.current) return;

    const timeoutId = setTimeout(() => {
      ultimoCommit.current = busquedaInput;
      escribirFiltro("search", busquedaInput);
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaInput]);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getProducts({
      admin: true,
      page: pagina,
      pageSize: PRODUCTOS_POR_PAGINA,
      search: busqueda,
      orden,
    })
      .then(({ data, total: cantidad, pageSize }) => {
        if (!activo) return;
        setProductos(data);
        setTotal(cantidad);
        setTotalPaginas(Math.max(1, Math.ceil(cantidad / pageSize)));
        // Cambiar de página, de búsqueda o de orden limpia la selección y los
        // borradores: las filas cambian bajo los pies, y aplicar sobre filas que
        // ya no se ven es el accidente que un checkbox puede causar.
        setSeleccionados(new Set());
        setBorradores({});
        setError(null);
        setCargando(false);
      })
      .catch(() => {
        if (!activo) return;
        // Distinguir "falló la carga" de "no hay nada": un catch que solo vacía
        // la lista haría leer un backend caído como un catálogo vacío.
        setError("No se pudieron cargar los precios. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [pagina, busqueda, orden, reintento]);

  // Una página fuera de rango se corrige a la última real, con `replace` para
  // que "atrás" no vuelva a ella y la corrección se repita para siempre.
  useEffect(() => {
    if (cargando) return;
    if (pagina > totalPaginas) irAPagina(totalPaginas, { reemplazar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, pagina, totalPaginas]);

  /**
   * Cada producto con su borrador aplicado y el cálculo ya resuelto.
   *
   * El cálculo sale de `utils/precios.js`, espejo manual del módulo del
   * backend: lo que se muestra acá es exactamente lo que se va a escribir al
   * aplicar.
   */
  const filas = useMemo(
    () =>
      productos.map((producto) => {
        const borrador = borradores[producto.id];
        const costo = borrador?.costo ?? costoCrudo(producto.costo);
        const coeficiente = borrador?.coeficiente ?? producto.coeficiente ?? "";
        const calculado = calcularPrecio(costo, coeficiente);

        return {
          ...producto,
          costo,
          // Solo para el input. El cálculo, el PATCH y la comparación de
          // "sin cambios" usan `costo`, que es el crudo.
          costoVisual: formatearPrecioInput(costo).formateado,
          coeficiente,
          calculado,
          editado: borrador !== undefined,
          estado: estadoDePrecio({ precio: producto.precio, costo, coeficiente }),
        };
      }),
    [productos, borradores],
  );

  /** ¿Esta fila entra en el filtro elegido? `null` = no hay filtro. */
  function cumpleFiltro(fila, clave) {
    if (clave === null) return true;
    if (clave === SIN_PRECIO_REAL) return esSinPrecioReal(fila);
    return fila.estado === clave;
  }

  const filasVisibles = filas.filter((fila) => cumpleFiltro(fila, filtro));
  // Un conteo por chip y no un mapa por estado: "Sin precio real" no es un
  // estado, así que no puede salir de agrupar por `fila.estado`.
  const conteoPorFiltro = useMemo(() => {
    const conteo = {};
    for (const { clave } of FILTROS) {
      conteo[clave] = filas.filter((fila) => cumpleFiltro(fila, clave)).length;
    }
    return conteo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas]);

  const idsVisibles = filasVisibles.map((fila) => fila.id);
  const haySeleccion = seleccionados.size > 0;
  const todosSeleccionados = idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.has(id));

  function alternarSeleccion(id) {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodos() {
    setSeleccionados(todosSeleccionados ? new Set() : new Set(idsVisibles));
  }

  function editar(id, campo, valor) {
    setBorradores((actual) => {
      const fila = filas.find((f) => f.id === id);
      return {
        ...actual,
        [id]: {
          costo: fila.costo,
          coeficiente: fila.coeficiente,
          ...actual[id],
          [campo]: valor,
        },
      };
    });
  }

  /** Descarta el borrador de una fila: lo que se ve pasa a ser lo del servidor. */
  function descartarBorrador(id) {
    setBorradores(({ [id]: _descartado, ...resto }) => resto);
  }

  /**
   * Persiste el borrador de una fila al salir del campo.
   *
   * Guardar el costo NO mueve el precio publicado — eso es un paso aparte. Por
   * eso la fila queda en "Difiere" después de guardar, que es exactamente lo
   * que tiene que pasar: el dato está, el precio todavía no se aplicó.
   *
   * **Un blur, un PATCH. No hay encadenado ni escrituras derivadas.** Hubo una
   * versión que, al resolver, releía el borrador vigente y mandaba otra vuelta
   * si había cambiado. Leía el borrador VIVO —el que se mueve con cada tecla—
   * sin ninguna prueba de que ese valor hubiera pasado por un blur, así que
   * borrar el coeficiente para retipearlo mientras el PATCH viajaba mandaba
   * `coeficiente: ""`; el backend mapea la cadena vacía a `null`
   * (`validarCostoYCoeficiente`), y el producto caía a "Sin costo" sin un solo
   * error. Es exactamente lo que el contrato de `CeldaEditable` prohíbe nueve
   * líneas más arriba: nunca se guarda un valor a medio tipear.
   */
  async function guardarCosteo(id) {
    // Un blur con el PATCH anterior todavía en vuelo NO dispara un segundo por
    // el mismo campo. Lo que se haya tipeado mientras tanto queda como borrador
    // a la vista —marcado "sin guardar"— y se escribe en el próximo blur; hasta
    // entonces `abrirConfirmacion` lo cuenta como pendiente y no previsualiza.
    if (guardando.has(id)) return;

    const borrador = borradores[id];
    if (!borrador) return;

    const original = productos.find((producto) => producto.id === id);
    const costo = String(borrador.costo ?? "");
    const coeficiente = String(borrador.coeficiente ?? "");
    // Los dos lados de la comparación tienen que estar en la MISMA forma. El
    // borrador guarda dígitos pelados; el del servidor pasa por `costoCrudo`
    // igual que en `filas`. Comparar contra el valor sin normalizar haría que
    // retipear el mismo número mande un PATCH que no cambia nada.
    const sinCambios =
      costo === costoCrudo(original?.costo) &&
      coeficiente === String(original?.coeficiente ?? "");
    if (sinCambios) {
      // El campo se tocó y volvió a su valor: se descarta el borrador en vez de
      // mandar un PATCH que no cambia nada. La fila queda sincronizada con el
      // backend y deja de bloquear la confirmación.
      descartarBorrador(id);
      return;
    }

    setGuardando((actual) => new Set(actual).add(id));
    try {
      const actualizado = await updateCosteo(id, { costo, coeficiente });
      // La fila se reemplaza por la respuesta del servidor: así lo de abajo del
      // borrador es lo guardado, no lo tipeado.
      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.id === id
            ? { ...producto, costo: actualizado.costo, coeficiente: actualizado.coeficiente }
            : producto,
        ),
      );

      // El borrador se descarta SOLO si sigue siendo el que se acaba de
      // persistir. Se lee por el actualizador de `setBorradores` y no del
      // closure porque este código corre después del await y el closure trae el
      // borrador del render que disparó el PATCH. Un descarte ciego se llevaría
      // puesto lo que se tipeó mientras el pedido viajaba —sin error y sin
      // aviso—; conservándolo, el valor sigue a la vista como "sin guardar" y
      // el próximo blur lo escribe.
      setBorradores((actual) => {
        const vigente = actual[id];
        if (!vigente) return actual;
        const esElPersistido =
          String(vigente.costo ?? "") === costo &&
          String(vigente.coeficiente ?? "") === coeficiente;
        if (!esElPersistido) return actual;
        const { [id]: _persistido, ...resto } = actual;
        return resto;
      });
    } catch (err) {
      // El borrador se conserva: perder lo tipeado por un error de red sería
      // peor que dejarlo a la vista para reintentar. Y mientras siga ahí, la
      // fila cuenta como pendiente y la confirmación no se abre — que es
      // justamente lo que hay que impedir, porque el backend tiene el costo
      // viejo y la previsualización mostraría un precio que no se va a escribir.
      setInforme({ error: mensajeDeError(err) });
    } finally {
      setGuardando((actual) => {
        const siguiente = new Set(actual);
        siguiente.delete(id);
        return siguiente;
      });
    }
  }

  /**
   * Vuelve a pedir la tabla, para ver lo que otro proceso escribió mientras
   * tanto — la skill de alta desde MercadoLibre carga productos por API, y hasta
   * ahora la única forma de verlos era recargar la página entera.
   *
   * **No refresca si hay algo sin guardar, y avisa nombrando las filas.** El
   * efecto de carga descarta los borradores junto con la selección, así que un
   * refetch a ciegas se llevaría puesto un costo a medio tipear. Es el mismo
   * criterio —y el mismo mensaje— que ya usa `abrirConfirmacion`: en esta
   * pantalla lo que se pierde es plata, así que se frena y se dice qué falta,
   * en vez de pisar en silencio.
   *
   * `guardando` cubre además el PATCH en vuelo: su respuesta llega DESPUÉS y
   * reescribe la fila, así que refrescar en el medio mostraría el valor viejo
   * por un instante y el nuevo un momento más tarde, sin que nadie lo pidiera.
   */
  function refrescar() {
    const pendientes = filas.filter((fila) => fila.editado || guardando.has(fila.id));
    if (pendientes.length > 0) {
      setInforme({
        error: `Hay costos sin guardar (${pendientes
          .map((fila) => fila.nombre)
          .join(", ")}). Se guardan al salir del campo: esperá a que terminen y volvé a intentar.`,
      });
      return;
    }
    setInforme(null);
    setReintento((n) => n + 1);
  }

  /**
   * Arma la vista previa antes → después. Es un paso obligatorio y no una
   * cortesía: cambiar 40 precios del catálogo público sin ver qué pasa es la
   * diferencia entre una herramienta y un accidente.
   *
   * **No abre nada mientras una fila seleccionada tenga un costo que el backend
   * NO tenga**, y esa guarda es la que sostiene el contrato del módulo ("lo que
   * se muestra acá es exactamente lo que se va a escribir al aplicar"). La
   * previsualización se arma con `filas`, que ya llevan los borradores
   * aplicados; el backend, en cambio, recalcula desde el `costo`/`coeficiente`
   * PERSISTIDOS, porque `precios-masivo` solo recibe `{ids, coeficiente}`. Con
   * un borrador en el medio esos dos números son distintos y el admin aprueba
   * un precio que el sistema no va a escribir.
   *
   * **Es SÍNCRONA y bloquea; no espera ningún guardado.** Tiene un costo
   * conocido y aceptado: `CeldaEditable` guarda al salir del campo, así que el
   * click en "Actualizar precios" ES ese blur, y el primer click del flujo
   * normal se rechaza —cartel y segundo click— porque cuando corre este handler
   * el PATCH recién sale. Se probó la alternativa (esperar las promesas en
   * vuelo) y el precio fue peor: para saber qué esperar hacía falta leer el
   * borrador vivo desde una promesa ya en curso, y por ahí se coló un
   * `coeficiente: ""` que nulea la columna. Fricción a cambio de que ningún
   * valor a medio tipear llegue nunca al catálogo.
   */
  function abrirConfirmacion() {
    const seleccionadas = filas.filter((fila) => seleccionados.has(fila.id));

    // `fila.editado` cubre el borrador sin escribir —incluido el que quedó de un
    // PATCH que falló, que a propósito no se descarta— y `guardando` cubre el
    // que se está escribiendo ahora mismo. Con las dos en cero, para toda fila
    // seleccionada `filas` no tiene borrador aplicado y sus números son
    // exactamente los que devolvió el servidor.
    const pendientes = seleccionadas.filter((fila) => fila.editado || guardando.has(fila.id));
    // Se nombra qué quedó afuera: un "hay cambios sin guardar" a secas obliga a
    // barrer la tabla a mano para encontrarlos.
    if (pendientes.length > 0) {
      setInforme({
        error: `Hay costos sin guardar en la selección (${pendientes
          .map((fila) => fila.nombre)
          .join(", ")}). Se guardan al salir del campo: esperá a que terminen y volvé a intentar.`,
      });
      return;
    }

    // El informe anterior queda tapado por el diálogo: dejarlo en pantalla
    // haría que el aviso de un intento bloqueado siga leyéndose como vigente
    // cuando ya se resolvió.
    setInforme(null);

    const coeficienteOverride = coeficienteMasivo.trim();

    const lineas = seleccionadas.map((fila) => {
      const coeficiente = coeficienteOverride || fila.coeficiente;
      const nuevo = calcularPrecio(fila.costo, coeficiente);
      return {
        id: fila.id,
        nombre: fila.nombre,
        sku: fila.sku,
        precioAnterior: fila.precio,
        precioNuevo: nuevo,
        sinCosto: nuevo === null,
        cambio: nuevo !== null && String(nuevo) !== String(Number(fila.precio)),
      };
    });

    setConfirmacion({ lineas, coeficiente: coeficienteOverride });
  }

  async function confirmar() {
    const aplicados = [...seleccionados];
    setAplicando(true);
    try {
      const respuesta = await aplicarPreciosMasivo(aplicados, {
        coeficiente: confirmacion.coeficiente || undefined,
      });
      setInforme(respuesta);
      setConfirmacion(null);
      setSeleccionados(new Set());
      setBorradores({});
      setCoeficienteMasivo("");
      setReintento((n) => n + 1);
    } catch (err) {
      // Por `mensajeDeError` y no por `err.message` pelado, por dos razones a la
      // vez: un throw que no es `Error` deja `informe.error` en `undefined` y el
      // panel renderiza la rama de ÉXITO ("Se actualizaron undefined precios."),
      // y si además `err` es nulo, leerle `.message` lanza DENTRO del catch —
      // el rechazo escapa de un `onClick` async, que nadie atrapa, y el diálogo
      // se queda abierto con "Confirmar" vivo y sin una sola señal en pantalla.
      setInforme({ error: mensajeDeError(err) });
      setConfirmacion(null);
    } finally {
      setAplicando(false);
    }
  }

  const aCambiar = confirmacion?.lineas.filter((linea) => linea.cambio).length ?? 0;
  const sinCosto = confirmacion?.lineas.filter((linea) => linea.sinCosto).length ?? 0;

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Costos y precios</h1>
          <p className="font-body-md text-body-md mt-2 max-w-prose text-on-surface-variant">
            El precio de venta se calcula como costo × coeficiente, redondeado al peso. Se publica
            recién cuando lo aplicás.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* "Traer cambios" y no "Actualizar": abajo ya hay un "Actualizar
              precios" que hace algo muy distinto —publica al catálogo— y dos
              botones que empiezan igual en la misma pantalla se confunden. El
              que se toca por error no puede ser el que cambia precios. */}
          <BotonActualizar
            onActualizar={refrescar}
            actualizando={cargando}
            etiqueta="Traer cambios"
          />
          <Link
            to="/catalogo/admin/productos"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Productos
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-lg bg-error-container px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-md text-body-md text-on-error-container">{error}</p>
          <button
            type="button"
            onClick={() => setReintento((n) => n + 1)}
            className="font-label-md text-label-md shrink-0 rounded-lg border border-on-error-container px-4 py-2 uppercase tracking-widest text-on-error-container hover:bg-error-container"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {informe ? (
        <div
          role="status"
          className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
        >
          {informe.error ? (
            <p className="font-body-md text-body-md text-on-surface">{informe.error}</p>
          ) : (
            <>
              <p className="font-body-md text-body-md text-on-surface">
                {informe.actualizados === 1
                  ? "Se actualizó 1 precio."
                  : `Se actualizaron ${informe.actualizados} precios.`}
              </p>
              {informe.rechazados?.length > 0 ? (
                <ul className="font-body-md text-body-md mt-2 list-disc pl-5 text-on-surface-variant">
                  {informe.rechazados.map((rechazado) => (
                    <li key={rechazado.id}>
                      {rechazado.nombre ?? `Producto ${rechazado.id}`} — {rechazado.motivo}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={() => setInforme(null)}
            className="font-label-md text-label-md mt-2 uppercase tracking-widest text-primary hover:underline"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {/* Un solo campo para nombre, SKU y categoría — el backend une los tres
          con OR. Mismo criterio que el buscador de Productos: el admin no tiene
          por qué declarar en qué campo está tipeando. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="buscar-precios" className="sr-only">
          Buscar productos por nombre, SKU o categoría
        </label>
        <div className="relative w-full max-w-md">
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="buscar-precios"
            type="search"
            value={busquedaInput}
            onChange={(evento) => setBusquedaInput(evento.target.value)}
            placeholder="Buscar por nombre, SKU o categoría…"
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface py-3 pl-11 pr-4 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        {/* El orden lo resuelve el backend sobre el catálogo entero, no un
            `sort()` sobre las cien filas cargadas — ver `ORDENES`. Sin debounce
            a propósito: un `<select>` emite una sola vez por selección. */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <label
            htmlFor="orden-precios"
            className="font-label-sm text-label-sm shrink-0 uppercase tracking-widest text-on-surface-variant"
          >
            Ordenar por
          </label>
          <select
            id="orden-precios"
            value={orden}
            onChange={(evento) => escribirFiltro("orden", evento.target.value)}
            className="font-body-md text-body-md rounded-lg border border-outline-variant bg-surface px-3 py-3 text-on-surface focus:border-primary focus:outline-none"
          >
            {ORDENES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* El filtro por estado es lo que vuelve usable la pantalla: la pregunta
          real, todos los meses, es "cuáles quedaron desactualizados". */}
      {!cargando && !error && filas.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTROS.map(({ clave, etiqueta }) => {
            const cantidad = conteoPorFiltro[clave] ?? 0;
            const activo = filtro === clave;
            return (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(clave)}
                className={`font-label-md text-label-md rounded-lg border px-4 py-2 uppercase tracking-widest ${
                  activo
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-outline"
                }`}
              >
                {etiqueta} ({cantidad})
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Los CHIPS y sus conteos miran solo la página cargada; la búsqueda y el
          orden, en cambio, los resuelve la base sobre el catálogo entero. La
          diferencia no es caprichosa: `Difiere` es una expresión derivada
          (`precio ≠ costo × coeficiente`), no una columna, así que no se puede
          bajar a la consulta sin SQL crudo.

          Con el catálogo entero en una página el número es completo; en cuanto
          hay más de una, decirlo es la diferencia entre un número parcial y un
          número que miente. Mismo criterio que los avisos de
          `historico.recortado` de analytics. */}
      {!cargando && !error && totalPaginas > 1 ? (
        <Advertencia titulo="Vista parcial">
          Hay {total} productos y esta pantalla trabaja de a {PRODUCTOS_POR_PAGINA}. La búsqueda y
          el orden recorren el catálogo entero, pero los chips de estado, sus conteos y la selección
          aplican solo a esta página.
        </Advertencia>
      ) : null}

      {haySeleccion ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
          <span className="font-body-md text-body-md text-on-surface">
            {seleccionados.size} {seleccionados.size === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <label className="font-body-md text-body-md flex items-center gap-2 text-on-surface-variant">
            Coeficiente
            <input
              type="text"
              inputMode="decimal"
              value={coeficienteMasivo}
              onChange={(evento) => setCoeficienteMasivo(evento.target.value)}
              placeholder="el de cada uno"
              className="w-36 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-right tabular-nums text-on-surface focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={abrirConfirmacion}
            className="font-label-md text-label-md rounded-lg bg-primary px-5 py-2.5 uppercase tracking-widest text-on-primary hover:opacity-90"
          >
            Actualizar precios
          </button>
          <button
            type="button"
            onClick={() => setSeleccionados(new Set())}
            className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:underline"
          >
            Limpiar selección
          </button>
        </div>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando precios…</p>
        </div>
      ) : error ? null : filas.length === 0 ? (
        // "Todavía no hay productos" sería falso con una búsqueda activa: los
        // productos están, la búsqueda no los alcanza. Decir lo contrario manda
        // al admin a cargar algo que ya tiene cargado.
        busqueda ? (
          <EstadoVacio
            icono="search_off"
            titulo="Sin resultados"
            mensaje={`Ningún producto coincide con "${busqueda}". Probá con otro nombre, SKU o categoría.`}
          />
        ) : (
          <EstadoVacio
            icono="sell"
            titulo="Todavía no hay productos"
            mensaje="Cuando cargues productos vas a poder manejar sus costos y precios desde acá."
          />
        )
      ) : filasVisibles.length === 0 ? (
        <EstadoVacio
          icono="filter_alt_off"
          titulo="Ningún producto en este estado"
          mensaje="Probá con otro filtro."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
          <table
            role="table"
            className={`${claseTablaApilada} w-full min-w-[980px] text-left text-[13px] xl:text-sm`}
          >
            <thead role="rowgroup">
              <tr role="row" className="border-b border-outline-variant">
                <th role="columnheader" className="px-2 py-2 xl:px-3 xl:py-3">
                  {/* El `<label>` amplía el área táctil a ~44px con un margen
                      negativo que compensa su propio padding, sin mover el
                      layout. Tiene que quedar SIN texto: si llevara contenido,
                      el nombre accesible del checkbox dejaría de ser su
                      `aria-label` y los tests por nombre se romperían. */}
                  <label className="-m-3 inline-flex p-3">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los productos de esta página"
                      checked={todosSeleccionados}
                      // `indeterminate` no existe como atributo HTML, solo como
                      // propiedad del nodo: se setea por ref o no se ve nunca.
                      ref={(nodo) => {
                        if (nodo) nodo.indeterminate = haySeleccion && !todosSeleccionados;
                      }}
                      onChange={alternarTodos}
                      className="size-5 accent-primary"
                    />
                  </label>
                </th>
                <th role="columnheader" className={claseEncabezado}>Foto</th>
                <th role="columnheader" className={claseEncabezado}>SKU / Producto</th>
                <th role="columnheader" className={`${claseEncabezado} text-right`}>Costo</th>
                <th role="columnheader" className={`${claseEncabezado} text-right`}>Coef.</th>
                <th role="columnheader" className={`${claseEncabezado} text-right`}>Calculado</th>
                <th role="columnheader" className={`${claseEncabezado} text-right`}>Vigente</th>
                <th role="columnheader" className={claseEncabezado}>Estado</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filasVisibles.map((fila) => (
                <tr key={fila.id} role="row" className="border-b border-outline-variant last:border-b-0">
                  <td role="cell" data-celda="control" className={claseCelda}>
                    {/* Ver el comentario del checkbox del encabezado: el
                        `<label>` tiene que quedar sin texto. */}
                    <label className="-m-3 inline-flex p-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${fila.nombre}`}
                        checked={seleccionados.has(fila.id)}
                        onChange={() => alternarSeleccion(fila.id)}
                        className="size-5 accent-primary"
                      />
                    </label>
                  </td>
                  {/* La portada, para reconocer el producto sin leer el SKU.
                      Sin link, por lo mismo que el nombre de al lado. */}
                  <td role="cell" data-celda="control" className={claseCelda}>
                    {fila.fotos?.[0]?.url ? (
                      <img
                        src={fila.fotos[0].url}
                        alt={fila.nombre}
                        className="h-9 w-9 rounded-lg object-cover xl:h-12 xl:w-12"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        data-testid={`sin-foto-${fila.id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant xl:h-12 xl:w-12"
                      >
                        <span className="material-symbols-outlined text-[16px] xl:text-[20px]">
                          image
                        </span>
                      </div>
                    )}
                  </td>
                  {/* SKU y nombre son SOLO identificación, sin link. Esta
                      pantalla se trabaja de corrido, tabulando entre celdas de
                      costo y coeficiente: un enlace en el medio de la fila se
                      lleva el foco y saca de la tabla a mitad de la carga. */}
                  <td role="cell" data-celda="identidad" className={claseCelda}>
                    <span className="block font-mono text-[11px] uppercase text-on-surface-variant">
                      {fila.sku}
                    </span>
                    <span className="text-on-surface">{fila.nombre}</span>
                  </td>
                  <td role="cell" data-label="Costo" className={claseNumero}>
                    {/* Se muestra formateado y se guarda pelado: `editar`
                        recibe el crudo que devuelve `formatearPrecioInput`.
                        El coeficiente de al lado NO pasa por acá — es el único
                        campo con decimales del sistema y este formateo
                        convertiría un 2,05 en 205. */}
                    <CeldaEditable
                      valor={fila.costoVisual}
                      onChange={(valor) =>
                        editar(fila.id, "costo", formatearPrecioInput(valor).crudo)
                      }
                      onGuardar={() => guardarCosteo(fila.id)}
                      etiqueta={`Costo de ${fila.nombre}`}
                    />
                  </td>
                  <td role="cell" data-label="Coef." className={claseNumero}>
                    <CeldaEditable
                      valor={fila.coeficiente}
                      onChange={(valor) => editar(fila.id, "coeficiente", valor)}
                      onGuardar={() => guardarCosteo(fila.id)}
                      etiqueta={`Coeficiente de ${fila.nombre}`}
                      ancho="w-20 max-md:w-full"
                    />
                  </td>
                  <td role="cell" data-label="Calculado" className={`${claseNumero} text-on-surface`}>
                    {fila.calculado === null ? (
                      <span className="text-on-surface-variant">—</span>
                    ) : (
                      formatPrecio(String(fila.calculado))
                    )}
                  </td>
                  <td role="cell" data-label="Vigente" className={`${claseNumero} text-on-surface-variant`}>
                    {formatPrecio(fila.precio)}
                  </td>
                  <td role="cell" data-label="Estado" className={claseCelda}>
                    <ChipEstado estado={fila.estado} />
                    {guardando.has(fila.id) ? (
                      <span className="font-label-sm text-label-sm mt-1 block text-on-surface-variant">
                        guardando…
                      </span>
                    ) : fila.editado ? (
                      <span className="font-label-sm text-label-sm mt-1 block text-on-surface-variant">
                        sin guardar
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && !error && filas.length > 0 ? (
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={irAPagina}
          etiqueta="Paginación de precios"
        />
      ) : null}

      {confirmacion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4">
          <div
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-precios"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-surface-container-lowest p-6 shadow-ambient"
          >
            <h2
              id="titulo-confirmar-precios"
              className="font-headline-md text-headline-md text-on-surface"
            >
              Confirmar precios
            </h2>
            <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
              {aCambiar === 0
                ? "Ningún precio cambia con esta selección."
                : `Se van a modificar ${aCambiar} de ${confirmacion.lineas.length} precios.`}
              {confirmacion.coeficiente
                ? ` Coeficiente aplicado: ${confirmacion.coeficiente}.`
                : ""}
            </p>

            <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-outline-variant">
              <table className="w-full text-left text-[13px]">
                <tbody>
                  {confirmacion.lineas.map((linea) => (
                    <tr key={linea.id} className="border-b border-outline-variant last:border-b-0">
                      <td className="px-3 py-2 text-on-surface">
                        <span className="block font-mono text-[11px] uppercase text-on-surface-variant">
                          {linea.sku}
                        </span>
                        {linea.nombre}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                        {formatPrecio(linea.precioAnterior)}
                      </td>
                      <td className="px-3 py-2 text-center text-on-surface-variant" aria-hidden="true">
                        →
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {linea.sinCosto ? (
                          <span className="text-on-surface-variant">sin costo</span>
                        ) : linea.cambio ? (
                          <span className="font-semibold text-primary">
                            {formatPrecio(String(linea.precioNuevo))}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">sin cambio</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sinCosto > 0 ? (
              <p className="font-body-md text-body-md mt-3 text-on-surface-variant">
                {sinCosto} {sinCosto === 1 ? "producto no tiene" : "productos no tienen"} costo y
                coeficiente cargados. {sinCosto === 1 ? "Se va" : "Se van"} a omitir.
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmacion(null)}
                className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-2.5 uppercase tracking-widest text-on-surface-variant hover:border-outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={aplicando || aCambiar === 0}
                className="font-label-md text-label-md rounded-lg bg-primary px-5 py-2.5 uppercase tracking-widest text-on-primary hover:opacity-90 disabled:opacity-50"
              >
                {aplicando ? "Aplicando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default AdminPrecios;
