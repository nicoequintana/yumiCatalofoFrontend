import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import SelectorCantidad from "../components/SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { getProducts } from "../api/products.js";
import { formatPrecio, precioACentavos } from "../utils/formato.js";

/**
 * `/carrito` — líneas del carrito (Sprint 5, Task 3, tarea final). Reutiliza
 * el patrón de `Favoritos.jsx` de re-fetchear productos en vivo contra los
 * ids guardados en localStorage, en vez de confiar en la foto/precio
 * cacheados en el momento en que se agregó el producto al carrito.
 *
 * Diferencia deliberada con `Favoritos.jsx`: acá NO se limpia en silencio una
 * línea cuyo producto ya no existe (borrado u oculto) — hay plata de por
 * medio (esto alimenta un checkout en Sprint 6), así que se muestra un
 * aviso inline en esa línea puntual y se deja que el usuario la quite a
 * mano vía `quitar(productId)`. `getProducts()` sin `admin: true` ya excluye
 * productos ocultos (`visibleEnCatalogo: false`) de sus resultados, así que
 * "no encontrado en el fetch en vivo" cubre tanto el caso borrado como el
 * caso oculto sin necesidad de chequear ese campo aparte.
 *
 * Nota sobre el estado vacío: se muestra `EstadoVacio` solo cuando el
 * carrito no tiene NINGUNA línea (ni siquiera con problemas). Si hay líneas
 * pero todas quedaron no-disponibles, se sigue mostrando la lista (con sus
 * avisos y el botón de "Quitar" de cada una) en vez de `EstadoVacio` — así
 * el usuario puede ver el motivo y resolverlo, en línea con el requisito de
 * "avisar en vez de esconder" (a diferencia de `Favoritos.jsx`). Ocultar
 * la lista detrás de un estado vacío genérico en ese caso escondería el
 * problema en vez de mostrarlo.
 */
function Carrito() {
  const { carrito, actualizarCantidad, quitar } = useCarrito();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    let activo = true;

    getProducts()
      .then((data) => {
        if (!activo) return;
        setProductos(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre. Peor todavía acá: sin `productos`
      // toda línea parece "no disponible", así que el carrito se leería como
      // vacío cuando el problema es la conexión.
      .catch(() => {
        if (!activo) return;
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
    // Corre solo al montar — igual que Favoritos.jsx, no debe re-ejecutarse
    // en cada cambio de `carrito` (eso pasa en cada agregar/quitar/actualizar).
  }, []);

  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const lineas = carrito.map((linea) => {
    const producto = productosPorId.get(linea.productId);
    const noDisponible = !producto;
    return { ...linea, producto, noDisponible };
  });

  const lineasValidas = lineas.filter((l) => !l.noDisponible);
  const hayProblemas = lineas.some((l) => l.noDisponible);

  const totalCentavos = lineasValidas.reduce(
    (total, l) => total + precioACentavos(l.producto.precio) * l.cantidad,
    0,
  );
  const total = formatPrecio(totalCentavos / 100);

  const ctaDeshabilitado = hayProblemas || lineasValidas.length === 0;

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="mb-6">
        <BotonVolver />
      </div>

      <div className="mb-16 flex flex-col items-center">
        <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
          Tu pedido
        </span>
        <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">Carrito</h2>
      </div>

      {cargando ? (
        <EstadoVacio icono="hourglass_empty" mensaje="Cargando carrito…" />
      ) : errorCarga ? (
        <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tu carrito" mensaje={errorCarga} />
      ) : lineas.length === 0 ? (
        <EstadoVacio
          icono="shopping_cart"
          titulo="Tu carrito está vacío"
          mensaje="Agregá productos desde el catálogo para verlos acá."
        />
      ) : (
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <ul className="flex flex-col gap-4">
            {lineas.map((l) => (
              <li
                key={l.productId}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
              >
                <div className="flex items-center gap-4">
                  {l.producto?.fotos?.[0]?.url ? (
                    <img
                      src={l.producto.fotos[0].url}
                      alt={l.producto.nombre}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                      <span className="material-symbols-outlined text-[24px]">image</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-1">
                    {l.producto ? (
                      <>
                        <span className="font-body-lg text-body-lg text-on-surface">
                          {l.producto.nombre}
                        </span>
                        <span className="font-body-md text-body-md text-on-surface-variant">
                          {formatPrecio(l.producto.precio)}
                        </span>
                      </>
                    ) : (
                      <span className="font-body-lg text-body-lg text-on-surface-variant">
                        Producto no disponible
                      </span>
                    )}
                  </div>

                  {!l.noDisponible ? (
                    <span className="font-body-lg text-body-lg text-on-surface">
                      {formatPrecio((precioACentavos(l.producto.precio) * l.cantidad) / 100)}
                    </span>
                  ) : null}
                </div>

                {l.noDisponible ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-error-container px-3 py-2">
                    <span className="font-body-md text-body-md text-on-error-container">
                      Este producto ya no está disponible.
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(l.productId)}
                      aria-label="Quitar producto no disponible del carrito"
                      className="font-label-md text-label-md text-on-error-container underline"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <SelectorCantidad
                      value={l.cantidad}
                      onChange={(cantidad) => actualizarCantidad(l.productId, cantidad)}
                    />
                    <button
                      type="button"
                      onClick={() => quitar(l.productId)}
                      aria-label="Eliminar del carrito"
                      className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-outline-variant pt-4">
            <span className="font-headline-md text-headline-md text-primary">Total</span>
            <strong
              data-testid="carrito-total"
              className="font-headline-md text-headline-md text-primary"
            >
              {total}
            </strong>
          </div>

          {hayProblemas ? (
            <p className="font-body-md text-body-md text-on-error-container">
              Quitá los productos no disponibles antes de continuar.
            </p>
          ) : null}

          {ctaDeshabilitado ? (
            // `aria-disabled` sobre un <Link>/<a> no es confiable entre
            // lectores de pantalla (NVDA/JAWS/VoiceOver suelen seguir
            // anunciándolo como link enfocable y clickeable, y el
            // preventDefault bloquea la navegación en silencio sin ninguna
            // explicación audible). Por eso, en vez de simular "deshabilitado"
            // con ARIA sobre un elemento de navegación, se cambia de elemento:
            // un <button disabled> nativo, que trae esa semántica gratis
            // (no-focuseable, anunciado como deshabilitado, sin necesidad de
            // handlers de click que cancelar).
            <button
              type="button"
              disabled
              className="font-label-md text-label-md inline-flex cursor-not-allowed items-center justify-center rounded-full bg-surface-container-high px-8 py-4 text-center uppercase tracking-widest text-on-surface-variant"
            >
              Confirmar pedido
            </button>
          ) : (
            <Link
              to="/checkout"
              className="font-label-md text-label-md inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
            >
              Confirmar pedido
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export default Carrito;
