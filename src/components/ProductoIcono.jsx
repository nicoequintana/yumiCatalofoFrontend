import { Link } from "react-router-dom";
import BotonAgregar from "./BotonAgregar.jsx";
import PrecioProducto from "./PrecioProducto.jsx";
import { rutaProducto } from "../utils/slug.js";

/**
 * "El ícono de la colección" — el producto que el admin eligió para la home.
 *
 * PRESENTACIONAL: `Catalogo.jsx` llama a `useProductoIcono`. Con `producto`
 * `null` no se renderiza.
 *
 * TODO SALE DEL PRODUCTO, no hay copy propio: título = `fraseComercial` (o el
 * nombre si no la tiene), párrafo = `porQueLoVasAQuerer`, datos = las dos
 * primeras `especificaciones`, imagen = portada. Precio y descuento llegan
 * resueltos del backend y los dibuja `PrecioProducto`.
 *
 * El lugar de "garantía" del mockup NO se dibuja: no hay dato que lo respalde.
 *
 * @param {Object|null} [producto] el detalle público de `GET /config/home`
 */
export default function ProductoIcono({ producto = null }) {
  if (!producto) return null;

  const foto = producto.fotos?.[0];
  const titulo = producto.fraseComercial || producto.nombre;
  const datos = (producto.especificaciones ?? []).slice(0, 2);

  // Predicado literal `> 0 && <= 3`, el mismo de `ProductCard`/`FichaProducto`:
  // una copia más del umbral de stock bajo que lista
  // `docs/reglas/sincronizaciones.md` (decisión de T10: se reusa el predicado,
  // no se unifica en esta tanda).
  const stockBajo = producto.stock > 0 && producto.stock <= 3;

  return (
    <section className="relative w-full overflow-hidden bg-primary py-7 text-on-primary md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[40%] -right-[10%] aspect-square w-3/5 rounded-full bg-[radial-gradient(circle,rgb(var(--color-on-primary-container)/0.16),transparent_65%)]"
      />
      <div className="relative mx-auto grid w-full max-w-container-max gap-[26px] px-margin-mobile md:grid-cols-[5fr_7fr] md:items-center md:gap-14 md:px-margin-desktop">
        <div className="flex flex-col items-start gap-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-[5px] font-label-sm text-[11px] font-bold uppercase leading-[14px] tracking-[0.08em] text-on-secondary">
            <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
              workspace_premium
            </span>
            El ícono de la colección
          </span>

          {producto.fraseComercial ? (
            <span className="font-label-md text-[13px] font-semibold leading-[18px] tracking-[0.02em] text-on-primary-container">
              {producto.nombre}
            </span>
          ) : null}

          <h2 className="max-w-[18ch] font-headline-md text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-on-primary md:text-[40px] md:leading-[46px]">
            {titulo}
          </h2>

          {producto.porQueLoVasAQuerer ? (
            <p className="max-w-[52ch] font-body-md text-[15px] leading-6 text-on-primary-container">
              {producto.porQueLoVasAQuerer}
            </p>
          ) : null}

          {datos.length > 0 ? (
            <dl className="grid w-full max-w-[420px] grid-cols-2 gap-3.5 py-1.5">
              {datos.map((dato) => (
                <div key={dato.id ?? dato.nombre} className="flex flex-col-reverse border-l-2 border-secondary-container/50 pl-3">
                  <dt className="font-body-sm text-[13px] text-on-primary-container">{dato.nombre}</dt>
                  <dd className="break-words font-label-lg text-[22px] font-extrabold leading-[26px] tracking-[-0.02em] text-secondary-container">
                    {dato.valor}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <PrecioProducto
            producto={producto}
            className="font-label-lg text-[28px] font-extrabold leading-[32px] tracking-[-0.03em] tabular-nums text-on-primary"
            claseAnterior="!text-on-primary-container"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={rutaProducto(producto)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary-container px-5 font-label-md text-[14px] font-bold text-on-secondary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              Ver producto
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
            <BotonAgregar producto={producto} className="!h-11 px-5" />
          </div>

          {stockBajo ? (
            <p className="inline-flex items-center gap-1.5 font-label-md text-[13px] font-semibold leading-none text-secondary-container">
              <span aria-hidden="true" className="block h-[7px] w-[7px] rounded-full bg-secondary-container motion-safe:animate-pulse" />
              {producto.stock === 1 ? "Última unidad" : `Últimas ${producto.stock} unidades`}
            </p>
          ) : null}
        </div>

        {foto ? (
          <div className="relative aspect-[4/3] max-w-full overflow-hidden rounded-3xl bg-primary-container shadow-sombra-2 md:aspect-[16/11]">
            <img
              src={foto.url}
              alt={producto.nombre}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
