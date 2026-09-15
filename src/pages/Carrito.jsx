import { useEffect } from "react";
import { Link } from "react-router-dom";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import SelectorCantidad from "../components/SelectorCantidad.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import useCarrito from "../hooks/useCarrito.js";
import useProductosCarrito from "../hooks/useProductosCarrito.js";
import useCombosCarrito from "../hooks/useCombosCarrito.js";
import ProductosDeCombo from "../components/ProductosDeCombo.jsx";
import { precargarRequireAuthCliente } from "../components/cargarRequireAuthCliente.js";
import { MENSAJE_ERROR_CARGA } from "../hooks/useOfertas.js";
import { formatPrecio, precioACentavos } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";
import PrecioProducto from "../components/PrecioProducto.jsx";
import { precioAPagar } from "../utils/precioEfectivo.js";

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
 * mano vía `quitar({ productId })`. `getProductsByIds()` sin `admin: true` aplica
 * las mismas guardas públicas que el listado (excluye ocultos y agotados), así
 * que "no encontrado en el fetch en vivo" cubre los tres casos —borrado,
 * oculto y agotado— sin necesidad de chequear esos campos aparte.
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
  // Clave de los productos que hay que traer: los ids del carrito, ordenados y
  // serializados. Es lo que dispara el refetch, y por eso NO incluye las
  // cantidades — subir o bajar el contador de una línea no cambia qué
  // productos hay que cotizar, así que no debe costar una request.
  // Una clave por fuente: los ids de las líneas de producto y los de combo.
  const claveIds = [...new Set(carrito.filter((l) => l.productId !== undefined).map((l) => l.productId))]
    .sort((a, b) => a - b)
    .join(",");
  const claveIdsCombo = [...new Set(carrito.filter((l) => l.comboId !== undefined).map((l) => l.comboId))]
    .sort((a, b) => a - b)
    .join(",");

  // Cache + refetch en segundo plano: volver al carrito no pinta "Cargando…".
  // El error se distingue del vacío: sin `productos` toda línea parecería "no
  // disponible" y el carrito se leería como vacío cuando falla la conexión.
  const { productos, cargando: cargandoProductos, error } = useProductosCarrito(claveIds);
  const { combos, cargando: cargandoCombos, error: errorCombos } = useCombosCarrito(claveIdsCombo);
  const cargando = cargandoProductos || cargandoCombos;
  const errorCarga = error || errorCombos ? MENSAJE_ERROR_CARGA : null;

  // Precarga el chunk del guard de `/checkout` (lazy en `App.jsx`): sin esto el
  // primer "Continuar" pinta el spinner de Suspense ~300 ms. Fire-and-forget: un
  // fallo acá solo significa que ese primer paso vuelve a esperar al chunk.
  useEffect(() => {
    precargarRequireAuthCliente();
  }, []);

  const productosPorId = new Map(productos.map((p) => [p.id, p]));
  const combosPorId = new Map(combos.map((c) => [c.id, c]));

  const lineas = carrito.map((linea) => {
    if (linea.comboId !== undefined) {
      const combo = combosPorId.get(linea.comboId);
      return {
        ...linea,
        tipo: "COMBO",
        combo,
        // Un combo que no volvió o que dejó de estar vigente no se cobra; uno
        // vigente sin stock tampoco. Los dos bloquean hasta que se quite.
        noDisponible: !combo || !combo.vigente,
        sinStock: Boolean(combo) && combo.vigente && !combo.disponible,
        // `alcanza` llega resuelto del backend: el carrito solo lo compara.
        excedeStock: Boolean(combo) && combo.disponible && linea.cantidad > combo.alcanza,
      };
    }
    const producto = productosPorId.get(linea.productId);
    // El clamp contra el stock aplica SOLO cuando el dato vivo vino del
    // backend; un payload sin `stock` no inventa tope. Y nunca se ajusta la
    // cantidad en silencio: la línea muestra un aviso con un botón de
    // ajuste explícito, y el CTA queda bloqueado mientras tanto.
    const stockConocido = Boolean(producto) && Number.isInteger(producto.stock);
    return {
      ...linea,
      tipo: "PRODUCTO",
      producto,
      noDisponible: !producto,
      excedeStock: stockConocido && linea.cantidad > producto.stock,
      maxCantidad: stockConocido ? producto.stock : undefined,
    };
  });

  const lineasValidas = lineas.filter((l) => !l.noDisponible && !l.sinStock);
  const hayProblemas = lineas.some((l) => l.noDisponible || l.sinStock);
  const hayExcesos = lineas.some((l) => l.excedeStock);

  const totalCentavos = lineasValidas.reduce(
    // El EFECTIVO, no el de lista: es lo que el backend va a cobrar al
    // crear la orden. Sumar el de lista mostraría un total que no coincide
    // con la factura, y el cliente lo descubriría al recibir el mail. Un
    // combo, su `precioCombo` tal cual lo emitió el backend.
    (total, l) =>
      total + precioACentavos(l.tipo === "COMBO" ? l.combo.precioCombo : precioAPagar(l.producto)) * l.cantidad,
    0,
  );
  const total = formatPrecio(totalCentavos / 100);

  const ctaDeshabilitado = hayProblemas || hayExcesos || lineasValidas.length === 0;

  return (
    <>
      <MetaSeo
        titulo="Tu carrito — YIMA"
        descripcion="Revisá los productos que agregaste."
        canonical={urlAbsoluta("/carrito")}
        noindex
      />

      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mb-6">
          <BotonVolver />
        </div>

        <div className="mb-16 flex flex-col items-center">
          <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
            Tu pedido
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">Carrito</h1>
        </div>

        {cargando ? (
          <EstadoVacio icono="hourglass_empty" mensaje="Cargando carrito…" />
        ) : errorCarga ? (
          <EstadoVacio icono="cloud_off" titulo="No pudimos cargar tu carrito" mensaje={errorCarga} />
        ) : lineas.length === 0 ? (
          // El mensaje NOMBRA la salida ("desde el catálogo"), así que la
          // pantalla también la OFRECE. `EstadoVacio` no tiene prop de acción a
          // propósito —lo comparten media docena de pantallas que no necesitan
          // ninguna—, así que el link va como HERMANO: mismo criterio que el
          // estado de campaña terminada de `Coleccion.jsx`.
          <div className="flex flex-col items-center">
            <EstadoVacio
              icono="shopping_cart"
              titulo="Tu carrito está vacío"
              mensaje="Agregá productos desde el catálogo para verlos acá."
            />
            <Link
              to="/coleccion"
              className="font-label-lg text-label-lg -mt-12 mb-4 inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-3 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
            >
              Ver el catálogo
            </Link>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            <ul className="flex flex-col gap-4">
              {lineas.map((l) => (
                <li
                  key={l.tipo === "COMBO" ? `combo-${l.comboId}` : `producto-${l.productId}`}
                  className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                >
                  {l.tipo === "COMBO" ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                          <span aria-hidden="true" className="material-symbols-outlined text-[24px]">redeem</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="font-body-lg text-body-lg text-on-surface">
                            {l.combo?.nombre ?? "Combo"}
                          </span>
                          {l.combo ? (
                            <ProductosDeCombo
                              productos={l.combo.items.map((item) => ({ nombreProducto: item.nombre, cantidad: item.cantidad }))}
                              className="font-body-md text-body-md text-on-surface-variant"
                            />
                          ) : null}
                        </div>
                        {!l.noDisponible && !l.sinStock ? (
                          <span className="font-body-lg text-body-lg text-on-surface">
                            {formatPrecio((precioACentavos(l.combo.precioCombo) * l.cantidad) / 100)}
                          </span>
                        ) : null}
                      </div>

                      {l.noDisponible || l.sinStock ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-error-container px-3 py-2">
                          <span className="font-body-md text-body-md text-on-error-container">
                            {l.sinStock ? "Este combo se quedó sin stock." : "Este combo ya no está disponible."}
                          </span>
                          <button
                            type="button"
                            onClick={() => quitar({ comboId: l.comboId })}
                            aria-label="Quitar combo no disponible del carrito"
                            className="font-label-lg text-label-lg text-on-error-container underline"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <>
                          {l.excedeStock ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-error-container px-3 py-2">
                              <span className="font-body-md text-body-md text-on-error-container">
                                Solo alcanza para {l.combo.alcanza} {l.combo.alcanza === 1 ? "combo" : "combos"}.
                              </span>
                              <button
                                type="button"
                                onClick={() => actualizarCantidad({ comboId: l.comboId }, l.combo.alcanza)}
                                className="font-label-lg text-label-lg shrink-0 text-on-error-container underline"
                              >
                                Ajustar a {l.combo.alcanza}
                              </button>
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between">
                            <SelectorCantidad
                              value={l.cantidad}
                              onChange={(cantidad) => actualizarCantidad({ comboId: l.comboId }, cantidad)}
                              max={l.combo.alcanza}
                            />
                            <button
                              type="button"
                              onClick={() => quitar({ comboId: l.comboId })}
                              aria-label="Eliminar combo del carrito"
                              className="inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-error"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
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
                              {/* El "c/u" desambigua contra el subtotal de la
                                  derecha: sin él la línea muestra dos montos
                                  distintos y nada dice cuál es cuál. Mismo
                                  tratamiento que el resumen de `Checkout.jsx`. */}
                              <span
                                data-testid={`carrito-unitario-${l.productId}`}
                                className="flex flex-wrap items-baseline gap-x-1"
                              >
                                <PrecioProducto
                                  producto={l.producto}
                                  className="font-body-md text-body-md text-on-surface-variant"
                                />
                                <span className="font-body-md text-body-md text-on-surface-variant">
                                  c/u
                                </span>
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
                            {formatPrecio((precioACentavos(precioAPagar(l.producto)) * l.cantidad) / 100)}
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
                            onClick={() => quitar({ productId: l.productId })}
                            aria-label="Quitar producto no disponible del carrito"
                            className="font-label-lg text-label-lg text-on-error-container underline"
                          >
                            Quitar
                          </button>
                        </div>
                    ) : (
                        <>
                          {l.excedeStock ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-error-container px-3 py-2">
                              <span className="font-body-md text-body-md text-on-error-container">
                                Solo hay {l.producto.stock}{" "}
                                {l.producto.stock === 1 ? "unidad disponible" : "unidades disponibles"}.
                              </span>
                              <button
                                type="button"
                                onClick={() => actualizarCantidad({ productId: l.productId }, l.producto.stock)}
                                className="font-label-lg text-label-lg shrink-0 text-on-error-container underline"
                              >
                                Ajustar a {l.producto.stock}
                              </button>
                            </div>
                          ) : null}
                        <div className="flex items-center justify-between">
                          <SelectorCantidad
                            value={l.cantidad}
                            onChange={(cantidad) => actualizarCantidad({ productId: l.productId }, cantidad)}
                            max={l.maxCantidad}
                          />
                          <button
                            type="button"
                            onClick={() => quitar({ productId: l.productId })}
                            aria-label="Eliminar del carrito"
                            className="inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-error"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Eliminar
                          </button>
                        </div>
                        </>
                      )}
                    </>
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
                Quitá los productos y combos no disponibles antes de continuar.
              </p>
            ) : null}

            {hayExcesos ? (
              <p className="font-body-md text-body-md text-on-error-container">
                Ajustá las cantidades que superan el stock disponible antes de continuar.
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
                className="font-label-lg text-label-lg inline-flex cursor-not-allowed items-center justify-center rounded-full bg-surface-container-high px-8 py-4 text-center uppercase tracking-widest text-on-surface-variant"
              >
                Continuar
              </button>
            ) : (
              // "Confirmar pedido" es el copy del botón que SÍ crea la orden,
              // en `/checkout`. Repetirlo acá —donde el CTA solo navega— le
              // hace creer al cliente que ya compró: el mismo texto para dos
              // acciones distintas, y la que promete menos es la que cobra.
              <Link
                to="/checkout"
                className="font-label-lg text-label-lg inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
              >
                Continuar
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default Carrito;
