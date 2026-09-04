import { useEffect, useState } from "react";
import { getCategorias } from "../../../api/categorias.js";
import { getProducts } from "../../../api/products.js";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";
import { DEBOUNCE_BUSQUEDA_MS } from "../../../hooks/useTablaAdmin.js";

/**
 * A dónde lleva el botón del cartel.
 *
 * ⚠️ **La lista de destinos LLEGA POR PROP desde la API** (`GET
 * /campanias/opciones`): el frontend no tiene copia. Un destino nuevo en
 * `lib/campanias.js` sería aceptable para el backend e invisible acá, sin
 * ningún test rojo — es el modo de falla más mudo que hay.
 *
 * "Sin botón" es la única opción que NO viene del backend, y no es una omisión:
 * del otro lado se expresa con `modalCtaTipo: null`, o sea con la ausencia del
 * dato. Una lista de valores no puede tener una entrada para "ninguno".
 *
 * Se guarda la INTENCIÓN (qué), nunca la ruta (dónde). La ruta la arma el
 * backend al leer, contra lo que existe hoy: así una categoría renombrada no
 * deja el botón apuntando a una URL que ya no resuelve.
 */

/** Cuántos productos se ofrecen al buscar el destino. Es un picker, no un listado. */
const RESULTADOS_DESTINO = 8;

export default function SelectorDestinoCta({
  destinos,
  tipo,
  referenciaId,
  referenciaNombre,
  cantidadEnVitrina,
  onCambiarTipo,
  onCambiarReferencia,
  disabled,
}) {
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    let activo = true;
    getCategorias()
      .then((datos) => {
        if (activo) setCategorias(datos);
      })
      // Falla blanda: el resto de los destinos sigue disponible.
      .catch(() => {
        if (activo) setCategorias([]);
      });
    return () => {
      activo = false;
    };
  }, []);

  const opciones = [...(destinos ?? []), { valor: "", etiqueta: "Sin botón" }];

  return (
    <fieldset disabled={disabled} className="mt-2">
      <legend className={claseEtiqueta}>A dónde lleva el botón</legend>

      <div className="flex flex-col gap-2">
        {opciones.map((destino) => {
          const elegido = tipo === destino.valor;
          // Sobre "Los productos de la campaña" se muestra el tamaño de la
          // vitrina: es el dato que decide si ese destino sirve o no.
          const etiqueta =
            destino.valor === "CAMPANIA"
              ? `${destino.etiqueta} (${cantidadEnVitrina})`
              : destino.etiqueta;

          return (
            <div key={destino.valor || "SIN_BOTON"}>
              <label className="flex items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 text-on-surface transition-colors hover:bg-surface-container">
                <input
                  type="radio"
                  name="destino-cta"
                  value={destino.valor}
                  checked={elegido}
                  onChange={() => onCambiarTipo(destino.valor)}
                  className="h-4 w-4 accent-[rgb(var(--color-primary))]"
                />
                <span className="font-body-md text-body-md">{etiqueta}</span>
              </label>

              {elegido && destino.valor === "CAMPANIA" && cantidadEnVitrina === 0 ? (
                // El mismo aviso que `DialogoProgramar` da sobre una promoción
                // sin productos, y por el mismo motivo: el botón existiría y no
                // llevaría a nada que el visitante pueda ver.
                <p className="font-body-sm text-body-sm mt-2 rounded-lg bg-error-container px-3 py-2 text-on-error-container">
                  Todavía no hay ningún producto en la vitrina: el botón mandaría a una grilla
                  vacía. Agregá productos más abajo o elegí otro destino.
                </p>
              ) : null}

              {elegido && destino.valor === "CATEGORIA" ? (
                <div className="mt-2 pl-7">
                  <label htmlFor="cta-categoria" className={claseEtiqueta}>
                    Elegí la categoría
                  </label>
                  <select
                    id="cta-categoria"
                    value={referenciaId}
                    onChange={(e) => onCambiarReferencia(e.target.value)}
                    className={claseCampo}
                  >
                    <option value="">Elegí una…</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {elegido && destino.valor === "PRODUCTO" ? (
                <BuscadorDeProducto
                  referenciaId={referenciaId}
                  referenciaNombre={referenciaNombre}
                  onElegir={onCambiarReferencia}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Busca un producto para apuntarle el botón.
 *
 * Es un picker de UNO, no el selector de la vitrina: por eso trae pocos
 * resultados y no ofrece agregar en lote. Con `admin: true` para poder elegir
 * también un producto oculto — el backend ya rechaza mandar el cartel a la ficha
 * de uno que el visitante no puede abrir.
 *
 * ⚠️ **El nombre del elegido no puede salir solo de `referenciaNombre`.** Esa
 * prop viene de `campania.modalCtaReferencia`, o sea del detalle CARGADO, que
 * no se refresca al elegir: la pantalla seguía diciendo "Elegido: Velador LED"
 * después de clickear "Reloj Clásico", y también después de guardar. El dato
 * que se persistía era el correcto; lo que el admin veía era mentira, en la
 * pantalla donde se decide a dónde manda un cartel que ve todo el mundo. Por
 * eso el componente RECUERDA lo que se acaba de elegir.
 */
function BuscadorDeProducto({ referenciaId, referenciaNombre, onElegir }) {
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState([]);
  // Lo elegido en ESTA sesión de edición, con su id: sin el id no habría forma
  // de saber si el nombre recordado sigue describiendo la referencia vigente.
  const [elegido, setElegido] = useState(null);

  // El nombre recordado gana mientras describa al id vigente. Si la referencia
  // cambió desde afuera (cambiar de destino la limpia), se cae al del detalle.
  const nombreElegido =
    elegido && String(elegido.id) === String(referenciaId) ? elegido.nombre : referenciaNombre;

  useEffect(() => {
    const buscado = termino.trim();
    if (!buscado) {
      setResultados([]);
      return undefined;
    }

    let activo = true;
    const temporizador = setTimeout(() => {
      getProducts({ admin: true, search: buscado, page: 1, pageSize: RESULTADOS_DESTINO })
        .then((sobre) => {
          if (activo) setResultados(sobre?.data ?? []);
        })
        .catch(() => {
          if (activo) setResultados([]);
        });
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [termino]);

  return (
    <div className="mt-2 pl-7">
      <label htmlFor="cta-producto" className={claseEtiqueta}>
        Buscá el producto
      </label>
      <input
        id="cta-producto"
        type="search"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        placeholder="Nombre o SKU"
        className={claseCampo}
      />

      {/* Qué está elegido AHORA. El nombre sale de lo que se acaba de clickear
          y, si no hubo elección todavía, del detalle que manda el backend: sin
          ninguno de los dos el editor mostraría un id pelado. */}
      {referenciaId ? (
        <p className="font-body-sm text-body-sm mt-2 text-on-surface-variant">
          Elegido: <strong className="text-on-surface">{nombreElegido ?? `#${referenciaId}`}</strong>
        </p>
      ) : null}

      {resultados.length > 0 ? (
        <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
          {resultados.map((producto) => (
            <li key={producto.id}>
              <button
                type="button"
                onClick={() => {
                  setElegido({ id: producto.id, nombre: producto.nombre });
                  onElegir(String(producto.id));
                }}
                className="font-body-md text-body-md w-full rounded px-2 py-1 text-left text-on-surface transition-colors hover:bg-surface-container"
              >
                {producto.nombre}
                <span className="font-body-sm text-body-sm ml-2 text-on-surface-variant">
                  {producto.sku}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
