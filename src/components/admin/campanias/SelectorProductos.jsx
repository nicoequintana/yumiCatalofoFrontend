import { useEffect, useState } from "react";
import { getCategorias } from "../../../api/categorias.js";
import { getEtiquetas, getProducts } from "../../../api/products.js";
import { getPromocion } from "../../../api/promociones.js";
import CeldaProducto from "../CeldaProducto.jsx";
import { claseCampo, claseEtiqueta } from "../clasesFormulario.js";
import { DEBOUNCE_BUSQUEDA_MS } from "../../../hooks/useTablaAdmin.js";

/**
 * La VITRINA de la campaña: qué productos MUESTRA.
 *
 * Es una pregunta distinta de qué descuentos aplica. "Navidad" quiere exhibir
 * los productos navideños tengan o no rebaja; si listarlos exigiera una
 * promoción, habría que inventar descuentos que el negocio no quiso dar.
 *
 * DOS LISTAS LADO A LADO y no una tabla con checkboxes: el admin necesita ver
 * al mismo tiempo qué está buscando y qué lleva elegido. Con una sola lista, lo
 * ya agregado se pierde apenas cambia el filtro.
 *
 * Cada cambio se PERSISTE en el acto contra `PUT /:id/productos`, que reemplaza
 * la lista completa y responde el detalle. No hay botón "guardar la vitrina":
 * sería un segundo estado sucio conviviendo con el del formulario, y el editor
 * ya tiene uno.
 *
 * Los dos títulos son `<h3>` porque cuelgan del `<h2>` "Productos de la campaña"
 * que pone el editor: saltar de h2 a h4 deja un hueco que un lector de pantalla
 * anuncia como una sección que falta.
 *
 * ⚠️ **El tope de productos lo pone y lo rechaza el BACKEND**
 * (`MAX_PRODUCTOS_CAMPANIA`). Acá no se copia ese número: el proyecto lleva un
 * censo de espejos manuales justamente porque se desincronizan sin que nada
 * falle. El error del backend se muestra tal cual llega.
 */

/** Tamaño de la página de resultados. Es una grilla para elegir, no un listado. */
const RESULTADOS_POR_PAGINA = 24;

export default function SelectorProductos({
  productos,
  promocionesAsociadas,
  guardando,
  onGuardar,
}) {
  const [termino, setTermino] = useState("");
  const [categoria, setCategoria] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [etiquetas, setEtiquetas] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(true);
  const [errorBusqueda, setErrorBusqueda] = useState(null);
  // Estado propio de "Traer los de las promociones": el error se muestra JUNTO
  // al botón, y el hook del editor no llega a enterarse de este fallo (la
  // lectura falla antes de que haya nada que guardar).
  const [trayendo, setTrayendo] = useState(false);
  const [errorTraer, setErrorTraer] = useState(null);

  useEffect(() => {
    let activo = true;
    // Los dos filtros degradan solos: sin ellos se puede buscar igual por texto.
    getCategorias()
      .then((datos) => activo && setCategorias(datos))
      .catch(() => activo && setCategorias([]));
    getEtiquetas()
      .then((datos) => activo && setEtiquetas(datos?.etiquetas ?? []))
      .catch(() => activo && setEtiquetas([]));
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    setBuscando(true);

    const temporizador = setTimeout(() => {
      getProducts({
        // Con la vista de admin para poder elegir también los ocultos y los
        // agotados: una campaña se arma ANTES de publicar lo que va a mostrar.
        admin: true,
        search: termino.trim(),
        categoria,
        etiqueta,
        page: 1,
        pageSize: RESULTADOS_POR_PAGINA,
      })
        .then((sobre) => {
          if (!activo) return;
          setResultados(sobre?.data ?? []);
          // Un fetch exitoso limpia el error anterior: si no, un problema de red
          // ya resuelto seguiría en pantalla sobre datos frescos.
          setErrorBusqueda(null);
        })
        // "Falló la carga" y "no hay nada" no son lo mismo: vaciar la lista en
        // el catch haría leer un backend caído como un catálogo vacío.
        .catch(() => {
          if (activo) setErrorBusqueda("Revisá tu conexión e intentá de nuevo.");
        })
        .finally(() => {
          if (activo) setBuscando(false);
        });
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [termino, categoria, etiqueta]);

  const idsEnVitrina = new Set(productos.map((p) => p.id));
  const sinAgregar = resultados.filter((p) => !idsEnVitrina.has(p.id));

  function agregar(ids) {
    onGuardar([...productos.map((p) => p.id), ...ids.filter((id) => !idsEnVitrina.has(id))]);
  }

  function quitar(id) {
    onGuardar(productos.map((p) => p.id).filter((actual) => actual !== id));
  }

  /**
   * Trae los productos de las promociones que la campaña aplica.
   *
   * Es el atajo del caso más común: se arma la promoción primero y la campaña
   * después. **Une, no reemplaza** — la vitrina puede tener productos que
   * ninguna promoción toca, y pisarlos sería borrar trabajo sin avisar.
   *
   * ⚠️ **TODO O NADA, y el mensaje lo dice.** `Promise.all` rechaza con la
   * primera que falle, y con degradación parcial la vitrina quedaría con los
   * productos de algunas promociones y sin los de otras, persistidos, sin que
   * nada en pantalla diga cuáles faltan. Es peor que no agregar nada: el admin
   * no tiene forma de auditar qué quedó afuera.
   *
   * ⚠️ **Sin este `try/catch` el botón se moría mudo.** La promesa quedaba
   * rechazada sin manejar: no hay estado de error acá, `onGuardar` nunca se
   * llamaba, y por lo tanto tampoco entraba en el `conGuardado` del hook, que
   * es lo único que pinta el error de la página. El admin apretaba y no pasaba
   * nada — ni error, ni spinner, ni productos —, así que volvía a apretar.
   *
   * El 401 NO es uno de los casos mudos: `fetchAutenticado` lo intercepta
   * antes, borra el token y redirige al login. Los que sí lo eran: el 404 de
   * una promoción que otro admin borró entre la carga y el click, el 502 con
   * HTML del proxy, y el timeout de 15 s de `fetchConTimeout`.
   */
  async function traerDeLasPromociones() {
    setErrorTraer(null);
    setTrayendo(true);

    let ids;
    try {
      const detalles = await Promise.all(promocionesAsociadas.map((p) => getPromocion(p.id)));
      ids = detalles.flatMap((detalle) => (detalle.items ?? []).map((i) => i.productId));
    } catch {
      setErrorTraer(
        "No se pudieron traer los productos de las promociones: no se agregó ninguno. Revisá tu conexión e intentá de nuevo.",
      );
      return;
    } finally {
      setTrayendo(false);
    }

    // Fuera del `try`: un fallo del guardado no es un fallo de la lectura, y su
    // motivo lo reporta el editor en la sección de productos.
    agregar([...new Set(ids)]);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="vitrina-buscar" className={claseEtiqueta}>
            Buscar productos
          </label>
          <input
            id="vitrina-buscar"
            type="search"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Nombre, SKU o categoría"
            className={claseCampo}
          />
        </div>
        <div>
          <label htmlFor="vitrina-categoria" className={claseEtiqueta}>
            Filtrar por categoría
          </label>
          <select
            id="vitrina-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vitrina-etiqueta" className={claseEtiqueta}>
            Filtrar por etiqueta
          </label>
          <select
            id="vitrina-etiqueta"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            className={claseCampo}
          >
            <option value="">Todas</option>
            {etiquetas.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------------- Resultados ---------------- */}
        <section aria-labelledby="titulo-resultados-vitrina">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="titulo-resultados-vitrina"
              className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant"
            >
              Resultados
            </h3>
            {sinAgregar.length > 0 ? (
              <button
                type="button"
                disabled={guardando}
                onClick={() => agregar(sinAgregar.map((p) => p.id))}
                className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                Agregar los {sinAgregar.length} resultados
              </button>
            ) : null}
          </div>

          {errorBusqueda ? (
            <p className="font-body-sm text-body-sm rounded-lg bg-error-container px-3 py-2 text-on-error-container">
              {errorBusqueda}
            </p>
          ) : buscando ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Ningún producto coincide con esos filtros.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-xl border border-outline-variant p-2">
              {resultados.map((producto) => {
                const yaEsta = idsEnVitrina.has(producto.id);
                return (
                  <li
                    key={producto.id}
                    className="font-body-md text-body-md flex items-center gap-3 rounded-lg px-2 py-2 text-on-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <CeldaProducto
                        nombre={producto.nombre}
                        sku={producto.sku}
                        fotoPortada={producto.fotos?.[0]?.url ?? producto.fotoPortada ?? null}
                        visibleEnCatalogo={producto.visibleEnCatalogo}
                      />
                    </span>
                    {yaEsta ? (
                      <span className="font-label-sm text-label-sm shrink-0 rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">
                        Agregado
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={guardando}
                        aria-label={`Agregar ${producto.nombre}`}
                        onClick={() => agregar([producto.id])}
                        className="font-label-sm text-label-sm shrink-0 rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                      >
                        Agregar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------------- La vitrina ---------------- */}
        <section aria-labelledby="titulo-vitrina">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="titulo-vitrina"
              className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant"
            >
              En la vitrina · {productos.length}
            </h3>
            {promocionesAsociadas.length > 0 ? (
              <button
                type="button"
                disabled={guardando || trayendo}
                onClick={traerDeLasPromociones}
                className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                {trayendo ? "Trayendo…" : "Traer los de las promociones"}
              </button>
            ) : null}
          </div>

          {/* El motivo va ACÁ, pegado al botón que falló: el error general de la
              página se pinta arriba de todo, a ~1.686 px de esta sección, o sea
              fuera del viewport de quien apretó. */}
          {errorTraer ? (
            <p className="font-body-sm text-body-sm mb-3 rounded-lg bg-error-container px-3 py-2 text-on-error-container">
              {errorTraer}
            </p>
          ) : null}

          {productos.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Todavía no elegiste ninguno. La campaña puede existir igual: la vitrina solo hace
              falta si el cartel manda a “los productos de la campaña”.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-xl border border-outline-variant p-2">
              {productos.map((producto) => (
                <li
                  key={producto.id}
                  className="font-body-md text-body-md flex items-center gap-3 rounded-lg px-2 py-2 text-on-surface"
                >
                  <span className="min-w-0 flex-1">
                    <CeldaProducto
                      nombre={producto.nombre}
                      sku={producto.sku}
                      fotoPortada={producto.fotoPortada}
                      visibleEnCatalogo={producto.visibleEnCatalogo}
                    />
                  </span>
                  <button
                    type="button"
                    disabled={guardando}
                    aria-label={`Quitar ${producto.nombre}`}
                    onClick={() => quitar(producto.id)}
                    className="font-label-sm text-label-sm shrink-0 rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
