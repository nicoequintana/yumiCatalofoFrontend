import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import EditorPromocion from "../../components/admin/promociones/EditorPromocion.jsx";
import SeccionBannerPromocion from "../../components/admin/promociones/SeccionBannerPromocion.jsx";
import TablaComercial from "../../components/admin/promociones/TablaComercial.jsx";
import AlertaConflictos from "../../components/admin/promociones/AlertaConflictos.jsx";
import { claseCelda, claseEncabezado } from "../../components/admin/clasesTabla.js";
import { useTablaAdmin } from "../../hooks/useTablaAdmin.js";
import {
  actualizarPromocion,
  crearPromocion,
  cambiarEstadoItem,
  eliminarPromocion,
  getConflictos,
  getListadoComercial,
  getPromocion,
  getPromociones,
  guardarArtePromocion,
  guardarItemsPromocion,
  quitarArtePromocion,
} from "../../api/promociones.js";
import { getCategorias } from "../../api/categorias.js";
import { getEtiquetas } from "../../api/products.js";

/**
 * ADMIN → Promociones: QUÉ productos tienen QUÉ descuento.
 *
 * SOLO ESCRITORIO: la tabla comercial tiene diez columnas y no hay forma
 * honesta de mostrarla en un celular.
 *
 * ES UN MÓDULO APARTE DE CAMPAÑAS, y la separación no es de pantallas sino de
 * ACCIONES: **acá no se programa nada.** No hay fechas, no hay un botón de
 * "activar ahora", y el backend rechaza un body que traiga fechas. Una
 * promoción define el descuento; el calendario define cuándo se aplica.
 *
 * LAYOUT: arriba las promociones con su editor, abajo el listado comercial —
 * que es a la vez la pantalla de análisis del §14 y el lugar de donde se eligen
 * los productos. Las dos mitades se hablan: seleccionar filas abajo y tocar
 * "Agregar" las suma a la promoción abierta arriba.
 */

/** Descuento con el que entra un producto nuevo. El mínimo del rango. */
const PORCENTAJE_INICIAL = 5;

export default function AdminPromociones() {
  const [promociones, setPromociones] = useState([]);
  const [abierta, setAbierta] = useState(null);
  const [comercial, setComercial] = useState({ data: [], page: 1, total: 0, pageSize: 20 });
  const [conflictos, setConflictos] = useState([]);

  // El estado compartido de la tabla —página, selección múltiple y el escape
  // hatch de `searchParams` para los filtros propios— vive en `useTablaAdmin`,
  // mismo patrón que `AdminProductos` y `AdminPrecios`. Esta pantalla NO
  // ordena (ver el §14 del pedido: dos columnas se calculan en memoria
  // DESPUÉS de paginar, así que ordenar por ellas daría un ranking falso), así
  // que se llama SIN `ordenPorDefecto` y no se usan `busqueda`/`orden`.
  const { pagina, irAPagina, seleccionados, setSeleccionados, searchParams, setSearchParams } =
    useTablaAdmin();

  // Los DOS filtros propios de esta tabla —categoría y etiqueta— viven en la
  // URL, igual que en `AdminProductos`: un listado filtrado se comparte, se
  // recarga, y no se pierde al volver de abrir una promoción.
  const categoria = searchParams.get("categoria") ?? "";
  const etiqueta = searchParams.get("etiqueta") ?? "";

  // Opciones de los selects de filtro. Mismo criterio que `AdminProductos`:
  // las etiquetas salen de TODAS las creadas (no de una lista cerrada), cada
  // una con su conteo. Fallo blando a `[]`: filtrar sigue siendo posible por
  // URL, y la tabla —lo que esta pantalla existe para mostrar— no se entera.
  const [categorias, setCategorias] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([
      getPromociones(),
      getListadoComercial({ page: pagina, categoria: categoria || undefined, etiqueta: etiqueta || undefined }),
      getConflictos(),
    ])
      .then(([lista, listado, choques]) => {
        if (!activo) return;
        setPromociones(lista);
        setComercial(listado);
        setConflictos(choques);
        // Un fetch exitoso limpia el error anterior: si no, un problema de red
        // ya resuelto seguiría en pantalla sobre datos frescos.
        setError(null);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre.
      .catch((err) => {
        if (activo) setError(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [pagina, categoria, etiqueta]);

  // Las opciones de los selects se piden una sola vez, al montar. Mismo
  // patrón que `AdminProductos`: un fallo deja el select con "Todas" como
  // única opción, sin tocar la tabla de abajo.
  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const datos = await getCategorias();
        if (activo) setCategorias(Array.isArray(datos) ? datos : []);
      } catch {
        if (activo) setCategorias([]);
      }
      try {
        const datos = await getEtiquetas();
        if (activo) setEtiquetas(datos?.etiquetas ?? []);
      } catch {
        if (activo) setEtiquetas([]);
      }
    })();

    return () => {
      activo = false;
    };
  }, []);

  // La selección NO sobrevive a un cambio de los filtros: las filas cambian
  // bajo los pies, y ejecutar "Agregar a la promoción" sobre ids que ya no se
  // ven es el mismo accidente que `AdminProductos` evita con su efecto
  // equivalente. `useTablaAdmin` no lo cubre solo porque no conoce estos dos
  // filtros propios de esta pantalla.
  useEffect(() => {
    setSeleccionados(new Set());
  }, [categoria, etiqueta, setSeleccionados]);

  /**
   * Commitea un filtro propio de esta tabla (categoría o etiqueta) a la URL.
   * Mismo criterio que `cambiarFiltro` de `AdminProductos`: borra `page` (la
   * página 2 del resultado anterior puede no existir en el nuevo) y va con
   * `replace` porque filtrar es seguir en la misma pantalla. El valor vacío
   * quita el parámetro.
   */
  function cambiarFiltro(clave, valor) {
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

  /**
   * Ejecuta una mutación y refresca.
   *
   * **El refresco tiene su propio catch, con un mensaje DISTINTO.** Si la
   * escritura anduvo y la relectura falla, dejar caer el error en el catch de
   * arriba muestra el mensaje crudo de red —indistinguible de "no se guardó"—
   * y el admin repite una operación ya hecha.
   */
  async function conGuardado(operacion) {
    setGuardando(true);
    setError(null);
    try {
      await operacion();
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setGuardando(false);
    }

    try {
      const [lista, listado, choques] = await Promise.all([
        getPromociones(),
        getListadoComercial({
          page: pagina,
          categoria: categoria || undefined,
          etiqueta: etiqueta || undefined,
        }),
        getConflictos(),
      ]);
      setPromociones(lista);
      setComercial(listado);
      setConflictos(choques);
    } catch {
      setError(
        "La operación se guardó, pero no se pudo actualizar la pantalla. Recargá la página para ver el estado actual.",
      );
    }
    return true;
  }

  async function abrir(id) {
    setError(null);
    try {
      setAbierta(await getPromocion(id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function crear(evento) {
    evento.preventDefault();
    const nombre = nombreNueva.trim();
    if (!nombre) return;

    let creada = null;
    const ok = await conGuardado(async () => {
      creada = await crearPromocion({ nombre });
    });
    if (ok) {
      setNombreNueva("");
      setAbierta(creada);
    }
  }

  async function guardarItems(items) {
    await conGuardado(async () => {
      setAbierta(await guardarItemsPromocion(abierta.id, items));
    });
  }

  /**
   * El banner del carrusel. `datos` ya viene armado por
   * `SeccionBannerPromocion` con SOLO los cinco campos del banner — nunca con
   * `activa`, que es de otra acción (`alternarActiva`).
   *
   * ⚠️ **`nombre` y `descripcion` van SIEMPRE, aunque esta acción no los
   * toque** — y son DOS motivos distintos, no el mismo repetido:
   *
   * - `nombre`: `parsearNombre` del backend EXIGE la clave en todo `PUT` —una
   *   promoción sin nombre no es un estado válido— así que un body sin
   *   `nombre` responde 400 "El nombre de la promoción es obligatorio",
   *   incluso si lo único que se quiso cambiar fue el banner. Falla RUIDOSO:
   *   se nota en el acto.
   * - `descripcion`: acá el peligro es el opuesto. `parsearDescripcion`
   *   trata la clave AUSENTE igual que `null` —no distingue "no la toques"
   *   de "bórrala", a diferencia de las cinco claves del banner— así que un
   *   `PUT` sin `descripcion` la BORRA en silencio, sin 400 y sin aviso.
   *   Reenviarla acá no es cortesía: es lo único que evita que guardar el
   *   banner le vacíe la nota interna a la promoción.
   *
   * Mismo motivo por el que `alternarActiva` también re-manda las dos.
   */
  async function guardarBanner(datos) {
    await conGuardado(async () => {
      setAbierta(
        await actualizarPromocion(abierta.id, {
          nombre: abierta.nombre,
          descripcion: abierta.descripcion,
          ...datos,
        }),
      );
    });
  }

  async function subirArteBanner(archivo) {
    await conGuardado(async () => {
      setAbierta(await guardarArtePromocion(abierta.id, archivo));
    });
  }

  async function quitarArteBanner() {
    await conGuardado(async () => {
      setAbierta(await quitarArtePromocion(abierta.id));
    });
  }

  /**
   * Suma los productos seleccionados a la promoción abierta.
   *
   * Entran con el descuento MÍNIMO y no con uno inventado: el paso siguiente es
   * ponerles el que corresponde, y un default alto sería un descuento que nadie
   * decidió esperando a que alguien se olvide de mirarlo.
   */
  async function agregarSeleccionados() {
    const yaEstan = new Set(abierta.items.map((i) => i.productId));
    const nuevos = [...seleccionados].filter((id) => !yaEstan.has(id));

    const items = [
      ...abierta.items.map((i) => ({ productId: i.productId, porcentaje: i.porcentaje })),
      ...nuevos.map((productId) => ({ productId, porcentaje: PORCENTAJE_INICIAL })),
    ];

    const ok = await conGuardado(async () => {
      setAbierta(await guardarItemsPromocion(abierta.id, items));
    });
    if (ok) setSeleccionados(new Set());
  }

  async function quitar(productId) {
    await conGuardado(async () => {
      const items = abierta.items
        .filter((i) => i.productId !== productId)
        .map((i) => ({ productId: i.productId, porcentaje: i.porcentaje }));
      setAbierta(await guardarItemsPromocion(abierta.id, items));
    });
  }

  async function alternarActiva(promocion) {
    await conGuardado(async () => {
      const actualizada = await actualizarPromocion(promocion.id, {
        nombre: promocion.nombre,
        descripcion: promocion.descripcion,
        activa: !promocion.activa,
      });
      setAbierta((actual) => (actual?.id === promocion.id ? actualizada : actual));
    });
  }

  async function eliminar(id) {
    const ok = await conGuardado(() => eliminarPromocion(id));
    if (ok) {
      setConfirmandoBorrado(null);
      if (abierta?.id === id) setAbierta(null);
    }
  }

  /**
   * Resuelve un conflicto: la elegida manda, las otras se apagan PARA ESE
   * PRODUCTO y siguen funcionando para todos los demás.
   *
   * **No se reactivan solas** cuando la ganadora termina: volver atrás es un
   * click explícito desde el editor de la promoción.
   */
  async function resolverConflicto(conflicto, ganadoraId) {
    const perdedoras = conflicto.promociones.filter((p) => p.id !== ganadoraId);
    await conGuardado(async () => {
      for (const perdedora of perdedoras) {
        await cambiarEstadoItem(perdedora.id, conflicto.productId, false);
      }
      // El editor abierto puede ser una de las que se acaba de apagar.
      if (abierta) setAbierta(await getPromocion(abierta.id));
    });
  }

  function alternarSeleccion(id) {
    setSeleccionados((actuales) => {
      const siguiente = new Set(actuales);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const totalPaginas = Math.max(1, Math.ceil(comercial.total / comercial.pageSize));

  return (
    <SoloEscritorio titulo="Promociones">
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6">
          <BotonVolver fallback="/catalogo/admin/productos" />
        </div>

        <div className="mb-10">
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Promociones</h1>
          <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
            Qué productos tienen qué descuento. <strong>Acá no se programan fechas</strong>: una
            promoción se aplica cuando la programás desde el calendario de Campañas.
          </p>
        </div>

        {error ? (
          <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            {error}
          </p>
        ) : null}

        {cargando ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Spinner className="h-8 w-8 text-on-surface-variant" />
            <span className="font-body-md text-body-md text-on-surface-variant">
              Cargando promociones…
            </span>
          </div>
        ) : (
          <>
            <AlertaConflictos
              conflictos={conflictos}
              guardando={guardando}
              onResolver={resolverConflicto}
            />

            <section aria-labelledby="titulo-promociones" className="mb-10">
              <h2
                id="titulo-promociones"
                className="font-headline-sm text-headline-sm mb-4 text-primary"
              >
                Promociones
              </h2>

              <form onSubmit={crear} className="mb-4 flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="nombre-promocion"
                    className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
                  >
                    Nueva promoción
                  </label>
                  <input
                    id="nombre-promocion"
                    type="text"
                    maxLength={120}
                    value={nombreNueva}
                    onChange={(e) => setNombreNueva(e.target.value)}
                    placeholder="Promo Hogar"
                    className="w-72 rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardando || nombreNueva.trim() === ""}
                  className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  Crear
                </button>
              </form>

              {promociones.length === 0 && !error ? (
                <EstadoVacio
                  icono="sell"
                  titulo="Todavía no hay promociones"
                  mensaje="Creá una arriba y después elegí sus productos de la tabla de abajo."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <table role="table" className="w-full">
                    <thead role="rowgroup">
                      <tr
                        role="row"
                        className="border-b border-outline-variant bg-surface-container-low text-left"
                      >
                        <th role="columnheader" className={claseEncabezado}>Promoción</th>
                        <th role="columnheader" className={`${claseEncabezado} text-right`}>Productos</th>
                        <th role="columnheader" className={claseEncabezado}>Estado</th>
                        <th role="columnheader" className={`${claseEncabezado} text-right`}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {promociones.map((promocion) => (
                        <tr
                          key={promocion.id}
                          role="row"
                          className={`border-b border-outline-variant last:border-b-0 ${
                            abierta?.id === promocion.id ? "bg-surface-container" : ""
                          }`}
                        >
                          <td role="cell" className={claseCelda}>
                            <button
                              type="button"
                              onClick={() => abrir(promocion.id)}
                              className="text-left text-primary hover:underline"
                            >
                              {promocion.nombre}
                            </button>
                          </td>
                          <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                            {promocion.cantidadProductos}
                          </td>
                          <td role="cell" className={claseCelda}>
                            {/* Las dos preguntas que importan mirando la lista:
                                si está archivada, y si el calendario la está
                                usando. Sin programación no le llega a nadie. */}
                            <span className="flex flex-wrap gap-2">
                              <span
                                className={`font-label-sm text-label-sm rounded-full px-3 py-1 ${
                                  promocion.activa
                                    ? "bg-secondary-container text-on-secondary-container"
                                    : "bg-surface-container text-on-surface-variant line-through"
                                }`}
                              >
                                {promocion.activa ? "Activa" : "Archivada"}
                              </span>
                              <span
                                className={`font-label-sm text-label-sm rounded-full px-3 py-1 ${
                                  promocion.programada
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container text-on-surface-variant"
                                }`}
                                title={
                                  promocion.programada
                                    ? "El calendario la está usando."
                                    : "Sin programar no se aplica a nadie."
                                }
                              >
                                {promocion.programada ? "Programada" : "Sin programar"}
                              </span>
                            </span>
                          </td>
                          <td role="cell" className={`${claseCelda} text-right`}>
                            {confirmandoBorrado === promocion.id ? (
                              <span className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={guardando}
                                  onClick={() => eliminar(promocion.id)}
                                  className="font-label-sm text-label-sm rounded-lg bg-error px-3 py-2 uppercase tracking-widest text-on-error disabled:opacity-60"
                                >
                                  Sí, eliminar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmandoBorrado(null)}
                                  className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <span className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={guardando}
                                  onClick={() => alternarActiva(promocion)}
                                  className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                                >
                                  {promocion.activa ? "Archivar" : "Reactivar"}
                                </button>
                                <button
                                  type="button"
                                  disabled={guardando}
                                  onClick={() => setConfirmandoBorrado(promocion.id)}
                                  className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                                >
                                  Eliminar
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {abierta ? (
                <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      {abierta.nombre}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAbierta(null)}
                      aria-label="Cerrar la promoción"
                      className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
                        close
                      </span>
                    </button>
                  </div>
                  <EditorPromocion
                    promocion={abierta}
                    guardando={guardando}
                    onGuardarItems={guardarItems}
                    onQuitar={quitar}
                  />

                  <div className="mt-6">
                    <SeccionBannerPromocion
                      promocion={abierta}
                      guardando={guardando}
                      onGuardar={guardarBanner}
                      onSubirArte={subirArteBanner}
                      onQuitarArte={quitarArteBanner}
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section aria-labelledby="titulo-comercial">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2
                    id="titulo-comercial"
                    className="font-headline-sm text-headline-sm text-primary"
                  >
                    Productos
                  </h2>
                  <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
                    Qué se mira, qué se vende y a qué precio. Ordenado por vistas.
                  </p>
                </div>

                {/* La acción que une las dos mitades de la pantalla. */}
                <button
                  type="button"
                  disabled={guardando || !abierta || seleccionados.size === 0}
                  onClick={agregarSeleccionados}
                  title={abierta ? undefined : "Abrí una promoción de arriba para poder agregar."}
                  className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {abierta
                    ? `Agregar ${seleccionados.size} a “${abierta.nombre}”`
                    : "Agregar a una promoción"}
                </button>
              </div>

              {/* Molde EXACTO de los filtros de `AdminProductos` (categoría y
                  etiqueta): mismo markup, mismas clases, misma forma de
                  cargar las opciones. Sin el tercer filtro de stock, que esta
                  pantalla no tiene, y sin el select de orden: acá NO se
                  ordena. */}
              <div className="mb-4 grid max-w-xl grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="filtro-categoria"
                    className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    Categoría
                  </label>
                  <select
                    id="filtro-categoria"
                    value={categoria}
                    onChange={(e) => cambiarFiltro("categoria", e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="filtro-etiqueta"
                    className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
                  >
                    Etiqueta
                  </label>
                  <select
                    id="filtro-etiqueta"
                    value={etiqueta}
                    onChange={(e) => cambiarFiltro("etiqueta", e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {etiquetas.map((et) => (
                      <option key={et.id} value={String(et.id)}>
                        {et.nombre} ({et.cantidadProductos})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <TablaComercial
                filas={comercial.data}
                seleccionados={seleccionados}
                onAlternar={alternarSeleccion}
                guardando={guardando}
              />

              {totalPaginas > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => irAPagina(pagina - 1)}
                    className="font-label-md text-label-md rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    Página {pagina} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() => irAPagina(pagina + 1)}
                    className="font-label-md text-label-md rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </SoloEscritorio>
  );
}
