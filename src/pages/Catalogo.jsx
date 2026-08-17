import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import { getProducts } from "../api/products.js";

/**
 * `/` — landing + full catalog in one scroll, per design D1.
 *
 * Hero copy is ported verbatim from home.html L122-129 (Spanish, brand
 * copy). The bento/featured layout from home.html is intentionally NOT
 * built — per D1 the asymmetric bento only fits a fixed 3-item layout and
 * breaks for an arbitrary product count, so ALL products render in ONE
 * grid using catalogo.html's padded-card idiom (`ProductCard`, no bento).
 * Grid spans stay here (the parent page), not inside `ProductCard` (D2).
 */
function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getProducts().then((data) => {
      if (!activo) return;
      setProductos(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <>
      {/* Hero Section — ported from home.html L121-130 */}
      <section className="relative flex w-full flex-col items-center justify-center px-margin-mobile py-24 text-center md:px-margin-desktop md:py-32">
        <h1 className="font-display-lg text-display-lg mx-auto mb-6 max-w-4xl tracking-tight text-primary md:text-[64px]">
          Fernando Segovia
          <br />
          Nicolas Quintana
        </h1>
        <p className="font-body-lg text-body-lg mx-auto mb-12 max-w-2xl text-on-surface-variant">
          Descubra una colección curada de objetos extraordinarios diseñados para elevar sus
          momentos cotidianos. Un tributo al diseño atemporal y la artesanía impecable.
        </p>
      </section>

      {/* Collection Grid — section header from home.html L132-136, card grid idiom from catalogo.html */}
      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mb-16 flex flex-col items-center">
          <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
            Nuestra Colección
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
            Piezas Destacadas
          </h2>
        </div>

        {cargando ? (
          <EstadoVacio icono="hourglass_empty" mensaje="Cargando productos…" />
        ) : productos.length === 0 ? (
          <EstadoVacio
            icono="inventory_2"
            titulo="Todavía no hay productos"
            mensaje="Pronto vamos a sumar piezas a la colección."
          />
        ) : (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
            {productos.map((producto, index) => {
              // Every 4th card renders wide (horizontal variant), matching
              // catalogo.html's mix of `lg:col-span-4` stacked cards and
              // `lg:col-span-6` wide cards (L179-209) — asymmetry comes from
              // this span mix, not from a separate bento section (D1).
              const esAncha = index % 4 === 3;
              return (
                <div
                  key={producto.id}
                  className={esAncha ? "col-span-1 md:col-span-12 lg:col-span-6" : "col-span-1 md:col-span-6 lg:col-span-4"}
                >
                  <ProductCard producto={producto} variant={esAncha ? "horizontal" : "vertical"} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default Catalogo;
