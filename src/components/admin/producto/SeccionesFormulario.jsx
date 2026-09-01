import { useRef } from "react";
import { Link } from "react-router-dom";
import ListaDinamica from "../../ListaDinamica.jsx";
import {
  formatPrecio,
  formatearPrecioInput,
  formatearPrecioParaEdicion,
} from "../../../utils/formato.js";
import { ESTADOS_PRECIO } from "../../../utils/precios.js";

const SUGERENCIAS_ETIQUETA = ["Exclusivo", "Nuevo", "Best Seller", "Trending", "Popular"];

/**
 * Columna izquierda del editor: el `<form>` completo, campo por campo.
 *
 * Es presentacional — todo el estado y las acciones llegan por props desde
 * `useProductoForm`. No hace fetch ni guarda nada por su cuenta.
 *
 * `etiqueta` is free-text — an `<input>` with a `<datalist>` of suggestions,
 * not a hard enum.
 *
 * El botón Guardar no está acá: vive en `EditorHeader` y alcanza este
 * formulario por `form="form-producto"`, así que el `id` es parte del
 * contrato entre los dos componentes.
 *
 * `nuevaCaracteristica` / `nuevaSpecNombre` / `nuevaSpecValor` llegan
 * agrupados en `borradores`: son los campos "agregar", que todavía no son
 * parte del producto.
 */
function SeccionesFormulario({
  visible,
  visibleEnEscritorio = false,
  formRef,
  onSubmit,
  guardando,
  valores,
  editar,
  precio,
  categorias,
  errorCategorias,
  error,
  esEdicion,
  borradores: {
    nuevaCaracteristica,
    setNuevaCaracteristica,
    nuevaSpecNombre,
    setNuevaSpecNombre,
    nuevaSpecValor,
    setNuevaSpecValor,
  },
  agregarCaracteristica,
  eliminarCaracteristica,
  agregarEspecificacion,
  eliminarEspecificacion,
}) {
  // Enter en el Nombre de una especificación pasa el foco acá, al Valor: el
  // borrador todavía no tiene las dos mitades, así que agregar el ítem sería
  // guardar una spec a medias — y dejar pasar el submit nativo guardaría el
  // producto entero y descartaría el borrador.
  const specValorRef = useRef(null);

  return (
    <div
      // Sin `lg:block` en general: hasta el 27/08/2026 esta columna forzaba
      // su propia visibilidad en `lg` (dos paneles fijos, formulario y
      // preview, lado a lado) porque las pestañas solo existían debajo de
      // `lg`. Ahora el formulario comparte la columna izquierda con la
      // solapa Imágenes, y las pestañas son lo único que decide cuál se ve —
      // en CUALQUIER tamaño. Con la solapa Imágenes activa el formulario
      // sigue oculto en todo tamaño: un override de `lg` acá lo mostraría en
      // escritorio aunque Imágenes fuera la pestaña elegida.
      //
      // La ÚNICA excepción es `visibleEnEscritorio`, que llega en `true`
      // cuando la pestaña activa es Vista previa: esa pestaña no tiene
      // columna propia en `lg` (ahí el preview siempre está a la vista en su
      // propia columna, sin pestañas), así que sin este `lg:block` rotar el
      // dispositivo con "Vista previa" activa dejaba la columna izquierda
      // vacía — ni el formulario ni la solapa Imágenes tenían ninguna razón
      // para mostrarse. Residuo aceptado: en ese estado ninguna pestaña
      // visible queda con `aria-pressed="true"`, porque el estado
      // (`panelActivo`) no sabe en qué viewport está. La alternativa exacta
      // sería enterarse del breakpoint con `matchMedia`, que se descartó a
      // propósito para no meter el primer breakpoint resuelto en JS del
      // proyecto — acá el fix es puramente CSS. El scroll de la columna lo
      // controla el `<div>` que envuelve a este componente y a
      // `SolapaImagenes` en `AdminProductoForm.jsx`.
      className={`px-4 py-6 md:px-8 ${
        visible ? "" : visibleEnEscritorio ? "hidden lg:block" : "hidden"
      }`}
    >
      <form
        id="form-producto"
        ref={formRef}
        onSubmit={onSubmit}
        className="flex max-w-2xl flex-col gap-8"
      >
        {/* Deshabilita todos los controles mientras el guardado está en vuelo:
            un cambio tipeado durante el POST se perdería en silencio, porque el
            submit exitoso limpia `sucio` y navega al listado. `display:contents`
            (la clase `contents`) deja el layout flex del <form> intacto — un
            <fieldset> como contenedor flex tiene bugs de render conocidos. */}
        <fieldset disabled={guardando} className="contents">
        <div>
          <label htmlFor="nombre" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            required
            value={valores.nombre}
            onChange={(e) => editar("nombre")(e.target.value)}
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="descripcion"
            className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
          >
            Descripción
          </label>
          <textarea
            id="descripcion"
            rows={4}
            required
            value={valores.descripcion}
            onChange={(e) => editar("descripcion")(e.target.value)}
            className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Costo y coeficiente son OBLIGATORIOS: de este par sale el precio
              de venta, que ya no se tipea en ninguna pantalla. El costo va
              primero porque es el número que se carga; el precio, abajo, es su
              consecuencia. */}
          <div>
            <label htmlFor="costo" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Costo
            </label>
            {/* `inputMode="numeric"` y no `"decimal"`: el costo es entero
                (`Product.costo` es `Decimal(10, 0)`) y `formatearPrecioInput`
                descarta todo lo que no sea dígito, así que un teclado de celular
                que ofrezca la coma solo invita a tipear algo que el campo va a
                ignorar. */}
            <div className="flex items-center rounded-lg border border-outline-variant bg-surface px-4 focus-within:border-primary">
              <span className="font-body-md text-body-md text-on-surface-variant">$</span>
              <input
                id="costo"
                type="text"
                inputMode="numeric"
                required
                value={formatearPrecioInput(valores.costo).formateado}
                onChange={(e) => editar("costo")(formatearPrecioInput(e.target.value).crudo)}
                className="font-body-md text-body-md w-full bg-transparent px-2 py-3 text-on-surface focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="coeficiente" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Coeficiente
            </label>
            {/* `inputMode="decimal"` acá SÍ, al revés que el costo: es el único
                campo del sistema que lleva decimales (2,05 = ×2,05). */}
            <input
              id="coeficiente"
              type="text"
              inputMode="decimal"
              required
              placeholder="2,05"
              value={valores.coeficiente}
              onChange={(e) => editar("coeficiente")(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
            <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
              Multiplica al costo. En 1 el precio queda igual al costo.
            </p>
          </div>

          {/* El precio de venta es CALCULADO y de solo lectura: sale de
              `costo × coeficiente`, redondeado al peso. No se puede tipear en
              ninguna pantalla del panel. */}
          <div className="sm:col-span-2">
            <label
              htmlFor="precio-calculado"
              className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
            >
              Precio de venta (calculado)
            </label>
            <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-4">
              <span className="font-body-md text-body-md text-on-surface-variant">$</span>
              <input
                id="precio-calculado"
                type="text"
                readOnly
                tabIndex={-1}
                value={
                  precio.calculado === null
                    ? ""
                    : formatearPrecioParaEdicion(precio.calculado).formateado
                }
                placeholder="Cargá el costo"
                className="font-body-md text-body-md w-full cursor-default bg-transparent px-2 py-3 text-on-surface focus:outline-none"
              />
            </div>

            {/* En EDICIÓN el precio calculado no es el que ve el cliente hasta
                que alguien lo aplique. Sin esta línea la pantalla afirmaría un
                precio que todavía no está publicado. En un alta no hay contra
                qué comparar, así que `estado` viene en `null` y no se muestra. */}
            {precio.estado === ESTADOS_PRECIO.DIFIERE ? (
              <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
                Difiere del publicado, que sigue siendo{" "}
                <strong className="text-on-surface">{formatPrecio(precio.publicado)}</strong>.
                Se actualiza al aplicarlo desde{" "}
                <Link to="/catalogo/admin/productos/precios" className="text-primary hover:underline">
                  Costos y precios
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="etiqueta" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
              Etiqueta (opcional)
            </label>
            <input
              id="etiqueta"
              type="text"
              list="sugerencias-etiqueta"
              value={valores.etiqueta}
              onChange={(e) => editar("etiqueta")(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
            <datalist id="sugerencias-etiqueta">
              {SUGERENCIAS_ETIQUETA.map((sugerencia) => (
                <option key={sugerencia} value={sugerencia} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
          <h2 className="font-headline-md text-headline-md text-primary">Contenido comercial</h2>

          <div>
            <label
              htmlFor="fraseComercial"
              className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
            >
              Frase comercial (opcional)
            </label>
            <input
              id="fraseComercial"
              type="text"
              value={valores.fraseComercial}
              onChange={(e) => editar("fraseComercial")(e.target.value)}
              placeholder="Ej: Iluminá donde quieras, sin depender de un enchufe."
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="porQueLoVasAQuerer"
              className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
            >
              ¿Por qué lo vas a querer? (opcional)
            </label>
            <textarea
              id="porQueLoVasAQuerer"
              rows={3}
              value={valores.porQueLoVasAQuerer}
              onChange={(e) => editar("porQueLoVasAQuerer")(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="tePasaEsto"
              className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
            >
              ¿Te pasa esto? (opcional)
            </label>
            <textarea
              id="tePasaEsto"
              rows={3}
              value={valores.tePasaEsto}
              onChange={(e) => editar("tePasaEsto")(e.target.value)}
              className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              Beneficios
            </h3>
            <ListaDinamica items={valores.beneficios} onChange={editar("beneficios")} placeholder="Ej: Recargable por USB" />
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
          <h2 className="font-headline-md text-headline-md text-primary">Uso del producto</h2>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              ¿Cómo podés usarlo? (opcional)
            </h3>
            <ListaDinamica items={valores.usos} onChange={editar("usos")} placeholder="Ej: Para estudiar" />
          </div>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              Ideal para (opcional)
            </h3>
            <ListaDinamica items={valores.idealPara} onChange={editar("idealPara")} placeholder="Ej: Estudiantes" />
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-outline-variant pt-8">
          <h2 className="font-headline-md text-headline-md text-primary">Información del producto</h2>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              Características destacadas
            </h3>
            <div className="mb-3 flex flex-col gap-2">
              {valores.caracteristicas.map((caracteristica, index) => (
                <div
                  key={caracteristica.id}
                  className="flex items-center justify-between rounded-lg bg-surface-container px-4 py-2"
                >
                  <span className="font-body-md text-body-md text-on-surface">{caracteristica.texto}</span>
                  <button
                    type="button"
                    onClick={() => eliminarCaracteristica(index)}
                    aria-label={`Eliminar característica ${caracteristica.texto}`}
                    className="inline-flex items-center justify-center text-on-surface-variant hover:text-error max-md:min-h-11 max-md:min-w-11"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={nuevaCaracteristica}
                onChange={(e) => setNuevaCaracteristica(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarCaracteristica();
                  }
                }}
                placeholder="Ej: Cuero genuino"
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={agregarCaracteristica}
                className="font-label-md text-label-md shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
              >
                Agregar
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              Especificaciones técnicas (opcional)
            </h3>
            <div className="mb-3 flex flex-col gap-2">
              {valores.especificaciones.map((spec, index) => (
                <div
                  key={spec.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container px-4 py-2"
                >
                  <span className="font-body-md text-body-md text-on-surface">
                    <strong>{spec.nombre}</strong> — {spec.valor}
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarEspecificacion(index)}
                    aria-label={`Eliminar especificación ${spec.nombre}`}
                    className="inline-flex items-center justify-center text-on-surface-variant hover:text-error max-md:min-h-11 max-md:min-w-11"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={nuevaSpecNombre}
                onChange={(e) => setNuevaSpecNombre(e.target.value)}
                onKeyDown={(e) => {
                  // Sin esto, Enter acá dispara el submit implícito del form:
                  // guarda el producto entero a mitad de la carga de la spec y
                  // descarta el borrador (los borradores no viajan en el
                  // payload). No agrega el ítem porque falta la otra mitad:
                  // pasa el foco al Valor, donde Enter sí agrega.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    specValorRef.current?.focus();
                  }
                }}
                placeholder="Nombre (ej: Material)"
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                ref={specValorRef}
                value={nuevaSpecValor}
                onChange={(e) => setNuevaSpecValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarEspecificacion();
                  }
                }}
                placeholder="Valor (ej: ABS)"
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={agregarEspecificacion}
                className="font-label-md text-label-md shrink-0 rounded-lg border border-outline-variant px-4 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
              >
                + Agregar especificación
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-label-md text-label-md mb-3 block uppercase tracking-widest text-on-surface">
              ¿Qué incluye? (opcional)
            </h3>
            <ListaDinamica items={valores.incluye} onChange={editar("incluye")} placeholder="Ej: 1 × Cable USB" />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-outline-variant pt-8">
          <h2 className="font-headline-md text-headline-md text-primary">Fotos y video</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Se gestionan en la solapa <strong>Imágenes</strong>, arriba: ahí están la portada, la
            imagen de «¿Qué problema resuelve?», la galería y la generación con IA.
          </p>
        </div>

        {/* ---------- Lo que no se ve en la ficha pública ---------- */}
        <div
          data-testid="config-catalogo"
          className="flex flex-col gap-6 border-t border-outline-variant pt-8"
        >
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">Configuración del catálogo</h2>
            <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
              Nada de esto se muestra en la ficha pública. Controla dónde y cómo aparece el producto.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="categoria" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
                Categoría (opcional)
              </label>
              <select
                id="categoria"
                value={valores.categoriaId}
                onChange={(e) => editar("categoriaId")(e.target.value)}
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
              {errorCategorias ? (
                <p className="font-body-md mt-2 text-[13px] leading-snug text-error">
                  {errorCategorias} Podés guardar igual y asignarla después.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="stock" className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface">
                Stock
              </label>
              <input
                id="stock"
                type="number"
                min="0"
                step="1"
                required
                value={valores.stock}
                onChange={(e) => editar("stock")(e.target.value)}
                className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
              />
              <p className="font-body-md mt-2 text-[13px] leading-snug text-on-surface-variant">
                En 0 el producto sale de la grilla pública, pero su ficha sigue accesible con el badge
                “Agotado”.
              </p>
            </div>
          </div>

          {esEdicion ? (
            <div className="rounded-lg border border-outline-variant">
              <div className="flex flex-col gap-1 border-b border-outline-variant px-4 py-3">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  SKU
                </span>
                <span className="font-body-md text-body-md text-on-surface">{valores.sku ?? "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
                <span className="font-body-md text-body-md text-on-surface">Visible en el catálogo</span>
                <span
                  className={`font-label-sm text-label-sm rounded-full px-3 py-1 uppercase tracking-wide ${
                    valores.visibleEnCatalogo
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {valores.visibleEnCatalogo ? "Sí" : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
                <span className="font-body-md text-body-md text-on-surface">Destacado</span>
                <span
                  className={`font-label-sm text-label-sm rounded-full px-3 py-1 uppercase tracking-wide ${
                    valores.destacado
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {valores.destacado ? "Sí" : "No"}
                </span>
              </div>

              <p className="font-body-md px-4 py-3 text-[13px] leading-snug text-on-surface-variant">
                Estos dos se cambian desde el{" "}
                <Link to="/catalogo/admin/productos" className="text-primary underline">
                  listado de productos
                </Link>
                , donde se guardan al instante.
              </p>
            </div>
          ) : (
            <p className="font-body-md rounded-lg border border-outline-variant px-4 py-3 text-[13px] leading-snug text-on-surface-variant">
              El SKU se genera solo al guardar. La visibilidad y el destacado se ajustan después
              desde el{" "}
              <Link to="/catalogo/admin/productos" className="text-primary underline">
                listado de productos
              </Link>
              .
            </p>
          )}
        </div>

        {error ? (
          <p className="font-body-md text-body-md rounded-lg bg-error-container px-4 py-3 text-on-error-container">
            {error}
          </p>
        ) : null}
        </fieldset>
      </form>
    </div>
  );
}

export default SeccionesFormulario;
