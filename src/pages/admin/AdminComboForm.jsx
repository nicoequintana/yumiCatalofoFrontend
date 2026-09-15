import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useComboEditor from "../../hooks/useComboEditor.js";
import useGuardaSalida from "../../hooks/useGuardaSalida.js";
import useDialogo from "../../hooks/useDialogo.js";
import { useToast } from "../../context/useToast.js";
import TarjetaCombo from "../../components/TarjetaCombo.jsx";
import FilaCombos from "../../components/FilaCombos.jsx";
import LienzoTienda from "../../components/admin/combos/LienzoTienda.jsx";
import { FILA_COMBOS_HOME } from "../../constants/combos.js";
import SelectorCantidad from "../../components/SelectorCantidad.jsx";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import VeloModal from "../../components/VeloModal.jsx";
import EditorTabs from "../../components/admin/producto/EditorTabs.jsx";
import Interruptor from "../../components/admin/campanias/Interruptor.jsx";
import PaginaCombo from "../PaginaCombo.jsx";
import { formatFecha, formatPrecio } from "../../utils/formato.js";
import { claseCampo } from "../../components/admin/clasesFormulario.js";

const RUTA_LISTADO = "/catalogo/admin/combos";

const PANELES = [
  { id: "form", etiqueta: "Editar", icono: "edit" },
  { id: "preview", etiqueta: "Vista previa", icono: "visibility", soloChico: true },
];

const VIGENCIAS = [
  { valor: "SIEMPRE", titulo: "Siempre vigente", detalle: "Está a la venta mientras esté activo." },
  {
    valor: "CAMPANIA",
    titulo: "Programado desde campañas",
    detalle: "Solo se vende mientras una campaña que lo incluye esté en fecha.",
  },
];

const claseBoton =
  "font-label-lg text-label-lg inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 uppercase tracking-widest transition-colors disabled:opacity-60";
const claseBotonContorno = `${claseBoton} border border-outline-variant text-on-surface-variant hover:border-outline`;
const claseBotonChico =
  "font-label-md text-label-md inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:border-outline";
const claseLabel = "font-label-md text-label-md block text-on-surface";
const claseAyuda = "font-body-sm text-body-sm text-on-surface-variant";
const claseSegmentado = "flex max-w-full flex-wrap gap-1 rounded-lg bg-surface-container-highest p-1";
const claseOpcionSegmentado =
  "font-label-md text-label-md inline-flex min-h-11 items-center rounded-md transition-colors";
const claseOpcionElegida = "bg-surface-container-lowest text-primary shadow-sm";

/** Dónde aparece el combo en la tienda. */
const MODOS_PREVIA = [
  { id: "home", texto: "Card en la home", icono: "view_agenda" },
  { id: "catalogo", texto: "Card en el catálogo", icono: "grid_view" },
  { id: "pagina", texto: "Página", icono: "web" },
];

/** Anchos REALES a los que se dibuja la tienda antes de achicarla. */
const DISPOSITIVOS = [
  { id: "escritorio", etiqueta: "Escritorio", icono: "desktop_windows", ancho: 1280 },
  { id: "celular", etiqueta: "Celular", icono: "smartphone", ancho: 390 },
];

/** La página es larga: el marco se corta acá y se recorre con scroll. */
const ALTO_MAXIMO_PAGINA = "min(75vh, 760px)";

/**
 * Lo que se dibuja dentro del lienzo, con los componentes REALES de la tienda:
 * - `home`: `FilaCombos` con los mismos textos que la home (`FILA_COMBOS_HOME`).
 * - `catalogo`: la grilla de `/combos` (`CatalogoCombos.jsx`) con este combo
 *   SOLO — impar, la card queda centrada a media columna, como en la tienda.
 *   Las clases del contenedor y la grilla copian las de `CatalogoCombos.jsx`:
 *   si cambian allá, cambian acá.
 * - `pagina`: `PaginaCombo` con `comboForzado`.
 */
function PreviaEnTienda({ modo, combo }) {
  if (modo === "pagina") return <PaginaCombo comboForzado={combo} />;
  if (modo === "catalogo") {
    return (
      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-7 md:px-margin-desktop md:py-10">
        <div className="grilla-combos grid auto-rows-fr grid-cols-1 gap-[26px] md:grid-cols-2 md:gap-x-[26px] md:gap-y-8">
          <TarjetaCombo combo={combo} />
        </div>
      </section>
    );
  }
  return <FilaCombos combos={[combo]} {...FILA_COMBOS_HOME} />;
}

/**
 * El objeto de vista previa: textos del formulario + números de `cotizacion`
 * TAL CUAL los resolvió el backend (`POST /combos/admin/combos/cotizar`),
 * incluidos `disponible` y `quedanPocos` — acá no hay umbral ni cuenta propia
 * (spec §6.2). Sin cotización (menos unidades que el mínimo, % inválido o
 * mientras corre el debounce) no hay vista previa.
 */
function comboDeVistaPrevia(cambios, cotizacion, combo) {
  if (!cotizacion) return null;
  return {
    id: combo?.id ?? 0,
    ruta: combo?.ruta ?? "/combos",
    nombre: cambios.nombre || "Nombre del combo",
    frase: cambios.frase || "Frase comercial del combo.",
    porcentaje: cambios.porcentaje,
    precioSeparado: cotizacion.precioSeparado,
    precioCombo: cotizacion.precioCombo,
    ahorro: cotizacion.ahorro,
    unidades: cotizacion.unidades,
    alcanza: cotizacion.alcanza,
    disponible: cotizacion.disponible,
    quedanPocos: cotizacion.quedanPocos,
    heroUrl: cambios.heroUrl,
    items: cambios.items.map((item) => ({
      productId: item.productId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioLista: item.precio,
      foto: item.foto ?? null,
      ruta: "/coleccion",
      categoria: null,
    })),
  };
}

/** Carcasa de cada sección: ícono en baldosa, título y bajada (diseño aprobado). */
function Seccion({ id, icono, titulo, bajada, children }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="material-symbols-outlined grid h-9 w-9 flex-none place-items-center rounded-lg bg-surface-container-low text-[20px] text-primary"
        >
          {icono}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="font-headline-sm text-[16px] font-bold leading-tight text-on-surface">
            {titulo}
          </h2>
          <p className={claseAyuda}>{bajada}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * `/catalogo/admin/combos/nuevo` y `/catalogo/admin/combos/:id` — spec §8.3.
 *
 * Mismo esquema que `AdminProductoForm`: encabezado con Volver, "Cambios sin
 * guardar", Eliminar, Cancelar y Guardar; formulario a la izquierda y vista
 * previa a la derecha en `lg` (cada columna con su scroll), y `EditorTabs`
 * con Editar / Vista previa por debajo.
 *
 * Esta pantalla no calcula NADA de plata ni de stock: el resumen, el aviso de
 * "sale más barato", `alcanza`, `limitante` y la pill de promo por fila salen
 * de `cotizacion`; la URL, de `combo.ruta`. El estado y el guardado viven en
 * `useComboEditor`.
 */
function AdminComboForm() {
  const { id: idDeRuta } = useParams();
  const id = idDeRuta ? Number(idDeRuta) : null;
  const navigate = useNavigate();
  const editor = useComboEditor(id);
  const { mostrarToast } = useToast();
  const confirmarSalida = useGuardaSalida(Boolean(editor.sucio));

  const [panelActivo, setPanelActivo] = useState("form");
  const [vistaPrevia, setVistaPrevia] = useState("home");
  const [dispositivoId, setDispositivoId] = useState("escritorio");
  const dispositivo = DISPOSITIVOS.find((opcion) => opcion.id === dispositivoId);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const dialogoBorradoRef = useDialogo({
    abierto: confirmandoBorrado,
    onCerrar: () => {
      if (editor.guardando) return;
      setConfirmandoBorrado(false);
    },
  });

  if (editor.cargando) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <Spinner className="h-8 w-8 text-on-surface-variant" />
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando combo…</p>
      </div>
    );
  }

  // Distinto de un combo vacío: lo que falló es la carga. Mostrar el
  // formulario en blanco haría creer que el combo perdió sus datos, y
  // guardarlo los pisaría de verdad.
  if (id && !editor.combo && editor.error) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <span aria-hidden="true" className="material-symbols-outlined text-[40px] text-on-surface-variant">
          cloud_off
        </span>
        <p className="font-headline-md text-headline-md text-on-surface">No se pudo cargar el combo</p>
        <p className="font-body-md text-body-md max-w-md text-on-surface-variant">{editor.error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${claseBoton} bg-primary text-on-primary hover:bg-primary-container`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            refresh
          </span>
          Reintentar
        </button>
      </div>
    );
  }

  const { combo, cambios, setCambios, cotizacion, opciones } = editor;
  const unidades = cambios.items.reduce((total, item) => total + item.cantidad, 0);
  const campanias = combo?.campanias ?? [];
  const preview = comboDeVistaPrevia(cambios, cotizacion, combo);
  const idsEnCombo = new Set(cambios.items.map((item) => item.productId));
  const descuentoDe = (productId) =>
    cotizacion?.items?.find((item) => item.productId === productId)?.descuento ?? null;
  const terminoBuscado = editor.busqueda.trim();

  function editarCampo(campo, valor) {
    setCambios((actual) => ({ ...actual, [campo]: valor }));
  }

  async function handleGuardar() {
    const guardado = await editor.guardar();
    if (!guardado) return;
    mostrarToast("Combo guardado");
    if (!id) navigate(`${RUTA_LISTADO}/${guardado.id}`, { replace: true });
  }

  async function handleEliminar() {
    const resultado = await editor.eliminar();
    if (resultado) navigate(RUTA_LISTADO, { replace: true });
  }

  function handleCancelar() {
    if (!confirmarSalida()) return;
    navigate(RUTA_LISTADO);
  }

  function handleAgregar(producto) {
    editor.agregarProducto(producto);
    editor.setBusqueda("");
  }

  return (
    <div className="flex w-full flex-col lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface px-4 py-4 md:px-8">
        <div className="min-w-0">
          <div className="mb-2">
            <BotonVolver fallback={RUTA_LISTADO} puedeSalir={confirmarSalida} destinoFijo />
          </div>
          <span className="font-label-sm text-label-sm block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-md text-headline-md text-primary">{id ? "Editar combo" : "Nuevo combo"}</h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {editor.sucio ? (
            <span className="font-label-md text-label-md inline-flex basis-full items-center gap-2 text-on-surface-variant sm:basis-auto">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                edit_note
              </span>
              Cambios sin guardar
            </span>
          ) : null}
          {id ? (
            <button
              type="button"
              disabled={editor.guardando}
              onClick={() => setConfirmandoBorrado(true)}
              className={`${claseBoton} mr-3 border border-error text-error hover:bg-error-container`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                delete
              </span>
              Eliminar
            </button>
          ) : null}
          <button type="button" onClick={handleCancelar} className={claseBotonContorno}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={editor.guardando}
            className={`${claseBoton} bg-primary text-on-primary hover:bg-primary-container`}
          >
            {editor.guardando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
            {editor.guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </header>

      <EditorTabs panelActivo={panelActivo} onCambiarPanel={setPanelActivo} paneles={PANELES} />

      {editor.error && !confirmandoBorrado ? (
        <p
          role="alert"
          className="font-body-md text-body-md mx-4 mt-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container md:mx-8"
        >
          {editor.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* ---------------- Columna izquierda: formulario ---------------- */}
        <div className={`${panelActivo === "form" ? "" : "hidden"} lg:block lg:min-h-0 lg:overflow-y-auto`}>
          <div className="grid content-start gap-4 px-4 py-5 md:px-7 md:py-6">
            <Seccion id="combo-datos" icono="badge" titulo="Datos del combo" bajada="Lo que lee el cliente en la card y en la página.">
              <div className="grid gap-1.5">
                <label htmlFor="combo-nombre" className={claseLabel}>
                  Nombre
                </label>
                <input
                  id="combo-nombre"
                  className={claseCampo}
                  value={cambios.nombre}
                  maxLength={opciones?.largoMaxNombre}
                  onChange={(e) => editarCampo("nombre", e.target.value)}
                />
                {combo?.ruta ? (
                  <code className="font-body-sm text-[12px] break-all text-outline">{combo.ruta}</code>
                ) : (
                  <span className={claseAyuda}>La URL pública se arma al guardar.</span>
                )}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="combo-frase" className={claseLabel}>
                  Frase comercial
                </label>
                <textarea
                  id="combo-frase"
                  className={`${claseCampo} resize-y`}
                  rows={2}
                  value={cambios.frase}
                  maxLength={opciones?.largoMaxFrase}
                  onChange={(e) => editarCampo("frase", e.target.value)}
                />
                <p className={`${claseAyuda} flex justify-between gap-3`}>
                  <span>En la card se ven 2 líneas. En la página se ve completa.</span>
                  <span className="flex-none tabular-nums">
                    {cambios.frase.length} / {opciones?.largoMaxFrase ?? "—"}
                  </span>
                </p>
              </div>
            </Seccion>

            <Seccion id="combo-productos" icono="category" titulo="Productos del combo" bajada="Cada unidad cuenta para el mínimo y el máximo.">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
                >
                  search
                </span>
                <input
                  type="search"
                  aria-label="Buscar producto por nombre o SKU"
                  placeholder="Buscar por nombre o SKU"
                  autoComplete="off"
                  className={`${claseCampo} pl-10`}
                  value={editor.busqueda}
                  onChange={(e) => editor.setBusqueda(e.target.value)}
                />
              </div>
              {terminoBuscado !== "" ? (
                <div className="-mt-2 overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-ambient">
                  {editor.resultados.length > 0 ? (
                    <ul>
                      {editor.resultados.map((producto) => {
                        const yaEsta = idsEnCombo.has(producto.id);
                        const foto = producto.fotos?.[0]?.url;
                        return (
                          <li key={producto.id} className="border-b border-surface-container-low last:border-b-0">
                            <button
                              type="button"
                              aria-label={`Agregar ${producto.nombre}`}
                              disabled={yaEsta}
                              onClick={() => handleAgregar(producto)}
                              className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-container-low disabled:cursor-default disabled:opacity-60"
                            >
                              <span className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-md bg-surface-container">
                                {foto ? (
                                  <img src={foto} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">
                                    inventory_2
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="font-body-md text-body-md block truncate text-on-surface">{producto.nombre}</span>
                                <span className={`${claseAyuda} block tabular-nums`}>
                                  {producto.sku} · {formatPrecio(producto.precio)} · stock {producto.stock}
                                </span>
                              </span>
                              <span className="font-label-md text-label-md inline-flex flex-none items-center gap-0.5 text-primary">
                                {yaEsta ? (
                                  "En el combo"
                                ) : (
                                  <>
                                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                                      add
                                    </span>
                                    Agregar
                                  </>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className={`${claseAyuda} px-3 py-3`}>
                      {editor.buscando ? "Buscando…" : "Ningún producto coincide con la búsqueda."}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <div className="flex justify-between gap-3">
                  <span className="font-label-md text-label-md tabular-nums text-on-surface">
                    {unidades} de {opciones?.maxUnidades ?? "—"} unidades
                  </span>
                  {opciones ? (
                    <span className={`font-label-md text-label-md ${unidades >= opciones.minUnidades ? "text-secondary" : "text-on-surface-variant"}`}>
                      {unidades >= opciones.minUnidades ? "Mínimo cumplido" : `Mínimo ${opciones.minUnidades}`}
                    </span>
                  ) : null}
                </div>
                {opciones ? (
                  <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-secondary transition-[width]"
                      style={{ width: `${Math.min(100, (unidades / opciones.maxUnidades) * 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>

              {cambios.items.length > 0 ? (
                <ul className="grid gap-2">
                  {cambios.items.map((item) => {
                    const descuento = descuentoDe(item.productId);
                    return (
                      <li
                        key={item.productId}
                        className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-lg border border-outline-variant p-2.5 sm:grid-cols-[44px_minmax(0,1fr)_auto]"
                      >
                        <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-surface-container">
                          {item.foto ? (
                            <img src={item.foto} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-on-surface-variant">
                              inventory_2
                            </span>
                          )}
                        </span>
                        <span className="grid min-w-0 gap-0.5">
                          <span className="font-body-md text-body-md truncate font-semibold text-on-surface">{item.nombre}</span>
                          <span className={`${claseAyuda} flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums`}>
                            <span>{item.sku}</span>
                            <span>Lista {formatPrecio(item.precio)}</span>
                            <span>Stock {item.stock}</span>
                            {descuento ? (
                              <span className="font-label-sm rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-bold text-on-primary-container">
                                Promo -{descuento.porcentaje}% vigente
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                          <SelectorCantidad
                            value={item.cantidad}
                            etiqueta={item.nombre}
                            onChange={(cantidad) => editor.cambiarCantidad(item.productId, cantidad)}
                          />
                          <button
                            type="button"
                            aria-label={`Quitar ${item.nombre}`}
                            onClick={() => editor.quitarProducto(item.productId)}
                            className="grid h-11 w-11 place-items-center rounded-lg text-outline transition-colors hover:bg-error-container hover:text-on-error-container"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                              close
                            </span>
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={`${claseAyuda} rounded-lg border border-dashed border-outline-variant px-4 py-5 text-center`}>
                  Buscá un producto para empezar a armar el combo.
                </p>
              )}
            </Seccion>

            <Seccion id="combo-descuento" icono="percent" titulo="Descuento" bajada="Se aplica sobre la suma de precios de lista.">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)] sm:items-start">
                <div className="grid gap-1.5">
                  <label htmlFor="combo-porcentaje" className={claseLabel}>
                    Descuento del combo
                  </label>
                  <div className="relative">
                    <input
                      id="combo-porcentaje"
                      type="number"
                      inputMode="numeric"
                      className={`${claseCampo} pr-9 font-display-lg text-[22px] font-extrabold text-primary`}
                      value={cambios.porcentaje}
                      min={opciones?.porcentajeMin}
                      max={opciones?.porcentajeMax}
                      step={1}
                      onChange={(e) => editarCampo("porcentaje", Number(e.target.value))}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] font-extrabold text-outline">
                      %
                    </span>
                  </div>
                </div>
                {cotizacion ? (
                  <dl className="font-body-md text-body-md rounded-lg bg-surface-container-low px-4 py-1.5 tabular-nums">
                    <div className="flex justify-between gap-3 border-b border-dashed border-outline-variant py-2 text-on-surface-variant">
                      <dt>Suma de precios de lista</dt>
                      <dd className="font-semibold text-on-surface">{formatPrecio(cotizacion.precioSeparado)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-dashed border-outline-variant py-2 text-on-surface-variant">
                      <dt>Descuento {cambios.porcentaje}%</dt>
                      <dd className="font-semibold text-on-surface">− {formatPrecio(cotizacion.ahorro)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 py-2 font-bold text-on-surface">
                      <dt>Precio del combo</dt>
                      <dd className="text-[18px] text-primary">{formatPrecio(cotizacion.precioCombo)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className={`${claseAyuda} rounded-lg bg-surface-container-low px-4 py-3`}>
                    La cuenta aparece con al menos {opciones?.minUnidades ?? 2} unidades y un descuento válido.
                  </p>
                )}
              </div>
              {cotizacion?.avisoMasCaro ? (
                <div
                  role="status"
                  className="font-body-sm text-body-sm grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-lg border border-outline bg-tertiary-container px-4 py-3 leading-relaxed text-on-surface"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                    warning
                  </span>
                  <div>
                    <strong className="font-body-md text-body-md mb-0.5 block">Comprando por separado sale más barato</strong>
                    El combo cuesta {formatPrecio(cotizacion.precioCombo)} y, con las promociones vigentes, estos productos
                    sueltos cuestan {formatPrecio(cotizacion.precioSueltoHoy)}. Podés guardar igual, pero la página va a
                    anunciar un ahorro que hoy no existe.
                  </div>
                </div>
              ) : null}
              {cotizacion ? (
                <p className="font-body-sm text-body-sm flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg bg-secondary-container px-3 py-2.5 text-on-secondary-container">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    inventory
                  </span>
                  <span>Con el stock actual alcanza para {cotizacion.alcanza} combos.</span>
                  {cotizacion.limitante ? <span>Lo limita {cotizacion.limitante.nombre}.</span> : null}
                </p>
              ) : null}
            </Seccion>

            <Seccion id="combo-imagen" icono="image" titulo="Imagen principal" bajada="El hero de la página del combo.">
              <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                <div className="relative aspect-[12/5] max-w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
                  {cambios.heroUrl ? (
                    <img src={cambios.heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="material-symbols-outlined absolute inset-0 grid place-items-center text-[32px] text-outline">
                      add_photo_alternate
                    </span>
                  )}
                </div>
                <div className="grid gap-2">
                  <p className={claseAyuda}>
                    Foto horizontal y <strong className="text-on-surface">sin texto encima</strong>: el título y el precio los pone
                    la página. Recomendado: 2400 × 1000 px.
                  </p>
                  {id ? null : (
                    <p className="font-body-sm text-body-sm font-semibold text-on-surface">Guardá el combo para cargar la imagen principal.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label
                      className={`${claseBotonChico} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                        !id || editor.guardando ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      <input
                        type="file"
                        aria-label="Archivo de la imagen principal"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={!id || editor.guardando}
                        onChange={(e) => {
                          const archivo = e.target.files?.[0];
                          if (archivo) editor.subirHero(archivo);
                          e.target.value = "";
                        }}
                      />
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        upload
                      </span>
                      {cambios.heroUrl ? "Reemplazar" : "Subir imagen"}
                    </label>
                    {cambios.heroUrl ? (
                      <button type="button" onClick={editor.quitarHero} disabled={editor.guardando} className={`${claseBotonChico} disabled:opacity-60`}>
                        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Seccion>

            <Seccion id="combo-vigencia" icono="event_available" titulo="Vigencia" bajada="Cuándo se puede comprar este combo.">
              {/* Radios NATIVOS pintados como tarjetas: el navegador ya resuelve las
                  flechas, el foco único del grupo y Espacio, sin reimplementar el
                  patrón ARIA de radiogroup. */}
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Vigencia</legend>
                {VIGENCIAS.map((opcion) => {
                  const elegida = cambios.vigencia === opcion.valor;
                  return (
                    <label
                      key={opcion.valor}
                      className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-2.5 rounded-lg border-[1.5px] px-3.5 py-3 text-left transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                        elegida ? "border-primary bg-primary-container/10" : "border-outline-variant bg-surface hover:border-outline"
                      }`}
                    >
                      <input
                        type="radio"
                        name="combo-vigencia"
                        value={opcion.valor}
                        checked={elegida}
                        onChange={() => editarCampo("vigencia", opcion.valor)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 ${elegida ? "border-primary" : "border-outline"}`}
                      >
                        {elegida ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                      </span>
                      <span>
                        <span className="font-body-md text-body-md block font-semibold text-on-surface">{opcion.titulo}</span>
                        <span className={claseAyuda}>{opcion.detalle}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {cambios.vigencia === "CAMPANIA" ? (
                campanias.length === 0 ? (
                  <p className="font-body-sm text-body-sm flex items-start gap-2 rounded-lg border border-outline bg-tertiary-container px-3 py-2.5 text-on-surface">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      warning
                    </span>
                    <span>Este combo no está asociado a ninguna campaña: no se va a ver en la tienda.</span>
                  </p>
                ) : (
                  <div className="grid gap-2">
                    <ul className="grid gap-1.5">
                      {campanias.map((campania) => (
                        <li
                          key={campania.id}
                          className="font-body-sm text-body-sm flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-container-low px-3 py-2 text-on-surface"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            calendar_month
                          </span>
                          <span className="font-semibold">{campania.nombre}</span>
                          <span
                            className={`font-label-sm rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              campania.activa ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {campania.etiquetaEstado} · {campania.etiquetaTemporal}
                          </span>
                          {campania.desde ? (
                            <span className="ml-auto tabular-nums text-on-surface-variant">
                              {formatFecha(campania.desde)} al {formatFecha(campania.hasta)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <p className={claseAyuda}>Las fechas se editan en Campañas, en la sección “Combos de la campaña”.</p>
                  </div>
                )
              ) : null}

              <div className="grid gap-1.5 border-t border-surface-container-low pt-3">
                <Interruptor etiqueta="Combo activo" activo={cambios.activo} onCambiar={(valor) => editarCampo("activo", valor)} />
                <p className={claseAyuda}>Apagado, no se vende ni aparece en ningún lado, esté o no en fecha.</p>
              </div>
            </Seccion>
          </div>
        </div>

        {/* ---------------- Columna derecha: vista previa ---------------- */}
        <aside
          aria-label="Vista previa"
          className={`${panelActivo === "preview" ? "flex" : "hidden"} flex-col gap-3 border-outline-variant bg-surface-container-low px-4 py-4 md:px-5 lg:flex lg:min-h-0 lg:overflow-y-auto lg:border-l`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-label-sm text-label-sm inline-flex items-center gap-1.5 uppercase tracking-widest text-on-surface-variant">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                visibility
              </span>
              Así lo ve el cliente
            </span>
            <div role="group" aria-label="Qué previsualizar" className={claseSegmentado}>
              {MODOS_PREVIA.map((modo) => (
                <button
                  key={modo.id}
                  type="button"
                  aria-pressed={vistaPrevia === modo.id}
                  onClick={() => setVistaPrevia(modo.id)}
                  className={`${claseOpcionSegmentado} gap-1.5 whitespace-nowrap px-2.5 sm:px-3 ${
                    vistaPrevia === modo.id ? claseOpcionElegida : "text-on-surface-variant"
                  }`}
                >
                  {/* Sin ícono en celular: con él, los tres rótulos no entran en 390px y se partían. */}
                  <span aria-hidden="true" className="material-symbols-outlined hidden text-[18px] sm:inline">
                    {modo.icono}
                  </span>
                  {modo.texto}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Dispositivo" className={claseSegmentado}>
              {DISPOSITIVOS.map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  aria-label={opcion.etiqueta}
                  aria-pressed={dispositivo.id === opcion.id}
                  onClick={() => setDispositivoId(opcion.id)}
                  className={`${claseOpcionSegmentado} w-11 justify-center ${
                    dispositivo.id === opcion.id ? claseOpcionElegida : "text-on-surface-variant"
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    {opcion.icono}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {preview ? (
            <LienzoTienda
              ancho={dispositivo.ancho}
              etiqueta={`${dispositivo.ancho} px · ${dispositivo.etiqueta.toLowerCase()}`}
              altoMaximo={vistaPrevia === "pagina" ? ALTO_MAXIMO_PAGINA : null}
            >
              <PreviaEnTienda modo={vistaPrevia} combo={preview} />
            </LienzoTienda>
          ) : (
            <p className={`${claseAyuda} rounded-xl border border-dashed border-outline-variant px-4 py-10 text-center`}>
              La vista previa aparece cuando el combo tiene al menos {opciones?.minUnidades ?? 2} unidades y un descuento
              válido.
            </p>
          )}

          <p className={`${claseAyuda} flex items-start gap-1.5`}>
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              info
            </span>
            Se actualiza mientras editás. El precio final lo confirma el servidor al guardar.
          </p>
        </aside>
      </div>

      {confirmandoBorrado ? (
        <VeloModal className="z-50 flex items-center justify-center bg-black/40 px-margin-mobile">
          <div
            ref={dialogoBorradoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-combo"
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
          >
            <h2 id="titulo-eliminar-combo" className="font-headline-md text-headline-md mb-2 text-on-background">
              Eliminar combo
            </h2>
            <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
              ¿Seguro que querés eliminar <strong className="text-on-surface">{cambios.nombre || "este combo"}</strong>? Esta
              acción no se puede deshacer.
            </p>
            {editor.error ? (
              <p role="alert" className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {editor.error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmandoBorrado(false)} disabled={editor.guardando} className={claseBotonContorno}>
                No, volver
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={editor.guardando}
                className={`${claseBoton} bg-error text-on-error`}
              >
                {editor.guardando ? <Spinner className="h-4 w-4 text-on-error" decorativo /> : null}
                Sí, eliminar
              </button>
            </div>
          </div>
        </VeloModal>
      ) : null}
    </div>
  );
}

export default AdminComboForm;
